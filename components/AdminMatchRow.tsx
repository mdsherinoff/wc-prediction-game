"use client";

import { useState } from "react";
import { MatchStatus, Stage } from "@prisma/client";

type Team = { id: string; name: string } | null;

type Match = {
  id: string;
  stage: Stage;
  kickoff: string;
  status: MatchStatus;
  homeScore: number | null;
  awayScore: number | null;
  homeTeam: Team;
  awayTeam: Team;
};

export default function AdminMatchRow({ match }: { match: Match }) {
  const [home, setHome] = useState<string>(
    match.homeScore != null ? String(match.homeScore) : ""
  );
  const [away, setAway] = useState<string>(
    match.awayScore != null ? String(match.awayScore) : ""
  );
  const [status, setStatus] = useState<MatchStatus>(match.status);
  const [penWinner, setPenWinner] = useState<string>("");
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  const isKnockout = match.stage !== "GROUP";
  const scoresLevel =
    home !== "" && away !== "" && parseInt(home, 10) === parseInt(away, 10);

  async function save() {
    setSaving(true);
    setMsg(null);
    try {
      const res = await fetch("/api/admin/matches", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          matchId: match.id,
          homeScore: home === "" ? null : parseInt(home, 10),
          awayScore: away === "" ? null : parseInt(away, 10),
          status,
          winnerTeamId:
            isKnockout && scoresLevel && penWinner ? penWinner : undefined,
          wentToPens: isKnockout && scoresLevel && !!penWinner,
        }),
      });
      const body = await res.json();
      if (!res.ok) throw new Error(body.error ?? "Save failed");
      setMsg("Saved");
    } catch (e) {
      setMsg(e instanceof Error ? e.message : "Save failed");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="border border-line rounded px-3 py-2 flex items-center gap-3 flex-wrap text-sm">
      <span className="text-xs text-ink/40 w-20 shrink-0">{match.stage}</span>
      <span className="flex-1 min-w-[160px] truncate">
        {match.homeTeam?.name ?? "TBD"} vs {match.awayTeam?.name ?? "TBD"}
      </span>

      <input
        type="number"
        className="w-14 border border-line rounded px-1 py-1 text-center"
        value={home}
        onChange={(e) => setHome(e.target.value)}
        placeholder="H"
      />
      <span>-</span>
      <input
        type="number"
        className="w-14 border border-line rounded px-1 py-1 text-center"
        value={away}
        onChange={(e) => setAway(e.target.value)}
        placeholder="A"
      />

      {isKnockout && scoresLevel && (
        <select
          value={penWinner}
          onChange={(e) => setPenWinner(e.target.value)}
          className="border border-line rounded px-2 py-1 text-xs"
        >
          <option value="">Pens winner...</option>
          {match.homeTeam && (
            <option value={match.homeTeam.id}>{match.homeTeam.name}</option>
          )}
          {match.awayTeam && (
            <option value={match.awayTeam.id}>{match.awayTeam.name}</option>
          )}
        </select>
      )}

      <select
        value={status}
        onChange={(e) => setStatus(e.target.value as MatchStatus)}
        className="border border-line rounded px-2 py-1 text-xs"
      >
        <option value="SCHEDULED">Scheduled</option>
        <option value="LIVE">Live</option>
        <option value="FINISHED">Finished</option>
      </select>

      <button
        onClick={save}
        disabled={saving}
        className="bg-pitch text-chalk text-xs font-semibold px-3 py-1.5 rounded hover:brightness-110 disabled:opacity-50"
      >
        {saving ? "..." : "Save"}
      </button>
      {msg && <span className="text-xs text-ink/50">{msg}</span>}
    </div>
  );
}
