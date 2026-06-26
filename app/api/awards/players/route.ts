import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Not signed in" }, { status: 401 });
  }

  const category = req.nextUrl.searchParams.get("category");

  const where =
    category === "GOLDEN_GLOVE"
      ? { position: "GK" }
      : category === "YOUNG_PLAYER"
        ? { birthYear: { gte: 2005 } }
        : undefined;

  const players = await prisma.player.findMany({
    where,
    orderBy: [{ country: "asc" }, { name: "asc" }],
    select: {
      id: true,
      name: true,
      country: true,
      position: true,
      club: true,
      ageLabel: true,
    },
  });

  return NextResponse.json({ players });
}
