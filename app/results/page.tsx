import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import ResultRow from "@/components/ResultRow";
import { stageLabel } from "@/lib/scoring";
import { Stage } from "@prisma/client";

export const dynamic = "force-dynamic";

const KNOCKOUT_STAGE_ORDER: Stage[] = ["R32", "R16", "QF", "SF", "THIRD_PLACE", "FINAL"];

export default async function ResultsPage() {
  const session = await auth();
  if (!session?.user?.id) {
    redirect("/login");
  }
  const userId = session.user.id;

  const finishedMatches = await prisma.match.findMany({
    where: { status: "FINISHED" },
    include: {
      homeTeam: true,
      awayTeam: true,
      groupPredictions: { where: { userId } },
      knockoutPredictions: { where: { userId } },
    },
    orderBy: { kickoff: "asc" },
  });

  if (finishedMatches.length === 0) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-16 text-center text-ink/60">
        <p>No matches have finished yet — results will show up here as soon as they do.</p>
      </div>
    );
  }

  const groupMatches = finishedMatches.filter((m) => m.stage === "GROUP");
  const knockoutMatches = finishedMatches.filter((m) => m.stage !== "GROUP");

  const groupsByLetter = new Map<string, typeof groupMatches>();
  for (const m of groupMatches) {
    const key = m.groupName ?? "Other";
    if (!groupsByLetter.has(key)) groupsByLetter.set(key, []);
    groupsByLetter.get(key)!.push(m);
  }

  const knockoutsByStage = new Map<Stage, typeof knockoutMatches>();
  for (const m of knockoutMatches) {
    if (!knockoutsByStage.has(m.stage)) knockoutsByStage.set(m.stage, []);
    knockoutsByStage.get(m.stage)!.push(m);
  }

  return (
    <div className="max-w-3xl mx-auto px-4 py-8">
      <h1 className="font-display text-3xl font-700 text-pitch mb-1">
        Results
      </h1>
      <p className="text-sm text-ink/60 mb-8">
        Every completed match so far, with the points you earned on each one.
      </p>

      {groupMatches.length > 0 && (
        <>
          <h2 className="font-display text-2xl font-700 text-pitch mb-4">
            Group stage
          </h2>
          {Array.from(groupsByLetter.entries())
            .sort(([a], [b]) => a.localeCompare(b))
            .map(([groupName, matches]) => (
              <section key={groupName} className="mb-8">
                <h3 className="font-display text-lg font-700 text-turf mb-3 flex items-center gap-2">
                  <span className="bg-turf text-chalk w-6 h-6 rounded-full flex items-center justify-center text-xs">
                    {groupName}
                  </span>
                  Group {groupName}
                </h3>
                <div className="space-y-2">
                  {matches.map((m) => (
                    <ResultRow
                      key={m.id}
                      kickoff={m.kickoff.toISOString()}
                      homeTeam={m.homeTeam}
                      awayTeam={m.awayTeam}
                      homeScore={m.homeScore}
                      awayScore={m.awayScore}
                      userPoints={m.groupPredictions[0]?.pointsAwarded ?? null}
                    />
                  ))}
                </div>
              </section>
            ))}
        </>
      )}

      {knockoutMatches.length > 0 && (
        <>
          <h2 className="font-display text-2xl font-700 text-pitch mb-4 mt-4">
            Knockouts
          </h2>
          {KNOCKOUT_STAGE_ORDER.filter((s) => knockoutsByStage.has(s)).map(
            (stage) => (
              <section key={stage} className="mb-8">
                <h3 className="font-display text-lg font-700 text-turf mb-3">
                  {stageLabel(stage)}
                </h3>
                <div className="space-y-2">
                  {knockoutsByStage.get(stage)!.map((m) => (
                    <ResultRow
                      key={m.id}
                      kickoff={m.kickoff.toISOString()}
                      homeTeam={m.homeTeam}
                      awayTeam={m.awayTeam}
                      homeScore={m.homeScore}
                      awayScore={m.awayScore}
                      wentToPens={m.wentToPens}
                      penHomeScore={m.penHomeScore}
                      penAwayScore={m.penAwayScore}
                      userPoints={m.knockoutPredictions[0]?.pointsAwarded ?? null}
                    />
                  ))}
                </div>
              </section>
            )
          )}
        </>
      )}
    </div>
  );
}
