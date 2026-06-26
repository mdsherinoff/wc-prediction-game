import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const KNOCKOUT_ROUNDS = [
  { stage: "R32", label: "Round of 32" },
  { stage: "R16", label: "Round of 16" },
  { stage: "QF", label: "Quarter-Final" },
  { stage: "SF", label: "Semi-Final" },
  { stage: "THIRD_PLACE", label: "Third Place" },
  { stage: "FINAL", label: "Final" },
];

const DEFAULTS = [
  {
    key: "GROUP_EXACT",
    value: 1,
    label: "Group stage — exact score",
    group: "GROUP",
  },
  ...KNOCKOUT_ROUNDS.map((r) => ({
    key: `KNOCKOUT_WINNER_${r.stage}`,
    value: 1,
    label: `${r.label} — correct winner`,
    group: "KNOCKOUT",
  })),
  ...KNOCKOUT_ROUNDS.map((r) => ({
    key: `KNOCKOUT_EXACT_BONUS_${r.stage}`,
    value: 2,
    label: `${r.label} — exact score bonus`,
    group: "KNOCKOUT",
  })),
  {
    key: "BRACKET_ADVANCER",
    value: 1,
    label: "Bracket — correct advancer pick",
    group: "BRACKET",
  },
  {
    key: "AWARD_PICK",
    value: 1,
    label: "Award — correct player pick",
    group: "AWARDS",
  },
];

async function main() {
  for (const d of DEFAULTS) {
    await prisma.pointsConfig.upsert({
      where: { key: d.key },
      update: {},
      create: d,
    });
  }
  console.log(`Points config seeded (${DEFAULTS.length} keys).`);
}

main().finally(() => prisma.$disconnect());
