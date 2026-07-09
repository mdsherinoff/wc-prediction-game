import { requireAdmin } from "@/lib/admin";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import Link from "next/link";
import AdminAwardWinnerPicker from "@/components/AdminAwardWinnerPicker";

export const dynamic = "force-dynamic";

const CATEGORIES: {
  key: "GOLDEN_BALL" | "GOLDEN_BOOT" | "GOLDEN_GLOVE" | "YOUNG_PLAYER";
  label: string;
  hint: string;
}[] = [
  { key: "GOLDEN_BALL", label: "Golden Ball", hint: "Best player of the tournament" },
  { key: "GOLDEN_BOOT", label: "Golden Boot", hint: "Top goalscorer" },
  { key: "GOLDEN_GLOVE", label: "Golden Glove", hint: "Best goalkeeper" },
  {
    key: "YOUNG_PLAYER",
    label: "Best Young Player",
    hint: "Born on or after Jan 1, 2005",
  },
];

export default async function AdminAwardsPage() {
  const session = await requireAdmin();
  if (!session) {
    redirect("/login");
  }

  const winners = await prisma.awardWinner.findMany({
    include: { player: true },
  });
  const winnerByCategory = new Map(winners.map((w) => [w.category, w.player]));

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <div className="flex items-center justify-between mb-1">
        <h1 className="font-display text-3xl font-700 text-pitch">
          Award winners
        </h1>
        <Link href="/admin" className="text-sm text-turf underline">
          ← Back to admin
        </Link>
      </div>
      <p className="text-sm text-ink/60 mb-6">
        Set the real winner for each award once it&apos;s announced. Saving a
        winner immediately awards points to everyone who picked that player, and
        changing or clearing a winner re-scores everyone in that category.
      </p>

      <div className="grid sm:grid-cols-2 gap-6">
        {CATEGORIES.map((cat) => {
          const player = winnerByCategory.get(cat.key);
          return (
            <AdminAwardWinnerPicker
              key={cat.key}
              category={cat.key}
              label={cat.label}
              hint={cat.hint}
              existingPlayer={
                player
                  ? {
                      id: player.id,
                      name: player.name,
                      country: player.country,
                      position: player.position,
                      club: player.club,
                      ageLabel: player.ageLabel,
                    }
                  : null
              }
            />
          );
        })}
      </div>
    </div>
  );
}
