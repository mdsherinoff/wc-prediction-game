"use client";

import { useState } from "react";
import { Stage } from "@prisma/client";

type Team = { id: string; name: string } | null;

type SlotMatch = {
  slotKey: string;
  homeTeam: Team;
  awayTeam: Team;
  winnerTeamId: string | null;
};

export default function BracketRound({
  stage,
  stageLabel,
  locked,
  lockTime,
  matches,
  existingPicks,
}: {
  stage: Stage;
  stageLabel: string;
  locked: boolean;
  lockTime: string;
  matches: SlotMatch[];
  existingPicks: Record<string, string>;
}) {
  const [picks, setPicks] = useState<Record<string, string>>(existingPicks);
  const [savingSlot, setSavingSlot] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function choose(slotKey: string, teamId: string) {
    setError(null);
    setPicks((prev) => ({ ...prev, [slotKey]: teamId }));
    setSavingSlot(slotKey);
    try {
      const res = await fetch("/api/predictions/bracket", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ stage, slotKey, teamId }),
      });
      if (!res.ok) {
        const body = await res.json();
        throw new Error(body.error ?? "Failed to save pick");
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to save pick");
    } finally {
      setSavingSlot(null);
    }
  }

  const lockDate = new Date(lockTime);

  return (
    <section className="mb-10">
      <div className="flex items-center justify-between mb-3">
        <h2 className="font-display text-xl font-700 text-turf">
          {stageLabel}
        </h2>
        <span className="text-xs text-ink/40">
          {locked
            ? "Locked"
            : `Locks ${lockDate.toLocaleString(undefined, {
                month: "short",
                day: "numeric",
                hour: "numeric",
                minute: "2-digit",
              })}`}
        </span>
      </div>

      <div className="space-y-3">
        {matches.map((m) => {
          const teamsKnown = !!m.homeTeam && !!m.awayTeam;
          if (!teamsKnown) {
            return (
              <div
                key={m.slotKey}
                className="ticket px-5 py-3 mx-2 text-sm text-ink/40"
              >
                Matchup TBD
              </div>
            );
          }

          return (
            <div key={m.slotKey} className="ticket px-5 py-3 mx-2">
              <div className="flex items-center gap-3 flex-wrap">
                {[m.homeTeam, m.awayTeam].map((team) => {
                  const isPicked = picks[m.slotKey] === team!.id;
                  const isActualWinner = m.winnerTeamId === team!.id;
                  return (
                    <button
                      key={team!.id}
                      disabled={locked}
                      onClick={() => choose(m.slotKey, team!.id)}
                      className={`flex-1 min-w-[120px] text-sm font-medium px-3 py-2 rounded border transition relative ${
                        isPicked
                          ? "bg-turf text-chalk border-turf"
                          : "bg-white text-ink border-line hover:border-turf"
                      } disabled:opacity-70 disabled:cursor-not-allowed`}
                    >
                      {team!.name}
                      {m.winnerTeamId && (
                        <span
                          className={`ml-2 text-xs ${
                            isActualWinner ? "text-amber" : "text-ink/30"
                          }`}
                        >
                          {isActualWinner ? "advanced" : ""}
                        </span>
                      )}
                    </button>
                  );
                })}
                {savingSlot === m.slotKey && (
                  <span className="text-xs text-ink/40">saving...</span>
                )}
              </div>
            </div>
          );
        })}
      </div>
      {error && <p className="text-red text-xs mt-2 px-2">{error}</p>}
    </section>
  );
}
