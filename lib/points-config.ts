import { prisma } from "@/lib/prisma";
import { Stage } from "@prisma/client";

export type PointsConfigMap = Record<string, number>;

const KNOCKOUT_STAGES: Stage[] = [
  "R32",
  "R16",
  "QF",
  "SF",
  "THIRD_PLACE",
  "FINAL",
];

function buildFallbacks(): PointsConfigMap {
  const fallbacks: PointsConfigMap = {
    GROUP_EXACT: 1,
    BRACKET_ADVANCER: 1,
    AWARD_PICK: 1,
  };
  for (const stage of KNOCKOUT_STAGES) {
    fallbacks[`KNOCKOUT_WINNER_${stage}`] = 1;
    fallbacks[`KNOCKOUT_EXACT_BONUS_${stage}`] = 2;
  }
  return fallbacks;
}

const FALLBACKS = buildFallbacks();

/** Reads all configurable point values, falling back to sane defaults for any key not yet in the database. */
export async function getPointsConfig(): Promise<PointsConfigMap> {
  const rows = await prisma.pointsConfig.findMany();
  const map: PointsConfigMap = { ...FALLBACKS };
  for (const r of rows) {
    map[r.key] = r.value;
  }
  return map;
}

/** Convenience accessors so call sites don't need to know the key-naming convention. */
export function knockoutWinnerPoints(
  config: PointsConfigMap,
  stage: Stage,
): number {
  return config[`KNOCKOUT_WINNER_${stage}`] ?? 1;
}

export function knockoutExactBonusPoints(
  config: PointsConfigMap,
  stage: Stage,
): number {
  return config[`KNOCKOUT_EXACT_BONUS_${stage}`] ?? 2;
}
