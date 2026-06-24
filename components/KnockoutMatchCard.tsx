"use client";

import { useState, useMemo, useEffect } from "react";

type Team = { id: string; name: string } | null;

type Match = {
  id: string;
  kickoff: string;
  status: "SCHEDULED" | "LIVE" | "FINISHED";
  homeScore: number | null;
  awayScore: number | null;
  winnerTeamId: string | null;
  homeTeam: Team;
  awayTeam: Team;
};

type Prediction = {
  predictedWinner: string;
  homeScore: number | null;
  awayScore: number | null;
  pointsAwarded: number | null;
} | null;

export default function KnockoutMatchCard({
  match,
  existingPrediction,
}: {
  match: Match;
  existingPrediction: Prediction;
}) {
  const [winner, setWinner] = useState<string | null>(
    existingPrediction?.predictedWinner ?? null,
  );
  const [home, setHome] = useState<string>(
    existingPrediction?.homeScore != null
      ? String(existingPrediction.homeScore)
      : "",
  );
  const [away, setAway] = useState<string>(
    existingPrediction?.awayScore != null
      ? String(existingPrediction.awayScore)
      : "",
  );

  useEffect(() => {
    setWinner(existingPrediction?.predictedWinner ?? null);
    setHome(
      existingPrediction?.homeScore != null
        ? String(existingPrediction.homeScore)
        : "",
    );
    setAway(
      existingPrediction?.awayScore != null
        ? String(existingPrediction.awayScore)
        : "",
    );
  }, [
    existingPrediction?.predictedWinner,
    existingPrediction?.homeScore,
    existingPrediction?.awayScore,
  ]);

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  const kickoffDate = new Date(match.kickoff);
  const lockTime = useMemo(
    () => new Date(kickoffDate.getTime() - 60 * 60 * 1000),
    [match.kickoff],
  );
  const [locked, setLocked] = useState(match.status !== "SCHEDULED");
  useEffect(() => {
    setLocked(new Date() >= lockTime || match.status !== "SCHEDULED");
  }, [lockTime, match.status]);
  const openTime = useMemo(
    () => new Date(kickoffDate.getTime() - 16 * 60 * 60 * 1000),
    [match.kickoff],
  );
  const now = new Date();
  const notYetOpen = now < openTime && match.status === "SCHEDULED";
  const teamsKnown = !!match.homeTeam && !!match.awayTeam;

  async function save() {
    setError(null);
    if (!winner) {
      setError("Pick a winner");
      return;
    }
    setSaving(true);
    try {
      const h = home === "" ? null : parseInt(home, 10);
      const a = away === "" ? null : parseInt(away, 10);
      const res = await fetch("/api/predictions/knockout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          matchId: match.id,
          predictedWinner: winner,
          homeScore: h,
          awayScore: a,
        }),
      });
      if (!res.ok) {
        const body = await res.json();
        throw new Error(body.error ?? "Failed to save");
      }
      setSaved(true);
      setTimeout(() => setSaved(false), 1500);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to save");
    } finally {
      setSaving(false);
    }
  }

  const [kickoffLabel, setKickoffLabel] = useState("");
  useEffect(() => {
    setKickoffLabel(
      kickoffDate.toLocaleString(undefined, {
        weekday: "short",
        month: "short",
        day: "numeric",
        hour: "numeric",
        minute: "2-digit",
      }),
    );
  }, [match.kickoff]);

  if (!teamsKnown) {
    return (
      <div className="ticket px-5 py-4 mx-2 text-ink/40 text-sm">
        {kickoffLabel} — teams TBD (waiting on earlier rounds)
      </div>
    );
  }

  return (
    <div className="ticket px-5 py-4 mx-2">
      <div className="text-xs text-ink/50 mb-2 flex items-center gap-2">
        <span>{kickoffLabel}</span>
        {match.status === "LIVE" && (
          <span className="text-red font-semibold pulse-live">● LIVE</span>
        )}
        {locked && match.status === "SCHEDULED" && (
          <span className="text-ink/40">Locked</span>
        )}
        {notYetOpen && (
          <span className="text-ink/40">
            Opens{" "}
            {openTime.toLocaleString(undefined, {
              month: "short",
              day: "numeric",
              hour: "numeric",
              minute: "2-digit",
            })}
          </span>
        )}
      </div>

      <div className="flex items-center gap-3 flex-wrap">
        {[match.homeTeam, match.awayTeam].map((team) => (
          <button
            key={team!.id}
            disabled={locked || notYetOpen}
            onClick={() => setWinner(team!.id)}
            className={`flex-1 min-w-[120px] text-sm font-medium px-3 py-2 rounded border transition ${
              winner === team!.id
                ? "bg-turf text-chalk border-turf"
                : "bg-white text-ink border-line hover:border-turf"
            } disabled:opacity-60 disabled:cursor-not-allowed`}
          >
            {team!.name}
          </button>
        ))}
      </div>

      {!locked && !notYetOpen && (
        <div className="mt-3">
          <div className="text-xs text-ink/50 mb-1.5">
            Optional score guess{" "}
            <span className="text-ink/40">(+2 pts if exact)</span>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <div className="score-box w-9 h-9 text-base flex items-center justify-center shrink-0">
              <input
                type="number"
                min={0}
                max={20}
                inputMode="numeric"
                value={home}
                onChange={(e) => setHome(e.target.value)}
                aria-label="Home score guess"
              />
            </div>
            <span className="text-ink/40 shrink-0">-</span>
            <div className="score-box w-9 h-9 text-base flex items-center justify-center shrink-0">
              <input
                type="number"
                min={0}
                max={20}
                inputMode="numeric"
                value={away}
                onChange={(e) => setAway(e.target.value)}
                aria-label="Away score guess"
              />
            </div>

            <button
              onClick={save}
              disabled={saving}
              className="ml-auto bg-turf text-chalk text-xs font-semibold px-3 py-2 rounded hover:brightness-110 transition disabled:opacity-50 whitespace-nowrap"
            >
              {saving ? "..." : saved ? "Saved" : "Save"}
            </button>
          </div>
        </div>
      )}

      {match.status === "FINISHED" && (
        <div className="text-xs text-turf mt-2 font-semibold">
          Final: {match.homeScore}-{match.awayScore}
          {existingPrediction?.pointsAwarded != null && (
            <span className="ml-2 text-amber">
              +{existingPrediction.pointsAwarded} pt
            </span>
          )}
        </div>
      )}

      {error && <p className="text-red text-xs mt-2">{error}</p>}
    </div>
  );
}
