"use client";

import { useState, useMemo, useRef, useEffect } from "react";

export type PlayerOption = {
  id: string;
  name: string;
  country: string;
  position: string | null;
  club: string | null;
  ageLabel: string | null;
};

export default function PlayerSearchPicker({
  players,
  onSelect,
  placeholder = "Search for a player...",
  disabled,
}: {
  players: PlayerOption[];
  onSelect: (player: PlayerOption) => void;
  placeholder?: string;
  disabled?: boolean;
}) {
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const filtered = useMemo(() => {
    if (query.trim().length === 0) return players.slice(0, 30);
    const q = query.toLowerCase();
    return players
      .filter(
        (p) =>
          p.name.toLowerCase().includes(q) ||
          p.country.toLowerCase().includes(q) ||
          (p.club ?? "").toLowerCase().includes(q),
      )
      .slice(0, 30);
  }, [query, players]);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (
        containerRef.current &&
        !containerRef.current.contains(e.target as Node)
      ) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <div ref={containerRef} className="relative">
      <input
        type="text"
        value={query}
        disabled={disabled}
        onChange={(e) => {
          setQuery(e.target.value);
          setOpen(true);
        }}
        onFocus={() => setOpen(true)}
        placeholder={placeholder}
        className="w-full border border-line rounded px-3 py-2 text-sm disabled:opacity-50 disabled:cursor-not-allowed"
      />

      {open && !disabled && (
        <div className="absolute z-20 left-0 right-0 mt-1 bg-white border border-line rounded shadow-lg max-h-72 overflow-y-auto">
          {filtered.length === 0 ? (
            <p className="px-3 py-3 text-sm text-ink/40">No players match.</p>
          ) : (
            filtered.map((p) => (
              <button
                key={p.id}
                type="button"
                onClick={() => {
                  onSelect(p);
                  setQuery("");
                  setOpen(false);
                }}
                className="w-full text-left px-3 py-2 text-sm hover:bg-chalk transition flex items-center justify-between gap-2"
              >
                <span className="font-medium text-ink truncate">{p.name}</span>
                <span className="text-xs text-ink/40 shrink-0">
                  {p.country}
                  {p.club ? ` · ${p.club}` : ""}
                </span>
              </button>
            ))
          )}
        </div>
      )}
    </div>
  );
}
