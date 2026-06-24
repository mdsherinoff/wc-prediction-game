import { prisma } from "@/lib/prisma";
import { MatchStatus, Stage } from "@prisma/client";
import {
  scoreGroupPrediction,
  scoreKnockoutPrediction,
  scoreBracketPick,
} from "@/lib/scoring";

/**
 * Scans all FINISHED matches and awards points to any predictions/picks
 * that haven't been scored yet (scoredAt is null). Safe to run repeatedly —
 * already-scored rows are skipped.
 */
export async function scoreFinishedMatches() {
  const finishedMatches = await prisma.match.findMany({
    where: { status: MatchStatus.FINISHED, homeScore: { not: null }, awayScore: { not: null } },
  });

  let groupScored = 0;
  let knockoutScored = 0;
  let bracketScored = 0;

  for (const match of finishedMatches) {
    if (match.homeScore == null || match.awayScore == null) continue;

    if (match.stage === Stage.GROUP) {
      const predictions = await prisma.groupPrediction.findMany({
        where: { matchId: match.id, scoredAt: null },
      });
      for (const p of predictions) {
        const points = scoreGroupPrediction(
          p.homeScore,
          p.awayScore,
          match.homeScore,
          match.awayScore
        );
        await prisma.groupPrediction.update({
          where: { id: p.id },
          data: { pointsAwarded: points, scoredAt: new Date() },
        });
        groupScored++;
      }
    } else {
      // Knockout match — needs a determined winner to score.
      if (!match.winnerTeamId) continue;

      const predictions = await prisma.knockoutPrediction.findMany({
        where: { matchId: match.id, scoredAt: null },
      });
      for (const p of predictions) {
        const points = scoreKnockoutPrediction({
          predictedWinnerTeamId: p.predictedWinner,
          predHome: p.homeScore,
          predAway: p.awayScore,
          actualWinnerTeamId: match.winnerTeamId,
          actualHome: match.homeScore,
          actualAway: match.awayScore,
        });
        await prisma.knockoutPrediction.update({
          where: { id: p.id },
          data: { pointsAwarded: points, scoredAt: new Date() },
        });
        knockoutScored++;
      }

      // Bracket picks reference this match via slotKey, if set.
      if (match.slotKey) {
        const picks = await prisma.bracketPick.findMany({
          where: { slotKey: match.slotKey, scoredAt: null },
        });
        for (const pick of picks) {
          const points = scoreBracketPick(pick.teamId, match.winnerTeamId);
          await prisma.bracketPick.update({
            where: { id: pick.id },
            data: { pointsAwarded: points, scoredAt: new Date() },
          });
          bracketScored++;
        }
      }
    }
  }

  return { groupScored, knockoutScored, bracketScored };
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
