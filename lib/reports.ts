import { prisma } from "@/lib/prisma";

export type LeaderboardBarDatum = {
  name: string;
  groupPoints: number;
  knockoutPoints: number;
  bracketPoints: number;
  adjustmentPoints: number;
  total: number;
};

export type AccuracyDatum = {
  name: string;
  predicted: number;
  correct: number;
  accuracyPct: number;
};

export type ParticipationDatum = {
  name: string;
  predicted: number;
  totalPredictable: number;
  participationPct: number;
};

export type ReportsData = {
  leaderboardBars: LeaderboardBarDatum[];
  accuracy: AccuracyDatum[];
  participation: ParticipationDatum[];
  boldestPredictor: { name: string; totalGoalsPredicted: number } | null;
  mostPopularChampionPick: { teamName: string; pickCount: number } | null;
  totalFinishedMatches: number;
};

const sum = (vals: (number | null)[]) =>
  vals.reduce((acc: number, v) => acc + (v ?? 0), 0);

export async function getReportsData(): Promise<ReportsData> {
  const users = await prisma.user.findMany({
    select: {
      id: true,
      name: true,
      email: true,
      groupPredictions: {
        select: { pointsAwarded: true, homeScore: true, awayScore: true },
      },
      knockoutPredictions: { select: { pointsAwarded: true } },
      bracketPicks: {
        select: {
          pointsAwarded: true,
          slotKey: true,
          teamId: true,
          stage: true,
        },
      },
      manualAdjustment: { select: { points: true } },
    },
  });

  const totalGroupMatches = await prisma.match.count({
    where: { stage: "GROUP" },
  });
  const totalKnockoutMatches = await prisma.match.count({
    where: { stage: { not: "GROUP" } },
  });
  const totalFinishedMatches = await prisma.match.count({
    where: { status: "FINISHED" },
  });

  const leaderboardBars: LeaderboardBarDatum[] = users
    .map((u) => {
      const groupPoints = sum(u.groupPredictions.map((p) => p.pointsAwarded));
      const knockoutPoints = sum(
        u.knockoutPredictions.map((p) => p.pointsAwarded),
      );
      const bracketPoints = sum(u.bracketPicks.map((p) => p.pointsAwarded));
      const adjustmentPoints = u.manualAdjustment?.points ?? 0;
      return {
        name: u.name ?? u.email ?? "Unknown",
        groupPoints,
        knockoutPoints,
        bracketPoints,
        adjustmentPoints,
        total: groupPoints + knockoutPoints + bracketPoints + adjustmentPoints,
      };
    })
    .sort((a, b) => b.total - a.total);

  const accuracy: AccuracyDatum[] = users
    .map((u) => {
      const allPredictions = [
        ...u.groupPredictions.map((p) => p.pointsAwarded),
        ...u.knockoutPredictions.map((p) => p.pointsAwarded),
      ];
      const scoredOnly = allPredictions.filter((p) => p !== null) as number[];
      const predicted = scoredOnly.length;
      const correct = scoredOnly.filter((p) => p > 0).length;
      return {
        name: u.name ?? u.email ?? "Unknown",
        predicted,
        correct,
        accuracyPct:
          predicted > 0 ? Math.round((correct / predicted) * 100) : 0,
      };
    })
    .filter((a) => a.predicted > 0)
    .sort((a, b) => b.accuracyPct - a.accuracyPct);

  const totalPredictable = totalGroupMatches + totalKnockoutMatches;
  const participation: ParticipationDatum[] = users
    .map((u) => {
      const predicted =
        u.groupPredictions.length + u.knockoutPredictions.length;
      return {
        name: u.name ?? u.email ?? "Unknown",
        predicted,
        totalPredictable,
        participationPct:
          totalPredictable > 0
            ? Math.round((predicted / totalPredictable) * 100)
            : 0,
      };
    })
    .sort((a, b) => b.participationPct - a.participationPct);

  let boldestPredictor: ReportsData["boldestPredictor"] = null;
  let maxGoals = -1;
  for (const u of users) {
    const goals = sum(
      u.groupPredictions.flatMap((p) => [p.homeScore, p.awayScore]),
    );
    if (u.groupPredictions.length > 0 && goals > maxGoals) {
      maxGoals = goals;
      boldestPredictor = {
        name: u.name ?? u.email ?? "Unknown",
        totalGoalsPredicted: goals,
      };
    }
  }

  const finalPicks = await prisma.bracketPick.findMany({
    where: { slotKey: "FINAL" },
    select: { teamId: true },
  });
  let mostPopularChampionPick: ReportsData["mostPopularChampionPick"] = null;
  if (finalPicks.length > 0) {
    const counts = new Map<string, number>();
    for (const p of finalPicks) {
      counts.set(p.teamId, (counts.get(p.teamId) ?? 0) + 1);
    }
    const sorted = Array.from(counts.entries()).sort((a, b) => b[1] - a[1]);
    const top = sorted[0];
    if (top) {
      const [topTeamId, topCount] = top;
      const team = await prisma.team.findUnique({ where: { id: topTeamId } });
      if (team) {
        mostPopularChampionPick = { teamName: team.name, pickCount: topCount };
      }
    }
  }

  return {
    leaderboardBars,
    accuracy,
    participation,
    boldestPredictor,
    mostPopularChampionPick,
    totalFinishedMatches,
  };
}
