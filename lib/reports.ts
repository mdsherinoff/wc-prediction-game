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

/** A single labelled value for a ranked horizontal-bar list. */
export type RankedDatum = {
  label: string;
  value: number;
  caption?: string;
};

export type AwardFavorite = {
  category: string;
  label: string;
  playerName: string;
  country: string;
  pickCount: number;
};

export type ReportsData = {
  leaderboardBars: LeaderboardBarDatum[];
  accuracy: AccuracyDatum[];
  participation: ParticipationDatum[];
  sharpestPredictors: RankedDatum[];
  popularScorelines: RankedDatum[];
  awardFavorites: AwardFavorite[];
  boldestPredictor: { name: string; totalGoalsPredicted: number } | null;
  mostPopularChampionPick: { teamName: string; pickCount: number } | null;
  goalsPredictedAvg: number | null;
  goalsActualAvg: number | null;
  totalFinishedMatches: number;
};

const AWARD_LABELS: Record<string, string> = {
  GOLDEN_BALL: "Golden Ball",
  GOLDEN_BOOT: "Golden Boot",
  GOLDEN_GLOVE: "Golden Glove",
  YOUNG_PLAYER: "Best Young Player",
};

const sum = (vals: (number | null)[]) =>
  vals.reduce((acc: number, v) => acc + (v ?? 0), 0);

const round1 = (n: number) => Math.round(n * 10) / 10;

export async function getReportsData(): Promise<ReportsData> {
  const users = await prisma.user.findMany({
    select: {
      id: true,
      name: true,
      groupPredictions: {
        select: {
          pointsAwarded: true,
          homeScore: true,
          awayScore: true,
          knownIncorrect: true,
        },
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

  const [
    totalGroupMatches,
    totalKnockoutMatches,
    totalFinishedMatches,
    finishedGroupMatches,
    awardPicks,
    finalPicks,
  ] = await Promise.all([
    prisma.match.count({ where: { stage: "GROUP" } }),
    prisma.match.count({ where: { stage: { not: "GROUP" } } }),
    prisma.match.count({ where: { status: "FINISHED" } }),
    prisma.match.findMany({
      where: { stage: "GROUP", status: "FINISHED" },
      select: { homeScore: true, awayScore: true },
    }),
    prisma.awardPick.findMany({
      include: { player: { select: { name: true, country: true } } },
    }),
    prisma.bracketPick.findMany({
      where: { slotKey: "FINAL" },
      select: { teamId: true },
    }),
  ]);

  const displayName = (name: string | null) => name ?? "Anonymous";

  const leaderboardBars: LeaderboardBarDatum[] = users
    .map((u) => {
      const groupPoints = sum(u.groupPredictions.map((p) => p.pointsAwarded));
      const knockoutPoints = sum(
        u.knockoutPredictions.map((p) => p.pointsAwarded),
      );
      const bracketPoints = sum(u.bracketPicks.map((p) => p.pointsAwarded));
      const adjustmentPoints = u.manualAdjustment?.points ?? 0;
      return {
        name: displayName(u.name),
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
        name: displayName(u.name),
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
        name: displayName(u.name),
        predicted,
        totalPredictable,
        participationPct:
          totalPredictable > 0
            ? Math.round((predicted / totalPredictable) * 100)
            : 0,
      };
    })
    .sort((a, b) => b.participationPct - a.participationPct);

  // Sharpest predictors — raw count of predictions that earned points. Unlike
  // accuracy (a ratio), this rewards volume of correct calls.
  const sharpestPredictors: RankedDatum[] = users
    .map((u) => {
      const correct = [
        ...u.groupPredictions.map((p) => p.pointsAwarded),
        ...u.knockoutPredictions.map((p) => p.pointsAwarded),
      ].filter((p) => p != null && p > 0).length;
      return { label: displayName(u.name), value: correct };
    })
    .filter((d) => d.value > 0)
    .sort((a, b) => b.value - a.value);

  // Most popular predicted group scorelines across the whole pool.
  const scorelineCounts = new Map<string, number>();
  let scorelinePredictionTotal = 0;
  let goalsPredictedTotal = 0;
  let goalsPredictedCount = 0;
  for (const u of users) {
    for (const p of u.groupPredictions) {
      if (p.knownIncorrect || p.homeScore == null || p.awayScore == null)
        continue;
      const key = `${p.homeScore}-${p.awayScore}`;
      scorelineCounts.set(key, (scorelineCounts.get(key) ?? 0) + 1);
      scorelinePredictionTotal++;
      goalsPredictedTotal += p.homeScore + p.awayScore;
      goalsPredictedCount++;
    }
  }
  const popularScorelines: RankedDatum[] = Array.from(scorelineCounts.entries())
    .map(([label, value]) => ({
      label,
      value,
      caption:
        scorelinePredictionTotal > 0
          ? `${Math.round((value / scorelinePredictionTotal) * 100)}%`
          : undefined,
    }))
    .sort((a, b) => b.value - a.value)
    .slice(0, 8);

  // Crowd's favorite pick for each award category.
  const picksByCategory = new Map<
    string,
    Map<string, { playerName: string; country: string; count: number }>
  >();
  for (const pick of awardPicks) {
    const perCat = picksByCategory.get(pick.category) ?? new Map();
    const entry = perCat.get(pick.playerId) ?? {
      playerName: pick.player.name,
      country: pick.player.country,
      count: 0,
    };
    entry.count++;
    perCat.set(pick.playerId, entry);
    picksByCategory.set(pick.category, perCat);
  }
  const awardFavorites: AwardFavorite[] = [];
  for (const [category, label] of Object.entries(AWARD_LABELS)) {
    const perCat = picksByCategory.get(category);
    if (!perCat || perCat.size === 0) continue;
    const top = Array.from(perCat.values()).sort((a, b) => b.count - a.count)[0];
    awardFavorites.push({
      category,
      label,
      playerName: top.playerName,
      country: top.country,
      pickCount: top.count,
    });
  }

  // Boldest predictor — most total goals predicted across their group picks.
  let boldestPredictor: ReportsData["boldestPredictor"] = null;
  let maxGoals = -1;
  for (const u of users) {
    const goals = sum(
      u.groupPredictions.flatMap((p) => [p.homeScore, p.awayScore]),
    );
    if (u.groupPredictions.length > 0 && goals > maxGoals) {
      maxGoals = goals;
      boldestPredictor = {
        name: displayName(u.name),
        totalGoalsPredicted: goals,
      };
    }
  }

  // Pool-vs-reality: average goals per game the pool predicted, vs the average
  // in matches that have actually finished.
  const goalsPredictedAvg =
    goalsPredictedCount > 0
      ? round1(goalsPredictedTotal / goalsPredictedCount)
      : null;
  const goalsActualAvg =
    finishedGroupMatches.length > 0
      ? round1(
          finishedGroupMatches.reduce(
            (acc, m) => acc + (m.homeScore ?? 0) + (m.awayScore ?? 0),
            0,
          ) / finishedGroupMatches.length,
        )
      : null;

  // Crowd favorite to win it all — most-picked team in the FINAL bracket slot.
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
    sharpestPredictors,
    popularScorelines,
    awardFavorites,
    boldestPredictor,
    mostPopularChampionPick,
    goalsPredictedAvg,
    goalsActualAvg,
    totalFinishedMatches,
  };
}
