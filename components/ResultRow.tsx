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
  const kickoffLabel = new Date(kickoff).toLocaleDateString(undefined, {
    weekday: "short",
    month: "short",
    day: "numeric",
  });

  return (
    <div className="ticket px-5 py-3 mx-2 flex items-center justify-between gap-4">
      <div className="flex-1 min-w-0">
        <div className="text-xs text-ink/40 mb-0.5">{kickoffLabel}</div>
        <div className="font-medium text-ink truncate">
          {homeTeam?.name ?? "TBD"}{" "}
          <span className="text-ink/40">vs</span> {awayTeam?.name ?? "TBD"}
        </div>
      </div>

      <div className="flex items-center gap-3 shrink-0">
        <div className="score-box w-10 h-10 text-lg flex items-center justify-center">
          {homeScore ?? "-"}
        </div>
        <span className="text-ink/40 font-display">-</span>
        <div className="score-box w-10 h-10 text-lg flex items-center justify-center">
          {awayScore ?? "-"}
        </div>
        {wentToPens && (
          <span className="text-xs text-ink/40">
            (pens {penHomeScore}-{penAwayScore})
          </span>
        )}
        {userPoints != null && (
          <span className="text-xs font-semibold text-amber whitespace-nowrap">
            +{userPoints} pt
          </span>
        )}
      </div>
    </div>
  );
}
