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

// Renders a value centered inside its own bar segment, but only if the
// segment is wide enough for the text to actually fit — narrow slivers
// (e.g. 1 point next to a 40-point segment) render no label rather than
// an overflowing or clipped number.
function SegmentLabel({
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
  if (typeof value !== "number" || value <= 0) return null;
  // Rough minimum width for a 2-digit label at this font size — below
  // this, skip the label rather than render something illegible/clipped.
  const MIN_WIDTH_FOR_LABEL = 22;
  if (nw < MIN_WIDTH_FOR_LABEL) return null;

  return (
    <text
      x={nx + nw / 2}
      y={ny + nh / 2}
      dy={4}
      textAnchor="middle"
      fontSize={11}
      fontWeight={700}
      fill="#f5f3ec"
      fontFamily="'Barlow Condensed', sans-serif"
    >
      {value}
    </text>
  );
}

// Headline total, anchored just past the end of the full stacked bar.
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
  // A zero-width segment means this particular bar (floor or real) isn't
  // the one actually drawn for this row — skip it so the other segment's
  // label is the only one rendered, avoiding duplicate/overlapping totals.
  if (nw === 0) return null;

  return (
    <text
      x={nx + nw + 10}
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

// Label for the zero-point placeholder track — writes "0 pt" directly on
// the muted background, but only for rows whose real total is zero (it's
// wired to fire on every row, so it self-filters here).
function ZeroLabel({
  x,
  y,
  height,
  value,
}: {
  x?: string | number;
  y?: string | number;
  height?: string | number;
  value?: string | number | boolean | null;
}) {
  if (typeof value === "number" && value > 0) return null;

  const nx = Number(x);
  const ny = Number(y);
  const nh = Number(height);
  if ([nx, ny, nh].some((n) => Number.isNaN(n))) return null;

  return (
    <text
      x={nx + 10}
      y={ny + nh / 2}
      dy={4}
      fontSize={12}
      fontWeight={700}
      fill="rgba(19,38,31,0.35)"
      fontFamily="'Barlow Condensed', sans-serif"
    >
      0 pt
    </text>
  );
}

// Custom tooltip, styled with the app's fonts/colors instead of Recharts'
// default white box. Reads straight off `payload`, so it only ever shows
// the real SERIES entries — there's no separate placeholder series to
// accidentally leak in anymore (the empty-row track is a Bar `background`,
// which never appears in tooltip payloads).
function ChartTooltip({
  active,
  payload,
  label,
}: {
  active?: boolean;
  payload?: { dataKey?: string; value?: number; color?: string }[];
  label?: string;
}) {
  if (!active || !payload || payload.length === 0) return null;

  const total = payload.reduce((sum, p) => sum + (p.value ?? 0), 0);

  return (
    <div
      className="rounded-lg px-3.5 py-3 min-w-[150px]"
      style={{
        background: "#13261f",
        boxShadow: "0 8px 20px rgba(0,0,0,0.18)",
      }}
    >
      <div className="font-display font-700 text-[13px] text-chalk mb-1.5">
        {label}
      </div>
      {SERIES.map((s) => {
        const entry = payload.find((p) => p.dataKey === s.key);
        return (
          <div
            key={s.key}
            className="flex items-center justify-between gap-4 text-xs py-0.5"
            style={{ color: "rgba(245,243,236,0.55)" }}
          >
            <span>{s.label}</span>
            <span className="font-semibold text-chalk">
              {entry?.value ?? 0}
            </span>
          </div>
        );
      })}
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

  const maxTotal = Math.max(...top.map(totalOf), 1);

  // Reverse for display only, so rank #1 renders at the top of the chart
  // (Recharts vertical-layout bars draw top-to-bottom in array order).
  const chartData = [...top].reverse().map((d) => ({
    ...d,
    total: totalOf(d),
  }));

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
              width={150}
              tickLine={false}
              axisLine={false}
              tick={(props) => (
                <RankedNameTick {...props} rankByName={rankByName} />
              )}
            />
            <Tooltip
              cursor={{ fill: "rgba(11,61,46,0.04)" }}
              content={<ChartTooltip />}
            />
            {SERIES.map((s, i) => (
              <Bar
                key={s.key}
                dataKey={s.key}
                stackId="pts"
                name={s.label}
                fill={s.color}
                barSize={26}
                radius={
                  i === SERIES.length - 1
                    ? [0, 6, 6, 0]
                    : i === 0
                      ? [6, 0, 0, 6]
                      : undefined
                }
                // Full-width muted track behind every bar — only needs to
                // be declared once, on the first series, since Recharts
                // draws one shared background per category row.
                background={
                  i === 0 ? { fill: "#e4e0d2", radius: 6 } : undefined
                }
              >
                <LabelList dataKey={s.key} content={SegmentLabel} />
                {i === SERIES.length - 1 && (
                  <LabelList dataKey="total" content={TotalLabel} />
                )}
                {i === 0 && <LabelList dataKey="total" content={ZeroLabel} />}
              </Bar>
            ))}
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
