import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { getReportsData } from "@/lib/reports";
import LeaderboardBarChart from "@/components/LeaderboardBarChart";
import RadialPercentChart from "@/components/RadialPercentChart";
import RankedBarList from "@/components/RankedBarList";

export const dynamic = "force-dynamic";

export default async function ReportsPage() {
  const session = await auth();
  if (!session?.user?.id) {
    redirect("/login");
  }

  const data = await getReportsData();

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <div className="flex items-center justify-between gap-3 mb-1 flex-wrap">
        <h1 className="font-display text-3xl font-700 text-pitch">Reports</h1>
        <span className="font-display font-700 text-[11px] tracking-[0.08em] text-ink/40">
          WORLD CUP PREDICTOR
        </span>
      </div>
      <p className="text-sm text-ink/60 mb-8">
        {data.totalFinishedMatches} match
        {data.totalFinishedMatches === 1 ? "" : "es"} scored so far.
      </p>

      <section className="mb-6">
        <div className="ticket p-5">
          <LeaderboardBarChart data={data.leaderboardBars} />
        </div>
      </section>

      <section className="mb-6">
        <div className="ticket p-5">
          <RadialPercentChart
            data={data.accuracy}
            dataKey="accuracyPct"
            color="#1f6e4a"
            title="ACCURACY"
            subtitle="SHARE OF SCORED PREDICTIONS THAT EARNED A POINT"
          />
        </div>
      </section>

      <section className="mb-6">
        <div className="ticket p-5">
          <RadialPercentChart
            data={data.participation}
            dataKey="participationPct"
            color="#e8a33d"
            title="PARTICIPATION"
            subtitle="SHARE OF MATCHES EACH PERSON ACTUALLY PREDICTED"
          />
        </div>
      </section>

      <section className="mb-6 grid md:grid-cols-2 gap-6">
        <div className="ticket p-5">
          <RankedBarList
            data={data.sharpestPredictors}
            color="#1f6e4a"
            title="SHARPEST EYE"
            subtitle="MOST CORRECT PREDICTIONS"
            emptyLabel="No correct predictions scored yet."
          />
        </div>
        <div className="ticket p-5">
          <RankedBarList
            data={data.popularScorelines}
            color="#0b3d2e"
            title="CROWD SCORELINES"
            subtitle="MOST-PREDICTED GROUP SCORELINES"
            emptyLabel="No group scorelines predicted yet."
          />
        </div>
      </section>

      <section className="mb-6">
        <h2 className="font-display text-xl font-700 text-turf mb-3">
          Crowd&apos;s award favorites
        </h2>
        {data.awardFavorites.length === 0 ? (
          <p className="text-sm text-ink/40">No award picks submitted yet.</p>
        ) : (
          <div className="grid sm:grid-cols-2 gap-4">
            {data.awardFavorites.map((fav) => (
              <FunFactCard
                key={fav.category}
                icon={<StarIcon />}
                label={fav.label.toUpperCase()}
                content={
                  <>
                    <div className="font-display font-700 text-lg text-chalk mb-1.5">
                      {fav.playerName}
                    </div>
                    <div
                      className="font-display text-[30px] leading-none flex items-baseline gap-2"
                      style={{
                        fontFamily:
                          "'DSEG7 Classic', 'Barlow Condensed', monospace",
                        color: "#e8a33d",
                      }}
                    >
                      {fav.pickCount}
                      <span
                        className="text-xs font-normal"
                        style={{
                          fontFamily: "Inter, sans-serif",
                          color: "rgba(245,243,236,0.55)",
                        }}
                      >
                        {fav.pickCount === 1 ? "person · " : "people · "}
                        {fav.country}
                      </span>
                    </div>
                  </>
                }
                empty=""
              />
            ))}
          </div>
        )}
      </section>

      <section>
        <h2 className="font-display text-xl font-700 text-turf mb-3">
          Fun facts
        </h2>
        <div className="grid sm:grid-cols-2 gap-4">
          <FunFactCard
            icon={<LinkIcon />}
            label="IN SYNC"
            empty="Not enough overlapping predictions yet."
            content={
              data.inSyncPair && (
                <>
                  <div className="font-display font-700 text-lg text-chalk mb-1.5">
                    {data.inSyncPair.nameA} &amp; {data.inSyncPair.nameB}
                  </div>
                  <BigStat
                    value={String(data.inSyncPair.count)}
                    caption="identical predictions"
                  />
                </>
              )
            }
          />

          <FunFactCard
            icon={<ScaleIcon />}
            label="DRAW SPECIALIST"
            empty="No draws predicted yet."
            content={
              data.drawSpecialist && (
                <>
                  <div className="font-display font-700 text-lg text-chalk mb-1.5">
                    {data.drawSpecialist.name}
                  </div>
                  <BigStat
                    value={String(data.drawSpecialist.draws)}
                    caption={`draws · ${data.drawSpecialist.pct}% of their picks`}
                  />
                </>
              )
            }
          />

          <FunFactCard
            icon={<ClockIcon />}
            label="EARLY BIRD"
            empty="Not enough predictions yet."
            content={
              data.earliestBird && (
                <>
                  <div className="font-display font-700 text-lg text-chalk mb-1.5">
                    {data.earliestBird.name}
                  </div>
                  <BigStat
                    value={formatLead(data.earliestBird.avgLeadHours).value}
                    caption={formatLead(data.earliestBird.avgLeadHours).caption}
                  />
                </>
              )
            }
          />

          <FunFactCard
            icon={<GoalIcon />}
            label="GOAL MACHINE"
            empty="Not enough predictions yet."
            content={
              data.goalMachine && (
                <>
                  <div className="font-display font-700 text-lg text-chalk mb-1.5">
                    {data.goalMachine.name}
                  </div>
                  <BigStat
                    value={data.goalMachine.avgGoals.toFixed(1)}
                    caption="goals / game predicted"
                  />
                </>
              )
            }
          />

          <FunFactCard
            icon={<ShieldIcon />}
            label="MOST CAUTIOUS"
            empty="Not enough predictions yet."
            content={
              data.mostCautious && (
                <>
                  <div className="font-display font-700 text-lg text-chalk mb-1.5">
                    {data.mostCautious.name}
                  </div>
                  <BigStat
                    value={data.mostCautious.avgGoals.toFixed(1)}
                    caption="goals / game predicted"
                  />
                </>
              )
            }
          />

          <FunFactCard
            icon={<GoalIcon />}
            label="GOALS: CROWD vs REALITY"
            empty="No group predictions yet."
            content={
              data.goalsPredictedAvg != null && (
                <div className="flex gap-8">
                  <GoalStat
                    value={data.goalsPredictedAvg}
                    caption="predicted / game"
                  />
                  <GoalStat
                    value={data.goalsActualAvg}
                    caption="actual / game"
                  />
                </div>
              )
            }
          />
        </div>
      </section>
    </div>
  );
}

function GoalStat({
  value,
  caption,
}: {
  value: number | null;
  caption: string;
}) {
  return (
    <div>
      <div
        className="font-display text-[30px] leading-none"
        style={{
          fontFamily: "'DSEG7 Classic', 'Barlow Condensed', monospace",
          color: "#e8a33d",
        }}
      >
        {value != null ? value.toFixed(1) : "—"}
      </div>
      <div
        className="text-xs font-normal mt-1"
        style={{ color: "rgba(245,243,236,0.55)" }}
      >
        {caption}
      </div>
    </div>
  );
}

function BigStat({ value, caption }: { value: string; caption: string }) {
  return (
    <div
      className="font-display text-[30px] leading-none flex items-baseline gap-2"
      style={{
        fontFamily: "'DSEG7 Classic', 'Barlow Condensed', monospace",
        color: "#e8a33d",
      }}
    >
      {value}
      <span
        className="text-xs font-normal"
        style={{
          fontFamily: "Inter, sans-serif",
          color: "rgba(245,243,236,0.55)",
        }}
      >
        {caption}
      </span>
    </div>
  );
}

// Predictions only open 16h before kickoff, so leads are usually hours; show
// days only if a backfilled/edge value pushes the average past ~1.5 days.
function formatLead(hours: number): { value: string; caption: string } {
  if (hours >= 36) {
    return {
      value: (hours / 24).toFixed(1),
      caption: "days before kickoff, avg",
    };
  }
  return {
    value: String(Math.round(hours)),
    caption: "hours before kickoff, avg",
  };
}

function FunFactCard({
  icon,
  label,
  content,
  empty,
}: {
  icon: React.ReactNode;
  label: string;
  content: React.ReactNode;
  empty: string;
}) {
  return (
    <div className="rounded-lg p-5 bg-pitch">
      <div className="text-amber mb-2.5" aria-hidden="true">
        {icon}
      </div>
      <div className="text-[11px] tracking-[0.06em] mb-2 text-chalk/55">
        {label}
      </div>
      {content ?? <p className="text-sm text-chalk/50">{empty}</p>}
    </div>
  );
}

function LinkIcon() {
  return (
    <svg
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
      <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
    </svg>
  );
}

function ScaleIcon() {
  return (
    <svg
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M12 3v18" />
      <path d="M5 21h14" />
      <path d="m3 8 4-4 4 4-4 2-4-2z" />
      <path d="m13 8 4-4 4 4-4 2-4-2z" />
    </svg>
  );
}

function ClockIcon() {
  return (
    <svg
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7v5l3 2" />
    </svg>
  );
}

function ShieldIcon() {
  return (
    <svg
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
    </svg>
  );
}

function StarIcon() {
  return (
    <svg
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="m12 2 3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
    </svg>
  );
}

function GoalIcon() {
  return (
    <svg
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <circle cx="12" cy="12" r="10" />
      <path d="m12 7 2.5 1.8-1 3h-3l-1-3L12 7z" />
      <path d="M12 7V2.5M9.5 11.8 5.8 9.2M14.5 11.8l3.7-2.6M10.5 14.8 8 19M13.5 14.8 16 19" />
    </svg>
  );
}
