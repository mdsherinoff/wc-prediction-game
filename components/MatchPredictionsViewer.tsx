"use client";

import { useState } from "react";

type MatchOption = { id: string; stage: string; label: string };

type GroupPredictionRow = {
  userName: string;
  homeScore: number | null;
  awayScore: number | null;
  knownIncorrect: boolean;
  pointsAwarded: number | null;
  createdAt: string;
  updatedAt: string;
};

type KnockoutPredictionRow = GroupPredictionRow & {
  predictedWinner: string | null;
};

type ApiResponse = {
  stage: string;
  homeTeamName: string;
  awayTeamName: string;
  homeTeamId?: string;
  awayTeamId?: string;
  predictions: (GroupPredictionRow | KnockoutPredictionRow)[];
};

function formatTimestamp(iso: string) {
  return new Date(iso).toLocaleString(undefined, {
    weekday: "short",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
    second: "2-digit",
  });
}

export default function MatchPredictionsViewer({
  matches,
}: {
  matches: MatchOption[];
}) {
  const [matchId, setMatchId] = useState("");
  const [data, setData] = useState<ApiResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function load(id: string) {
    setMatchId(id);
    setData(null);
    setError(null);
    if (!id) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/match-predictions?matchId=${id}`);
      const body = await res.json();
      if (!res.ok) throw new Error(body.error ?? "Failed to load");
      setData(body);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load");
    } finally {
      setLoading(false);
    }
  }

  const isGroup = data?.stage === "GROUP";

  return (
    <div>
      <select
        value={matchId}
        onChange={(e) => load(e.target.value)}
        className="w-full border border-line rounded px-3 py-2 text-sm mb-6"
      >
        <option value="">Select a match...</option>
        {matches.map((m) => (
          <option key={m.id} value={m.id}>
            [{m.stage}] {m.label}
          </option>
        ))}
      </select>

      {loading && <p className="text-sm text-ink/40">Loading...</p>}
      {error && <p className="text-sm text-red">{error}</p>}

      {data && (
        <div>
          <div className="flex items-center justify-between gap-3 flex-wrap mb-1">
            <h2 className="font-display text-lg font-700 text-pitch">
              {data.homeTeamName} vs {data.awayTeamName}
            </h2>
            <a
              href={`/api/admin/match-predictions/pdf?matchId=${matchId}`}
              className="text-xs bg-pitch text-chalk px-3 py-1.5 rounded font-semibold hover:brightness-110"
            >
              Download PDF
            </a>
          </div>
          <p className="text-xs text-ink/50 mb-4">
            {data.predictions.length} prediction
            {data.predictions.length === 1 ? "" : "s"}, most recently updated
            first.
          </p>

          {data.predictions.length === 0 ? (
            <p className="text-sm text-ink/40">
              No one has predicted this match.
            </p>
          ) : (
            <div className="space-y-2">
              {data.predictions.map((p, i) => (
                <div
                  key={i}
                  className="border border-line rounded px-4 py-3 text-sm"
                >
                  <div className="flex items-center justify-between gap-3 flex-wrap mb-1">
                    <span className="font-semibold text-ink">{p.userName}</span>
                    {p.pointsAwarded != null && (
                      <span className="text-amber font-semibold text-xs">
                        +{p.pointsAwarded} pt
                      </span>
                    )}
                  </div>

                  <div className="text-ink/70 mb-2">
                    {p.knownIncorrect ? (
                      <span className="text-red">
                        Marked as a known-wrong guess (no exact value recorded)
                      </span>
                    ) : isGroup ? (
                      <span>
                        Predicted{" "}
                        <span className="font-display font-700">
                          {p.homeScore}-{p.awayScore}
                        </span>
                      </span>
                    ) : (
                      <span>
                        Picked{" "}
                        <span className="font-display font-700">
                          {(p as KnockoutPredictionRow).predictedWinner ===
                          data.homeTeamId
                            ? data.homeTeamName
                            : (p as KnockoutPredictionRow).predictedWinner ===
                                data.awayTeamId
                              ? data.awayTeamName
                              : "—"}
                        </span>
                        {p.homeScore != null && p.awayScore != null && (
                          <span className="text-ink/50 ml-1">
                            ({p.homeScore}-{p.awayScore})
                          </span>
                        )}
                      </span>
                    )}
                  </div>

                  <div className="text-xs text-ink/40 flex flex-wrap gap-x-4 gap-y-0.5">
                    <span>First predicted: {formatTimestamp(p.createdAt)}</span>
                    {p.updatedAt !== p.createdAt && (
                      <span>Last updated: {formatTimestamp(p.updatedAt)}</span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
