type Team = { name: string; flagUrl?: string | null } | null;

export default function ResultRow({
  kickoff,
  homeTeam,
  awayTeam,
  homeScore,
  awayScore,
  wentToPens,
  penHomeScore,
  penAwayScore,
  userPoints,
}: {
  kickoff: string;
  homeTeam: Team;
  awayTeam: Team;
  homeScore: number | null;
  awayScore: number | null;
  wentToPens?: boolean;
  penHomeScore?: number | null;
  penAwayScore?: number | null;
  userPoints?: number | null;
}) {
  const kickoffLabel = new Date(kickoff)
    .toLocaleDateString(undefined, {
      weekday: "short",
      month: "short",
      day: "numeric",
    })
    .toUpperCase();

  return (
    <div className="scoreboard-card px-4 py-3 mx-2 flex items-center justify-between gap-4">
      <div className="flex-1 min-w-0">
        <div
          className="text-[11px] tracking-wide mb-1"
          style={{ color: "var(--board-text-muted)" }}
        >
          {kickoffLabel}
        </div>
        <div className="font-display font-bold text-base tracking-wide text-[var(--chalk)] truncate">
          {homeTeam?.name?.toUpperCase() ?? "TBD"}{" "}
          <span style={{ color: "var(--board-text-muted)" }}>VS</span>{" "}
          {awayTeam?.name?.toUpperCase() ?? "TBD"}
        </div>
      </div>

      <div className="flex items-center gap-3 shrink-0">
        <div className="digit-box w-10 h-10 text-lg flex items-center justify-center">
          {homeScore ?? "-"}
        </div>
        <span
          className="font-display"
          style={{ color: "var(--board-text-muted)" }}
        >
          -
        </span>
        <div className="digit-box w-10 h-10 text-lg flex items-center justify-center">
          {awayScore ?? "-"}
        </div>

        {wentToPens && (
          <span
            className="text-xs whitespace-nowrap"
            style={{ color: "var(--board-text-muted)" }}
          >
            (PENS {penHomeScore}-{penAwayScore})
          </span>
        )}

        {userPoints != null && (
          <span className="text-xs font-semibold text-[var(--amber)] whitespace-nowrap">
            +{userPoints} pt
          </span>
        )}
      </div>
    </div>
  );
}
