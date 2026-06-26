/**
 * One-off / repeatable script to import (or refresh) player data from the
 * Kaggle "FIFA World Cup 2026 Player Data" CSV.
 *
 * Usage:
 *   1. Download players.csv from
 *      https://www.kaggle.com/datasets/swaptr/fifa-wc-2026-players
 *   2. Place it at the project root as players.csv
 *   3. npx tsx prisma/import-players.ts
 *
 * Safe to re-run any time you download a fresher copy — upserts by
 * (name, country), so existing players get refreshed instead of duplicated.
 *
 * Performance note: this batches all reads up front and all writes via
 * a single transaction of upserts, rather than doing one round-trip per
 * row sequentially — that approach was timing out against Neon's
 * serverless connection on large CSVs (1000+ rows).
 */
import { PrismaClient } from "@prisma/client";
import { readFileSync } from "fs";
import { join } from "path";

const prisma = new PrismaClient();
const CSV_PATH = join(process.cwd(), "players.csv");

function parseCsv(text: string): Record<string, string>[] {
  const lines = text.split(/\r?\n/).filter((l) => l.length > 0);
  const headers = splitCsvLine(lines[0]);
  return lines.slice(1).map((line) => {
    const values = splitCsvLine(line);
    const row: Record<string, string> = {};
    headers.forEach((h, i) => {
      row[h.trim()] = (values[i] ?? "").trim();
    });
    return row;
  });
}

function splitCsvLine(line: string): string[] {
  const result: string[] = [];
  let current = "";
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    if (char === '"') {
      inQuotes = !inQuotes;
    } else if (char === "," && !inQuotes) {
      result.push(current);
      current = "";
    } else {
      current += char;
    }
  }
  result.push(current);
  return result;
}

function toIntOrNull(val: string | undefined): number | null {
  if (!val || val === "") return null;
  const n = parseInt(val, 10);
  return isNaN(n) ? null : n;
}

// Batch size for each transaction — small enough to avoid a single huge
// transaction timing out, large enough to drastically cut round-trips
// versus one-at-a-time.
const BATCH_SIZE = 100;

async function main() {
  const raw = readFileSync(CSV_PATH, "utf-8");
  const rows = parseCsv(raw);
  console.log(`Parsed ${rows.length} player rows.`);

  const validRows = rows
    .map((row) => {
      const name = row["player"];
      const country = row["team_country"] || row["team"];
      if (!name || !country) return null;

      const birthYearRaw = row["birth_year"];
      const birthYear = birthYearRaw ? parseInt(birthYearRaw, 10) : null;

      return {
        name,
        country,
        position: row["position"] || null,
        club: row["club"] || null,
        ageLabel: row["age"] || null,
        birthYear: birthYear && !isNaN(birthYear) ? birthYear : null,
      };
    })
    .filter((r): r is NonNullable<typeof r> => r !== null);

  const skipped = rows.length - validRows.length;
  console.log(
    `${validRows.length} valid rows, ${skipped} skipped (missing player/country).`,
  );

  let processed = 0;

  for (let i = 0; i < validRows.length; i += BATCH_SIZE) {
    const batch = validRows.slice(i, i + BATCH_SIZE);

    await prisma.$transaction(
      batch.map((r) =>
        prisma.player.upsert({
          where: { name_country: { name: r.name, country: r.country } },
          update: {
            position: r.position,
            club: r.club,
            ageLabel: r.ageLabel,
            birthYear: r.birthYear,
          },
          create: {
            name: r.name,
            country: r.country,
            position: r.position,
            club: r.club,
            ageLabel: r.ageLabel,
            birthYear: r.birthYear,
          },
        }),
      ),
      { timeout: 30000 },
    );

    processed += batch.length;
    console.log(`Processed ${processed}/${validRows.length}...`);
  }

  console.log("Done.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
