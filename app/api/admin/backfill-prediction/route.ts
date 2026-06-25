import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin";
import { prisma } from "@/lib/prisma";
import { scoreFinishedMatches } from "@/lib/scoring-engine";

/**
 * POST /api/admin/backfill-prediction
 * Admin tool to enter a prediction on behalf of a user for a match that
 * already happened before this site existed (or was otherwise missed).
 * Bypasses the normal lock-window checks since this is historical backfill,
 * not a live prediction. Re-runs scoring immediately after saving so points
 * are awarded right away if the match is already finished.
 */
export async function POST(req: NextRequest) {
  const adminSession = await requireAdmin();
  if (!adminSession) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await req.json();
  const { userId, matchId, homeScore, awayScore, predictedWinner } = body as {
    userId: string;
    matchId: string;
    homeScore?: number | null;
    awayScore?: number | null;
    predictedWinner?: string | null;
  };

  if (!userId || !matchId) {
    return NextResponse.json(
      { error: "userId and matchId required" },
      { status: 400 },
    );
  }

  const match = await prisma.match.findUnique({ where: { id: matchId } });
  if (!match) {
    return NextResponse.json({ error: "Match not found" }, { status: 404 });
  }

  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  if (match.stage === "GROUP") {
    if (
      typeof homeScore !== "number" ||
      typeof awayScore !== "number" ||
      !Number.isInteger(homeScore) ||
      !Number.isInteger(awayScore) ||
      homeScore < 0 ||
      awayScore < 0
    ) {
      return NextResponse.json(
        { error: "Group matches need a valid homeScore and awayScore" },
        { status: 400 },
      );
    }

    const prediction = await prisma.groupPrediction.upsert({
      where: { userId_matchId: { userId, matchId } },
      update: { homeScore, awayScore, pointsAwarded: null, scoredAt: null },
      create: { userId, matchId, homeScore, awayScore },
    });

    // Re-score immediately in case the match is already finished
    await scoreFinishedMatches();

    return NextResponse.json({ prediction });
  } else {
    if (
      !predictedWinner ||
      ![match.homeTeamId, match.awayTeamId].includes(predictedWinner)
    ) {
      return NextResponse.json(
        { error: "predictedWinner must be one of the two teams in this match" },
        { status: 400 },
      );
    }

    const hasScoreGuess =
      typeof homeScore === "number" &&
      typeof awayScore === "number" &&
      Number.isInteger(homeScore) &&
      Number.isInteger(awayScore) &&
      homeScore >= 0 &&
      awayScore >= 0;

    const prediction = await prisma.knockoutPrediction.upsert({
      where: { userId_matchId: { userId, matchId } },
      update: {
        predictedWinner,
        homeScore: hasScoreGuess ? homeScore : null,
        awayScore: hasScoreGuess ? awayScore : null,
        pointsAwarded: null,
        scoredAt: null,
      },
      create: {
        userId,
        matchId,
        predictedWinner,
        homeScore: hasScoreGuess ? homeScore : null,
        awayScore: hasScoreGuess ? awayScore : null,
      },
    });

    await scoreFinishedMatches();

    return NextResponse.json({ prediction });
  }
}

/**
 * DELETE /api/admin/backfill-prediction
 * Remove a backfilled (or any) prediction entirely — leaves it as null/unpredicted.
 */
export async function DELETE(req: NextRequest) {
  const adminSession = await requireAdmin();
  if (!adminSession) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await req.json();
  const { userId, matchId, stage } = body as {
    userId: string;
    matchId: string;
    stage: "GROUP" | "KNOCKOUT";
  };

  if (!userId || !matchId || !stage) {
    return NextResponse.json(
      { error: "userId, matchId, and stage required" },
      { status: 400 },
    );
  }

  if (stage === "GROUP") {
    await prisma.groupPrediction.deleteMany({ where: { userId, matchId } });
  } else {
    await prisma.knockoutPrediction.deleteMany({ where: { userId, matchId } });
  }

  return NextResponse.json({ ok: true });
}
