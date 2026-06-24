"use client";

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from "recharts";
import type { LeaderboardBarDatum } from "@/lib/reports";

const SERIES = [
  { key: "groupPoints", label: "Groups", color: "#1f6e4a" },
  { key: "knockoutPoints", label: "Knockouts", color: "#e8a33d" },
  { key: "bracketPoints", label: "Bracket", color: "#0b3d2e" },
  { key: "adjustmentPoints", label: "Adjustments", color: "#c4453a" },
] as const;

export default function LeaderboardBarChart({
  data,
}: {
  data: LeaderboardBarDatum[];
}) {
  if (data.length === 0) {
    return (
      <p className="text-sm text-ink/40 py-8 text-center">
        No scored predictions yet.
      </p>
    );
  }

  return (
    <div>
      <div className="flex items-baseline gap-2.5 flex-wrap mb-3.5">
        <span className="font-display font-700 text-[15px] tracking-wide text-pitch">
          LEADERBOARD
        </span>
        <span className="text-[11px] tracking-wide text-ink/45">
          POINTS BY SOURCE
        </span>
      </div>

      <div className="flex gap-3.5 flex-wrap mb-3.5">
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

      <div className="w-full h-80">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            data={data}
            margin={{ top: 8, right: 8, left: 0, bottom: 8 }}
          >
            <CartesianGrid
              strokeDasharray="3 3"
              stroke="#d8d3c3"
              vertical={false}
            />
            <XAxis
              dataKey="name"
              tick={{ fontSize: 12, fill: "#13261f" }}
              interval={0}
              angle={-30}
              textAnchor="end"
              height={60}
            />
            <YAxis
              tick={{ fontSize: 12, fill: "#13261f" }}
              allowDecimals={false}
            />
            <Tooltip
              contentStyle={{
                fontSize: 13,
                borderRadius: 8,
                border: "1px solid #d8d3c3",
              }}
            />
            {SERIES.map((s, i) => (
              <Bar
                key={s.key}
                dataKey={s.key}
                stackId="pts"
                name={s.label}
                fill={s.color}
                radius={i === SERIES.length - 1 ? [4, 4, 0, 0] : undefined}
              />
            ))}
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
