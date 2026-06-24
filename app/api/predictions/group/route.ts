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
  const { matchId, homeScore, awayScore } = body as {
    matchId: string;
    homeScore: number;
    awayScore: number;
  };

  if (
    !matchId ||
    typeof homeScore !== "number" ||
    typeof awayScore !== "number" ||
    homeScore < 0 ||
    awayScore < 0 ||
    !Number.isInteger(homeScore) ||
    !Number.isInteger(awayScore)
  ) {
    return NextResponse.json({ error: "Invalid prediction" }, { status: 400 });
  }

  const match = await prisma.match.findUnique({ where: { id: matchId } });
  if (!match || match.stage !== "GROUP") {
    return NextResponse.json({ error: "Match not found" }, { status: 404 });
  }

  if (isLocked(match.kickoff)) {
    return NextResponse.json(
      { error: "Predictions for this match are locked" },
      { status: 403 }
    );
  }

  const prediction = await prisma.groupPrediction.upsert({
    where: { userId_matchId: { userId: session.user.id, matchId } },
    update: { homeScore, awayScore },
    create: {
      userId: session.user.id,
      matchId,
      homeScore,
      awayScore,
    },
  });

  return NextResponse.json({ prediction });
}
