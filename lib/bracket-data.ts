import { prisma } from "@/lib/prisma";
import { Stage } from "@prisma/client";

export type BracketSlot = {
  matchId: string;
  slotKey: string;
  stage: Stage;
  homeTeam: { id: string; name: string; flagUrl: string | null } | null;
  awayTeam: { id: string; name: string; flagUrl: string | null } | null;
  homeScore: number | null;
  awayScore: number | null;
  winnerTeamId: string | null;
  wentToPens: boolean;
  penHomeScore: number | null;
  penAwayScore: number | null;
  kickoff: Date;
  status: "SCHEDULED" | "LIVE" | "FINISHED";
  // How many people in the pool picked each team to win this slot
  pickCounts: { teamId: string; count: number }[];
  totalPicks: number;
};

export type BracketTreeData = {
  bySlot: Map<string, BracketSlot>;
  thirdPlace: BracketSlot | null;
  final: BracketSlot | null;
};

const ROUND_STAGES: Stage[] = ["R32", "R16", "QF", "SF"];

export async function getBracketTreeData(): Promise<BracketTreeData> {
  const matches = await prisma.match.findMany({
    where: { stage: { in: [...ROUND_STAGES, "FINAL", "THIRD_PLACE"] } },
    include: { homeTeam: true, awayTeam: true },
    orderBy: { kickoff: "asc" },
  });

  const allPicks = await prisma.bracketPick.findMany({
    select: { slotKey: true, teamId: true },
  });

  const picksBySlot = new Map<string, Map<string, number>>();
  for (const p of allPicks) {
    if (!picksBySlot.has(p.slotKey)) picksBySlot.set(p.slotKey, new Map());
    const counts = picksBySlot.get(p.slotKey)!;
    counts.set(p.teamId, (counts.get(p.teamId) ?? 0) + 1);
  }

  const bySlot = new Map<string, BracketSlot>();
  let thirdPlace: BracketSlot | null = null;
  let final: BracketSlot | null = null;

  for (const m of matches) {
    if (!m.slotKey) continue;
    const counts = picksBySlot.get(m.slotKey) ?? new Map();
    const pickCounts = Array.from(counts.entries()).map(([teamId, count]) => ({
      teamId,
      count,
    }));
    const totalPicks = pickCounts.reduce((acc, p) => acc + p.count, 0);

    const slot: BracketSlot = {
      matchId: m.id,
      slotKey: m.slotKey,
      stage: m.stage,
      homeTeam: m.homeTeam
        ? {
            id: m.homeTeam.id,
            name: m.homeTeam.name,
            flagUrl: m.homeTeam.flagUrl,
          }
        : null,
      awayTeam: m.awayTeam
        ? {
            id: m.awayTeam.id,
            name: m.awayTeam.name,
            flagUrl: m.awayTeam.flagUrl,
          }
        : null,
      homeScore: m.homeScore,
      awayScore: m.awayScore,
      winnerTeamId: m.winnerTeamId,
      wentToPens: m.wentToPens,
      penHomeScore: m.penHomeScore,
      penAwayScore: m.penAwayScore,
      kickoff: m.kickoff,
      status: m.status,
      pickCounts,
      totalPicks,
    };

    if (m.stage === "THIRD_PLACE") {
      thirdPlace = slot;
    } else if (m.stage === "FINAL") {
      final = slot;
    } else {
      bySlot.set(m.slotKey, slot);
    }
  }

  return { bySlot, thirdPlace, final };
}

/** Returns slots for one round, sorted by their numeric suffix (R32-1, R32-2, ...). */
export function slotsForStage(
  data: BracketTreeData,
  stage: Stage,
): BracketSlot[] {
  return Array.from(data.bySlot.values())
    .filter((s) => s.stage === stage)
    .sort((a, b) => {
      const na = parseInt(a.slotKey.split("-")[1] ?? "0", 10);
      const nb = parseInt(b.slotKey.split("-")[1] ?? "0", 10);
      return na - nb;
    });
}
