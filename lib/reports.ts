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
  inSyncPair: { nameA: string; nameB: string; count: number } | null;
  drawSpecialist: { name: string; draws: number; pct: number } | null;
  earliestBird: { name: string; avgLeadHours: number } | null;
  goalMachine: { name: string; avgGoals: number } | null;
  mostCautious: { name: string; avgGoals: number } | null;
  goalsPredictedAvg: number | null;
  goalsActualAvg: number | null;
  totalFinishedMatches: number;
};

// Minimum predictions before a per-person "average"-style award is meaningful.
const MIN_PREDICTIONS_TO_QUALIFY = 3;

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
          matchId: true,
          createdAt: true,
          match: { select: { kickoff: true } },
        },
      },
      knockoutPredictions: {
        select: {
          pointsAwarded: true,
          createdAt: true,
          match: { select: { kickoff: true } },
        },
      },
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
      // Which team is "home" is arbitrary across the whole pool, so treat a
      // scoreline and its mirror as one bucket (2-1 == 1-2, 3-0 == 0-3) by
      // always listing the higher score first.
      const hi = Math.max(p.homeScore, p.awayScore);
      const lo = Math.min(p.homeScore, p.awayScore);
      const key = `${hi}-${lo}`;
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

  // Per-person goal averages (group predictions only, min N to qualify) — the
  // Goal Machine (highest) and Most Cautious (lowest).
  let goalMachine: ReportsData["goalMachine"] = null;
  let mostCautious: ReportsData["mostCautious"] = null;
  // Draw Specialist — who predicts the most drawn scorelines.
  let drawSpecialist: ReportsData["drawSpecialist"] = null;
  // Early Bird — who submits earliest before kickoff on average.
  let earliestBird: ReportsData["earliestBird"] = null;

  for (const u of users) {
    const name = displayName(u.name);
    const valid = u.groupPredictions.filter(
      (p) => !p.knownIncorrect && p.homeScore != null && p.awayScore != null,
    );

    if (valid.length >= MIN_PREDICTIONS_TO_QUALIFY) {
      const avgGoals = round1(
        valid.reduce((acc, p) => acc + p.homeScore! + p.awayScore!, 0) /
          valid.length,
      );
      if (!goalMachine || avgGoals > goalMachine.avgGoals) {
        goalMachine = { name, avgGoals };
      }
      if (!mostCautious || avgGoals < mostCautious.avgGoals) {
        mostCautious = { name, avgGoals };
      }

      const draws = valid.filter((p) => p.homeScore === p.awayScore).length;
      if (draws > 0 && (!drawSpecialist || draws > drawSpecialist.draws)) {
        drawSpecialist = {
          name,
          draws,
          pct: Math.round((draws / valid.length) * 100),
        };
      }
    }

    // Average lead time between first submitting a prediction and kickoff,
    // across group + knockout picks. Only count picks made before kickoff
    // (backfilled/late rows would otherwise skew it negative).
    const leads: number[] = [
      ...u.groupPredictions,
      ...u.knockoutPredictions,
    ]
      .map((p) => p.match.kickoff.getTime() - p.createdAt.getTime())
      .filter((ms) => ms > 0);
    if (leads.length >= MIN_PREDICTIONS_TO_QUALIFY) {
      const avgLeadHours = round1(
        leads.reduce((a, b) => a + b, 0) / leads.length / (1000 * 60 * 60),
      );
      if (!earliestBird || avgLeadHours > earliestBird.avgLeadHours) {
        earliestBird = { name, avgLeadHours };
      }
    }
  }

  // In Sync — the pair of players whose exact group-scoreline predictions match
  // on the most matches. Build each person's matchId -> "h-a" map, then compare
  // every pair (fine at friend-group scale).
  const predMaps = users.map((u) => {
    const m = new Map<string, string>();
    for (const p of u.groupPredictions) {
      if (p.knownIncorrect || p.homeScore == null || p.awayScore == null)
        continue;
      m.set(p.matchId, `${p.homeScore}-${p.awayScore}`);
    }
    return { name: displayName(u.name), preds: m };
  });
  let inSyncPair: ReportsData["inSyncPair"] = null;
  for (let i = 0; i < predMaps.length; i++) {
    for (let j = i + 1; j < predMaps.length; j++) {
      const a = predMaps[i];
      const b = predMaps[j];
      let count = 0;
      // Iterate the smaller map for efficiency.
      const [small, large] =
        a.preds.size <= b.preds.size ? [a.preds, b.preds] : [b.preds, a.preds];
      for (const [matchId, score] of small) {
        if (large.get(matchId) === score) count++;
      }
      if (count > 0 && (!inSyncPair || count > inSyncPair.count)) {
        inSyncPair = { nameA: a.name, nameB: b.name, count };
      }
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

  return {
    leaderboardBars,
    accuracy,
    participation,
    sharpestPredictors,
    popularScorelines,
    awardFavorites,
    inSyncPair,
    drawSpecialist,
    earliestBird,
    goalMachine,
    mostCautious,
    goalsPredictedAvg,
    goalsActualAvg,
    totalFinishedMatches,
  };
}
