import { requireAdmin } from "@/lib/admin";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import MatchPredictionsViewer from "@/components/MatchPredictionsViewer";

export const dynamic = "force-dynamic";

export default async function MatchPredictionsPage() {
  const session = await requireAdmin();
  if (!session) {
    redirect("/login");
  }

  const matches = await prisma.match.findMany({
    include: { homeTeam: true, awayTeam: true },
    orderBy: { kickoff: "asc" },
  });

  return (
    <div className="max-w-3xl mx-auto px-4 py-8">
      <h1 className="font-display text-3xl font-700 text-pitch mb-1">
        Match predictions
      </h1>
      <p className="text-sm text-ink/60 mb-8">
        See everyone&apos;s prediction for a specific match, plus exactly when
        they added or last updated it.
      </p>

      <MatchPredictionsViewer
        matches={matches.map((m) => ({
          id: m.id,
          stage: m.stage,
          label: `${m.homeTeam?.name ?? "TBD"} vs ${m.awayTeam?.name ?? "TBD"} — ${m.kickoff.toLocaleDateString()}`,
        }))}
      />
    </div>
  );
}
