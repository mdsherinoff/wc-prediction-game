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
  size = "default",
  pointsAwarded,
}: {
  name: string;
  country: string;
  position: string | null;
  club: string | null;
  ageLabel: string | null;
  awardLabel?: string;
  size?: "default" | "compact";
  pointsAwarded?: number | null;
}) {
  const positionLabel = position
    ? (POSITION_LABELS[position] ?? position)
    : null;
  // "27-010" style -> show just the years part for a clean display age
  const ageYears = ageLabel ? ageLabel.split("-")[0] : null;
  const compact = size === "compact";

  return (
    <div
      className={`relative rounded-xl overflow-hidden w-full flex flex-col justify-between ${
        compact ? "aspect-[3/4] p-2" : "max-w-[260px] aspect-[3/4] p-4"
      }`}
      style={{
        background: "linear-gradient(160deg, #0b3d2e 0%, #13261f 70%)",
        border: "1px solid rgba(232,163,61,0.4)",
      }}
    >
      {awardLabel && (
        <div
          className={`absolute top-0 left-0 right-0 text-center font-display font-bold tracking-wide ${
            compact ? "py-1 text-[7px]" : "py-1.5 text-[10px]"
          }`}
          style={{ background: "var(--amber)", color: "var(--ink)" }}
        >
          {awardLabel.toUpperCase()}
        </div>
      )}

      <div
        className={`flex-1 flex items-center justify-center ${compact ? "mt-4" : "mt-6"}`}
      >
        {/* No player photos in the dataset — initials badge stands in for the portrait */}
        <div
          className={`rounded-full flex items-center justify-center font-display font-bold ${
            compact ? "w-10 h-10 text-sm" : "w-24 h-24 text-3xl"
          }`}
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
        <div
          className={`font-display font-bold tracking-wide text-[var(--chalk)] leading-tight ${
            compact ? "text-[10px] mb-0.5" : "text-lg mb-1"
          }`}
        >
          {name.toUpperCase()}
        </div>
        <div
          className={
            compact ? "text-[8px] tracking-wide" : "text-[11px] tracking-wide"
          }
          style={{ color: "var(--board-text-muted)" }}
        >
          {country}
        </div>

        <div
          className={`flex flex-col items-center gap-0.5 ${
            compact ? "mt-1.5 pt-1.5 text-[7px]" : "mt-3 pt-3 text-[10px]"
          }`}
          style={{
            borderTop: "1px solid var(--board-divider)",
            color: "var(--board-text-muted)",
          }}
        >
          <div
            className={`flex items-center justify-center gap-2 tracking-wide ${compact ? "flex-wrap" : ""}`}
          >
            {positionLabel && <span>{positionLabel.toUpperCase()}</span>}
            {ageYears && <span>AGE {ageYears}</span>}
          </div>
          {club && (
            <div className="tracking-wide truncate max-w-full px-1">
              {club.toUpperCase()}
            </div>
          )}
        </div>

        {pointsAwarded != null && (
          <div
            className={`mt-1.5 font-display font-bold ${compact ? "text-[10px]" : "text-sm"}`}
            style={{
              color:
                pointsAwarded > 0 ? "var(--amber)" : "var(--board-digit-dim)",
            }}
          >
            +{pointsAwarded} PT{pointsAwarded === 1 ? "" : "S"}
          </div>
        )}
      </div>
    </div>
  );
}
