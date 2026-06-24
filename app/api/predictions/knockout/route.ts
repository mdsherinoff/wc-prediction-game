import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { isLocked } from "@/lib/scoring";

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Not signed in" }, { status: 401 });
  }

  const body = await req.json();
  const { matchId, predictedWinner, homeScore, awayScore } = body as {
    matchId: string;
    predictedWinner: string;
    homeScore?: number | null;
    awayScore?: number | null;
  };

  if (!matchId || !predictedWinner) {
    return NextResponse.json({ error: "Invalid prediction" }, { status: 400 });
  }

  const match = await prisma.match.findUnique({ where: { id: matchId } });
  if (!match || match.stage === "GROUP") {
    return NextResponse.json({ error: "Match not found" }, { status: 404 });
  }

  if (![match.homeTeamId, match.awayTeamId].includes(predictedWinner)) {
    return NextResponse.json(
      { error: "predictedWinner must be one of the two teams in this match" },
      { status: 400 }
    );
  }

  if (isLocked(match.kickoff)) {
    return NextResponse.json(
      { error: "Predictions for this match are locked" },
      { status: 403 }
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
    where: { userId_matchId: { userId: session.user.id, matchId } },
    update: {
      predictedWinner,
      homeScore: hasScoreGuess ? homeScore : null,
      awayScore: hasScoreGuess ? awayScore : null,
    },
    create: {
      userId: session.user.id,
      matchId,
      predictedWinner,
      homeScore: hasScoreGuess ? homeScore : null,
      awayScore: hasScoreGuess ? awayScore : null,
    },
  });

  return NextResponse.json({ prediction });
}
