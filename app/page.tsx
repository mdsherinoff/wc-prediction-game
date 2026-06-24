import Link from "next/link";
import { auth } from "@/auth";

export default async function HomePage() {
  const session = await auth();

  return (
    <div>
      <section className="bg-pitch text-chalk">
        <div className="max-w-5xl mx-auto px-4 py-16 text-center">
          <p className="font-display text-amber tracking-[0.3em] text-sm mb-3">
            FIFA WORLD CUP 2026 · USA · MEXICO · CANADA
          </p>
          <h1 className="font-display text-5xl sm:text-6xl font-800 mb-4">
            Predict every match.
            <br />
            Settle the bragging rights.
          </h1>
          <p className="text-chalk/80 max-w-xl mx-auto mb-8">
            Score the group stage exactly right, call the knockout winners,
            and build your bracket all the way to the final.
          </p>
          {session?.user ? (
            <Link
              href="/groups"
              className="inline-block bg-amber text-ink font-semibold px-6 py-3 rounded-lg hover:brightness-95 transition"
            >
              Make your predictions
            </Link>
          ) : (
            <Link
              href="/login"
              className="inline-block bg-amber text-ink font-semibold px-6 py-3 rounded-lg hover:brightness-95 transition"
            >
              Sign in to play
            </Link>
          )}
        </div>
      </section>

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
    <div className="ticket p-6">
      <span className="font-display text-amber text-3xl font-700">
        {step}
      </span>
      <h3 className="font-display text-xl font-700 text-pitch mt-1 mb-2">
        {title}
      </h3>
      <p className="text-sm text-ink/70">{body}</p>
    </div>
  );
}
