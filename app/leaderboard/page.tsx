import { prisma } from "@/lib/prisma";
import Image from "next/image";
import Link from "next/link";

export const dynamic = "force-dynamic";

export default async function LeaderboardPage() {
  const users = await prisma.user.findMany({
    select: {
      id: true,
      name: true,
      image: true,
      groupPredictions: { select: { pointsAwarded: true } },
      knockoutPredictions: { select: { pointsAwarded: true } },
      bracketPicks: { select: { pointsAwarded: true } },
      manualAdjustment: { select: { points: true } },
    },
  });

  const sum = (vals: (number | null)[]) =>
    vals.reduce((acc: number, v) => acc + (v ?? 0), 0);

  const rows = users
    .map((u) => {
      const groupPoints = sum(u.groupPredictions.map((p) => p.pointsAwarded));
      const knockoutPoints = sum(
        u.knockoutPredictions.map((p) => p.pointsAwarded),
      );
      const bracketPoints = sum(u.bracketPicks.map((p) => p.pointsAwarded));
      const adjustmentPoints = u.manualAdjustment?.points ?? 0;
      return {
        id: u.id,
        name: u.name ?? "Anonymous",
        image: u.image,
        groupPoints,
        knockoutPoints,
        bracketPoints,
        adjustmentPoints,
        total: groupPoints + knockoutPoints + bracketPoints + adjustmentPoints,
      };
    })
    .sort((a, b) => b.total - a.total);

  return (
    <div className="max-w-3xl mx-auto px-4 py-8">
      <h1 className="font-display text-3xl font-700 text-pitch mb-1">
        Leaderboard
      </h1>
      <p className="text-sm text-ink/60 mb-8">
        Group: exact score only. Knockouts: winner + score bonus. Bracket:
        correct advancer picks.
      </p>

      {/* Mobile: stacked cards, rank + name + total always visible, tap for breakdown */}
      <div className="sm:hidden space-y-2">
        {rows.length === 0 && (
          <p
            className="scoreboard-card py-8 text-center text-sm"
            style={{ color: "rgba(245,243,236,0.4)" }}
          >
            No predictions scored yet.
          </p>
        )}
        {rows.map((r, i) => (
          <Link
            key={r.id}
            href={`/users/${r.id}`}
            className="scoreboard-card flex items-center gap-3 px-3 py-2.5"
            style={
              i === 0 ? { background: "rgba(232,163,61,0.08)" } : undefined
            }
          >
            <span
              className="font-display font-700 text-[16px] text-[var(--amber)] w-6 shrink-0 text-center"
              style={{
                fontFamily: "'DSEG7 Classic', 'Barlow Condensed', monospace",
              }}
            >
              {i + 1}
            </span>

            {r.image ? (
              <Image
                src={r.image}
                alt={r.name}
                width={28}
                height={28}
                className="rounded-full shrink-0"
              />
            ) : (
              <span
                className="w-7 h-7 rounded-full flex items-center justify-center font-display font-700 text-[10px] text-[var(--amber)] shrink-0"
                style={{ background: "rgba(0,0,0,0.3)" }}
              >
                {r.name
                  .split(" ")
                  .map((p) => p[0])
                  .slice(0, 2)
                  .join("")
                  .toUpperCase()}
              </span>
            )}

            <span className="flex-1 min-w-0 truncate text-[var(--chalk)] text-sm">
              {r.name}
            </span>

            <span
              className="font-display font-700 text-lg text-[var(--amber)] shrink-0"
              style={{
                fontFamily: "'DSEG7 Classic', 'Barlow Condensed', monospace",
              }}
            >
              {r.total}
            </span>
          </Link>
        ))}
        <p
          className="text-xs text-center pt-1"
          style={{ color: "rgba(19,38,31,0.4)" }}
        >
          Tap anyone to see their full points breakdown.
        </p>
      </div>

      {/* Desktop/tablet: full table with every column */}
      <div className="hidden sm:block scoreboard-card overflow-x-auto">
        <table className="w-full text-sm min-w-[540px]">
          <thead>
            <tr
              style={{ background: "rgba(0,0,0,0.25)" }}
              className="text-left"
            >
              <th className="py-3 px-4 font-display font-600 text-[12px] tracking-wide text-[var(--amber)]">
                #
              </th>
              <th className="py-3 px-4 font-display font-600 text-[12px] tracking-wide text-[var(--amber)]">
                Player
              </th>
              <th className="py-3 px-4 font-display font-600 text-[12px] tracking-wide text-[var(--amber)] text-right">
                Groups
              </th>
              <th className="py-3 px-4 font-display font-600 text-[12px] tracking-wide text-[var(--amber)] text-right">
                Knockouts
              </th>
              <th className="py-3 px-4 font-display font-600 text-[12px] tracking-wide text-[var(--amber)] text-right">
                Bracket
              </th>
              <th className="py-3 px-4 font-display font-600 text-[12px] tracking-wide text-[var(--amber)] text-right">
                Adj.
              </th>
              <th className="py-3 px-4 font-display font-700 text-[12px] tracking-wide text-[var(--amber)] text-right">
                Total
              </th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r, i) => (
              <tr
                key={r.id}
                className="border-t border-[var(--board-divider)]"
                style={
                  i === 0 ? { background: "rgba(232,163,61,0.08)" } : undefined
                }
              >
                <td
                  className="py-3 px-4 font-display font-700 text-[16px] text-[var(--amber)]"
                  style={{
                    fontFamily:
                      "'DSEG7 Classic', 'Barlow Condensed', monospace",
                  }}
                >
                  {i + 1}
                </td>
                <td className="py-3 px-4 max-w-[180px]">
                  <Link
                    href={`/users/${r.id}`}
                    className="flex items-center gap-2 text-[var(--chalk)] hover:text-[var(--amber)] transition min-w-0"
                  >
                    {r.image ? (
                      <Image
                        src={r.image}
                        alt={r.name}
                        width={24}
                        height={24}
                        className="rounded-full shrink-0"
                      />
                    ) : (
                      <span
                        className="w-6 h-6 rounded-full flex items-center justify-center font-display font-700 text-[10px] text-[var(--amber)] shrink-0"
                        style={{ background: "rgba(0,0,0,0.3)" }}
                      >
                        {r.name
                          .split(" ")
                          .map((p) => p[0])
                          .slice(0, 2)
                          .join("")
                          .toUpperCase()}
                      </span>
                    )}
                    <span className="truncate">{r.name}</span>
                  </Link>
                </td>
                <td
                  className="py-3 px-4 text-right"
                  style={{ color: "rgba(245,243,236,0.7)" }}
                >
                  {r.groupPoints}
                </td>
                <td
                  className="py-3 px-4 text-right"
                  style={{ color: "rgba(245,243,236,0.7)" }}
                >
                  {r.knockoutPoints}
                </td>
                <td
                  className="py-3 px-4 text-right"
                  style={{ color: "rgba(245,243,236,0.7)" }}
                >
                  {r.bracketPoints}
                </td>
                <td
                  className={`py-3 px-4 text-right ${
                    r.adjustmentPoints !== 0
                      ? "text-[var(--amber)] font-semibold"
                      : ""
                  }`}
                  style={
                    r.adjustmentPoints === 0
                      ? { color: "rgba(245,243,236,0.3)" }
                      : undefined
                  }
                >
                  {r.adjustmentPoints > 0
                    ? `+${r.adjustmentPoints}`
                    : r.adjustmentPoints}
                </td>
                <td
                  className="py-3 px-4 text-right font-display font-700 text-lg text-[var(--amber)]"
                  style={{
                    fontFamily:
                      "'DSEG7 Classic', 'Barlow Condensed', monospace",
                  }}
                >
                  {r.total}
                </td>
              </tr>
            ))}
            {rows.length === 0 && (
              <tr>
                <td
                  colSpan={7}
                  className="py-8 text-center"
                  style={{ color: "rgba(245,243,236,0.4)" }}
                >
                  No predictions scored yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
