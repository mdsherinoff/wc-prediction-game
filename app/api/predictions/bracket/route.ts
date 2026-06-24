import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { roundLockTime } from "@/lib/scoring";
import { Stage } from "@prisma/client";

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Not signed in" }, { status: 401 });
  }

  const body = await req.json();
  const { stage, slotKey, teamId } = body as {
    stage: Stage;
    slotKey: string;
    teamId: string;
  };

  if (!stage || !slotKey || !teamId) {
    return NextResponse.json({ error: "Invalid pick" }, { status: 400 });
  }

  // The bracket page is only usable once the group stage has finished
  // this is enforced by checking a Setting flag set by the admin sync job.
  const bracketUnlocked = await prisma.setting.findUnique({
    where: { key: "bracket_unlocked" },
  });
  if (bracketUnlocked?.value !== "true") {
    return NextResponse.json(
      { error: "The bracket predictor isn't open yet — group stage must finish first" },
      { status: 403 }
    );
  }

  // Find the earliest kickoff among matches in this round to compute the round's lock time.
  const firstMatchInRound = await prisma.match.findFirst({
    where: { stage },
    orderBy: { kickoff: "asc" },
  });

  if (!firstMatchInRound) {
    return NextResponse.json({ error: "Round not found" }, { status: 404 });
  }

  const lock = roundLockTime(firstMatchInRound.kickoff);
  if (new Date() >= lock) {
    return NextResponse.json(
      { error: "Picks for this round are locked" },
      { status: 403 }
    );
  }

  const pick = await prisma.bracketPick.upsert({
    where: { userId_slotKey: { userId: session.user.id, slotKey } },
    update: { teamId, stage },
    create: {
      userId: session.user.id,
      stage,
      slotKey,
      teamId,
    },
  });

  return NextResponse.json({ pick });
}
