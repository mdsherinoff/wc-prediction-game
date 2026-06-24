"use client";

import { useState, useMemo } from "react";

type Team = { name: string; flagUrl: string | null } | null;

type Match = {
  id: string;
  kickoff: string;
  status: "SCHEDULED" | "LIVE" | "FINISHED";
  homeScore: number | null;
  awayScore: number | null;
  homeTeam: Team;
  awayTeam: Team;
};

type Prediction = {
  homeScore: number;
  awayScore: number;
  pointsAwarded: number | null;
} | null;

export default function GroupMatchCard({
  match,
  existingPrediction,
}: {
  match: Match;
  existingPrediction: Prediction;
}) {
  const [home, setHome] = useState<string>(
    existingPrediction ? String(existingPrediction.homeScore) : ""
  );
  const [away, setAway] = useState<string>(
    existingPrediction ? String(existingPrediction.awayScore) : ""
  );
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  const kickoffDate = new Date(match.kickoff);
  const lockTime = useMemo(
    () => new Date(kickoffDate.getTime() - 60 * 60 * 1000),
    [match.kickoff],
  );
  const openTime = useMemo(
    () => new Date(kickoffDate.getTime() - 16 * 60 * 60 * 1000),
    [match.kickoff],
  );
  const now = new Date();
  const notYetOpen = now < openTime && match.status === "SCHEDULED";
  const locked = now >= lockTime || match.status !== "SCHEDULED";

  async function save() {
    setError(null);
    const h = parseInt(home, 10);
    const a = parseInt(away, 10);
    if (isNaN(h) || isNaN(a) || h < 0 || a < 0) {
      setError("Enter both scores");
      return;
    }
    setSaving(true);
    try {
      const res = await fetch("/api/predictions/group", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ matchId: match.id, homeScore: h, awayScore: a }),
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

  const kickoffLabel = kickoffDate.toLocaleString(undefined, {
    weekday: "short",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });

  return (
    <div className="ticket px-5 py-4 mx-2 relative">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div className="flex-1 min-w-0">
          <div className="text-xs text-ink/50 mb-1 flex items-center gap-2">
            <span>{kickoffLabel}</span>
            {match.status === "LIVE" && (
              <span className="text-red font-semibold pulse-live">● LIVE</span>
            )}
            {locked && match.status === "SCHEDULED" && (
              <span className="text-ink/40">🔒 Locked</span>
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
          <div className="font-medium text-ink">
            {match.homeTeam?.name ?? "TBD"}{" "}
            <span className="text-ink/40">vs</span>{" "}
            {match.awayTeam?.name ?? "TBD"}
          </div>
          {match.status === "FINISHED" && (
            <div className="text-xs text-turf mt-1 font-semibold">
              Final: {match.homeScore}–{match.awayScore}
              {existingPrediction?.pointsAwarded != null && (
                <span className="ml-2 text-amber">
                  +{existingPrediction.pointsAwarded} pt
                </span>
              )}
            </div>
          )}
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <div className="score-box w-12 h-12 text-2xl flex items-center justify-center">
            <input
              type="number"
              min={0}
              max={20}
              inputMode="numeric"
              disabled={locked || notYetOpen}
              onChange={(e) => setHome(e.target.value)}
              aria-label={`${match.homeTeam?.name ?? "Home"} score prediction`}
            />
          </div>
          <span className="text-ink/40 font-display text-xl">–</span>
          <div className="score-box w-12 h-12 text-2xl flex items-center justify-center">
            <input
              type="number"
              min={0}
              max={20}
              inputMode="numeric"
              disabled={locked || notYetOpen}
              onChange={(e) => setAway(e.target.value)}
              aria-label={`${match.awayTeam?.name ?? "Away"} score prediction`}
            />
          </div>

          {!locked && !notYetOpen && (
            <button
              onClick={save}
              disabled={saving}
              className="ml-2 bg-turf text-chalk text-xs font-semibold px-3 py-2 rounded hover:brightness-110 transition disabled:opacity-50 whitespace-nowrap"
            >
              {saving ? "..." : saved ? "Saved ✓" : "Save"}
            </button>
          )}
        </div>
      </div>

      {error && <p className="text-red text-xs mt-2">{error}</p>}
    </div>
  );
}
