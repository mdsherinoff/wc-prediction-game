import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin";
import { prisma } from "@/lib/prisma";
import { scoreFinishedMatches, scoreAwardPicks } from "@/lib/scoring-engine";

export async function GET() {
  const adminSession = await requireAdmin();
  if (!adminSession) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const config = await prisma.pointsConfig.findMany({
    orderBy: [{ group: "asc" }, { key: "asc" }],
  });
  return NextResponse.json({ config });
}

/**
 * PUT /api/admin/points-config
 * Body: { key: string, value: number }
 * Updates one point value AND retroactively re-scores every already-scored
 * prediction/pick that this value affects, so the leaderboard reflects the
 * new rule for everyone immediately — not just future predictions.
 */
export async function PUT(req: NextRequest) {
  const adminSession = await requireAdmin();
  if (!adminSession) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await req.json();
  const { key, value } = body as { key: string; value: number };

  if (!key || typeof value !== "number" || !Number.isInteger(value)) {
    return NextResponse.json(
      { error: "Invalid config update" },
      { status: 400 },
    );
  }

  await prisma.pointsConfig.update({ where: { key }, data: { value } });

  // Reset scoredAt on every prediction type this key could affect, so the
  // scoring engine re-evaluates them fresh with the new point value.
  // Knockout keys are per-round now (e.g. "KNOCKOUT_WINNER_FINAL"), so only
  // reset predictions belonging to matches in that specific round —
  // changing the Final's value shouldn't re-score R32 predictions too.
  const knockoutWinnerMatch = key.match(/^KNOCKOUT_WINNER_(.+)$/);
  const knockoutBonusMatch = key.match(/^KNOCKOUT_EXACT_BONUS_(.+)$/);
  const affectedStage = knockoutWinnerMatch?.[1] ?? knockoutBonusMatch?.[1];

  if (key === "GROUP_EXACT") {
    await prisma.groupPrediction.updateMany({
      where: { scoredAt: { not: null } },
      data: { pointsAwarded: null, scoredAt: null },
    });
  } else if (affectedStage) {
    await prisma.knockoutPrediction.updateMany({
      where: {
        scoredAt: { not: null },
        match: { stage: affectedStage as any },
      },
      data: { pointsAwarded: null, scoredAt: null },
    });
  } else if (key === "BRACKET_ADVANCER") {
    await prisma.bracketPick.updateMany({
      where: { scoredAt: { not: null } },
      data: { pointsAwarded: null, scoredAt: null },
    });
  } else if (key === "AWARD_PICK") {
    await prisma.awardPick.updateMany({
      where: { scoredAt: { not: null } },
      data: { pointsAwarded: null, scoredAt: null },
    });
  }

  // Re-run scoring immediately so the new values take effect right away.
  const matchScoreResult = await scoreFinishedMatches();
  const awardScoreResult = await scoreAwardPicks();

  return NextResponse.json({ ok: true, matchScoreResult, awardScoreResult });
}
