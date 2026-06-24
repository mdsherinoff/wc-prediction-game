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
      <h1 className="font-display text-3xl font-700 text-pitch mb-1">
        Reports
      </h1>
      <p className="text-sm text-ink/60 mb-8">
        {data.totalFinishedMatches} match
        {data.totalFinishedMatches === 1 ? "" : "es"} scored so far.
      </p>

      <section className="mb-10">
        <h2 className="font-display text-xl font-700 text-turf mb-1">
          Leaderboard
        </h2>
        <p className="text-xs text-ink/50 mb-4">
          Total points per person, broken down by where they came from.
        </p>
        <div className="ticket p-4">
          <LeaderboardBarChart data={data.leaderboardBars} />
        </div>
      </section>

      <section className="mb-10">
        <h2 className="font-display text-xl font-700 text-turf mb-1">
          Accuracy
        </h2>
        <p className="text-xs text-ink/50 mb-4">
          Of the matches each person predicted and that have been scored, the
          share where they earned at least one point.
        </p>
        <div className="ticket p-4">
          <PercentBarChart
            data={data.accuracy}
            dataKey="accuracyPct"
            color="#1f6e4a"
          />
        </div>
      </section>

      <section className="mb-10">
        <h2 className="font-display text-xl font-700 text-turf mb-1">
          Participation
        </h2>
        <p className="text-xs text-ink/50 mb-4">
          Share of all group + knockout matches so far that each person actually
          submitted a prediction for.
        </p>
        <div className="ticket p-4">
          <PercentBarChart
            data={data.participation}
            dataKey="participationPct"
            color="#e8a33d"
          />
        </div>
      </section>

      <section>
        <h2 className="font-display text-xl font-700 text-turf mb-3">
          Fun facts
        </h2>
        <div className="grid sm:grid-cols-2 gap-4">
          <div className="ticket p-5">
            <div className="text-xs text-ink/50 mb-1">Boldest predictor</div>
            {data.boldestPredictor ? (
              <p className="text-sm">
                <span className="font-semibold text-pitch">
                  {data.boldestPredictor.name}
                </span>{" "}
                predicted the most total goals across the group stage —{" "}
                <span className="font-semibold text-amber">
                  {data.boldestPredictor.totalGoalsPredicted}
                </span>{" "}
                goals in total.
              </p>
            ) : (
              <p className="text-sm text-ink/40">No group predictions yet.</p>
            )}
          </div>

          <div className="ticket p-5">
            <div className="text-xs text-ink/50 mb-1">
              Crowd favorite to win it all
            </div>
            {data.mostPopularChampionPick ? (
              <p className="text-sm">
                <span className="font-semibold text-pitch">
                  {data.mostPopularChampionPick.teamName}
                </span>{" "}
                is the most-picked champion, chosen by{" "}
                <span className="font-semibold text-amber">
                  {data.mostPopularChampionPick.pickCount}
                </span>{" "}
                {data.mostPopularChampionPick.pickCount === 1
                  ? "person"
                  : "people"}
                .
              </p>
            ) : (
              <p className="text-sm text-ink/40">
                No bracket final picks yet — this fills in once the bracket
                predictor is open.
              </p>
            )}
          </div>
        </div>
      </section>
    </div>
  );
}
