import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin";
import { prisma } from "@/lib/prisma";

export async function PUT(req: NextRequest) {
  const adminSession = await requireAdmin();
  if (!adminSession) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await req.json();
  const { userId, points, note } = body as {
    userId: string;
    points: number;
    note?: string | null;
  };

  if (!userId || typeof points !== "number" || !Number.isInteger(points)) {
    return NextResponse.json({ error: "Invalid adjustment" }, { status: 400 });
  }

  const adjustment = await prisma.manualAdjustment.upsert({
    where: { userId },
    update: { points, note: note ?? null },
    create: { userId, points, note: note ?? null },
  });

  return NextResponse.json({ adjustment });
}

export async function DELETE(req: NextRequest) {
  const adminSession = await requireAdmin();
  if (!adminSession) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await req.json();
  const { userId } = body as { userId: string };

  if (!userId) {
    return NextResponse.json({ error: "userId required" }, { status: 400 });
  }

  await prisma.manualAdjustment.deleteMany({ where: { userId } });

  return NextResponse.json({ ok: true });
}
