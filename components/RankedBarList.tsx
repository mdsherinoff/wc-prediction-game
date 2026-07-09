"use client";

import type { RankedDatum } from "@/lib/reports";

/**
 * A compact ranked list of horizontal bars, each scaled to the largest value
 * in the set. Good for count-based rankings (correct picks, popular scorelines)
 * where a fixed 0–100% axis would render everything as tiny slivers.
 */
export default function RankedBarList({
  data,
  color,
  title,
  subtitle,
  valueSuffix = "",
  maxRows = 8,
  emptyLabel = "Not enough data yet.",
}: {
  data: RankedDatum[];
  color: string;
  title?: string;
  subtitle?: string;
  valueSuffix?: string;
  maxRows?: number;
  emptyLabel?: string;
}) {
  const rows = data.slice(0, maxRows);

  if (rows.length === 0) {
    return (
      <div>
        <Heading title={title} subtitle={subtitle} />
        <p className="text-sm text-ink/40 py-8 text-center">{emptyLabel}</p>
      </div>
    );
  }

  const max = Math.max(...rows.map((r) => r.value), 1);

  return (
    <div>
      <Heading title={title} subtitle={subtitle} />
      <div className="flex flex-col gap-1.5 mt-3">
        {rows.map((r, idx) => {
          const widthPct = Math.max((r.value / max) * 100, 4);
          return (
            <div key={r.label} className="flex items-center gap-3">
              <span
                className="font-display font-700 text-[13px] w-4 text-center shrink-0"
                style={{ color: idx === 0 ? "#e8a33d" : "rgba(19,38,31,0.3)" }}
              >
                {idx + 1}
              </span>
              <span className="text-[13px] font-semibold text-ink shrink-0 w-[92px] truncate">
                {r.label}
              </span>
              <div className="flex-1 h-[24px] rounded-md bg-[#eae6d8] relative overflow-hidden">
                <div
                  className="h-full rounded-md flex items-center justify-end pr-2"
                  style={{ width: `${widthPct}%`, background: color }}
                >
                  <span className="font-display font-700 text-[11px] text-chalk">
                    {r.value}
                    {valueSuffix}
                  </span>
                </div>
              </div>
              {r.caption && (
                <span className="text-xs text-ink/45 w-10 text-right shrink-0">
                  {r.caption}
                </span>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function Heading({
  title,
  subtitle,
}: {
  title?: string;
  subtitle?: string;
}) {
  if (!title && !subtitle) return null;
  return (
    <div className="flex items-baseline gap-2.5 flex-wrap">
      {title && (
        <span className="font-display font-700 text-[15px] tracking-wide text-pitch">
          {title}
        </span>
      )}
      {subtitle && (
        <span className="text-[11px] tracking-wide text-ink/45">
          {subtitle}
        </span>
      )}
    </div>
  );
}
