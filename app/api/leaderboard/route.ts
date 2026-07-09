import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  // /api is outside the middleware matcher, so guard here — don't expose the
  // pool's standings to unauthenticated callers.
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Not signed in" }, { status: 401 });
  }

  const users = await prisma.user.findMany({
    select: {
      id: true,
      name: true,
      image: true,
      groupPredictions: { select: { pointsAwarded: true } },
      knockoutPredictions: { select: { pointsAwarded: true } },
      bracketPicks: { select: { pointsAwarded: true } },
      awardPicks: { select: { pointsAwarded: true } },
      manualAdjustment: { select: { points: true } },
    },
  });

  const sum = (vals: (number | null)[]) =>
    vals.reduce((acc: number, v) => acc + (v ?? 0), 0);

  const leaderboard = users
    .map((u) => {
      const groupPoints = sum(u.groupPredictions.map((p) => p.pointsAwarded));
      const knockoutPoints = sum(
        u.knockoutPredictions.map((p) => p.pointsAwarded),
      );
      const bracketPoints = sum(u.bracketPicks.map((p) => p.pointsAwarded));
      const awardPoints = sum(u.awardPicks.map((p) => p.pointsAwarded));
      const adjustmentPoints = u.manualAdjustment?.points ?? 0;
      return {
        userId: u.id,
        name: u.name,
        image: u.image,
        groupPoints,
        knockoutPoints,
        bracketPoints,
        awardPoints,
        adjustmentPoints,
        totalPoints:
          groupPoints +
          knockoutPoints +
          bracketPoints +
          awardPoints +
          adjustmentPoints,
      };
    })
    .sort((a, b) => b.totalPoints - a.totalPoints);

  return NextResponse.json({ leaderboard });
}
