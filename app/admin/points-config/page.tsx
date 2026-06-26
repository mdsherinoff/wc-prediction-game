import { requireAdmin } from "@/lib/admin";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import PointsConfigForm from "@/components/PointsConfigForm";

export const dynamic = "force-dynamic";

export default async function PointsConfigPage() {
  const session = await requireAdmin();
  if (!session) {
    redirect("/login");
  }

  const config = await prisma.pointsConfig.findMany({
    orderBy: [{ group: "asc" }, { key: "asc" }],
  });

  if (config.length === 0) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-16 text-center text-ink/60">
        <p>
          No points configuration found. Run{" "}
          <code className="bg-line px-1 rounded">
            npx tsx prisma/seed-points-config.ts
          </code>{" "}
          once to set up the defaults.
        </p>
      </div>
    );
  }

  const byGroup = new Map<string, typeof config>();
  for (const c of config) {
    if (!byGroup.has(c.group)) byGroup.set(c.group, []);
    byGroup.get(c.group)!.push(c);
  }

  return (
    <div className="max-w-2xl mx-auto px-4 py-8">
      <h1 className="font-display text-3xl font-700 text-pitch mb-1">
        Points configuration
      </h1>
      <p className="text-sm text-ink/60 mb-8">
        Changing a value here immediately re-scores every already-finished match
        or award using the new rule, and updates everyone&apos;s leaderboard
        total right away.
      </p>

      {Array.from(byGroup.entries()).map(([group, items]) => (
        <div key={group} className="mb-8">
          <h2 className="font-display text-lg font-700 text-turf mb-3">
            {group}
          </h2>
          <div className="space-y-2">
            {items.map((item) => (
              <PointsConfigForm
                key={item.key}
                configKey={item.key}
                label={item.label}
                value={item.value}
              />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
