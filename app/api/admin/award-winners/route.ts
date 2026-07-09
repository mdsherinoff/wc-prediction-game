import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin";
import { prisma } from "@/lib/prisma";
import {
  scoreAwardPicks,
  resetAwardCategoryScoring,
} from "@/lib/scoring-engine";
import { AwardCategory } from "@prisma/client";

const VALID_CATEGORIES: AwardCategory[] = [
  "GOLDEN_BALL",
  "GOLDEN_BOOT",
  "GOLDEN_GLOVE",
  "YOUNG_PLAYER",
];

/** GET /api/admin/award-winners — current announced winner per category. */
export async function GET() {
  const adminSession = await requireAdmin();
  if (!adminSession) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const winners = await prisma.awardWinner.findMany({
    include: { player: true },
  });
  return NextResponse.json({ winners });
}

/**
 * POST /api/admin/award-winners
 * Body: { category, playerId }  — set/replace the real winner of a category
 *       { category, playerId: null } — clear the winner
 *
 * After saving, every pick in that category is reset and re-scored so players
 * who chose the winning player get their points immediately (and anyone
 * previously credited under an old/removed winner loses them).
 */
export async function POST(req: NextRequest) {
  const adminSession = await requireAdmin();
  if (!adminSession) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await req.json();
  const { category, playerId } = body as {
    category: AwardCategory;
    playerId: string | null;
  };

  if (!category || !VALID_CATEGORIES.includes(category)) {
    return NextResponse.json({ error: "Invalid category" }, { status: 400 });
  }

  // Clear the winner for this category.
  if (playerId == null) {
    await prisma.awardWinner.deleteMany({ where: { category } });
    await resetAwardCategoryScoring(category);
    const awardScoreResult = await scoreAwardPicks();
    return NextResponse.json({ ok: true, winner: null, awardScoreResult });
  }

  const player = await prisma.player.findUnique({ where: { id: playerId } });
  if (!player) {
    return NextResponse.json({ error: "Player not found" }, { status: 404 });
  }

  // Enforce the same eligibility rules players' picks are held to, so an
  // ineligible winner can't be recorded by mistake.
  if (category === "GOLDEN_GLOVE" && player.position !== "GK") {
    return NextResponse.json(
      { error: "Golden Glove winner must be a goalkeeper" },
      { status: 400 },
    );
  }
  if (
    category === "YOUNG_PLAYER" &&
    (player.birthYear == null || player.birthYear < 2005)
  ) {
    return NextResponse.json(
      { error: "Best Young Player winner must be born on or after Jan 1, 2005" },
      { status: 400 },
    );
  }

  await prisma.awardWinner.upsert({
    where: { category },
    update: { playerId, decidedAt: new Date() },
    create: { category, playerId },
  });

  // Reset then re-score so the change grades everyone fresh, including people
  // who were credited under a previously-set winner.
  await resetAwardCategoryScoring(category);
  const awardScoreResult = await scoreAwardPicks();

  const winner = await prisma.awardWinner.findUnique({
    where: { category },
    include: { player: true },
  });

  return NextResponse.json({ ok: true, winner, awardScoreResult });
}
