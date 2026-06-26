"use client";

import { useState } from "react";

export default function PointsConfigForm({
  configKey,
  label,
  value,
}: {
  configKey: string;
  label: string;
  value: number;
}) {
  const [current, setCurrent] = useState(String(value));
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  async function save() {
    const parsed = parseInt(current, 10);
    if (isNaN(parsed)) {
      setMsg("Enter a whole number");
      return;
    }
    setSaving(true);
    setMsg(null);
    try {
      const res = await fetch("/api/admin/points-config", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ key: configKey, value: parsed }),
      });
      const body = await res.json();
      if (!res.ok) throw new Error(body.error ?? "Failed to save");
      setMsg("Saved — leaderboard re-scored.");
      setTimeout(() => setMsg(null), 3000);
    } catch (e) {
      setMsg(e instanceof Error ? e.message : "Failed to save");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="border border-line rounded px-4 py-3 flex items-center gap-3 flex-wrap">
      <span className="flex-1 text-sm">{label}</span>
      <input
        type="number"
        value={current}
        onChange={(e) => setCurrent(e.target.value)}
        className="w-20 border border-line rounded px-2 py-1.5 text-center"
      />
      <button
        onClick={save}
        disabled={saving}
        className="bg-pitch text-chalk text-xs font-semibold px-3 py-1.5 rounded hover:brightness-110 disabled:opacity-50"
      >
        {saving ? "Saving..." : "Save"}
      </button>
      {msg && <span className="text-xs text-ink/50 w-full">{msg}</span>}
    </div>
  );
}
