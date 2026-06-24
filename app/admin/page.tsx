import { requireAdmin } from "@/lib/admin";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import AdminSyncButton from "@/components/AdminSyncButton";
import AdminMatchRow from "@/components/AdminMatchRow";

export default async function AdminPage() {
  const session = await requireAdmin();
  if (!session) {
    redirect("/login");
  }

  const matches = await prisma.match.findMany({
    include: { homeTeam: true, awayTeam: true },
    orderBy: { kickoff: "asc" },
    take: 30,
  });

  const setting = await prisma.setting.findUnique({
    where: { key: "bracket_unlocked" },
  });

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <h1 className="font-display text-3xl font-700 text-pitch mb-1">
        Admin
      </h1>
      <p className="text-sm text-ink/60 mb-6">
        Bracket predictor status:{" "}
        <span className="font-semibold">
          {setting?.value === "true" ? "Unlocked" : "Locked (groups not finished)"}
        </span>
      </p>

      <div className="mb-8">
        <AdminSyncButton />
        <p className="text-xs text-ink/40 mt-2">
          Pulls latest results from football-data.org, scores any newly
          finished matches, and unlocks the bracket if the group stage is
          done.
        </p>
      </div>

      <h2 className="font-display text-xl font-700 text-turf mb-3">
        Manual result entry (fallback)
      </h2>
      <p className="text-xs text-ink/50 mb-4">
        Use this if the automatic sync is delayed or wrong for a specific
        match. Showing next 30 matches by kickoff.
      </p>

      <div className="space-y-2">
        {matches.map((m) => (
          <AdminMatchRow
            key={m.id}
            match={{
              id: m.id,
              stage: m.stage,
              kickoff: m.kickoff.toISOString(),
              status: m.status,
              homeScore: m.homeScore,
              awayScore: m.awayScore,
              homeTeam: m.homeTeam ? { id: m.homeTeam.id, name: m.homeTeam.name } : null,
              awayTeam: m.awayTeam ? { id: m.awayTeam.id, name: m.awayTeam.name } : null,
            }}
          />
        ))}
      </div>
    </div>
  );
}
