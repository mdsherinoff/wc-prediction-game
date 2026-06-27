import { auth } from "@/auth";
import { redirect, notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import Link from "next/link";
import PlayerCard from "@/components/PlayerCard";

const AWARD_LABELS: Record<string, string> = {
  GOLDEN_BALL: "Golden Ball",
  GOLDEN_BOOT: "Golden Boot",
  GOLDEN_GLOVE: "Golden Glove",
  YOUNG_PLAYER: "Best Young Player",
};

export const dynamic = "force-dynamic";

const sum = (vals: (number | null)[]) =>
  vals.reduce((acc: number, v) => acc + (v ?? 0), 0);

export default async function UserStatsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await auth();
  if (!session?.user?.id) {
    redirect("/login");
  }
  const { id } = await params;

  const user = await prisma.user.findUnique({
    where: { id },
    include: {
      groupPredictions: {
        include: { match: { include: { homeTeam: true, awayTeam: true } } },
        orderBy: { match: { kickoff: "desc" } },
      },
      knockoutPredictions: {
        include: { match: { include: { homeTeam: true, awayTeam: true } } },
        orderBy: { match: { kickoff: "desc" } },
      },
      bracketPicks: { select: { pointsAwarded: true } },
      manualAdjustment: { select: { points: true } },
      awardPicks: { include: { player: true } },
    },
  });

  if (!user) notFound();

  // Rank among all users by total points
  const allUsers = await prisma.user.findMany({
    select: {
      id: true,
      groupPredictions: { select: { pointsAwarded: true } },
      knockoutPredictions: { select: { pointsAwarded: true } },
      bracketPicks: { select: { pointsAwarded: true } },
      manualAdjustment: { select: { points: true } },
      awardPicks: { select: { pointsAwarded: true } },
    },
  });
  const totals = allUsers
    .map((u) => ({
      id: u.id,
      total:
        sum(u.groupPredictions.map((p) => p.pointsAwarded)) +
        sum(u.knockoutPredictions.map((p) => p.pointsAwarded)) +
        sum(u.bracketPicks.map((p) => p.pointsAwarded)) +
        sum(u.awardPicks.map((p) => p.pointsAwarded)) +
        (u.manualAdjustment?.points ?? 0),
    }))
    .sort((a, b) => b.total - a.total);
  const rank = totals.findIndex((t) => t.id === user.id) + 1;

  const groupPoints = sum(user.groupPredictions.map((p) => p.pointsAwarded));
  const knockoutPoints = sum(
    user.knockoutPredictions.map((p) => p.pointsAwarded),
  );
  const bracketPoints = sum(user.bracketPicks.map((p) => p.pointsAwarded));
  const awardPoints = sum(user.awardPicks.map((p) => p.pointsAwarded));
  const adjustmentPoints = user.manualAdjustment?.points ?? 0;
  const total =
    groupPoints +
    knockoutPoints +
    bracketPoints +
    awardPoints +
    adjustmentPoints;

  const allScored = [
    ...user.groupPredictions.map((p) => p.pointsAwarded),
    ...user.knockoutPredictions.map((p) => p.pointsAwarded),
  ].filter((p) => p !== null) as number[];
  const accuracyPct =
    allScored.length > 0
      ? Math.round(
          (allScored.filter((p) => p > 0).length / allScored.length) * 100,
        )
      : 0;

  const totalPredictable = await prisma.match.count();
  const predictedCount =
    user.groupPredictions.length + user.knockoutPredictions.length;
  const participationPct =
    totalPredictable > 0
      ? Math.round((predictedCount / totalPredictable) * 100)
      : 0;

  return (
    <div className="max-w-2xl mx-auto px-4 py-8">
      <Link
        href="/leaderboard"
        className="text-sm text-[var(--amber)] hover:underline mb-4 inline-block"
      >
        ← Back to leaderboard
      </Link>

      <div className="flex items-center gap-3 mb-6">
        {user.image && (
          <img
            src={user.image}
            alt={user.name ?? ""}
            width={48}
            height={48}
            className="rounded-full"
          />
        )}
        <div>
          <h1 className="font-display text-2xl font-bold text-[var(--pitch)]">
            {user.name ?? user.email}
          </h1>
          <p className="text-sm" style={{ color: "var(--board-text-muted)" }}>
            Rank #{rank} of {totals.length}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 mb-8">
        <StatBox label="GROUPS" value={groupPoints} />
        <StatBox label="KNOCKOUTS" value={knockoutPoints} />
        <StatBox label="BRACKET" value={bracketPoints} />
        <StatBox label="AWARDS" value={awardPoints} />
        <StatBox label="TOTAL" value={total} highlight />
      </div>

      <div className="grid sm:grid-cols-2 gap-3 mb-8">
        <StatBox
          label="ACCURACY"
          value={`${accuracyPct}%`}
          sub={`${allScored.filter((p) => p > 0).length}/${allScored.length} scored correctly`}
        />
        <StatBox
          label="PARTICIPATION"
          value={`${participationPct}%`}
          sub={`${predictedCount}/${totalPredictable} matches predicted`}
        />
      </div>

      {adjustmentPoints !== 0 && (
        <p
          className="text-xs mb-8"
          style={{ color: "var(--board-text-muted)" }}
        >
          Includes a manual adjustment of {adjustmentPoints > 0 ? "+" : ""}
          {adjustmentPoints} pts.
        </p>
      )}

      {user.awardPicks.length > 0 && (
        <div className="mb-8">
          <h2 className="font-display text-lg font-bold tracking-wide text-[var(--pitch)] mb-3">
            Award picks
          </h2>
          <div className="grid grid-cols-4 gap-3">
            {user.awardPicks.map((pick) => (
              <PlayerCard
                key={pick.id}
                size="compact"
                name={pick.player.name}
                country={pick.player.country}
                position={pick.player.position}
                club={pick.player.club}
                ageLabel={pick.player.ageLabel}
                awardLabel={AWARD_LABELS[pick.category] ?? pick.category}
              />
            ))}
          </div>
        </div>
      )}

      <h2 className="font-display text-lg font-bold tracking-wide text-[var(--pitch)] mb-3">
        Prediction history
      </h2>
      <div className="space-y-2">
        {[...user.groupPredictions, ...user.knockoutPredictions]
          .filter((p) => p.match.status === "FINISHED")
          .sort((a, b) => b.match.kickoff.getTime() - a.match.kickoff.getTime())
          .map((p) => {
            const isGroup = "homeScore" in p && p.match.stage === "GROUP";
            return (
              <Link
                key={p.id}
                href={`/match/${p.match.id}`}
                className="scoreboard-card px-4 py-2 flex items-center justify-between text-sm block hover:opacity-90 transition"
              >
                <span className="text-[var(--chalk)] truncate">
                  {p.match.homeTeam?.name ?? "TBD"} vs{" "}
                  {p.match.awayTeam?.name ?? "TBD"}
                </span>
                <span className="flex items-center gap-2 shrink-0">
                  {isGroup ? (
                    <span style={{ color: "var(--board-text-muted)" }}>
                      predicted {(p as any).homeScore}-{(p as any).awayScore}
                    </span>
                  ) : (
                    <span style={{ color: "var(--board-text-muted)" }}>
                      picked{" "}
                      {(p as any).predictedWinner === p.match.homeTeamId
                        ? p.match.homeTeam?.name
                        : p.match.awayTeam?.name}
                    </span>
                  )}
                  <span
                    className={`font-display font-bold ${
                      (p.pointsAwarded ?? 0) > 0
                        ? "text-[var(--amber)]"
                        : "text-[var(--red)]"
                    }`}
                  >
                    +{p.pointsAwarded ?? 0}
                  </span>
                </span>
              </Link>
            );
          })}
        {user.groupPredictions.length === 0 &&
          user.knockoutPredictions.length === 0 && (
            <p
              className="text-sm text-center"
              style={{ color: "var(--board-text-muted)" }}
            >
              No predictions yet.
            </p>
          )}
      </div>
    </div>
  );
}

function StatBox({
  label,
  value,
  sub,
  highlight,
}: {
  label: string;
  value: string | number;
  sub?: string;
  highlight?: boolean;
}) {
  return (
    <div className="scoreboard-card p-3 text-center">
      <div
        className="text-[10px] tracking-wide mb-1"
        style={{ color: "var(--board-text-muted)" }}
      >
        {label}
      </div>
      <div
        className={`font-display text-2xl font-bold ${
          highlight ? "text-[var(--amber)]" : "text-[var(--chalk)]"
        }`}
      >
        {value}
      </div>
      {sub && (
        <div
          className="text-[10px] mt-1"
          style={{ color: "var(--board-digit-dim)" }}
        >
          {sub}
        </div>
      )}
    </div>
  );
}
