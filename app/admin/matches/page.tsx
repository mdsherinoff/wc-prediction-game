import { requireAdmin } from "@/lib/admin";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import Link from "next/link";
import { Stage } from "@prisma/client";
import AdminMatchRow from "@/components/AdminMatchRow";
import RoundTabs, { type RoundTab } from "@/components/RoundTabs";

export const dynamic = "force-dynamic";

// Rounds in tournament order, with short labels that fit the tab pills.
const STAGE_ORDER: { key: Stage; label: string }[] = [
  { key: "GROUP", label: "Groups" },
  { key: "R32", label: "Ro32" },
  { key: "R16", label: "Ro16" },
  { key: "QF", label: "QF" },
  { key: "SF", label: "SF" },
  { key: "THIRD_PLACE", label: "3rd Place" },
  { key: "FINAL", label: "Final" },
];

export default async function AdminMatchesPage() {
  const session = await requireAdmin();
  if (!session) {
    redirect("/login");
  }

  const matches = await prisma.match.findMany({
    include: { homeTeam: true, awayTeam: true },
    orderBy: { kickoff: "asc" },
  });

  const tabs: RoundTab[] = [];
  let defaultKey: string | undefined;

  for (const { key, label } of STAGE_ORDER) {
    const stageMatches = matches.filter((m) => m.stage === key);
    if (stageMatches.length === 0) continue;

    const finished = stageMatches.filter((m) => m.status === "FINISHED").length;

    // Land the admin on the earliest round that still has matches left to score.
    if (defaultKey === undefined && finished < stageMatches.length) {
      defaultKey = key;
    }

    tabs.push({
      key,
      label: `${label} ${finished}/${stageMatches.length}`,
      content: (
        <div className="space-y-2">
          {stageMatches.map((m) => (
            <AdminMatchRow
              key={m.id}
              match={{
                id: m.id,
                stage: m.stage,
                kickoff: m.kickoff.toISOString(),
                status: m.status,
                homeScore: m.homeScore,
                awayScore: m.awayScore,
                homeTeam: m.homeTeam
                  ? { id: m.homeTeam.id, name: m.homeTeam.name }
                  : null,
                awayTeam: m.awayTeam
                  ? { id: m.awayTeam.id, name: m.awayTeam.name }
                  : null,
              }}
            />
          ))}
        </div>
      ),
    });
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <div className="flex items-center justify-between mb-1">
        <h1 className="font-display text-3xl font-700 text-pitch">
          Manual result entry
        </h1>
        <Link href="/admin" className="text-sm text-turf underline">
          ← Back to admin
        </Link>
      </div>
      <p className="text-sm text-ink/50 mb-6">
        Set or correct any match&apos;s score and status when the automatic sync
        is delayed, wrong, or unavailable. For knockout matches level after
        90+ET, pick the penalty-shootout winner. Saving re-scores affected
        predictions immediately. Tabs are split by round.
      </p>

      {tabs.length === 0 ? (
        <p className="text-sm text-ink/40">
          No fixtures loaded yet. Run the seed to import matches.
        </p>
      ) : (
        <RoundTabs tabs={tabs} defaultKey={defaultKey} />
      )}
    </div>
  );
}
