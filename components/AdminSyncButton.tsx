"use client";

import { useState } from "react";

export default function AdminSyncButton() {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<string | null>(null);

  async function sync() {
    setLoading(true);
    setResult(null);
    try {
      const res = await fetch("/api/admin/sync-results", { method: "POST" });
      const body = await res.json();
      if (!res.ok) throw new Error(body.error ?? "Sync failed");
      setResult(
        `Synced. Updated ${body.syncResult.updatedCount} matches. Scored ${body.scoreResult.groupScored} group / ${body.scoreResult.knockoutScored} knockout / ${body.scoreResult.bracketScored} bracket predictions.${
          body.bracketJustUnlocked ? " Bracket predictor just unlocked!" : ""
        }`
      );
    } catch (e) {
      setResult(e instanceof Error ? e.message : "Sync failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div>
      <button
        onClick={sync}
        disabled={loading}
        className="bg-turf text-chalk font-semibold px-4 py-2 rounded hover:brightness-110 transition disabled:opacity-50"
      >
        {loading ? "Syncing..." : "Sync results now"}
      </button>
      {result && <p className="text-sm text-ink/70 mt-2">{result}</p>}
    </div>
  );
}
