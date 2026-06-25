import { requireAdmin } from "@/lib/admin";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import BackfillForm from "@/components/BackfillForm";

export const dynamic = "force-dynamic";

export default async function BackfillPage() {
  const session = await requireAdmin();
  if (!session) {
    redirect("/login");
  }

  const users = await prisma.user.findMany({
    select: { id: true, name: true, email: true },
    orderBy: { name: "asc" },
  });

  const matches = await prisma.match.findMany({
    include: { homeTeam: true, awayTeam: true },
    orderBy: { kickoff: "asc" },
  });

  return (
    <div className="max-w-3xl mx-auto px-4 py-8">
      <h1 className="font-display text-3xl font-700 text-pitch mb-1">
        Backfill predictions
      </h1>
      <p className="text-sm text-ink/60 mb-8">
        Enter what someone predicted for a match that happened before this site
        existed (or that they otherwise never got to submit). Leave a match
        alone if they genuinely didn&apos;t predict it — it&apos;ll correctly
        show as unpredicted rather than wrong.
      </p>

      <BackfillForm
        users={users.map((u) => ({
          id: u.id,
          label: u.name ?? u.email ?? u.id,
        }))}
        matches={matches.map((m) => ({
          id: m.id,
          stage: m.stage,
          label: `${m.homeTeam?.name ?? "TBD"} vs ${m.awayTeam?.name ?? "TBD"} — ${m.kickoff.toLocaleDateString()}`,
          homeTeamId: m.homeTeamId,
          awayTeamId: m.awayTeamId,
          homeTeamName: m.homeTeam?.name ?? "Home",
          awayTeamName: m.awayTeam?.name ?? "Away",
        }))}
      />
    </div>
  );
}
