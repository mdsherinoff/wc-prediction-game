import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin";
import { prisma } from "@/lib/prisma";
import {
  scoreFinishedMatches,
  maybeUnlockBracket,
  resetMatchScoring,
} from "@/lib/scoring-engine";
import { MatchStatus } from "@prisma/client";

/**
 * PATCH /api/admin/matches
 * Manually set/correct a match result. Use this as a backup when the
 * football-data.org sync is unavailable, delayed, or wrong.
 */
export async function PATCH(req: NextRequest) {
  const adminSession = await requireAdmin();
  if (!adminSession) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await req.json();
  const {
    matchId,
    homeScore,
    awayScore,
    wentToPens,
    penHomeScore,
    penAwayScore,
    winnerTeamId,
    status,
  } = body as {
    matchId: string;
    homeScore: number | null;
    awayScore: number | null;
    wentToPens?: boolean;
    penHomeScore?: number | null;
    penAwayScore?: number | null;
    winnerTeamId?: string | null;
    status: MatchStatus;
  };

  if (!matchId) {
    return NextResponse.json({ error: "matchId required" }, { status: 400 });
  }

  const match = await prisma.match.findUnique({ where: { id: matchId } });
  if (!match) {
    return NextResponse.json({ error: "Match not found" }, { status: 404 });
  }

  // For knockout matches finishing in a draw, a winnerTeamId (decided by penalties) is required.
  let resolvedWinner = winnerTeamId ?? match.winnerTeamId;
  if (
    status === MatchStatus.FINISHED &&
    match.stage !== "GROUP" &&
    homeScore != null &&
    awayScore != null
  ) {
    if (homeScore !== awayScore) {
      resolvedWinner = homeScore > awayScore ? match.homeTeamId : match.awayTeamId;
    } else if (!resolvedWinner) {
      return NextResponse.json(
        { error: "Knockout match level on score — winnerTeamId (penalty winner) required" },
        { status: 400 }
      );
    }
  }

  await prisma.match.update({
    where: { id: matchId },
    data: {
      homeScore,
      awayScore,
      status,
      wentToPens: wentToPens ?? false,
      penHomeScore: penHomeScore ?? null,
      penAwayScore: penAwayScore ?? null,
      winnerTeamId: resolvedWinner,
    },
  });

  // If the graded result changed, clear any points already awarded for this
  // match so they get recomputed below. Without this, a correction to an
  // already-scored match would leave the old (wrong) points in place, since
  // scoreFinishedMatches only touches rows that were never scored.
  const gradedResultChanged =
    match.homeScore !== homeScore ||
    match.awayScore !== awayScore ||
    match.winnerTeamId !== resolvedWinner;
  if (gradedResultChanged) {
    await resetMatchScoring(matchId, match.slotKey);
  }

  const scoreResult = await scoreFinishedMatches();
  const bracketJustUnlocked = await maybeUnlockBracket();

  return NextResponse.json({ ok: true, scoreResult, bracketJustUnlocked });
}
