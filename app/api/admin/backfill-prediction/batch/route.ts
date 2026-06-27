import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin";
import { prisma } from "@/lib/prisma";
import { scoreFinishedMatches } from "@/lib/scoring-engine";

type BatchEntry = {
  userId: string;
  homeScore?: number | null;
  awayScore?: number | null;
  predictedWinner?: string | null;
  knownIncorrect?: boolean;
  markedCorrect?: boolean | "winnerOnly" | "exact";
};

/**
 * POST /api/admin/backfill-prediction/batch
 * Same logic as the single-entry backfill route, but accepts an array of
 * { userId, homeScore, awayScore, predictedWinner, knownIncorrect } entries
 * for ONE match, so an admin can enter several people's predictions for the
 * same game in one save. Re-scores once at the end, not once per entry.
 */
export async function POST(req: NextRequest) {
  const adminSession = await requireAdmin();
  if (!adminSession) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await req.json();
  const { matchId, entries } = body as {
    matchId: string;
    entries: BatchEntry[];
  };

  if (!matchId || !Array.isArray(entries) || entries.length === 0) {
    return NextResponse.json(
      { error: "matchId and a non-empty entries array are required" },
      { status: 400 },
    );
  }

  const match = await prisma.match.findUnique({ where: { id: matchId } });
  if (!match) {
    return NextResponse.json({ error: "Match not found" }, { status: 404 });
  }

  const results: { userId: string; ok: boolean; error?: string }[] = [];

  for (const entry of entries) {
    const { userId, homeScore, awayScore, predictedWinner } = entry;
    const markedWrong = !!entry.knownIncorrect;

    if (!userId) {
      results.push({ userId: "unknown", ok: false, error: "Missing userId" });
      continue;
    }

    try {
      if (match.stage === "GROUP") {
        const markedCorrect = !!entry.markedCorrect;

        // "Marked correct" pulls the real match score automatically —
        // no need to retype it when the admin already knows it was right.
        const effectiveHome = markedCorrect ? match.homeScore : homeScore;
        const effectiveAway = markedCorrect ? match.awayScore : awayScore;

        const hasRealScore =
          typeof effectiveHome === "number" &&
          typeof effectiveAway === "number" &&
          Number.isInteger(effectiveHome) &&
          Number.isInteger(effectiveAway) &&
          effectiveHome >= 0 &&
          effectiveAway >= 0;

        if (
          markedCorrect &&
          (match.homeScore == null || match.awayScore == null)
        ) {
          results.push({
            userId,
            ok: false,
            error:
              "Can't mark as correct — this match has no recorded score yet",
          });
          continue;
        }

        if (!markedWrong && !hasRealScore) {
          results.push({
            userId,
            ok: false,
            error:
              "Provide a valid scoreline, mark as correct, or mark as known-wrong",
          });
          continue;
        }

        await prisma.groupPrediction.upsert({
          where: { userId_matchId: { userId, matchId } },
          update: {
            homeScore: hasRealScore ? effectiveHome : null,
            awayScore: hasRealScore ? effectiveAway : null,
            knownIncorrect: markedWrong,
            pointsAwarded: null,
            scoredAt: null,
          },
          create: {
            userId,
            matchId,
            homeScore: hasRealScore ? effectiveHome : null,
            awayScore: hasRealScore ? effectiveAway : null,
            knownIncorrect: markedWrong,
          },
        });
      } else {
        // "winnerOnly" = got the winner right but not the exact score.
        // "exact" = got the winner AND the exact score right.
        const markedCorrect = entry.markedCorrect; // "winnerOnly" | "exact" | undefined

        let effectiveWinner = predictedWinner;
        let effectiveHome = homeScore;
        let effectiveAway = awayScore;

        if (markedCorrect === "winnerOnly" || markedCorrect === "exact") {
          if (!match.winnerTeamId) {
            results.push({
              userId,
              ok: false,
              error:
                "Can't mark as correct — this match has no recorded winner yet",
            });
            continue;
          }
          effectiveWinner = match.winnerTeamId;
          if (markedCorrect === "exact") {
            if (match.homeScore == null || match.awayScore == null) {
              results.push({
                userId,
                ok: false,
                error:
                  "Can't mark exact score — this match has no recorded score yet",
              });
              continue;
            }
            effectiveHome = match.homeScore;
            effectiveAway = match.awayScore;
          }
        }

        if (
          !markedWrong &&
          (!effectiveWinner ||
            ![match.homeTeamId, match.awayTeamId].includes(effectiveWinner))
        ) {
          results.push({
            userId,
            ok: false,
            error:
              "predictedWinner must be one of the two teams, or mark as known-wrong",
          });
          continue;
        }

        const hasScoreGuess =
          typeof effectiveHome === "number" &&
          typeof effectiveAway === "number" &&
          Number.isInteger(effectiveHome) &&
          Number.isInteger(effectiveAway) &&
          effectiveHome >= 0 &&
          effectiveAway >= 0;

        await prisma.knockoutPrediction.upsert({
          where: { userId_matchId: { userId, matchId } },
          update: {
            predictedWinner: markedWrong ? null : effectiveWinner,
            homeScore: hasScoreGuess ? effectiveHome : null,
            awayScore: hasScoreGuess ? effectiveAway : null,
            knownIncorrect: markedWrong,
            pointsAwarded: null,
            scoredAt: null,
          },
          create: {
            userId,
            matchId,
            predictedWinner: markedWrong ? null : effectiveWinner,
            homeScore: hasScoreGuess ? effectiveHome : null,
            awayScore: hasScoreGuess ? effectiveAway : null,
            knownIncorrect: markedWrong,
          },
        });
      }

      results.push({ userId, ok: true });
    } catch (e) {
      results.push({
        userId,
        ok: false,
        error: e instanceof Error ? e.message : "Failed to save",
      });
    }
  }

  // Re-score once, after all entries are written — not once per entry.
  const scoreResult = await scoreFinishedMatches();

  return NextResponse.json({ results, scoreResult });
}
