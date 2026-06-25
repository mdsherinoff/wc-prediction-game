"use client";

const TOP_N = 5;
const RADIUS = 42;
const STROKE = 10;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

export default function RadialPercentChart({
  data,
  dataKey,
  color,
  title,
  subtitle,
}: {
  data: { name: string; [key: string]: string | number }[];
  dataKey: string;
  color: string;
  title?: string;
  subtitle?: string;
}) {
  if (data.length === 0) {
    return (
      <p className="text-sm text-ink/40 py-8 text-center">
        Not enough data yet.
      </p>
    );
  }

  const top = [...data]
    .sort((a, b) => Number(b[dataKey]) - Number(a[dataKey]))
    .slice(0, TOP_N);

  return (
    <div>
      {(title || subtitle) && (
        <div className="flex items-baseline gap-2.5 flex-wrap mb-3.5">
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
      )}

      <div className="flex gap-7 flex-wrap justify-center py-2">
        {top.map((d) => {
          const pct = Math.max(0, Math.min(100, Number(d[dataKey]) || 0));
          const offset = CIRCUMFERENCE * (1 - pct / 100);
          return (
            <div key={d.name} className="text-center">
              <svg width={100} height={100} viewBox="0 0 100 100">
                <circle
                  cx={50}
                  cy={50}
                  r={RADIUS}
                  fill="none"
                  stroke="#f0eee5"
                  strokeWidth={STROKE}
                />
                <circle
                  cx={50}
                  cy={50}
                  r={RADIUS}
                  fill="none"
                  stroke={color}
                  strokeWidth={STROKE}
                  strokeDasharray={CIRCUMFERENCE}
                  strokeDashoffset={offset}
                  strokeLinecap="round"
                  transform="rotate(-90 50 50)"
                />
                <text
                  x={50}
                  y={50}
                  dy={7}
                  fontSize={20}
                  fontWeight={700}
                  fill="#0b3d2e"
                  textAnchor="middle"
                  fontFamily="'Barlow Condensed', sans-serif"
                >
                  {Math.round(pct)}%
                </text>
              </svg>
              <div className="text-xs text-ink mt-1 font-medium truncate max-w-[100px]">
                {d.name}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
