import { prisma } from "@/lib/prisma";
import Image from "next/image";

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

      <div className="scoreboard-card overflow-x-auto">
        <table className="w-full text-sm min-w-[540px]">
          <thead>
            <tr
              style={{ background: "rgba(0,0,0,0.25)" }}
              className="text-left"
            >
              <th className="py-2.5 px-3 sm:py-3 sm:px-4 font-display font-600 text-[12px] tracking-wide text-[var(--amber)]">
                #
              </th>
              <th className="py-2.5 px-3 sm:py-3 sm:px-4 font-display font-600 text-[12px] tracking-wide text-[var(--amber)]">
                Player
              </th>
              <th className="py-2.5 px-3 sm:py-3 sm:px-4 font-display font-600 text-[12px] tracking-wide text-[var(--amber)] text-right">
                Groups
              </th>
              <th className="py-2.5 px-3 sm:py-3 sm:px-4 font-display font-600 text-[12px] tracking-wide text-[var(--amber)] text-right">
                Knockouts
              </th>
              <th className="py-2.5 px-3 sm:py-3 sm:px-4 font-display font-600 text-[12px] tracking-wide text-[var(--amber)] text-right">
                Bracket
              </th>
              <th className="py-2.5 px-3 sm:py-3 sm:px-4 font-display font-600 text-[12px] tracking-wide text-[var(--amber)] text-right">
                Adj.
              </th>
              <th className="py-2.5 px-3 sm:py-3 sm:px-4 font-display font-700 text-[12px] tracking-wide text-[var(--amber)] text-right">
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
                  className="py-2.5 px-3 sm:py-3 sm:px-4 font-display font-700 text-[16px] text-[var(--amber)]"
                  style={{
                    fontFamily:
                      "'DSEG7 Classic', 'Barlow Condensed', monospace",
                  }}
                >
                  {i + 1}
                </td>
                <td className="py-2.5 px-3 sm:py-3 sm:px-4 flex items-center gap-2 text-[var(--chalk)]">
                  {r.image ? (
                    <Image
                      src={r.image}
                      alt={r.name}
                      width={24}
                      height={24}
                      className="rounded-full"
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
                  {r.name}
                </td>
                <td
                  className="py-2.5 px-3 sm:py-3 sm:px-4 text-right"
                  style={{ color: "rgba(245,243,236,0.7)" }}
                >
                  {r.groupPoints}
                </td>
                <td
                  className="py-2.5 px-3 sm:py-3 sm:px-4 text-right"
                  style={{ color: "rgba(245,243,236,0.7)" }}
                >
                  {r.knockoutPoints}
                </td>
                <td
                  className="py-2.5 px-3 sm:py-3 sm:px-4 text-right"
                  style={{ color: "rgba(245,243,236,0.7)" }}
                >
                  {r.bracketPoints}
                </td>
                <td
                  className={`py-2.5 px-3 sm:py-3 sm:px-4 text-right ${
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
                  className="py-2.5 px-3 sm:py-3 sm:px-4 text-right font-display font-700 text-lg text-[var(--amber)]"
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
