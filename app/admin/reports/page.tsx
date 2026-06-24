import { requireAdmin } from "@/lib/admin";
import { redirect } from "next/navigation";
import { getReportsData } from "@/lib/reports";
import LeaderboardBarChart from "@/components/LeaderboardBarChart";
import PercentBarChart from "@/components/PercentBarChart";

export default async function AdminReportsPage() {
  const session = await requireAdmin();
  if (!session) {
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
          <PercentBarChart
            data={data.accuracy}
            dataKey="accuracyPct"
            color="#1f6e4a"
            title="ACCURACY"
            subtitle="SHARE OF SCORED PREDICTIONS THAT EARNED A POINT"
          />
        </div>
      </section>

      <section className="mb-10">
        <div className="ticket p-5">
          <PercentBarChart
            data={data.participation}
            dataKey="participationPct"
            color="#e8a33d"
            title="PARTICIPATION"
            subtitle="SHARE OF MATCHES EACH PERSON ACTUALLY PREDICTED"
          />
        </div>
      </section>

      <section>
        <h2 className="font-display text-xl font-700 text-turf mb-3">
          Fun facts
        </h2>
        <div className="grid sm:grid-cols-2 gap-4">
          <FunFactCard
            icon={<BoltIcon />}
            label="BOLDEST PREDICTOR"
            empty="No group predictions yet."
            content={
              data.boldestPredictor && (
                <>
                  <div className="font-display font-700 text-lg text-chalk mb-1.5">
                    {data.boldestPredictor.name}
                  </div>
                  <div
                    className="font-display text-[30px] leading-none flex items-baseline gap-2"
                    style={{
                      fontFamily:
                        "'DSEG7 Classic', 'Barlow Condensed', monospace",
                      color: "#e8a33d",
                    }}
                  >
                    {data.boldestPredictor.totalGoalsPredicted}
                    <span
                      className="text-xs font-normal"
                      style={{
                        fontFamily: "Inter, sans-serif",
                        color: "rgba(245,243,236,0.55)",
                      }}
                    >
                      goals predicted
                    </span>
                  </div>
                </>
              )
            }
          />

          <FunFactCard
            icon={<TrophyIcon />}
            label="CROWD FAVORITE TO WIN IT ALL"
            empty="No bracket final picks yet — this fills in once the bracket predictor is open."
            content={
              data.mostPopularChampionPick && (
                <>
                  <div className="font-display font-700 text-lg text-chalk mb-1.5">
                    {data.mostPopularChampionPick.teamName}
                  </div>
                  <div
                    className="font-display text-[30px] leading-none flex items-baseline gap-2"
                    style={{
                      fontFamily:
                        "'DSEG7 Classic', 'Barlow Condensed', monospace",
                      color: "#e8a33d",
                    }}
                  >
                    {data.mostPopularChampionPick.pickCount}
                    <span
                      className="text-xs font-normal"
                      style={{
                        fontFamily: "Inter, sans-serif",
                        color: "rgba(245,243,236,0.55)",
                      }}
                    >
                      {data.mostPopularChampionPick.pickCount === 1
                        ? "person picked them"
                        : "people picked them"}
                    </span>
                  </div>
                </>
              )
            }
          />
        </div>
      </section>
    </div>
  );
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

function BoltIcon() {
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
      <path d="M13 2 3 14h7l-1 8 10-12h-7l1-8z" />
    </svg>
  );
}

function TrophyIcon() {
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
      <path d="M8 21h8" />
      <path d="M12 17v4" />
      <path d="M7 4h10v5a5 5 0 0 1-10 0V4Z" />
      <path d="M7 5H5a2 2 0 0 0-2 2v1a4 4 0 0 0 4 4" />
      <path d="M17 5h2a2 2 0 0 1 2 2v1a4 4 0 0 1-4 4" />
    </svg>
  );
}
