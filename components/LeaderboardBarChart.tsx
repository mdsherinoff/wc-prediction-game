"use client";

import { useState } from "react";
import type { LeaderboardBarDatum } from "@/lib/reports";

const SERIES = [
  { key: "groupPoints", label: "Groups", color: "#1f6e4a" },
  { key: "knockoutPoints", label: "Knockouts", color: "#e8a33d" },
  { key: "bracketPoints", label: "Bracket", color: "#0b3d2e" },
  { key: "adjustmentPoints", label: "Adjustments", color: "#c4453a" },
] as const;

const TOP_N = 5;
// Minimum pixel width a segment needs before it's worth printing a number
// inside it — narrower than this and the text would clip or overflow.
const MIN_SEGMENT_WIDTH_PCT = 7;

function totalOf(d: LeaderboardBarDatum) {
  return (
    (d.groupPoints ?? 0) +
    (d.knockoutPoints ?? 0) +
    (d.bracketPoints ?? 0) +
    (d.adjustmentPoints ?? 0)
  );
}

export default function LeaderboardBarChart({
  data,
}: {
  data: LeaderboardBarDatum[];
}) {
  const [hovered, setHovered] = useState<string | null>(null);

  if (data.length === 0) {
    return (
      <p className="text-sm text-ink/40 py-8 text-center">
        No scored predictions yet.
      </p>
    );
  }

  const top = [...data].sort((a, b) => totalOf(b) - totalOf(a)).slice(0, TOP_N);
  // Proportional to the leaderboard's own max, not each row's own total —
  // a leaderboard has to keep bar length comparable across rows, otherwise
  // a 1-point row and a 46-point row would render the same length.
  const maxTotal = Math.max(...top.map(totalOf), 1);
  // A nonzero total that's tiny relative to the leader (e.g. 1 vs 46) would
  // otherwise render as a near-invisible hairline — give it a visible floor
  // so "I have a small number of points" doesn't look identical to "broken".
  const MIN_VISIBLE_WIDTH_PCT = 6;

  return (
    <div>
      <div className="flex items-baseline gap-2.5 flex-wrap mb-1">
        <span className="font-display font-700 text-[15px] tracking-wide text-pitch">
          LEADERBOARD
        </span>
        <span className="text-[11px] tracking-wide text-ink/45">
          TOP {TOP_N} · POINTS BY SOURCE
        </span>
      </div>

      <div className="flex gap-3.5 flex-wrap mb-5 mt-3">
        {SERIES.map((s) => (
          <span
            key={s.key}
            className="flex items-center gap-1.5 text-xs text-ink/65"
          >
            <span
              className="w-2.5 h-2.5 rounded-sm inline-block"
              style={{ background: s.color }}
            />
            {s.label}
          </span>
        ))}
      </div>

      <div className="flex flex-col gap-1.5">
        {top.map((d, idx) => {
          const total = totalOf(d);
          const widthPct = Math.max(
            (total / maxTotal) * 100,
            total > 0 ? MIN_VISIBLE_WIDTH_PCT : 0,
          );
          const isHovered = hovered === d.name;

          return (
            <div
              key={d.name}
              className="relative flex items-center gap-3.5 py-2 px-2 -mx-2 rounded-md transition-colors"
              style={
                isHovered ? { background: "rgba(11,61,46,0.04)" } : undefined
              }
              onMouseEnter={() => setHovered(d.name)}
              onMouseLeave={() => setHovered(null)}
            >
              <span
                className="font-display font-700 text-[15px] w-4 text-center shrink-0"
                style={{
                  fontFamily: "'DSEG7 Classic', 'Barlow Condensed', monospace",
                  color: idx === 0 ? "#e8a33d" : "rgba(19,38,31,0.3)",
                }}
              >
                {idx + 1}
              </span>

              <span className="text-[13.5px] font-semibold text-ink shrink-0 w-[110px] truncate">
                {d.name}
              </span>

              <div className="flex-1 h-[26px] rounded-md bg-[#eae6d8] relative overflow-hidden">
                {total === 0 ? (
                  <span
                    className="absolute inset-y-0 left-2.5 flex items-center font-display font-700 text-[12px]"
                    style={{ color: "rgba(19,38,31,0.35)" }}
                  >
                    0 pt
                  </span>
                ) : (
                  <div
                    className="h-full flex"
                    style={{ width: `${widthPct}%` }}
                  >
                    {SERIES.map((s) => {
                      const v = d[s.key as keyof LeaderboardBarDatum] as
                        | number
                        | undefined;
                      const value = v ?? 0;
                      if (value <= 0) return null;
                      const segPctOfBar = (value / total) * 100;
                      const showLabel =
                        (segPctOfBar * widthPct) / 100 >= MIN_SEGMENT_WIDTH_PCT;
                      return (
                        <div
                          key={s.key}
                          className="h-full flex items-center justify-center shrink-0"
                          style={{
                            width: `${segPctOfBar}%`,
                            background: s.color,
                          }}
                        >
                          {showLabel && (
                            <span
                              className="font-display font-700 text-[11px]"
                              style={{ color: "#f5f3ec" }}
                            >
                              {value}
                            </span>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              <span className="font-display font-700 text-[15px] text-pitch w-7 text-right shrink-0">
                {total}
              </span>

              {isHovered && (
                <div
                  className="absolute z-10 rounded-lg px-3.5 py-3 min-w-[150px] pointer-events-none"
                  style={{
                    background: "#13261f",
                    boxShadow: "0 8px 20px rgba(0,0,0,0.18)",
                    top: "calc(100% + 4px)",
                    left: 140,
                  }}
                >
                  <div className="font-display font-700 text-[13px] text-chalk mb-1.5">
                    {d.name}
                  </div>
                  {SERIES.map((s) => (
                    <div
                      key={s.key}
                      className="flex items-center justify-between gap-4 text-xs py-0.5"
                      style={{ color: "rgba(245,243,236,0.55)" }}
                    >
                      <span>{s.label}</span>
                      <span className="font-semibold text-chalk">
                        {(d[s.key as keyof LeaderboardBarDatum] as number) ?? 0}
                      </span>
                    </div>
                  ))}
                  <div
                    className="flex items-center justify-between gap-4 text-xs pt-1.5 mt-1"
                    style={{
                      borderTop: "1px solid rgba(245,243,236,0.15)",
                      color: "rgba(245,243,236,0.55)",
                    }}
                  >
                    <span>Total</span>
                    <span className="font-bold" style={{ color: "#e8a33d" }}>
                      {total}
                    </span>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
