import { prisma } from "@/lib/prisma";
import ResultRow from "@/components/ResultRow";
import RoundTabs from "@/components/RoundTabs";
import { stageLabel } from "@/lib/scoring";
import { Stage } from "@prisma/client";
import { auth } from "@/auth";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

const KNOCKOUT_STAGE_ORDER: Stage[] = [
  "R32",
  "R16",
  "QF",
  "SF",
  "THIRD_PLACE",
  "FINAL",
];

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
    orderBy: { kickoff: "desc" },
  });

  if (finishedMatches.length === 0) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-16 text-center text-ink/60">
        <p>
          No matches have finished yet — results will show up here as soon as
          they do.
        </p>
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

  const groupLetters = Array.from(groupsByLetter.keys()).sort((a, b) =>
    a.localeCompare(b),
  );

  const tabs = [];

  if (groupMatches.length > 0) {
    tabs.push({
      key: "GROUP",
      label: "Group Stage",
      content: (
        <RoundTabs
          tabs={groupLetters.map((letter) => ({
            key: letter,
            label: `Group ${letter}`,
            content: (
              <div className="space-y-2">
                {groupsByLetter.get(letter)!.map((m) => (
                  <ResultRow
                    key={m.id}
                    matchId={m.id}
                    kickoff={m.kickoff.toISOString()}
                    homeTeam={m.homeTeam}
                    awayTeam={m.awayTeam}
                    homeScore={m.homeScore}
                    awayScore={m.awayScore}
                    userPoints={m.groupPredictions[0]?.pointsAwarded ?? null}
                  />
                ))}
              </div>
            ),
          }))}
        />
      ),
    });
  }

  for (const stage of KNOCKOUT_STAGE_ORDER) {
    if (!knockoutsByStage.has(stage)) continue;
    tabs.push({
      key: stage,
      label: stageLabel(stage),
      content: (
        <div className="space-y-2">
          {knockoutsByStage.get(stage)!.map((m) => (
            <ResultRow
              key={m.id}
              matchId={m.id}
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
      ),
    });
  }

  return (
    <div className="max-w-3xl mx-auto px-4 py-8">
      <h1 className="font-display text-3xl font-700 text-pitch mb-1">
        Results
      </h1>
      <p className="text-sm text-ink/60 mb-6">
        Every completed match so far, with the points you earned on each one.
      </p>

      <RoundTabs tabs={tabs} />
    </div>
  );
}
