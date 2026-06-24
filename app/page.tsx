import Link from "next/link";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import GroupMatchCard from "@/components/GroupMatchCard";
import KnockoutMatchCard from "@/components/KnockoutMatchCard";

export const dynamic = "force-dynamic";

const TODAY_WINDOW_HOURS = 16;

async function getTodaysMatches(userId: string) {
  const now = new Date();
  const windowEnd = new Date(
    now.getTime() + TODAY_WINDOW_HOURS * 60 * 60 * 1000,
  );

  return prisma.match.findMany({
    where: {
      status: { not: "FINISHED" },
      OR: [
        // Upcoming, kicking off within the window
        { kickoff: { gte: now, lte: windowEnd } },
        // Already underway (kickoff in the past but not finished)
        { status: "LIVE" },
      ],
    },
    include: {
      homeTeam: true,
      awayTeam: true,
      groupPredictions: { where: { userId } },
      knockoutPredictions: { where: { userId } },
    },
    orderBy: { kickoff: "asc" },
  });
}

export default async function HomePage() {
  const session = await auth();
  const todaysMatches = session?.user?.id
    ? await getTodaysMatches(session.user.id)
    : [];

  return (
    <div>
      <section className="bg-pitch text-chalk">
        <div className="max-w-5xl mx-auto px-4 py-16 text-center">
          <p className="font-display text-amber tracking-[0.3em] text-sm mb-3">
            FIFA WORLD CUP 2026 · USA · MEXICO · CANADA
          </p>
          <h1 className="font-display text-3xl sm:text-5xl md:text-6xl font-800 mb-4 leading-tight">
            Predict every match.
            <br />
            Settle the bragging rights.
          </h1>
          <p className="text-chalk/80 max-w-xl mx-auto mb-8">
            Score the group stage exactly right, call the knockout winners, and
            build your bracket all the way to the final.
          </p>
          {!session?.user && (
            <Link
              href="/login"
              className="inline-block bg-amber text-ink font-semibold px-6 py-3 rounded-lg hover:brightness-95 transition"
            >
              Sign in to play
            </Link>
          )}
        </div>
      </section>

      {session?.user && (
        <section className="max-w-3xl mx-auto px-4 py-10">
          <h2 className="font-display text-2xl font-700 text-pitch mb-1">
            Today&apos;s matches
          </h2>
          <p className="text-sm text-ink/60 mb-6">
            Kicking off in the next {TODAY_WINDOW_HOURS} hours — predict them
            right here.
          </p>

          {todaysMatches.length === 0 ? (
            <p
              className="scoreboard-card text-sm px-5 py-6 mx-2 text-center"
              style={{ color: "var(--board-text-muted)" }}
            >
              Nothing kicking off in the next {TODAY_WINDOW_HOURS} hours. Check
              the{" "}
              <Link href="/groups" className="text-[var(--amber)] underline">
                Groups
              </Link>{" "}
              or{" "}
              <Link href="/knockouts" className="text-[var(--amber)] underline">
                Knockouts
              </Link>{" "}
              pages for everything upcoming.
            </p>
          ) : (
            <div className="space-y-3">
              {todaysMatches.map((match) =>
                match.stage === "GROUP" ? (
                  <GroupMatchCard
                    key={match.id}
                    match={{
                      id: match.id,
                      kickoff: match.kickoff.toISOString(),
                      status: match.status,
                      homeScore: match.homeScore,
                      awayScore: match.awayScore,
                      homeTeam: match.homeTeam
                        ? {
                            name: match.homeTeam.name,
                            flagUrl: match.homeTeam.flagUrl,
                          }
                        : null,
                      awayTeam: match.awayTeam
                        ? {
                            name: match.awayTeam.name,
                            flagUrl: match.awayTeam.flagUrl,
                          }
                        : null,
                    }}
                    existingPrediction={match.groupPredictions[0] ?? null}
                  />
                ) : (
                  <KnockoutMatchCard
                    key={match.id}
                    match={{
                      id: match.id,
                      kickoff: match.kickoff.toISOString(),
                      status: match.status,
                      homeScore: match.homeScore,
                      awayScore: match.awayScore,
                      winnerTeamId: match.winnerTeamId,
                      homeTeam: match.homeTeam
                        ? { id: match.homeTeam.id, name: match.homeTeam.name }
                        : null,
                      awayTeam: match.awayTeam
                        ? { id: match.awayTeam.id, name: match.awayTeam.name }
                        : null,
                    }}
                    existingPrediction={
                      match.knockoutPredictions[0]
                        ? {
                            predictedWinner:
                              match.knockoutPredictions[0].predictedWinner,
                            homeScore: match.knockoutPredictions[0].homeScore,
                            awayScore: match.knockoutPredictions[0].awayScore,
                            pointsAwarded:
                              match.knockoutPredictions[0].pointsAwarded,
                          }
                        : null
                    }
                  />
                ),
              )}
            </div>
          )}
        </section>
      )}

      <section className="max-w-5xl mx-auto px-4 py-12 grid sm:grid-cols-3 gap-6">
        <RuleCard
          step="01"
          title="Group stage"
          body="Predict the exact scoreline for every group match. Nail it exactly and you score 1 point. Locks 1 hour before kickoff."
        />
        <RuleCard
          step="02"
          title="Knockouts"
          body="Pick the winner of every knockout match for 1 point, plus 2 bonus points if you also call the exact score."
        />
        <RuleCard
          step="03"
          title="The bracket"
          body="Once the groups wrap up, fill in your full knockout bracket — who reaches each round, who lifts the trophy, who takes third."
        />
      </section>
    </div>
  );
}

function RuleCard({
  step,
  title,
  body,
}: {
  step: string;
  title: string;
  body: string;
}) {
  return (
    <div className="scoreboard-card p-6">
      <span
        className="font-display text-3xl font-700"
        style={{
          fontFamily: "'DSEG7 Classic', 'Barlow Condensed', monospace",
          color: "var(--amber)",
        }}
      >
        {step}
      </span>
      <h3 className="font-display text-xl font-700 text-[var(--chalk)] mt-1 mb-2">
        {title}
      </h3>
      <p className="text-sm" style={{ color: "rgba(245,243,236,0.7)" }}>
        {body}
      </p>
    </div>
  );
}
