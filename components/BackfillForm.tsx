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

type EntryState = {
  homeScore: string;
  awayScore: string;
  winner: string;
  knownIncorrect: boolean;
  exactGuessUnknown: boolean;
  markedCorrect: boolean | "winnerOnly" | "exact" | null;
  included: boolean;
};

function emptyEntry(): EntryState {
  return {
    homeScore: "",
    awayScore: "",
    winner: "",
    knownIncorrect: false,
    exactGuessUnknown: false,
    markedCorrect: null,
    included: false,
  };
}

export default function BackfillForm({
  users,
  matches,
}: {
  users: { id: string; label: string }[];
  matches: MatchOption[];
}) {
  const [matchId, setMatchId] = useState("");
  const [entries, setEntries] = useState<Record<string, EntryState>>({});
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  const selectedMatch = matches.find((m) => m.id === matchId);
  const isGroup = selectedMatch?.stage === "GROUP";

  function selectMatch(id: string) {
    setMatchId(id);
    setEntries({});
    setMsg(null);
  }

  function toggleUser(userId: string) {
    setEntries((prev) => {
      const existing = prev[userId] ?? emptyEntry();
      return {
        ...prev,
        [userId]: { ...existing, included: !existing.included },
      };
    });
  }

  function updateEntry(userId: string, patch: Partial<EntryState>) {
    setEntries((prev) => ({
      ...prev,
      [userId]: { ...(prev[userId] ?? emptyEntry()), ...patch },
    }));
  }

  const includedUserIds = Object.entries(entries)
    .filter(([, e]) => e.included)
    .map(([userId]) => userId);

  async function saveAll() {
    if (!matchId || includedUserIds.length === 0) {
      setMsg("Pick a match and at least one person");
      return;
    }
    setSaving(true);
    setMsg(null);
    try {
      const payload = includedUserIds.map((userId) => {
        const e = entries[userId];
        const scoreIsKnown = !e.knownIncorrect || !e.exactGuessUnknown;
        return {
          userId,
          homeScore:
            scoreIsKnown && e.homeScore !== ""
              ? parseInt(e.homeScore, 10)
              : null,
          awayScore:
            scoreIsKnown && e.awayScore !== ""
              ? parseInt(e.awayScore, 10)
              : null,
          predictedWinner: e.winner || null,
          knownIncorrect: e.knownIncorrect,
          markedCorrect: e.markedCorrect ?? undefined,
        };
      });

      const res = await fetch("/api/admin/backfill-prediction/batch", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ matchId, entries: payload }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed to save");

      const failed = (data.results ?? []).filter((r: { ok: boolean }) => !r.ok);
      if (failed.length > 0) {
        setMsg(
          `Saved ${data.results.length - failed.length}/${data.results.length}. ${failed
            .map(
              (f: { userId: string; error?: string }) =>
                `${f.userId}: ${f.error}`,
            )
            .join("; ")}`,
        );
      } else {
        setMsg(`Saved all ${data.results.length} prediction(s) and re-scored.`);
      }
    } catch (e) {
      setMsg(e instanceof Error ? e.message : "Failed to save");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-4 border border-line rounded p-4">
      <div>
        <label className="text-xs text-ink/50 block mb-1">Match</label>
        <select
          value={matchId}
          onChange={(e) => selectMatch(e.target.value)}
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
          <label className="text-xs text-ink/50 block mb-2">
            People to enter predictions for ({includedUserIds.length} selected)
          </label>
          <div className="space-y-2">
            {users.map((u) => {
              const entry = entries[u.id] ?? emptyEntry();
              return (
                <div
                  key={u.id}
                  className={`border rounded px-3 py-2 ${
                    entry.included ? "border-turf bg-turf/5" : "border-line"
                  }`}
                >
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={entry.included}
                      onChange={() => toggleUser(u.id)}
                    />
                    <span className="text-sm font-medium">{u.label}</span>
                  </label>

                  {entry.included && (
                    <div className="mt-2 ml-6 space-y-2">
                      <div className="flex gap-2 flex-wrap">
                        <button
                          type="button"
                          onClick={() =>
                            updateEntry(u.id, {
                              knownIncorrect: !entry.knownIncorrect,
                              exactGuessUnknown: false,
                              markedCorrect: null,
                            })
                          }
                          className={`px-2 py-1 rounded border text-xs font-medium ${
                            entry.knownIncorrect
                              ? "bg-red text-chalk border-red"
                              : "border-line text-ink/60"
                          }`}
                        >
                          {entry.knownIncorrect
                            ? "✓ Marked wrong"
                            : "Mark as wrong"}
                        </button>

                        {isGroup ? (
                          <button
                            type="button"
                            onClick={() =>
                              updateEntry(u.id, {
                                markedCorrect: entry.markedCorrect
                                  ? null
                                  : true,
                                knownIncorrect: false,
                              })
                            }
                            className={`px-2 py-1 rounded border text-xs font-medium ${
                              entry.markedCorrect
                                ? "bg-turf text-chalk border-turf"
                                : "border-line text-ink/60"
                            }`}
                          >
                            {entry.markedCorrect
                              ? "✓ Marked correct (uses real score)"
                              : "Mark as correct"}
                          </button>
                        ) : (
                          <>
                            <button
                              type="button"
                              onClick={() =>
                                updateEntry(u.id, {
                                  markedCorrect:
                                    entry.markedCorrect === "winnerOnly"
                                      ? null
                                      : "winnerOnly",
                                  knownIncorrect: false,
                                })
                              }
                              className={`px-2 py-1 rounded border text-xs font-medium ${
                                entry.markedCorrect === "winnerOnly"
                                  ? "bg-turf text-chalk border-turf"
                                  : "border-line text-ink/60"
                              }`}
                            >
                              {entry.markedCorrect === "winnerOnly"
                                ? "✓ Correct winner only"
                                : "Mark winner correct"}
                            </button>
                            <button
                              type="button"
                              onClick={() =>
                                updateEntry(u.id, {
                                  markedCorrect:
                                    entry.markedCorrect === "exact"
                                      ? null
                                      : "exact",
                                  knownIncorrect: false,
                                })
                              }
                              className={`px-2 py-1 rounded border text-xs font-medium ${
                                entry.markedCorrect === "exact"
                                  ? "bg-amber text-ink border-amber"
                                  : "border-line text-ink/60"
                              }`}
                            >
                              {entry.markedCorrect === "exact"
                                ? "★ Correct winner + exact score"
                                : "Mark winner + score correct"}
                            </button>
                          </>
                        )}
                      </div>

                      {entry.knownIncorrect && (
                        <label className="flex items-center gap-2 text-xs text-ink/60 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={!entry.exactGuessUnknown}
                            onChange={() =>
                              updateEntry(u.id, {
                                exactGuessUnknown: !entry.exactGuessUnknown,
                              })
                            }
                          />
                          I know what they actually guessed
                        </label>
                      )}

                      {!entry.markedCorrect &&
                        (!entry.knownIncorrect || !entry.exactGuessUnknown) &&
                        isGroup && (
                          <div className="flex items-center gap-2">
                            <span className="text-xs text-ink/50 w-24 truncate">
                              {selectedMatch.homeTeamName}
                            </span>
                            <input
                              type="number"
                              min={0}
                              value={entry.homeScore}
                              onChange={(e) =>
                                updateEntry(u.id, { homeScore: e.target.value })
                              }
                              className="w-14 border border-line rounded px-2 py-1 text-center text-sm"
                            />
                            <span className="text-ink/40">-</span>
                            <input
                              type="number"
                              min={0}
                              value={entry.awayScore}
                              onChange={(e) =>
                                updateEntry(u.id, { awayScore: e.target.value })
                              }
                              className="w-14 border border-line rounded px-2 py-1 text-center text-sm"
                            />
                            <span className="text-xs text-ink/50 truncate">
                              {selectedMatch.awayTeamName}
                            </span>
                          </div>
                        )}

                      {!entry.markedCorrect &&
                        (!entry.knownIncorrect || !entry.exactGuessUnknown) &&
                        !isGroup && (
                          <div className="space-y-2">
                            <div className="flex gap-2">
                              {selectedMatch.homeTeamId && (
                                <button
                                  type="button"
                                  onClick={() =>
                                    updateEntry(u.id, {
                                      winner: selectedMatch.homeTeamId!,
                                    })
                                  }
                                  className={`px-2 py-1 rounded border text-xs ${
                                    entry.winner === selectedMatch.homeTeamId
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
                                  onClick={() =>
                                    updateEntry(u.id, {
                                      winner: selectedMatch.awayTeamId!,
                                    })
                                  }
                                  className={`px-2 py-1 rounded border text-xs ${
                                    entry.winner === selectedMatch.awayTeamId
                                      ? "bg-turf text-chalk border-turf"
                                      : "border-line"
                                  }`}
                                >
                                  {selectedMatch.awayTeamName}
                                </button>
                              )}
                            </div>
                            <div className="flex items-center gap-2">
                              <span className="text-xs text-ink/50">
                                Score (optional):
                              </span>
                              <input
                                type="number"
                                min={0}
                                value={entry.homeScore}
                                onChange={(e) =>
                                  updateEntry(u.id, {
                                    homeScore: e.target.value,
                                  })
                                }
                                className="w-14 border border-line rounded px-2 py-1 text-center text-sm"
                              />
                              <span className="text-ink/40">-</span>
                              <input
                                type="number"
                                min={0}
                                value={entry.awayScore}
                                onChange={(e) =>
                                  updateEntry(u.id, {
                                    awayScore: e.target.value,
                                  })
                                }
                                className="w-14 border border-line rounded px-2 py-1 text-center text-sm"
                              />
                            </div>
                          </div>
                        )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {selectedMatch && (
        <div className="flex items-center gap-3">
          <button
            onClick={saveAll}
            disabled={saving || includedUserIds.length === 0}
            className="bg-pitch text-chalk text-sm font-semibold px-4 py-2 rounded disabled:opacity-50"
          >
            {saving
              ? "Saving..."
              : `Save ${includedUserIds.length || ""} prediction(s)`}
          </button>
          {msg && <span className="text-sm text-ink/60">{msg}</span>}
        </div>
      )}
    </div>
  );
}
