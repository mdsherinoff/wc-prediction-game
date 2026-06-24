import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const users = await prisma.user.findMany({
    select: {
      id: true,
      name: true,
      image: true,
      groupPredictions: { select: { pointsAwarded: true } },
      knockoutPredictions: { select: { pointsAwarded: true } },
      bracketPicks: { select: { pointsAwarded: true } },
    },
  });

  const sum = (vals: (number | null)[]) =>
    vals.reduce((acc, v) => acc + (v ?? 0), 0);

  const leaderboard = users
    .map((u) => {
      const groupPoints = sum(u.groupPredictions.map((p) => p.pointsAwarded));
      const knockoutPoints = sum(
        u.knockoutPredictions.map((p) => p.pointsAwarded)
      );
      const bracketPoints = sum(u.bracketPicks.map((p) => p.pointsAwarded));
      return {
        userId: u.id,
        name: u.name,
        image: u.image,
        groupPoints,
        knockoutPoints,
        bracketPoints,
        totalPoints: groupPoints + knockoutPoints + bracketPoints,
      };
    })
    .sort((a, b) => b.totalPoints - a.totalPoints);

  return NextResponse.json({ leaderboard });
}
