"use client";

import { useState, useMemo, useEffect } from "react";
import Link from "next/link";

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
    existingPrediction ? String(existingPrediction.homeScore) : "",
  );
  const [away, setAway] = useState<string>(
    existingPrediction ? String(existingPrediction.awayScore) : "",
  );
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    setHome(existingPrediction ? String(existingPrediction.homeScore) : "");
    setAway(existingPrediction ? String(existingPrediction.awayScore) : "");
  }, [existingPrediction?.homeScore, existingPrediction?.awayScore]);

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

  const disabled = locked || notYetOpen;

  return (
    <div className="scoreboard-card px-4 py-3 mx-2">
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

      <div className="flex flex-col gap-2">
        <div className="flex items-center justify-between gap-3">
          <Link href={`/match/${match.id}`} className="block min-w-0">
            <span className="font-display font-bold text-lg tracking-wide text-[var(--chalk)] truncate hover:text-[var(--amber)] transition">
              {match.homeTeam?.name?.toUpperCase() ?? "TBD"}
            </span>
          </Link>

          <div
            className={`digit-box w-10 h-9 text-2xl flex items-center justify-center shrink-0 ${
              disabled ? "dim" : ""
            }`}
          >
            <input
              type="number"
              min={0}
              max={20}
              inputMode="numeric"
              disabled={disabled}
              value={home}
              onChange={(e) => setHome(e.target.value)}
              aria-label={`${match.homeTeam?.name ?? "Home"} score prediction`}
            />
          </div>
        </div>

        <div className="flex items-center justify-between gap-3">
          <Link href={`/match/${match.id}`} className="block min-w-0">
            <span className="font-display font-bold text-lg tracking-wide text-[var(--chalk)] truncate hover:text-[var(--amber)] transition">
              {match.awayTeam?.name?.toUpperCase() ?? "TBD"}
            </span>
          </Link>

          <div
            className={`digit-box w-10 h-9 text-2xl flex items-center justify-center shrink-0 ${
              disabled ? "dim" : ""
            }`}
          >
            <input
              type="number"
              min={0}
              max={20}
              inputMode="numeric"
              disabled={disabled}
              value={away}
              onChange={(e) => setAway(e.target.value)}
              aria-label={`${match.awayTeam?.name ?? "Away"} score prediction`}
            />
          </div>
        </div>
      </div>

      {match.status === "FINISHED" && (
        <div className="text-xs mt-3 font-semibold text-[var(--amber)]">
          FINAL: {match.homeScore}–{match.awayScore}
          {existingPrediction?.pointsAwarded != null && (
            <span className="ml-2 text-[var(--chalk)]">
              +{existingPrediction.pointsAwarded} pt
            </span>
          )}
        </div>
      )}

      {!disabled && (
        <div className="flex justify-end mt-3 pt-2 border-t border-[var(--board-divider)]">
          <button
            onClick={save}
            disabled={saving}
            className="font-display text-xs font-bold tracking-wide px-4 py-1.5 rounded border border-[var(--amber)] text-[var(--amber)] hover:bg-[var(--amber)] hover:text-[var(--ink)] transition disabled:opacity-50"
          >
            {saving ? "..." : saved ? "SAVED ✓" : "SAVE"}
          </button>
        </div>
      )}

      {error && <p className="text-[var(--red)] text-xs mt-2">{error}</p>}
    </div>
  );
}
