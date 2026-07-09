"use client";

import { useState, useEffect } from "react";
import PlayerSearchPicker, {
  type PlayerOption,
} from "@/components/PlayerSearchPicker";

export default function AdminAwardWinnerPicker({
  category,
  label,
  hint,
  existingPlayer,
}: {
  category: "GOLDEN_BALL" | "GOLDEN_BOOT" | "GOLDEN_GLOVE" | "YOUNG_PLAYER";
  label: string;
  hint: string;
  existingPlayer: PlayerOption | null;
}) {
  const [selected, setSelected] = useState<PlayerOption | null>(existingPlayer);
  const [players, setPlayers] = useState<PlayerOption[]>([]);
  const [loadingPlayers, setLoadingPlayers] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState<string | null>(null);
  const [changing, setChanging] = useState(false);

  useEffect(() => {
    setSelected(existingPlayer);
  }, [existingPlayer]);

  useEffect(() => {
    if (!changing) return;
    setLoadingPlayers(true);
    fetch(`/api/awards/players?category=${category}`)
      .then((r) => r.json())
      .then((body) => setPlayers(body.players ?? []))
      .finally(() => setLoadingPlayers(false));
  }, [changing, category]);

  async function post(playerId: string | null): Promise<void> {
    setError(null);
    setStatus(null);
    setSaving(true);
    try {
      const res = await fetch("/api/admin/award-winners", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ category, playerId }),
      });
      const body = await res.json();
      if (!res.ok) throw new Error(body.error ?? "Failed to save");
      const scored = body.awardScoreResult?.scored ?? 0;
      setStatus(
        playerId == null
          ? "Winner cleared — points for this award removed."
          : `Winner saved — ${scored} pick${scored === 1 ? "" : "s"} scored.`,
      );
      setChanging(false);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to save");
    } finally {
      setSaving(false);
    }
  }

  function onSelect(player: PlayerOption) {
    setSelected(player);
    void post(player.id);
  }

  function onClear() {
    setSelected(null);
    void post(null);
  }

  return (
    <div className="ticket p-5">
      <div className="flex items-center justify-between mb-1">
        <h2 className="font-display text-lg font-700 text-pitch">{label}</h2>
        {selected && !changing && (
          <div className="flex gap-3">
            <button
              onClick={() => setChanging(true)}
              disabled={saving}
              className="text-xs text-turf underline disabled:opacity-50"
            >
              Change
            </button>
            <button
              onClick={onClear}
              disabled={saving}
              className="text-xs text-red underline disabled:opacity-50"
            >
              Clear
            </button>
          </div>
        )}
      </div>
      <p className="text-xs text-ink/50 mb-4">{hint}</p>

      {changing ? (
        <div>
          <PlayerSearchPicker
            players={players}
            onSelect={onSelect}
            placeholder={
              loadingPlayers
                ? "Loading players..."
                : "Search by name, country, or club..."
            }
            disabled={loadingPlayers || saving}
          />
          {selected && (
            <button
              onClick={() => setChanging(false)}
              disabled={saving}
              className="text-xs text-ink/40 mt-2 underline"
            >
              Cancel
            </button>
          )}
        </div>
      ) : selected ? (
        <div className="rounded border border-line bg-white px-4 py-3">
          <p className="font-semibold text-ink">{selected.name}</p>
          <p className="text-xs text-ink/50">
            {selected.country}
            {selected.club ? ` · ${selected.club}` : ""}
            {selected.position ? ` · ${selected.position}` : ""}
          </p>
        </div>
      ) : (
        <button
          onClick={() => setChanging(true)}
          disabled={saving}
          className="w-full border border-dashed border-line rounded py-6 text-sm text-ink/50 hover:border-turf hover:text-turf transition disabled:opacity-50"
        >
          + Set winner
        </button>
      )}

      {status && <p className="text-turf text-xs mt-2">{status}</p>}
      {error && <p className="text-red text-xs mt-2">{error}</p>}
    </div>
  );
}
