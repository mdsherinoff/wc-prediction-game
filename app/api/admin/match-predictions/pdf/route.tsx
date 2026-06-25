import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin";
import { prisma } from "@/lib/prisma";
import { renderToBuffer } from "@react-pdf/renderer";
import { stageLabel } from "@/lib/scoring";
import MatchPredictionsPdf, {
  type PredictionPdfRow,
} from "@/components/MatchPredictionsPdf";

export async function GET(req: NextRequest) {
  const adminSession = await requireAdmin();
  if (!adminSession) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const matchId = req.nextUrl.searchParams.get("matchId");
  if (!matchId) {
    return NextResponse.json({ error: "matchId required" }, { status: 400 });
  }

  const match = await prisma.match.findUnique({
    where: { id: matchId },
    include: { homeTeam: true, awayTeam: true },
  });
  if (!match) {
    return NextResponse.json({ error: "Match not found" }, { status: 404 });
  }

  const homeTeamName = match.homeTeam?.name ?? "TBD";
  const awayTeamName = match.awayTeam?.name ?? "TBD";

  let rows: PredictionPdfRow[];

  if (match.stage === "GROUP") {
    const predictions = await prisma.groupPrediction.findMany({
      where: { matchId },
      include: { user: { select: { name: true, email: true } } },
      orderBy: { updatedAt: "desc" },
    });

    rows = predictions.map((p) => ({
      userName: p.user.name ?? p.user.email ?? "Unknown",
      predictionText:
        p.homeScore != null && p.awayScore != null
          ? `${p.homeScore}-${p.awayScore}`
          : "—",
      knownIncorrect: p.knownIncorrect,
      pointsAwarded: p.pointsAwarded,
      createdAt: p.createdAt.toISOString(),
      updatedAt: p.updatedAt.toISOString(),
    }));
  } else {
    const predictions = await prisma.knockoutPrediction.findMany({
      where: { matchId },
      include: { user: { select: { name: true, email: true } } },
      orderBy: { updatedAt: "desc" },
    });

    rows = predictions.map((p) => {
      const pickedName =
        p.predictedWinner === match.homeTeamId
          ? homeTeamName
          : p.predictedWinner === match.awayTeamId
            ? awayTeamName
            : "—";
      const scoreSuffix =
        p.homeScore != null && p.awayScore != null
          ? ` (${p.homeScore}-${p.awayScore})`
          : "";
      return {
        userName: p.user.name ?? p.user.email ?? "Unknown",
        predictionText: `${pickedName}${scoreSuffix}`,
        knownIncorrect: p.knownIncorrect,
        pointsAwarded: p.pointsAwarded,
        createdAt: p.createdAt.toISOString(),
        updatedAt: p.updatedAt.toISOString(),
      };
    });
  }

  const pdfBuffer = await renderToBuffer(
    <MatchPredictionsPdf
      homeTeamName={homeTeamName}
      awayTeamName={awayTeamName}
      stageLabel={stageLabel(match.stage)}
      kickoff={match.kickoff.toISOString()}
      generatedAt={new Date().toISOString()}
      rows={rows}
    />,
  );

  const safeFilename = `${homeTeamName}-vs-${awayTeamName}-predictions`
    .toLowerCase()
    .replace(/[^a-z0-9-]+/g, "-");

  return new NextResponse(pdfBuffer, {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${safeFilename}.pdf"`,
    },
  });
}
