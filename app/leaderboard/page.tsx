import { prisma } from "@/lib/prisma";
import Image from "next/image";

export const revalidate = 30; // refresh every 30s

export default async function LeaderboardPage() {
  const users = await prisma.user.findMany({
    select: {
      id: true,
      name: true,
      image: true,
      groupPredictions: { select: { pointsAwarded: true } },
      knockoutPredictions: { select: { pointsAwarded: true } },
      bracketPicks: { select: { pointsAwarded: true } },
    },
  });

  const sum = (vals: (number | null)[]) =>
    vals.reduce((acc: number, v) => acc + (v ?? 0), 0);

  const rows = users
    .map((u) => {
      const groupPoints = sum(u.groupPredictions.map((p) => p.pointsAwarded));
      const knockoutPoints = sum(
        u.knockoutPredictions.map((p) => p.pointsAwarded)
      );
      const bracketPoints = sum(u.bracketPicks.map((p) => p.pointsAwarded));
      return {
        id: u.id,
        name: u.name ?? "Anonymous",
        image: u.image,
        groupPoints,
        knockoutPoints,
        bracketPoints,
        total: groupPoints + knockoutPoints + bracketPoints,
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

      <div className="ticket overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-pitch text-chalk text-left">
              <th className="py-3 px-4 font-display font-600">#</th>
              <th className="py-3 px-4 font-display font-600">Player</th>
              <th className="py-3 px-4 font-display font-600 text-right">
                Groups
              </th>
              <th className="py-3 px-4 font-display font-600 text-right">
                Knockouts
              </th>
              <th className="py-3 px-4 font-display font-600 text-right">
                Bracket
              </th>
              <th className="py-3 px-4 font-display font-700 text-right">
                Total
              </th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r, i) => (
              <tr
                key={r.id}
                className={`border-t border-line ${
                  i === 0 ? "bg-amber/10" : ""
                }`}
              >
                <td className="py-3 px-4 font-display font-700 text-turf">
                  {i + 1}
                </td>
                <td className="py-3 px-4 flex items-center gap-2">
                  {r.image && (
                    <Image
                      src={r.image}
                      alt={r.name}
                      width={24}
                      height={24}
                      className="rounded-full"
                    />
                  )}
                  {r.name}
                </td>
                <td className="py-3 px-4 text-right text-ink/70">
                  {r.groupPoints}
                </td>
                <td className="py-3 px-4 text-right text-ink/70">
                  {r.knockoutPoints}
                </td>
                <td className="py-3 px-4 text-right text-ink/70">
                  {r.bracketPoints}
                </td>
                <td className="py-3 px-4 text-right font-display font-700 text-lg text-pitch">
                  {r.total}
                </td>
              </tr>
            ))}
            {rows.length === 0 && (
              <tr>
                <td colSpan={6} className="py-8 text-center text-ink/40">
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
