"use client";

import { useState, useEffect } from "react";
import PlayerSearchPicker, {
  type PlayerOption,
} from "@/components/PlayerSearchPicker";
import PlayerCard from "@/components/PlayerCard";

export default function AwardCategoryPicker({
  category,
  label,
  hint,
  locked,
  existingPlayer,
}: {
  category: "GOLDEN_BALL" | "GOLDEN_BOOT" | "GOLDEN_GLOVE" | "YOUNG_PLAYER";
  label: string;
  hint: string;
  locked: boolean;
  existingPlayer: PlayerOption | null;
}) {
  const [selected, setSelected] = useState<PlayerOption | null>(existingPlayer);
  const [players, setPlayers] = useState<PlayerOption[]>([]);
  const [loadingPlayers, setLoadingPlayers] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
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

  async function save(player: PlayerOption) {
    setError(null);
    setSaving(true);
    try {
      const res = await fetch("/api/awards", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ category, playerId: player.id }),
      });
      const body = await res.json();
      if (!res.ok) throw new Error(body.error ?? "Failed to save");
      setSelected(player);
      setChanging(false);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to save");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="ticket p-5">
      <div className="flex items-center justify-between mb-1">
        <h2 className="font-display text-lg font-700 text-pitch">{label}</h2>
        {!locked && selected && !changing && (
          <button
            onClick={() => setChanging(true)}
            className="text-xs text-turf underline"
          >
            Change
          </button>
        )}
      </div>
      <p className="text-xs text-ink/50 mb-4">{hint}</p>

      {changing ? (
        <div>
          <PlayerSearchPicker
            players={players}
            onSelect={save}
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
              className="text-xs text-ink/40 mt-2 underline"
            >
              Cancel
            </button>
          )}
        </div>
      ) : selected ? (
        <div className="flex justify-center">
          <PlayerCard
            name={selected.name}
            country={selected.country}
            position={selected.position}
            club={selected.club}
            ageLabel={selected.ageLabel}
            awardLabel={label}
          />
        </div>
      ) : locked ? (
        <p className="text-sm text-ink/40 text-center py-6">
          No pick was made before picks locked.
        </p>
      ) : (
        <button
          onClick={() => setChanging(true)}
          className="w-full border border-dashed border-line rounded py-6 text-sm text-ink/50 hover:border-turf hover:text-turf transition"
        >
          + Choose your player
        </button>
      )}

      {error && <p className="text-red text-xs mt-2">{error}</p>}
    </div>
  );
}
