import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { isAwardPicksLocked } from "@/lib/scoring";
import { AwardCategory } from "@prisma/client";

const VALID_CATEGORIES: AwardCategory[] = [
  "GOLDEN_BALL",
  "GOLDEN_BOOT",
  "GOLDEN_GLOVE",
  "YOUNG_PLAYER",
];

async function getLockStatus(): Promise<boolean> {
  const firstQf = await prisma.match.findFirst({
    where: { stage: "QF" },
    orderBy: { kickoff: "asc" },
  });
  // If QF fixtures aren't loaded yet, picks are open by default.
  if (!firstQf) return false;
  return isAwardPicksLocked(firstQf.kickoff);
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Not signed in" }, { status: 401 });
  }

  const body = await req.json();
  const { category, playerId } = body as {
    category: AwardCategory;
    playerId: string;
  };

  if (!category || !VALID_CATEGORIES.includes(category) || !playerId) {
    return NextResponse.json({ error: "Invalid award pick" }, { status: 400 });
  }

  if (await getLockStatus()) {
    return NextResponse.json(
      { error: "Award picks are locked — the Quarter-Finals have started" },
      { status: 403 },
    );
  }

  const player = await prisma.player.findUnique({ where: { id: playerId } });
  if (!player) {
    return NextResponse.json({ error: "Player not found" }, { status: 404 });
  }

  if (category === "GOLDEN_GLOVE" && player.position !== "GK") {
    return NextResponse.json(
      { error: "Golden Glove picks must be a goalkeeper" },
      { status: 400 },
    );
  }

  if (
    category === "YOUNG_PLAYER" &&
    (player.birthYear == null || player.birthYear < 2005)
  ) {
    return NextResponse.json(
      {
        error:
          "Best Young Player picks must be born on or after January 1, 2005",
      },
      { status: 400 },
    );
  }

  const pick = await prisma.awardPick.upsert({
    where: { userId_category: { userId: session.user.id, category } },
    update: { playerId },
    create: { userId: session.user.id, category, playerId },
  });

  return NextResponse.json({ pick });
}

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Not signed in" }, { status: 401 });
  }

  const picks = await prisma.awardPick.findMany({
    where: { userId: session.user.id },
    include: { player: true },
  });

  const locked = await getLockStatus();

  return NextResponse.json({ picks, locked });
}
