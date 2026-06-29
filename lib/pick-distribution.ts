import { prisma } from "@/lib/prisma";

export type PickDistribution = Map<string, Map<string, number>>;

/** Pick distribution across ALL users (not just one), per match. */
export async function getPickDistribution(
  matchIds: string[],
): Promise<PickDistribution> {
  const allPredictions = await prisma.knockoutPrediction.findMany({
    where: { matchId: { in: matchIds } },
    select: { matchId: true, predictedWinner: true },
  });

  const byMatch: PickDistribution = new Map();
  for (const p of allPredictions) {
    if (!p.predictedWinner) continue;
    if (!byMatch.has(p.matchId)) byMatch.set(p.matchId, new Map());
    const counts = byMatch.get(p.matchId)!;
    counts.set(p.predictedWinner, (counts.get(p.predictedWinner) ?? 0) + 1);
  }
  return byMatch;
}

/** Given a match's pick counts map and total, compute home/away percentages. */
export function computePickPercentages(params: {
  counts: Map<string, number> | undefined;
  totalPicks: number;
  homeTeamId?: string | null;
  awayTeamId?: string | null;
}): { homePct: number | null; awayPct: number | null } {
  const { counts, totalPicks, homeTeamId, awayTeamId } = params;
  if (totalPicks === 0) return { homePct: null, awayPct: null };

  const homePct = homeTeamId
    ? Math.round(((counts?.get(homeTeamId) ?? 0) / totalPicks) * 100)
    : null;
  const awayPct = awayTeamId
    ? Math.round(((counts?.get(awayTeamId) ?? 0) / totalPicks) * 100)
    : null;

  return { homePct, awayPct };
}
