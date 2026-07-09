import { requireAdmin } from "@/lib/admin";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import AdminSyncButton from "@/components/AdminSyncButton";
import AdminAdjustmentRow from "@/components/AdminAdjustmentRow";
import Link from "next/link";

export default async function AdminPage() {
  const session = await requireAdmin();
  if (!session) {
    redirect("/login");
  }

  const setting = await prisma.setting.findUnique({
    where: { key: "bracket_unlocked" },
  });

  const users = await prisma.user.findMany({
    include: { manualAdjustment: true },
    orderBy: { name: "asc" },
  });

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <div className="flex items-center justify-between mb-1">
        <h1 className="font-display text-3xl font-700 text-pitch">Admin</h1>
        <div className="flex gap-2 flex-wrap">
          <Link
            href="/admin/points-config"
            className="text-sm bg-amber text-ink px-3 py-1.5 rounded font-semibold hover:brightness-110"
          >
            Points config →
          </Link>
          <Link
            href="/admin/matches"
            className="text-sm bg-pitch text-chalk px-3 py-1.5 rounded font-semibold hover:brightness-110"
          >
            Manual result entry →
          </Link>
          <Link
            href="/admin/match-predictions"
            className="text-sm bg-ink text-chalk px-3 py-1.5 rounded font-semibold hover:brightness-110"
          >
            View match predictions →
          </Link>
          <Link
            href="/admin/backfill"
            className="text-sm bg-pitch text-chalk px-3 py-1.5 rounded font-semibold hover:brightness-110"
          >
            Backfill predictions →
          </Link>
          <Link
            href="/admin/reports"
            className="text-sm bg-turf text-chalk px-3 py-1.5 rounded font-semibold hover:brightness-110"
          >
            View reports →
          </Link>
          <Link
            href="/admin/awards"
            className="text-sm bg-amber text-ink px-3 py-1.5 rounded font-semibold hover:brightness-110"
          >
            Set award winners →
          </Link>
          <a
            href="/api/admin/award-picks/pdf"
            className="text-sm bg-ink text-chalk px-3 py-1.5 rounded font-semibold hover:brightness-110"
          >
            Download award picks (PDF) ↓
          </a>
        </div>
      </div>
      <p className="text-sm text-ink/60 mb-6">
        Bracket predictor status:{" "}
        <span className="font-semibold">
          {setting?.value === "true"
            ? "Unlocked"
            : "Locked (groups not finished)"}
        </span>
      </p>

      <div className="mb-8">
        <AdminSyncButton />
        <p className="text-xs text-ink/40 mt-2">
          Pulls latest results from football-data.org, scores any newly finished
          matches, and unlocks the bracket if the group stage is done.
        </p>
      </div>

      <h2 className="font-display text-xl font-700 text-turf mb-3">
        Manual point adjustments
      </h2>
      <p className="text-xs text-ink/50 mb-4">
        One editable number per person, added straight onto their leaderboard
        total — use this for points from matches predicted before this site
        existed, or to correct a mistake. Overwrite anytime; saving replaces the
        previous value (it doesn&apos;t add to it).
      </p>

      <div className="space-y-2 mb-10">
        {users.length === 0 && (
          <p className="text-sm text-ink/40">No users have signed in yet.</p>
        )}
        {users.map((u) => (
          <AdminAdjustmentRow
            key={u.id}
            userId={u.id}
            name={u.name ?? u.email ?? "Unknown"}
            currentPoints={u.manualAdjustment?.points ?? 0}
            currentNote={u.manualAdjustment?.note ?? null}
          />
        ))}
      </div>

      <h2 className="font-display text-xl font-700 text-turf mb-3">
        Manual result entry (fallback)
      </h2>
      <p className="text-xs text-ink/50 mb-4">
        Set or correct any match&apos;s score when the automatic sync is
        delayed or wrong. Now on its own page, split into tabs per round.
      </p>
      <Link
        href="/admin/matches"
        className="inline-block text-sm bg-pitch text-chalk px-3 py-1.5 rounded font-semibold hover:brightness-110"
      >
        Open manual result entry →
      </Link>
    </div>
  );
}
