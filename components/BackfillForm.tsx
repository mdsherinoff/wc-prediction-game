"use client";

import { useState } from "react";

type MatchOption = {
  id: string;
  stage: string;
  label: string;
  homeTeamId: string | null;
  awayTeamId: string | null;
  homeTeamName: string;
  awayTeamName: string;
};

export default function BackfillForm({
  users,
  matches,
}: {
  users: { id: string; label: string }[];
  matches: MatchOption[];
}) {
  const [userId, setUserId] = useState("");
  const [matchId, setMatchId] = useState("");
  const [homeScore, setHomeScore] = useState("");
  const [awayScore, setAwayScore] = useState("");
  const [winner, setWinner] = useState("");
  const [knownIncorrect, setKnownIncorrect] = useState(false);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  const selectedMatch = matches.find((m) => m.id === matchId);
  const isGroup = selectedMatch?.stage === "GROUP";

  async function save() {
    if (!userId || !matchId) {
      setMsg("Pick a user and a match");
      return;
    }
    setSaving(true);
    setMsg(null);
    try {
      const res = await fetch("/api/admin/backfill-prediction", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId,
          matchId,
          homeScore: homeScore === "" ? null : parseInt(homeScore, 10),
          awayScore: awayScore === "" ? null : parseInt(awayScore, 10),
          predictedWinner: winner || null,
          knownIncorrect,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed to save");
      setMsg("Saved and scored.");
    } catch (e) {
      setMsg(e instanceof Error ? e.message : "Failed to save");
    } finally {
      setSaving(false);
    }
  }

  async function clear() {
    if (!userId || !matchId || !selectedMatch) return;
    setSaving(true);
    setMsg(null);
    try {
      const res = await fetch("/api/admin/backfill-prediction", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId,
          matchId,
          stage: isGroup ? "GROUP" : "KNOCKOUT",
        }),
      });
      if (!res.ok) throw new Error("Failed to clear");
      setMsg("Cleared — now shows as unpredicted.");
      setHomeScore("");
      setAwayScore("");
      setWinner("");
    } catch (e) {
      setMsg(e instanceof Error ? e.message : "Failed to clear");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-4 border border-line rounded p-4">
      <div>
        <label className="text-xs text-ink/50 block mb-1">User</label>
        <select
          value={userId}
          onChange={(e) => setUserId(e.target.value)}
          className="w-full border border-line rounded px-2 py-2 text-sm"
        >
          <option value="">Select a person...</option>
          {users.map((u) => (
            <option key={u.id} value={u.id}>
              {u.label}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label className="text-xs text-ink/50 block mb-1">Match</label>
        <select
          value={matchId}
          onChange={(e) => {
            setMatchId(e.target.value);
            setHomeScore("");
            setAwayScore("");
            setWinner("");
            setKnownIncorrect(false);
          }}
          className="w-full border border-line rounded px-2 py-2 text-sm"
        >
          <option value="">Select a match...</option>
          {matches.map((m) => (
            <option key={m.id} value={m.id}>
              [{m.stage}] {m.label}
            </option>
          ))}
        </select>
      </div>

      {selectedMatch && (
        <div>
          <button
            type="button"
            onClick={() => setKnownIncorrect((v) => !v)}
            className={`px-3 py-2 rounded border text-sm font-medium ${
              knownIncorrect
                ? "bg-red text-chalk border-red"
                : "border-line text-ink/60"
            }`}
          >
            {knownIncorrect
              ? "✓ Marked as wrong prediction"
              : "Mark as wrong prediction (exact guess unknown)"}
          </button>
        </div>
      )}

      {selectedMatch && isGroup && !knownIncorrect && (
        <div className="flex items-center gap-3">
          <div>
            <label className="text-xs text-ink/50 block mb-1">
              {selectedMatch.homeTeamName}
            </label>
            <input
              type="number"
              min={0}
              value={homeScore}
              onChange={(e) => setHomeScore(e.target.value)}
              className="w-16 border border-line rounded px-2 py-2 text-center"
            />
          </div>
          <span className="text-ink/40 mt-5">-</span>
          <div>
            <label className="text-xs text-ink/50 block mb-1">
              {selectedMatch.awayTeamName}
            </label>
            <input
              type="number"
              min={0}
              value={awayScore}
              onChange={(e) => setAwayScore(e.target.value)}
              className="w-16 border border-line rounded px-2 py-2 text-center"
            />
          </div>
        </div>
      )}

      {selectedMatch && !isGroup && !knownIncorrect && (
        <div className="space-y-3">
          <div>
            <label className="text-xs text-ink/50 block mb-1">
              Predicted winner
            </label>
            <div className="flex gap-2">
              {selectedMatch.homeTeamId && (
                <button
                  type="button"
                  onClick={() => setWinner(selectedMatch.homeTeamId!)}
                  className={`px-3 py-2 rounded border text-sm ${
                    winner === selectedMatch.homeTeamId
                      ? "bg-turf text-chalk border-turf"
                      : "border-line"
                  }`}
                >
                  {selectedMatch.homeTeamName}
                </button>
              )}
              {selectedMatch.awayTeamId && (
                <button
                  type="button"
                  onClick={() => setWinner(selectedMatch.awayTeamId!)}
                  className={`px-3 py-2 rounded border text-sm ${
                    winner === selectedMatch.awayTeamId
                      ? "bg-turf text-chalk border-turf"
                      : "border-line"
                  }`}
                >
                  {selectedMatch.awayTeamName}
                </button>
              )}
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div>
              <label className="text-xs text-ink/50 block mb-1">
                Score (optional)
              </label>
              <input
                type="number"
                min={0}
                value={homeScore}
                onChange={(e) => setHomeScore(e.target.value)}
                className="w-16 border border-line rounded px-2 py-2 text-center"
              />
            </div>
            <span className="text-ink/40 mt-5">-</span>
            <div>
              <label className="text-xs text-ink/50 block mb-1 opacity-0">
                .
              </label>
              <input
                type="number"
                min={0}
                value={awayScore}
                onChange={(e) => setAwayScore(e.target.value)}
                className="w-16 border border-line rounded px-2 py-2 text-center"
              />
            </div>
          </div>
        </div>
      )}

      <div className="flex items-center gap-3">
        <button
          onClick={save}
          disabled={saving || !userId || !matchId}
          className="bg-pitch text-chalk text-sm font-semibold px-4 py-2 rounded disabled:opacity-50"
        >
          {saving ? "Saving..." : "Save prediction"}
        </button>
        <button
          onClick={clear}
          disabled={saving || !userId || !matchId}
          className="text-ink/40 hover:text-red text-sm disabled:opacity-50"
        >
          Clear (mark as not predicted)
        </button>
        {msg && <span className="text-sm text-ink/60">{msg}</span>}
      </div>
    </div>
  );
}
