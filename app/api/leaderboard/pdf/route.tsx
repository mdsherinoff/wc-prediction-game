import { NextResponse } from "next/server";
import { prisma } from "../../../../lib/prisma";
import { renderToBuffer } from "@react-pdf/renderer";
import LeaderboardPdf, {
  type LeaderboardPdfRow,
} from "../../../../components/LeaderboardPdf";

const sum = (vals: (number | null)[]) =>
  vals.reduce((acc: number, v) => acc + (v ?? 0), 0);

export async function GET() {
  const users = await prisma.user.findMany({
    select: {
      name: true,
      email: true,
      groupPredictions: { select: { pointsAwarded: true } },
      knockoutPredictions: { select: { pointsAwarded: true } },
      bracketPicks: { select: { pointsAwarded: true } },
      awardPicks: { select: { pointsAwarded: true } },
      manualAdjustment: { select: { points: true } },
    },
  });

  const ranked = users
    .map((u) => {
      const groupPoints = sum(u.groupPredictions.map((p) => p.pointsAwarded));
      const knockoutPoints = sum(
        u.knockoutPredictions.map((p) => p.pointsAwarded),
      );
      const bracketPoints = sum(u.bracketPicks.map((p) => p.pointsAwarded));
      const awardPoints = sum(u.awardPicks.map((p) => p.pointsAwarded));
      const adjustmentPoints = u.manualAdjustment?.points ?? 0;
      return {
        name: u.name ?? u.email ?? "Unknown",
        groupPoints,
        knockoutPoints,
        bracketPoints,
        awardPoints,
        total:
          groupPoints +
          knockoutPoints +
          bracketPoints +
          awardPoints +
          adjustmentPoints,
      };
    })
    .sort((a, b) => b.total - a.total);

  const rows: LeaderboardPdfRow[] = ranked.map((r, i) => ({
    rank: i + 1,
    ...r,
  }));

  const pdfBuffer = await renderToBuffer(
    <LeaderboardPdf generatedAt={new Date().toISOString()} rows={rows} />,
  );
  const pdfBytes = new Uint8Array(pdfBuffer);

  return new NextResponse(pdfBytes, {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="wc26-leaderboard.pdf"`,
    },
  });
}
