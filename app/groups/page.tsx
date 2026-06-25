import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import GroupMatchCard from "@/components/GroupMatchCard";
import MatchTabs from "@/components/MatchTabs";

export const dynamic = "force-dynamic";

async function getMatches(userId: string) {
  return prisma.match.findMany({
    where: { stage: "GROUP" },
    include: {
      homeTeam: true,
      awayTeam: true,
      groupPredictions: {
        where: { userId },
      },
    },
    orderBy: [{ groupName: "asc" }, { kickoff: "asc" }],
  });
}

type MatchWithRelations = Awaited<ReturnType<typeof getMatches>>[number];

function groupByGroupName(matches: MatchWithRelations[]) {
  const groups = new Map<string, MatchWithRelations[]>();
  for (const m of matches) {
    const key = m.groupName ?? "Other";
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key)!.push(m);
  }
  return groups;
}

function GroupSections({ matches }: { matches: MatchWithRelations[] }) {
  const groups = groupByGroupName(matches);

  if (matches.length === 0) {
    return (
      <p className="text-center text-ink/40 py-12 text-sm">Nothing here yet.</p>
    );
  }

  return (
    <>
      {Array.from(groups.entries()).map(([groupName, groupMatches]) => (
        <section key={groupName} className="mb-10">
          <h2 className="font-display text-xl font-700 text-turf mb-3 flex items-center gap-2">
            <span className="bg-turf text-chalk w-7 h-7 rounded-full flex items-center justify-center text-sm">
              {groupName}
            </span>
            Group {groupName}
          </h2>
          <div className="space-y-3">
            {groupMatches.map((match) => (
              <GroupMatchCard
                key={match.id}
                match={{
                  id: match.id,
                  kickoff: match.kickoff.toISOString(),
                  status: match.status,
                  homeScore: match.homeScore,
                  awayScore: match.awayScore,
                  homeTeam: match.homeTeam
                    ? {
                        name: match.homeTeam.name,
                        flagUrl: match.homeTeam.flagUrl,
                      }
                    : null,
                  awayTeam: match.awayTeam
                    ? {
                        name: match.awayTeam.name,
                        flagUrl: match.awayTeam.flagUrl,
                      }
                    : null,
                }}
                existingPrediction={match.groupPredictions[0] ?? null}
              />
            ))}
          </div>
        </section>
      ))}
    </>
  );
}

export default async function GroupsPage() {
  const session = await auth();
  if (!session?.user?.id) {
    redirect("/login");
  }

  const matches = await getMatches(session.user.id);

  if (matches.length === 0) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-16 text-center text-ink/60">
        <p>
          No group matches have been loaded yet. Ask the admin to run the
          fixture seed script.
        </p>
      </div>
    );
  }

  const upcomingMatches = matches.filter((m) => m.status !== "FINISHED");
  const completedMatches = matches
    .filter((m) => m.status === "FINISHED")
    .sort((a, b) => b.kickoff.getTime() - a.kickoff.getTime());

  return (
    <div className="max-w-3xl mx-auto px-4 py-8">
      <h1 className="font-display text-3xl font-700 text-pitch mb-1">
        Group stage predictions
      </h1>
      <p className="text-sm text-ink/60 mb-6">
        Exact scoreline only — 1 point if you call it exactly right. Opens 16 hours before kickoff and Locks 1
        hour before kickoff.
      </p>

      <MatchTabs
        upcomingCount={upcomingMatches.length}
        completedCount={completedMatches.length}
        upcoming={<GroupSections matches={upcomingMatches} />}
        completed={<GroupSections matches={completedMatches} />}
      />
    </div>
  );
}
