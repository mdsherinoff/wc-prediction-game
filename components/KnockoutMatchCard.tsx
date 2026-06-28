"use client";

import { useState, useMemo, useEffect } from "react";
import Link from "next/link";

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
  predictedWinner: string | null;
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
  const [flash, setFlash] = useState<"success" | "error" | null>(null);

  const kickoffDate = new Date(match.kickoff);
  const lockTime = useMemo(
    () => new Date(kickoffDate.getTime() - 1 * 60 * 1000),
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

  const [kickoffLabel, setKickoffLabel] = useState("");
  useEffect(() => {
    setKickoffLabel(
      kickoffDate
        .toLocaleString(undefined, {
          weekday: "short",
          month: "short",
          day: "numeric",
          hour: "numeric",
          minute: "2-digit",
        })
        .toUpperCase(),
    );
  }, [match.kickoff]);

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
      setFlash("success");
      setTimeout(() => setSaved(false), 1500);
      setTimeout(() => setFlash(null), 1500);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to save");
      setFlash("error");
      setTimeout(() => setFlash(null), 1500);
    } finally {
      setSaving(false);
    }
  }

  if (!teamsKnown) {
    return (
      <div
        className="scoreboard-card px-4 py-3 mx-2 text-sm"
        style={{ color: "var(--board-text-muted)" }}
      >
        {kickoffLabel} — TEAMS TBD (WAITING ON EARLIER ROUNDS)
      </div>
    );
  }

  const disabled = locked || notYetOpen;

  return (
    <div
      className="scoreboard-card px-4 py-3 mx-2 relative transition-all duration-300"
      style={{
        boxShadow:
          flash === "success"
            ? "0 0 0 2px var(--turf)"
            : flash === "error"
              ? "0 0 0 2px var(--red)"
              : undefined,
      }}
    >
      {flash === "success" && (
        <div
          className="absolute -top-2.5 -right-2.5 w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold z-10"
          style={{ background: "var(--turf)", color: "var(--chalk)" }}
        >
          ✓
        </div>
      )}
      <div className="flex items-center justify-between gap-3 mb-3 pb-2 border-b border-[var(--board-divider)]">
        <span
          className="text-[11px] tracking-wide"
          style={{ color: "var(--board-text-muted)" }}
        >
          {kickoffLabel}
        </span>

        {match.status === "LIVE" && (
          <span className="text-[11px] font-bold tracking-wide text-[var(--amber)] pulse-live">
            ● LIVE
          </span>
        )}
        {locked && match.status === "SCHEDULED" && (
          <span
            className="text-[11px] font-bold tracking-wide"
            style={{ color: "var(--board-text-muted)" }}
          >
            LOCKED
          </span>
        )}
        {notYetOpen && (
          <span
            className="text-[11px] font-bold tracking-wide"
            style={{ color: "var(--board-text-muted)" }}
          >
            OPENS{" "}
            {openTime
              .toLocaleString(undefined, {
                month: "short",
                day: "numeric",
                hour: "numeric",
                minute: "2-digit",
              })
              .toUpperCase()}
          </span>
        )}
      </div>

      <div className="flex items-center gap-2 flex-wrap">
        {[match.homeTeam, match.awayTeam].map((team) => (
          <div key={team!.id} className="flex-1 min-w-[120px]">
            <Link
              href={`/match/${match.id}`}
              className="block mb-1 font-display text-sm font-bold text-[var(--chalk)] hover:text-[var(--amber)] transition"
            >
              {team!.name.toUpperCase()}
            </Link>

            <button
              disabled={disabled}
              onClick={() => setWinner(team!.id)}
              className={`w-full px-3 py-2 rounded border transition ${
                winner === team!.id
                  ? "bg-[var(--amber)] text-[var(--ink)] border-[var(--amber)]"
                  : "bg-transparent text-[var(--chalk)] border-[var(--board-divider)] hover:border-[var(--amber)]"
              } disabled:opacity-60 disabled:cursor-not-allowed`}
            >
              PICK WINNER
            </button>
          </div>
        ))}
      </div>

      {!disabled && (
        <div className="mt-3">
          <div
            className="text-[11px] mb-1.5 tracking-wide"
            style={{ color: "var(--board-text-muted)" }}
          >
            OPTIONAL SCORE GUESS{" "}
            <span style={{ color: "var(--board-digit-dim)" }}>
              (+2 PTS IF EXACT)
            </span>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <div className="digit-box w-9 h-9 text-base flex items-center justify-center shrink-0">
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
            <span
              className="shrink-0"
              style={{ color: "var(--board-text-muted)" }}
            >
              -
            </span>
            <div className="digit-box w-9 h-9 text-base flex items-center justify-center shrink-0">
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
              className="ml-auto font-display text-xs font-bold tracking-wide px-4 py-1.5 rounded border border-[var(--amber)] text-[var(--amber)] hover:bg-[var(--amber)] hover:text-[var(--ink)] transition disabled:opacity-50 whitespace-nowrap"
            >
              {saving ? "..." : saved ? "SAVED ✓" : "SAVE"}
            </button>
          </div>
        </div>
      )}

      {match.status === "FINISHED" && (
        <div className="text-xs mt-3 font-semibold text-[var(--amber)]">
          FINAL: {match.homeScore}-{match.awayScore}
          {existingPrediction?.pointsAwarded != null && (
            <span className="ml-2 text-[var(--chalk)]">
              +{existingPrediction.pointsAwarded} pt
            </span>
          )}
        </div>
      )}

      {error && <p className="text-[var(--red)] text-xs mt-2">{error}</p>}
    </div>
  );
}
