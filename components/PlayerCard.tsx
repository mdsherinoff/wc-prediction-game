const POSITION_LABELS: Record<string, string> = {
  GK: "Goalkeeper",
  DF: "Defender",
  MF: "Midfielder",
  FW: "Forward",
};

export default function PlayerCard({
  name,
  country,
  position,
  club,
  ageLabel,
  awardLabel,
}: {
  name: string;
  country: string;
  position: string | null;
  club: string | null;
  ageLabel: string | null;
  awardLabel?: string;
}) {
  const positionLabel = position
    ? (POSITION_LABELS[position] ?? position)
    : null;
  // "27-010" style -> show just the years part for a clean display age
  const ageYears = ageLabel ? ageLabel.split("-")[0] : null;

  return (
    <div
      className="relative rounded-xl overflow-hidden w-full max-w-[260px] aspect-[3/4] flex flex-col justify-between p-4"
      style={{
        background: "linear-gradient(160deg, #0b3d2e 0%, #13261f 70%)",
        border: "1px solid rgba(232,163,61,0.4)",
      }}
    >
      {awardLabel && (
        <div
          className="absolute top-0 left-0 right-0 text-center py-1.5 text-[10px] font-display font-bold tracking-wide"
          style={{ background: "var(--amber)", color: "var(--ink)" }}
        >
          {awardLabel.toUpperCase()}
        </div>
      )}

      <div className="flex-1 flex items-center justify-center mt-6">
        {/* No player photos in the dataset — initials badge stands in for the portrait */}
        <div
          className="w-24 h-24 rounded-full flex items-center justify-center font-display font-bold text-3xl"
          style={{ background: "rgba(232,163,61,0.15)", color: "var(--amber)" }}
        >
          {name
            .split(" ")
            .map((p) => p[0])
            .slice(0, 2)
            .join("")
            .toUpperCase()}
        </div>
      </div>

      <div className="text-center">
        <div className="font-display font-bold text-lg tracking-wide text-[var(--chalk)] leading-tight mb-1">
          {name.toUpperCase()}
        </div>
        <div
          className="text-[11px] tracking-wide"
          style={{ color: "var(--board-text-muted)" }}
        >
          {country}
        </div>

        <div
          className="flex items-center justify-center gap-3 mt-3 pt-3 text-[10px] tracking-wide"
          style={{
            borderTop: "1px solid var(--board-divider)",
            color: "var(--board-text-muted)",
          }}
        >
          {positionLabel && <span>{positionLabel.toUpperCase()}</span>}
          {club && <span>{club.toUpperCase()}</span>}
          {ageYears && <span>AGE {ageYears}</span>}
        </div>
      </div>
    </div>
  );
}
