import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin";
import { prisma } from "@/lib/prisma";
import { renderToBuffer } from "@react-pdf/renderer";
import AwardPicksPdf, {
  AWARD_COLUMNS,
  type AwardCategoryKey,
  type AwardPicksPdfRow,
} from "@/components/AwardPicksPdf";

/**
 * GET /api/admin/award-picks/pdf
 * Renders a landscape PDF matrix of every player's award-category picks
 * (one row per user, one column per award), plus the actual announced
 * winners if they've been set.
 */
export async function GET() {
  const adminSession = await requireAdmin();
  if (!adminSession) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const [users, picks, winnerRows] = await Promise.all([
    prisma.user.findMany({
      select: { id: true, name: true, email: true },
      orderBy: { name: "asc" },
    }),
    prisma.awardPick.findMany({
      include: { player: { select: { name: true, country: true } } },
    }),
    prisma.awardWinner.findMany({
      include: { player: { select: { name: true, country: true } } },
    }),
  ]);

  const playerLabel = (name: string, country: string) => `${name} (${country})`;

  // userId -> category -> picked player label
  const byUser = new Map<string, Partial<Record<AwardCategoryKey, string>>>();
  for (const p of picks) {
    const forUser = byUser.get(p.userId) ?? {};
    forUser[p.category as AwardCategoryKey] = playerLabel(
      p.player.name,
      p.player.country,
    );
    byUser.set(p.userId, forUser);
  }

  const rows: AwardPicksPdfRow[] = users.map((u) => {
    const forUser = byUser.get(u.id) ?? {};
    const filled = {} as Record<AwardCategoryKey, string>;
    for (const c of AWARD_COLUMNS) {
      filled[c.key] = forUser[c.key] ?? "—";
    }
    return {
      userName: u.name ?? u.email ?? "Unknown",
      picks: filled,
    };
  });

  const winners: Partial<Record<AwardCategoryKey, string>> = {};
  for (const w of winnerRows) {
    winners[w.category as AwardCategoryKey] = playerLabel(
      w.player.name,
      w.player.country,
    );
  }

  const pdfBuffer = await renderToBuffer(
    <AwardPicksPdf
      generatedAt={new Date().toISOString()}
      rows={rows}
      winners={winners}
    />,
  );

  const pdfBytes = new Uint8Array(pdfBuffer);

  return new NextResponse(pdfBytes, {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="award-picks.pdf"`,
    },
  });
}
