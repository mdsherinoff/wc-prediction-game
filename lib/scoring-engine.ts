import { prisma } from "@/lib/prisma";
import { MatchStatus, Stage } from "@prisma/client";
import {
  scoreGroupPrediction,
  scoreKnockoutPrediction,
  scoreBracketPick,
  scoreAwardPick,
} from "@/lib/scoring";
import {
  getPointsConfig,
  knockoutWinnerPoints,
  knockoutExactBonusPoints,
} from "@/lib/points-config";

/** Appends an id to the list keyed by the points it earned. */
function bucketByPoints(
  buckets: Map<number, string[]>,
  points: number,
  id: string,
) {
  const existing = buckets.get(points);
  if (existing) existing.push(id);
  else buckets.set(points, [id]);
}

/**
 * Scans all FINISHED matches and awards points to any predictions/picks
 * that haven't been scored yet (scoredAt is null). Safe to run repeatedly —
 * already-scored rows are skipped.
 */
export async function scoreFinishedMatches() {
  const config = await getPointsConfig();

  const finishedMatches = await prisma.match.findMany({
    where: {
      status: MatchStatus.FINISHED,
      homeScore: { not: null },
      awayScore: { not: null },
    },
  });

  let groupScored = 0;
  let knockoutScored = 0;
  let bracketScored = 0;

  const now = new Date();

  for (const match of finishedMatches) {
    if (match.homeScore == null || match.awayScore == null) continue;

    if (match.stage === Stage.GROUP) {
      const predictions = await prisma.groupPrediction.findMany({
        where: { matchId: match.id, scoredAt: null },
      });
      // Group ids by the point value they earn, then write each group in a
      // single updateMany instead of one round-trip per prediction.
      const idsByPoints = new Map<number, string[]>();
      for (const p of predictions) {
        const points = scoreGroupPrediction(
          p.homeScore,
          p.awayScore,
          match.homeScore,
          match.awayScore,
          p.knownIncorrect,
          config.GROUP_EXACT,
        );
        bucketByPoints(idsByPoints, points, p.id);
      }
      for (const [points, ids] of idsByPoints) {
        await prisma.groupPrediction.updateMany({
          where: { id: { in: ids } },
          data: { pointsAwarded: points, scoredAt: now },
        });
        groupScored += ids.length;
      }
    } else {
      // Knockout match — needs a determined winner to score.
      if (!match.winnerTeamId) continue;

      const predictions = await prisma.knockoutPrediction.findMany({
        where: { matchId: match.id, scoredAt: null },
      });
      const idsByPoints = new Map<number, string[]>();
      for (const p of predictions) {
        const points = scoreKnockoutPrediction({
          predictedWinnerTeamId: p.predictedWinner,
          predHome: p.homeScore,
          predAway: p.awayScore,
          actualWinnerTeamId: match.winnerTeamId,
          actualHome: match.homeScore,
          actualAway: match.awayScore,
          knownIncorrect: p.knownIncorrect,
          pointsForWinner: knockoutWinnerPoints(config, match.stage),
          pointsForExactBonus: knockoutExactBonusPoints(config, match.stage),
        });
        bucketByPoints(idsByPoints, points, p.id);
      }
      for (const [points, ids] of idsByPoints) {
        await prisma.knockoutPrediction.updateMany({
          where: { id: { in: ids } },
          data: { pointsAwarded: points, scoredAt: now },
        });
        knockoutScored += ids.length;
      }

      // Bracket picks reference this match via slotKey, if set.
      if (match.slotKey) {
        const picks = await prisma.bracketPick.findMany({
          where: { slotKey: match.slotKey, scoredAt: null },
        });
        const bracketIdsByPoints = new Map<number, string[]>();
        for (const pick of picks) {
          const points = scoreBracketPick(
            pick.teamId,
            match.winnerTeamId,
            config.BRACKET_ADVANCER,
          );
          bucketByPoints(bracketIdsByPoints, points, pick.id);
        }
        for (const [points, ids] of bracketIdsByPoints) {
          await prisma.bracketPick.updateMany({
            where: { id: { in: ids } },
            data: { pointsAwarded: points, scoredAt: now },
          });
          bracketScored += ids.length;
        }
      }
    }
  }

  return { groupScored, knockoutScored, bracketScored };
}

/**
 * Clears the recorded score for a single match so its predictions and bracket
 * picks get re-graded on the next scoreFinishedMatches() run. Call this when a
 * match's result is corrected after it was already scored (e.g. an admin fixes
 * a wrong score, or a synced result changes) — otherwise the stale points stay
 * because scoreFinishedMatches only touches rows where scoredAt is null.
 */
export async function resetMatchScoring(matchId: string, slotKey: string | null) {
  await prisma.groupPrediction.updateMany({
    where: { matchId },
    data: { pointsAwarded: null, scoredAt: null },
  });
  await prisma.knockoutPrediction.updateMany({
    where: { matchId },
    data: { pointsAwarded: null, scoredAt: null },
  });
  if (slotKey) {
    await prisma.bracketPick.updateMany({
      where: { slotKey },
      data: { pointsAwarded: null, scoredAt: null },
    });
  }
}

/**
 * Flips the "bracket_unlocked" setting to true once every group match
 * is FINISHED. Call this after a results sync.
 */
export async function maybeUnlockBracket() {
  const unfinishedGroupMatches = await prisma.match.count({
    where: { stage: Stage.GROUP, status: { not: MatchStatus.FINISHED } },
  });

  if (unfinishedGroupMatches === 0) {
    await prisma.setting.upsert({
      where: { key: "bracket_unlocked" },
      update: { value: "true" },
      create: { key: "bracket_unlocked", value: "true" },
    });
    return true;
  }
  return false;
}

export async function scoreAwardPicks() {
  const config = await getPointsConfig();
  const winners = await prisma.awardWinner.findMany();
  let scored = 0;

  const now = new Date();

  for (const winner of winners) {
    const picks = await prisma.awardPick.findMany({
      where: { category: winner.category, scoredAt: null },
    });
    const idsByPoints = new Map<number, string[]>();
    for (const pick of picks) {
      const points = scoreAwardPick(
        pick.playerId,
        winner.playerId,
        config.AWARD_PICK,
      );
      bucketByPoints(idsByPoints, points, pick.id);
    }
    for (const [points, ids] of idsByPoints) {
      await prisma.awardPick.updateMany({
        where: { id: { in: ids } },
        data: { pointsAwarded: points, scoredAt: now },
      });
      scored += ids.length;
    }
  }

  return { scored };
}