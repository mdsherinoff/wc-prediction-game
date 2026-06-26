import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { isAwardPicksLocked } from "@/lib/scoring";
import AwardCategoryPicker from "@/components/AwardCategoryPicker";

export const dynamic = "force-dynamic";

const CATEGORIES: {
  key: "GOLDEN_BALL" | "GOLDEN_BOOT" | "GOLDEN_GLOVE" | "YOUNG_PLAYER";
  label: string;
  hint: string;
}[] = [
  {
    key: "GOLDEN_BALL",
    label: "Golden Ball",
    hint: "Best player of the tournament",
  },
  { key: "GOLDEN_BOOT", label: "Golden Boot", hint: "Top goalscorer" },
  { key: "GOLDEN_GLOVE", label: "Golden Glove", hint: "Best goalkeeper" },
  {
    key: "YOUNG_PLAYER",
    label: "Best Young Player",
    hint: "Born on or after Jan 1, 2005",
  },
];

export default async function AwardsPage() {
  const session = await auth();
  if (!session?.user?.id) {
    redirect("/login");
  }

  const firstQf = await prisma.match.findFirst({
    where: { stage: "QF" },
    orderBy: { kickoff: "asc" },
  });
  const locked = firstQf ? isAwardPicksLocked(firstQf.kickoff) : false;

  const existingPicks = await prisma.awardPick.findMany({
    where: { userId: session.user.id },
    include: { player: true },
  });
  const picksByCategory = new Map(
    existingPicks.map((p) => [p.category, p.player]),
  );

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <h1 className="font-display text-3xl font-700 text-pitch mb-1">
        Award predictions
      </h1>
      <p className="text-sm text-ink/60 mb-2">
        Pick your winner for each award. You can change your mind anytime —
        {locked ? (
          <span className="text-red font-semibold">
            {" "}
            picks are now locked, the Quarter-Finals have started.
          </span>
        ) : (
          " picks lock the moment the Quarter-Finals kick off."
        )}
      </p>

      <div className="grid sm:grid-cols-2 gap-6 mt-6">
        {CATEGORIES.map((cat) => (
          <AwardCategoryPicker
            key={cat.key}
            category={cat.key}
            label={cat.label}
            hint={cat.hint}
            locked={locked}
            existingPlayer={
              picksByCategory.get(cat.key)
                ? {
                    id: picksByCategory.get(cat.key)!.id,
                    name: picksByCategory.get(cat.key)!.name,
                    country: picksByCategory.get(cat.key)!.country,
                    position: picksByCategory.get(cat.key)!.position,
                    club: picksByCategory.get(cat.key)!.club,
                    ageLabel: picksByCategory.get(cat.key)!.ageLabel,
                  }
                : null
            }
          />
        ))}
      </div>
    </div>
  );
}
