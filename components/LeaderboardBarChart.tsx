"use client";

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  LabelList,
  ResponsiveContainer,
} from "recharts";
import type { LeaderboardBarDatum } from "@/lib/reports";

const SERIES = [
  { key: "groupPoints", label: "Groups", color: "#1f6e4a" },
  { key: "knockoutPoints", label: "Knockouts", color: "#e8a33d" },
  { key: "bracketPoints", label: "Bracket", color: "#0b3d2e" },
  { key: "adjustmentPoints", label: "Adjustments", color: "#c4453a" },
] as const;

const TOP_N = 5;

function totalOf(d: LeaderboardBarDatum) {
  return (
    (d.groupPoints ?? 0) +
    (d.knockoutPoints ?? 0) +
    (d.bracketPoints ?? 0) +
    (d.adjustmentPoints ?? 0)
  );
}

// Custom tick renders "#1  Jamie M." instead of just the name, so rank
// reads directly off the axis without a separate disconnected list.
function RankedNameTick({
  x,
  y,
  payload,
  rankByName,
}: {
  x?: string | number;
  y?: string | number;
  payload?: { value: string };
  rankByName: Map<string, number>;
}) {
  const nx = Number(x) || 0;
  const ny = Number(y) || 0;
  if (!payload) return null;
  const rank = rankByName.get(payload.value);
  return (
    <g transform={`translate(${nx},${ny})`}>
      <text
        x={0}
        y={0}
        dy={4}
        textAnchor="end"
        fontSize={13}
        fontFamily="Inter, sans-serif"
      >
        <tspan
          fill="#e8a33d"
          fontWeight={700}
          fontFamily="'DSEG7 Classic', 'Barlow Condensed', monospace"
        >
          {rank}{" "}
        </tspan>
        <tspan fill="#13261f" fontWeight={500}>
          {payload.value}
        </tspan>
      </text>
    </g>
  );
}

function TotalLabel({
  x,
  y,
  width,
  height,
  value,
}: {
  x?: string | number;
  y?: string | number;
  width?: string | number;
  height?: string | number;
  value?: string | number | boolean | null;
}) {
  const nx = Number(x);
  const ny = Number(y);
  const nw = Number(width);
  const nh = Number(height);
  if ([nx, ny, nw, nh].some((n) => Number.isNaN(n))) return null;

  return (
    <text
      x={nx + nw + 8}
      y={ny + nh / 2}
      dy={4}
      fontSize={15}
      fontWeight={700}
      fill="#0b3d2e"
      fontFamily="'Barlow Condensed', sans-serif"
    >
      {value}
    </text>
  );
}

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

  const ranked = [...data].sort((a, b) => totalOf(b) - totalOf(a));
  const top = ranked.slice(0, TOP_N);
  const rankByName = new Map(top.map((d, i) => [d.name, i + 1]));

  // Reverse for display only, so rank #1 renders at the top of the chart
  // (Recharts vertical-layout bars draw top-to-bottom in array order).
  const chartData = [...top].reverse().map((d) => ({
    ...d,
    total: totalOf(d),
  }));

  const maxTotal = Math.max(...top.map(totalOf), 1);

  return (
    <div>
      <div className="flex items-baseline gap-2.5 flex-wrap mb-3.5">
        <span className="font-display font-700 text-[15px] tracking-wide text-pitch">
          LEADERBOARD
        </span>
        <span className="text-[11px] tracking-wide text-ink/45">
          TOP {TOP_N} · POINTS BY SOURCE
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

      <div className="w-full" style={{ height: chartData.length * 56 + 20 }}>
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            data={chartData}
            layout="vertical"
            barCategoryGap={18}
            margin={{ top: 4, right: 44, left: 4, bottom: 4 }}
          >
            <XAxis type="number" hide domain={[0, maxTotal]} />
            <YAxis
              type="category"
              dataKey="name"
              width={120}
              tickLine={false}
              axisLine={false}
              tick={(props) => (
                <RankedNameTick {...props} rankByName={rankByName} />
              )}
            />
            <Tooltip
              cursor={{ fill: "rgba(11,61,46,0.04)" }}
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
                barSize={22}
                radius={
                  i === SERIES.length - 1
                    ? [0, 6, 6, 0]
                    : i === 0
                      ? [6, 0, 0, 6]
                      : undefined
                }
              >
                {i === SERIES.length - 1 && (
                  <LabelList dataKey="total" content={TotalLabel} />
                )}
              </Bar>
            ))}
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
