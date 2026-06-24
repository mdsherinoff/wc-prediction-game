"use client";

import { useState } from "react";

export default function AdminAdjustmentRow({
  userId,
  name,
  currentPoints,
  currentNote,
}: {
  userId: string;
  name: string;
  currentPoints: number;
  currentNote: string | null;
}) {
  const [points, setPoints] = useState<string>(String(currentPoints));
  const [note, setNote] = useState<string>(currentNote ?? "");
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  async function save() {
    const parsed = parseInt(points, 10);
    if (isNaN(parsed)) {
      setMsg("Enter a whole number");
      return;
    }
    setSaving(true);
    setMsg(null);
    try {
      const res = await fetch("/api/admin/adjustments", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId, points: parsed, note: note || null }),
      });
      const body = await res.json();
      if (!res.ok) throw new Error(body.error ?? "Save failed");
      setMsg("Saved");
      setTimeout(() => setMsg(null), 1500);
    } catch (e) {
      setMsg(e instanceof Error ? e.message : "Save failed");
    } finally {
      setSaving(false);
    }
  }

  async function clear() {
    setSaving(true);
    setMsg(null);
    try {
      const res = await fetch("/api/admin/adjustments", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId }),
      });
      if (!res.ok) throw new Error("Failed to clear");
      setPoints("0");
      setNote("");
      setMsg("Cleared");
      setTimeout(() => setMsg(null), 1500);
    } catch (e) {
      setMsg(e instanceof Error ? e.message : "Failed to clear");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="border border-line rounded px-3 py-2 flex items-center gap-3 flex-wrap text-sm">
      <span className="flex-1 min-w-[140px] font-medium truncate">{name}</span>

      <input
        type="number"
        className="w-20 border border-line rounded px-2 py-1 text-center"
        value={points}
        onChange={(e) => setPoints(e.target.value)}
        aria-label={`Adjustment points for ${name}`}
      />

      <input
        type="text"
        className="flex-1 min-w-[140px] border border-line rounded px-2 py-1 text-xs"
        placeholder="Note (optional, e.g. 'pre-launch group games')"
        value={note}
        onChange={(e) => setNote(e.target.value)}
      />

      <button
        onClick={save}
        disabled={saving}
        className="bg-pitch text-chalk text-xs font-semibold px-3 py-1.5 rounded hover:brightness-110 disabled:opacity-50"
      >
        {saving ? "..." : "Save"}
      </button>
      <button
        onClick={clear}
        disabled={saving}
        className="text-ink/40 hover:text-red text-xs px-2 py-1.5 disabled:opacity-50"
      >
        Clear
      </button>

      {msg && (
        <span className="text-xs text-ink/50 w-full sm:w-auto">{msg}</span>
      )}
    </div>
  );
}
