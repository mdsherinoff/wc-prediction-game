import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { stageLabel } from "@/lib/scoring";

export const dynamic = "force-dynamic";

async function getRecentForm(teamId: string, beforeDate: Date) {
  const matches = await prisma.match.findMany({
    where: {
      status: "FINISHED",
      kickoff: { lt: beforeDate },
      OR: [{ homeTeamId: teamId }, { awayTeamId: teamId }],
    },
    include: { homeTeam: true, awayTeam: true },
    orderBy: { kickoff: "desc" },
    take: 3,
  });

  return matches.map((m) => {
    const isHome = m.homeTeamId === teamId;
    const ownScore = isHome ? m.homeScore : m.awayScore;
    const oppScore = isHome ? m.awayScore : m.homeScore;
    const opponent = isHome ? m.awayTeam : m.homeTeam;
    let result: "W" | "D" | "L" = "D";
    if (ownScore != null && oppScore != null) {
      result = ownScore > oppScore ? "W" : ownScore < oppScore ? "L" : "D";
    }
    return {
      opponentName: opponent?.name ?? "TBD",
      ownScore,
      oppScore,
      result,
      kickoff: m.kickoff,
    };
  });
}

export default async function MatchDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await auth();
  if (!session?.user?.id) {
    redirect("/login");
  }
  const { id } = await params;

  const match = await prisma.match.findUnique({
    where: { id },
    include: {
      homeTeam: true,
      awayTeam: true,
      groupPredictions: { include: { user: true } },
      knockoutPredictions: { include: { user: true } },
    },
  });

  if (!match) notFound();

  const [homeForm, awayForm] = await Promise.all([
    match.homeTeamId ? getRecentForm(match.homeTeamId, match.kickoff) : [],
    match.awayTeamId ? getRecentForm(match.awayTeamId, match.kickoff) : [],
  ]);

  const now = new Date();
  const oneHourBeforeKickoff = new Date(
    match.kickoff.getTime() - 60 * 60 * 1000,
  );
  const predictionsRevealed = now >= oneHourBeforeKickoff;

  return (
    <div className="max-w-2xl mx-auto px-4 py-8">
      <Link
        href="/groups"
        className="text-sm text-turf underline mb-4 inline-block"
      >
        ← Back
      </Link>

      <div className="text-xs text-ink/50 mb-1">
        {stageLabel(match.stage)}{" "}
        {match.groupName ? `· Group ${match.groupName}` : ""}
      </div>
      <h1 className="font-display text-2xl font-700 text-pitch mb-6">
        {match.homeTeam?.name ?? "TBD"} vs {match.awayTeam?.name ?? "TBD"}
      </h1>

      <div className="grid sm:grid-cols-2 gap-4 mb-8">
        <TeamPanel team={match.homeTeam} form={homeForm} />
        <TeamPanel team={match.awayTeam} form={awayForm} />
      </div>

      {match.status === "FINISHED" && (
        <div className="ticket p-4 mb-8 text-center">
          <div className="text-xs text-ink/50 mb-1">Final score</div>
          <div className="font-display text-3xl font-700 text-pitch">
            {match.homeScore} – {match.awayScore}
          </div>
        </div>
      )}

      <h2 className="font-display text-lg font-700 text-turf mb-3">
        Everyone&apos;s predictions
      </h2>
      {!predictionsRevealed ? (
        <p className="text-sm text-ink/40 ticket p-4 text-center">
          Predictions are hidden until 1 hour before kickoff.
        </p>
      ) : (
        <div className="space-y-2">
          {match.stage === "GROUP"
            ? match.groupPredictions.map((p) => (
                <div
                  key={p.id}
                  className="ticket px-4 py-2 flex items-center justify-between text-sm"
                >
                  <span>{p.user.name}</span>
                  <span className="font-display font-700">
                    {p.homeScore} – {p.awayScore}
                  </span>
                </div>
              ))
            : match.knockoutPredictions.map((p) => (
                <div
                  key={p.id}
                  className="ticket px-4 py-2 flex items-center justify-between text-sm"
                >
                  <span>{p.user.name}</span>
                  <span className="font-display font-700">
                    {p.predictedWinner === match.homeTeamId
                      ? match.homeTeam?.name
                      : match.awayTeam?.name}
                    {p.homeScore != null && p.awayScore != null && (
                      <span className="text-ink/40 ml-2">
                        ({p.homeScore}-{p.awayScore})
                      </span>
                    )}
                  </span>
                </div>
              ))}
          {match.stage === "GROUP" && match.groupPredictions.length === 0 && (
            <p className="text-sm text-ink/40 text-center">
              No one predicted this match.
            </p>
          )}
          {match.stage !== "GROUP" &&
            match.knockoutPredictions.length === 0 && (
              <p className="text-sm text-ink/40 text-center">
                No one predicted this match.
              </p>
            )}
        </div>
      )}
    </div>
  );
}

function TeamPanel({
  team,
  form,
}: {
  team: {
    name: string;
    flagUrl: string | null;
    fifaRanking: number | null;
  } | null;
  form: {
    opponentName: string;
    ownScore: number | null;
    oppScore: number | null;
    result: "W" | "D" | "L";
  }[];
}) {
  if (!team) {
    return (
      <div className="ticket p-4 text-center text-ink/40 text-sm">TBD</div>
    );
  }

  return (
    <div className="ticket p-4">
      <div className="flex items-center gap-3 mb-3">
        {team.flagUrl && (
          <Image
            src={team.flagUrl}
            alt={team.name}
            width={32}
            height={24}
            className="rounded-sm"
          />
        )}
        <div>
          <div className="font-semibold text-ink">{team.name}</div>
          {team.fifaRanking != null && (
            <div className="text-xs text-ink/50">
              FIFA Rank #{team.fifaRanking}
            </div>
          )}
        </div>
      </div>

      <div className="text-xs text-ink/50 mb-1">Last 3 results</div>
      {form.length === 0 ? (
        <p className="text-xs text-ink/30">
          No completed matches yet this tournament.
        </p>
      ) : (
        <div className="space-y-1">
          {form.map((f, i) => (
            <div key={i} className="flex items-center justify-between text-xs">
              <span className="text-ink/70">vs {f.opponentName}</span>
              <span className="flex items-center gap-1.5">
                <span className="text-ink/50">
                  {f.ownScore}-{f.oppScore}
                </span>
                <span
                  className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold ${
                    f.result === "W"
                      ? "bg-turf text-chalk"
                      : f.result === "L"
                        ? "bg-red text-chalk"
                        : "bg-line text-ink/60"
                  }`}
                >
                  {f.result}
                </span>
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
