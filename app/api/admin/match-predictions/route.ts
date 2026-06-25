import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin";
import { prisma } from "@/lib/prisma";

/**
 * GET /api/admin/match-predictions?matchId=xxx
 * Returns every prediction for one match (group or knockout, whichever
 * applies), each with the predicting user's name/email and exact
 * createdAt / updatedAt timestamps, sorted by most recently updated first.
 */
export async function GET(req: NextRequest) {
  const adminSession = await requireAdmin();
  if (!adminSession) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const matchId = req.nextUrl.searchParams.get("matchId");
  if (!matchId) {
    return NextResponse.json({ error: "matchId required" }, { status: 400 });
  }

  const match = await prisma.match.findUnique({
    where: { id: matchId },
    include: { homeTeam: true, awayTeam: true },
  });
  if (!match) {
    return NextResponse.json({ error: "Match not found" }, { status: 404 });
  }

  if (match.stage === "GROUP") {
    const predictions = await prisma.groupPrediction.findMany({
      where: { matchId },
      include: { user: { select: { name: true, email: true } } },
      orderBy: { updatedAt: "desc" },
    });

    return NextResponse.json({
      stage: "GROUP",
      homeTeamName: match.homeTeam?.name ?? "TBD",
      awayTeamName: match.awayTeam?.name ?? "TBD",
      predictions: predictions.map((p) => ({
        userName: p.user.name ?? p.user.email ?? "Unknown",
        homeScore: p.homeScore,
        awayScore: p.awayScore,
        knownIncorrect: p.knownIncorrect,
        pointsAwarded: p.pointsAwarded,
        createdAt: p.createdAt,
        updatedAt: p.updatedAt,
      })),
    });
  } else {
    const predictions = await prisma.knockoutPrediction.findMany({
      where: { matchId },
      include: { user: { select: { name: true, email: true } } },
      orderBy: { updatedAt: "desc" },
    });

    return NextResponse.json({
      stage: match.stage,
      homeTeamName: match.homeTeam?.name ?? "TBD",
      awayTeamName: match.awayTeam?.name ?? "TBD",
      homeTeamId: match.homeTeamId,
      awayTeamId: match.awayTeamId,
      predictions: predictions.map((p) => ({
        userName: p.user.name ?? p.user.email ?? "Unknown",
        predictedWinner: p.predictedWinner,
        homeScore: p.homeScore,
        awayScore: p.awayScore,
        knownIncorrect: p.knownIncorrect,
        pointsAwarded: p.pointsAwarded,
        createdAt: p.createdAt,
        updatedAt: p.updatedAt,
      })),
    });
  }
}
