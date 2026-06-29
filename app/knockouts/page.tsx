import { prisma } from "@/lib/prisma";
import KnockoutMatchCard from "@/components/KnockoutMatchCard";
import MatchTabs from "@/components/MatchTabs";
import RoundTabs from "@/components/RoundTabs";
import { stageLabel } from "@/lib/scoring";
import { Stage } from "@prisma/client";
import Link from "next/link";
import { auth } from "@/auth";
import { redirect } from "next/navigation";
import {
  getPickDistribution,
  computePickPercentages,
} from "@/lib/pick-distribution";

export const dynamic = "force-dynamic";

const STAGE_ORDER: Stage[] = ["R32", "R16", "QF", "SF", "THIRD_PLACE", "FINAL"];

async function getMatches(userId: string) {
  return prisma.match.findMany({
    where: { stage: { in: STAGE_ORDER } },
    include: {
      homeTeam: true,
      awayTeam: true,
      knockoutPredictions: { where: { userId } },
      _count: {
        select: { knockoutPredictions: true },
      },
    },
    orderBy: { kickoff: "asc" },
  });
}

type MatchWithRelations = Awaited<ReturnType<typeof getMatches>>[number];
type PickDistribution = Map<string, Map<string, number>>;

function MatchList({
  matches,
  pickDistribution,
}: {
  matches: MatchWithRelations[];
  pickDistribution: PickDistribution;
}) {
  if (matches.length === 0) {
    return (
      <p className="text-center text-ink/40 py-12 text-sm">Nothing here yet.</p>
    );
  }
  return (
    <div className="space-y-3">
      {matches.map((match) => {
        const { homePct, awayPct } = computePickPercentages({
          counts: pickDistribution.get(match.id),
          totalPicks: match._count.knockoutPredictions,
          homeTeamId: match.homeTeam?.id,
          awayTeamId: match.awayTeam?.id,
        });

        return (
          <KnockoutMatchCard
            key={match.id}
            match={{
              id: match.id,
              kickoff: match.kickoff.toISOString(),
              status: match.status,
              homeScore: match.homeScore,
              awayScore: match.awayScore,
              winnerTeamId: match.winnerTeamId,
              homeTeam: match.homeTeam
                ? { id: match.homeTeam.id, name: match.homeTeam.name }
                : null,
              awayTeam: match.awayTeam
                ? { id: match.awayTeam.id, name: match.awayTeam.name }
                : null,
            }}
            existingPrediction={
              match.knockoutPredictions[0]
                ? {
                    predictedWinner:
                      match.knockoutPredictions[0].predictedWinner,
                    homeScore: match.knockoutPredictions[0].homeScore,
                    awayScore: match.knockoutPredictions[0].awayScore,
                    pointsAwarded: match.knockoutPredictions[0].pointsAwarded,
                  }
                : null
            }
            homePickPct={homePct}
            awayPickPct={awayPct}
          />
        );
      })}
    </div>
  );
}

export default async function KnockoutsPage() {
  const session = await auth();
  if (!session?.user?.id) {
    redirect("/login");
  }

  const matches = await getMatches(session.user.id);

  const bracketSetting = await prisma.setting.findUnique({
    where: { key: "bracket_unlocked" },
  });
  const bracketUnlocked = bracketSetting?.value === "true";

  if (matches.length === 0) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-16 text-center text-ink/60">
        <p>
          Knockout fixtures haven&apos;t been loaded yet — they fill in
          progressively as the group stage and earlier rounds conclude.
        </p>
      </div>
    );
  }

  const byStage = new Map<Stage, MatchWithRelations[]>();
  for (const m of matches) {
    if (!byStage.has(m.stage)) byStage.set(m.stage, []);
    byStage.get(m.stage)!.push(m);
  }

  const pickDistribution = await getPickDistribution(matches.map((m) => m.id));

  const tabs = STAGE_ORDER.filter((s) => byStage.has(s)).map((stage) => {
    const stageMatches = byStage.get(stage)!;
    const upcoming = stageMatches.filter((m) => m.status !== "FINISHED");
    const completed = stageMatches
      .filter((m) => m.status === "FINISHED")
      .sort((a, b) => b.kickoff.getTime() - a.kickoff.getTime());

    return {
      key: stage,
      label: stageLabel(stage),
      content: (
        <MatchTabs
          upcomingCount={upcoming.length}
          completedCount={completed.length}
          upcoming={
            <MatchList matches={upcoming} pickDistribution={pickDistribution} />
          }
          completed={
            <MatchList
              matches={completed}
              pickDistribution={pickDistribution}
            />
          }
        />
      ),
    };
  });

  return (
    <div className="max-w-3xl mx-auto px-4 py-8">
      <div className="flex items-center justify-between mb-1">
        <h1 className="font-display text-3xl font-700 text-pitch">
          Knockout predictions
        </h1>
        {bracketUnlocked && (
          <Link
            href="/knockouts/bracket"
            className="text-sm bg-amber text-ink px-3 py-1.5 rounded font-semibold hover:brightness-95"
          >
            Fill in your bracket →
          </Link>
        )}
      </div>
      <p className="text-sm text-ink/60 mb-6">
        Pick the winner for 1 point, plus 2 bonus points if you also call the
        exact score.
      </p>

      <RoundTabs tabs={tabs} />
    </div>
  );
}
