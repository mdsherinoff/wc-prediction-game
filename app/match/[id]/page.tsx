import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import Image from "next/image";
import BackButton from "@/components/BackButton";
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
      // Only pull the predictor's name — never their email/other PII into a
      // page any pool member can open.
      groupPredictions: { include: { user: { select: { name: true } } } },
      knockoutPredictions: { include: { user: { select: { name: true } } } },
    },
  });

  if (!match) notFound();

  const [homeForm, awayForm] = await Promise.all([
    match.homeTeamId ? getRecentForm(match.homeTeamId, match.kickoff) : [],
    match.awayTeamId ? getRecentForm(match.awayTeamId, match.kickoff) : [],
  ]);

  const predictionsRevealed = true;

  return (
    <div className="max-w-2xl mx-auto px-4 py-8">
      <BackButton
        fallbackHref={match.stage === "GROUP" ? "/groups" : "/knockouts"}
        className="text-sm text-[var(--amber)] hover:underline mb-4 inline-block"
      >
        ← Back
      </BackButton>

      <div
        className="text-[11px] tracking-wide mb-1"
        style={{ color: "var(--board-text-muted)" }}
      >
        {stageLabel(match.stage).toUpperCase()}{" "}
        {match.groupName ? `· GROUP ${match.groupName}` : ""}
      </div>
      <h1 className="font-display text-2xl font-bold tracking-wide text-[var(--ink)] mb-6">
        {match.homeTeam?.name?.toUpperCase() ?? "TBD"} VS{" "}
        {match.awayTeam?.name?.toUpperCase() ?? "TBD"}
      </h1>

      <div className="grid sm:grid-cols-2 gap-4 mb-8">
        <TeamPanel team={match.homeTeam} form={homeForm} />
        <TeamPanel team={match.awayTeam} form={awayForm} />
      </div>

      {match.status === "FINISHED" && (
        <div className="scoreboard-card p-4 mb-8 text-center">
          <div
            className="text-[11px] tracking-wide mb-1"
            style={{ color: "var(--board-text-muted)" }}
          >
            FINAL SCORE
          </div>
          <div className="font-display text-3xl font-bold text-[var(--amber)]">
            {match.homeScore} – {match.awayScore}
          </div>
        </div>
      )}

      <h2 className="font-display text-lg font-bold tracking-wide text-[var(--pitch)] mb-3">
        Everyone&apos;s predictions
      </h2>
      {!predictionsRevealed ? (
        <p
          className="text-sm scoreboard-card p-4 text-center"
          style={{ color: "var(--board-text-muted)" }}
        >
          Predictions are hidden until 1 hour before kickoff.
        </p>
      ) : (
        <div className="space-y-2">
          {match.stage === "GROUP"
            ? match.groupPredictions.map((p) => {
                const isFinished = match.status === "FINISHED";
                const isCorrect =
                  isFinished && !p.knownIncorrect && (p.pointsAwarded ?? 0) > 0;
                const isWrong =
                  isFinished &&
                  (p.knownIncorrect || (p.pointsAwarded ?? 0) === 0);
                return (
                  <div
                    key={p.id}
                    className="scoreboard-card px-4 py-2 flex items-center justify-between gap-3 text-sm"
                  >
                    <span className="text-[var(--chalk)] flex items-center gap-2 min-w-0">
                      {isFinished && (
                        <span
                          className={`shrink-0 w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold ${
                            isCorrect
                              ? "bg-turf text-chalk"
                              : isWrong
                                ? "bg-red text-chalk"
                                : ""
                          }`}
                        >
                          {isCorrect ? "✓" : isWrong ? "✗" : ""}
                        </span>
                      )}
                      <span className="truncate">{p.user.name}</span>
                    </span>
                    <span className="flex items-center gap-2 shrink-0">
                      {p.knownIncorrect ? (
                        <span
                          style={{ color: "var(--board-text-muted)" }}
                          className="text-xs"
                        >
                          marked wrong
                        </span>
                      ) : (
                        <span className="font-display font-bold text-[var(--amber)]">
                          {p.homeScore} – {p.awayScore}
                        </span>
                      )}
                      {isFinished && (p.pointsAwarded ?? 0) > 0 && (
                        <span className="text-xs font-semibold text-[var(--amber)]">
                          +{p.pointsAwarded}
                        </span>
                      )}
                    </span>
                  </div>
                );
              })
            : match.knockoutPredictions.map((p) => {
                const isFinished = match.status === "FINISHED";
                const points = p.pointsAwarded ?? 0;
                const gotWinner = isFinished && !p.knownIncorrect && points > 0;
                const gotExactBonus =
                  isFinished && !p.knownIncorrect && points >= 2;
                const isWrong =
                  isFinished && (p.knownIncorrect || points === 0);
                return (
                  <div
                    key={p.id}
                    className="scoreboard-card px-4 py-2 flex items-center justify-between gap-3 text-sm"
                  >
                    <span className="text-[var(--chalk)] flex items-center gap-2 min-w-0">
                      {isFinished && (
                        <span
                          className={`shrink-0 w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold ${
                            gotExactBonus
                              ? "bg-amber text-ink"
                              : gotWinner
                                ? "bg-turf text-chalk"
                                : isWrong
                                  ? "bg-red text-chalk"
                                  : ""
                          }`}
                          title={
                            gotExactBonus
                              ? "Winner + exact score"
                              : gotWinner
                                ? "Correct winner"
                                : "Incorrect"
                          }
                        >
                          {gotExactBonus
                            ? "★"
                            : gotWinner
                              ? "✓"
                              : isWrong
                                ? "✗"
                                : ""}
                        </span>
                      )}
                      <span className="truncate">{p.user.name}</span>
                    </span>
                    <span className="flex items-center gap-2 shrink-0">
                      {p.knownIncorrect ? (
                        <span
                          style={{ color: "var(--board-text-muted)" }}
                          className="text-xs"
                        >
                          marked wrong
                        </span>
                      ) : (
                        <span className="font-display font-bold text-[var(--amber)]">
                          {p.predictedWinner === match.homeTeamId
                            ? match.homeTeam?.name
                            : match.awayTeam?.name}
                          {p.homeScore != null && p.awayScore != null && (
                            <span
                              style={{ color: "var(--board-text-muted)" }}
                              className="ml-2"
                            >
                              ({p.homeScore}-{p.awayScore})
                            </span>
                          )}
                        </span>
                      )}
                      {isFinished && points > 0 && (
                        <span className="text-xs font-semibold text-[var(--amber)]">
                          +{points}
                        </span>
                      )}
                    </span>
                  </div>
                );
              })}
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
      <div
        className="scoreboard-card p-4 text-center text-sm"
        style={{ color: "var(--board-text-muted)" }}
      >
        TBD
      </div>
    );
  }

  return (
    <div className="scoreboard-card p-4">
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
          <div className="font-display font-bold tracking-wide text-[var(--chalk)]">
            {team.name.toUpperCase()}
          </div>
          {team.fifaRanking != null && (
            <div
              className="text-[11px]"
              style={{ color: "var(--board-text-muted)" }}
            >
              FIFA RANK #{team.fifaRanking}
            </div>
          )}
        </div>
      </div>

      <div
        className="text-[11px] tracking-wide mb-1"
        style={{ color: "var(--board-text-muted)" }}
      >
        LAST 3 RESULTS THIS TOURNAMENT
      </div>
      {form.length === 0 ? (
        <p className="text-xs" style={{ color: "var(--board-digit-dim)" }}>
          No completed matches yet this tournament.
        </p>
      ) : (
        <div className="space-y-1">
          {form.map((f, i) => (
            <div key={i} className="flex items-center justify-between text-xs">
              <span className="text-[var(--chalk)]">
                vs {f.opponentName.toUpperCase()}
              </span>
              <span className="flex items-center gap-1.5">
                <span style={{ color: "var(--board-text-muted)" }}>
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
