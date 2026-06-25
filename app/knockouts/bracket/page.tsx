import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import BracketRound from "@/components/BracketRound";
import BracketTree from "@/components/BracketTree";
import { getBracketTreeData } from "@/lib/bracket-data";
import { stageLabel } from "@/lib/scoring";
import { Stage } from "@prisma/client";

export const dynamic = "force-dynamic";

const STAGE_ORDER: Stage[] = ["R32", "R16", "QF", "SF", "THIRD_PLACE", "FINAL"];

export default async function BracketPage() {
  const session = await auth();
  if (!session?.user?.id) {
    redirect("/login");
  }

  const setting = await prisma.setting.findUnique({
    where: { key: "bracket_unlocked" },
  });
  const unlocked = setting?.value === "true";

  if (!unlocked) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-20 text-center">
        <h1 className="font-display text-3xl font-700 text-pitch mb-3">
          Bracket predictor isn&apos;t open yet
        </h1>
        <p className="text-ink/60">
          This unlocks once every group stage match has finished and the Round
          of 32 field is set.
        </p>
      </div>
    );
  }

  const treeData = await getBracketTreeData();

  const matches = await prisma.match.findMany({
    where: { stage: { in: STAGE_ORDER } },
    include: {
      homeTeam: true,
      awayTeam: true,
    },
    orderBy: { kickoff: "asc" },
  });

  const picks = await prisma.bracketPick.findMany({
    where: { userId: session.user.id },
  });
  const picksBySlot = new Map(picks.map((p) => [p.slotKey, p.teamId]));

  const byStage = new Map<Stage, typeof matches>();
  for (const m of matches) {
    if (!byStage.has(m.stage)) byStage.set(m.stage, []);
    byStage.get(m.stage)!.push(m);
  }

  return (
    <div className="max-w-5xl mx-auto px-4 py-8">
      <h1 className="font-display text-3xl font-700 text-pitch mb-1">
        The bracket
      </h1>
      <p className="text-sm text-ink/60 mb-6">
        The percentage on each team shows how many people in the pool picked
        them for that slot. Tap any match for details.
      </p>

      <div className="mb-10 -mx-4 sm:mx-0">
        <BracketTree
          bySlot={treeData.bySlot}
          final={treeData.final}
          thirdPlace={treeData.thirdPlace}
        />
      </div>

      <div className="max-w-3xl">
        <h2 className="font-display text-2xl font-700 text-pitch mb-1">
          Your picks
        </h2>
        <p className="text-sm text-ink/60 mb-8">
          Pick who advances at each round. 1 point per correct advancer pick,
          per round. Picks for a round lock 1 hour before that round&apos;s
          first match kicks off.
        </p>

        {STAGE_ORDER.filter((s) => byStage.has(s)).map((stage) => {
          const stageMatches = byStage.get(stage)!;
          const firstKickoff = stageMatches[0].kickoff;
          const lockTime = new Date(firstKickoff.getTime() - 60 * 60 * 1000);
          const locked = new Date() >= lockTime;

          return (
            <BracketRound
              key={stage}
              stage={stage}
              stageLabel={stageLabel(stage)}
              locked={locked}
              lockTime={lockTime.toISOString()}
              matches={stageMatches.map((m) => ({
                slotKey: m.slotKey!,
                homeTeam: m.homeTeam
                  ? { id: m.homeTeam.id, name: m.homeTeam.name }
                  : null,
                awayTeam: m.awayTeam
                  ? { id: m.awayTeam.id, name: m.awayTeam.name }
                  : null,
                winnerTeamId: m.winnerTeamId,
              }))}
              existingPicks={Object.fromEntries(
                stageMatches
                  .filter((m) => m.slotKey && picksBySlot.has(m.slotKey))
                  .map((m) => [
                    m.slotKey as string,
                    picksBySlot.get(m.slotKey as string)!,
                  ]),
              )}
            />
          );
        })}
      </div>
    </div>
  );
}
