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
 */
import { PrismaClient } from "@prisma/client";
import { readFileSync } from "fs";
import { join } from "path";

const prisma = new PrismaClient();
const CSV_PATH = join(process.cwd(), "players.csv");

/**
 * Minimal CSV parser handling quoted fields (in case any club/name contains
 * a comma, e.g. "Paris Saint-Germain, B"). Good enough for this dataset's
 * shape without pulling in a dependency.
 */
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

async function main() {
  const raw = readFileSync(CSV_PATH, "utf-8");
  const rows = parseCsv(raw);
  console.log(`Parsed ${rows.length} player rows.`);

  let created = 0;
  let updated = 0;
  let skipped = 0;

  for (const row of rows) {
    const name = row["player"];
    const country = row["team_country"] || row["team"];
    if (!name || !country) {
      console.warn("Skipping row with missing player/country:", row);
      skipped++;
      continue;
    }

    const birthYearRaw = row["birth_year"];
    const birthYear = birthYearRaw ? parseInt(birthYearRaw, 10) : null;

    const data = {
      position: row["position"] || null,
      club: row["club"] || null,
      ageLabel: row["age"] || null,
      birthYear: birthYear && !isNaN(birthYear) ? birthYear : null,
    };

    const existing = await prisma.player.findUnique({
      where: { name_country: { name, country } },
    });

    if (existing) {
      await prisma.player.update({ where: { id: existing.id }, data });
      updated++;
    } else {
      await prisma.player.create({ data: { name, country, ...data } });
      created++;
    }
  }

  console.log(
    `Done. Created ${created}, updated ${updated}, skipped ${skipped}.`,
  );
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
