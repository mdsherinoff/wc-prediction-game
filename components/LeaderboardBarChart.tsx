"use client";

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  ResponsiveContainer,
  CartesianGrid,
} from "recharts";
import type { LeaderboardBarDatum } from "@/lib/reports";

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
    <div className="w-full h-80">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 8 }}>
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
          <Legend wrapperStyle={{ fontSize: 12 }} />
          <Bar
            dataKey="groupPoints"
            stackId="pts"
            name="Groups"
            fill="#1f6e4a"
          />
          <Bar
            dataKey="knockoutPoints"
            stackId="pts"
            name="Knockouts"
            fill="#e8a33d"
          />
          <Bar
            dataKey="bracketPoints"
            stackId="pts"
            name="Bracket"
            fill="#0b3d2e"
          />
          <Bar
            dataKey="adjustmentPoints"
            stackId="pts"
            name="Adjustments"
            fill="#c4453a"
          />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
