import { PrismaClient, Stage } from "@prisma/client";

const prisma = new PrismaClient();

const FOOTBALL_DATA_BASE = "https://api.football-data.org/v4";

type FdTeam = { id: number; name: string; shortName: string | null; tla: string | null; crest: string | null };
type FdMatch = {
  id: number;
  utcDate: string;
  stage: string; // "GROUP_STAGE" | "LAST_32"  etc.
  group: string | null;
  homeTeam: FdTeam;
  awayTeam: FdTeam;
};

function mapStage(fdStage: string): Stage | null {
  switch (fdStage) {
    case "GROUP_STAGE":
      return Stage.GROUP;
    case "LAST_32":
      return Stage.R32;
    case "LAST_16":
      return Stage.R16;
    case "QUARTER_FINALS":
      return Stage.QF;
    case "SEMI_FINALS":
      return Stage.SF;
    case "THIRD_PLACE":
      return Stage.THIRD_PLACE;
    case "FINAL":
      return Stage.FINAL;
    default:
      return null;
  }
}

function groupLetter(fdGroup: string | null): string | null {
  if (!fdGroup) return null;
  const match = fdGroup.match(/Group ([A-L])/i);
  return match ? match[1].toUpperCase() : null;
}

async function upsertTeam(fd: FdTeam) {
  if (!fd?.name) return null;
  return prisma.team.upsert({
    where: { name: fd.name },
    update: {
      fifaCode: fd.tla ?? undefined,
      flagUrl: fd.crest ?? undefined,
    },
    create: {
      name: fd.name,
      fifaCode: fd.tla ?? undefined,
      flagUrl: fd.crest ?? undefined,
    },
  });
}

async function main() {
  const apiKey = process.env.FOOTBALL_DATA_API_KEY;
  if (!apiKey) {
    throw new Error("Set FOOTBALL_DATA_API_KEY in your .env before seeding.");
  }

  console.log("Fetching World Cup 2026 fixtures from football-data.org...");
  const res = await fetch(`${FOOTBALL_DATA_BASE}/competitions/WC/matches`, {
    headers: { "X-Auth-Token": apiKey },
  });

  if (!res.ok) {
    throw new Error(`football-data.org request failed (${res.status}): ${await res.text()}`);
  }

  const data = await res.json();
  const matches = data.matches as FdMatch[];
  console.log(`Fetched ${matches.length} matches.`);

  const stageCounters: Record<string, number> = {};

  for (const fd of matches) {
    const stage = mapStage(fd.stage);
    if (!stage) {
      console.warn(`Skipping match ${fd.id}: unrecognized stage "${fd.stage}"`);
      continue;
    }
    const group = stage === Stage.GROUP ? groupLetter(fd.group) : null;

    const homeTeam = fd.homeTeam?.name ? await upsertTeam(fd.homeTeam) : null;
    const awayTeam = fd.awayTeam?.name ? await upsertTeam(fd.awayTeam) : null;

    if (group && homeTeam) {
      await prisma.team.update({ where: { id: homeTeam.id }, data: { groupName: group } });
    }
    if (group && awayTeam) {
      await prisma.team.update({ where: { id: awayTeam.id }, data: { groupName: group } });
    }

    let slotKey: string | null = null;
    if (stage !== Stage.GROUP) {
      if (stage === Stage.FINAL) {
        slotKey = "FINAL";
      } else if (stage === Stage.THIRD_PLACE) {
        slotKey = "THIRD_PLACE";
      } else {
        stageCounters[stage] = (stageCounters[stage] ?? 0) + 1;
        slotKey = `${stage}-${stageCounters[stage]}`;
      }
    }

    await prisma.match.upsert({
      where: { externalId: String(fd.id) },
      update: {
        stage,
        groupName: group,
        homeTeamId: homeTeam?.id,
        awayTeamId: awayTeam?.id,
        kickoff: new Date(fd.utcDate),
        slotKey: slotKey ?? undefined,
      },
      create: {
        externalId: String(fd.id),
        stage,
        groupName: group,
        homeTeamId: homeTeam?.id,
        awayTeamId: awayTeam?.id,
        kickoff: new Date(fd.utcDate),
        slotKey,
      },
    });
  }

  console.log("Seed complete.");
  console.log(
    "Note: Round of 16 onward fixtures may show placeholder/TBD teams until earlier rounds finish — re-run `npm run seed` periodically to fill those in as football-data.org updates them."
  );
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
