import { prisma } from "@/lib/prisma";
import { MatchStatus } from "@prisma/client";

const FOOTBALL_DATA_BASE = "https://api.football-data.org/v4";

// football-data.org competition code for FIFA World Cup is "WC".
// Free tier allows 10 requests/minute — plenty for a friend-group app that
// syncs every few minutes during match windows, or on-demand via the admin panel.
type FdMatch = {
  id: number;
  utcDate: string;
  status:
    | "SCHEDULED"
    | "TIMED"
    | "IN_PLAY"
    | "PAUSED"
    | "FINISHED"
    | "POSTPONED"
    | "SUSPENDED"
    | "CANCELLED";
  stage: string;
  group: string | null;
  homeTeam: { name: string; tla: string | null; shortName: string | null };
  awayTeam: { name: string; tla: string | null; shortName: string | null };
  score: {
    winner: "HOME_TEAM" | "AWAY_TEAM" | "DRAW" | null;
    duration: "REGULAR" | "EXTRA_TIME" | "PENALTY_SHOOTOUT" | null;

    regularTime?: {
      home: number | null;
      away: number | null;
    };

    halfTime?: {
      home: number | null;
      away: number | null;
    };

    fullTime: {
      home: number | null;
      away: number | null;
    };

    extraTime?: {
      home: number | null;
      away: number | null;
    };

    penalties?: {
      home: number | null;
      away: number | null;
    };
  };
};

function mapStatus(fdStatus: FdMatch["status"]): MatchStatus {
  if (fdStatus === "FINISHED") return MatchStatus.FINISHED;
  if (fdStatus === "IN_PLAY" || fdStatus === "PAUSED") return MatchStatus.LIVE;
  return MatchStatus.SCHEDULED;
}

async function fetchWorldCupMatches(): Promise<FdMatch[]> {
  const apiKey = process.env.FOOTBALL_DATA_API_KEY;
  if (!apiKey) {
    throw new Error("FOOTBALL_DATA_API_KEY is not set");
  }

  const res = await fetch(`${FOOTBALL_DATA_BASE}/competitions/WC/matches`, {
    headers: { "X-Auth-Token": apiKey },
    cache: "no-store",
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(
      `football-data.org request failed (${res.status}): ${text}`,
    );
  }

  const data = await res.json();
  return data.matches as FdMatch[];
}

/**
 * Pulls current fixture/result data from football-data.org and updates
 * Match rows that have a matching externalId. Does NOT create new Match rows —
 * fixtures should be seeded ahead of time via `npm run seed` (see prisma/seed.ts),
 * since slotKey/stage/group mapping needs human judgment that the API only partially provides.
 *
 * Returns a summary of what changed for the admin UI / logs.
 */
export async function syncResultsFromFootballData() {
  const fdMatches = await fetchWorldCupMatches();
  const updated: string[] = [];
  const skipped: string[] = [];
  const errors: { externalId: string; error: string }[] = [];
  // Matches whose graded result (score or winner) actually changed this sync.
  // The caller uses these to re-score predictions that were already scored
  // under an out-of-date result.
  const resultChanged: { id: string; slotKey: string | null }[] = [];

  for (const fd of fdMatches) {
    const externalId = String(fd.id);
    try {
      const existing = await prisma.match.findUnique({ where: { externalId } });
      if (!existing) {
        skipped.push(externalId);
        continue;
      }

      const status = mapStatus(fd.status);

      // Branch on duration to pick the right score fields per match type:
      //
      // REGULAR: ended at 90 min — fullTime is the real score, regularTime
      //   is absent from the response entirely.
      //
      // EXTRA_TIME: went to extra time but no penalties — fullTime is safe
      //   to use here too since there are no penalty goals to pollute it.
      //   regularTime + extraTime would also work but fullTime is simpler.
      //
      // PENALTY_SHOOTOUT: fullTime includes penalty goals (confirmed from
      //   API docs and real match data), so we must use regularTime instead,
      //   which the API always provides for these matches.
      //
      // In all cases: only write the score if we have real data.
      // Never fall back to 0 — fall back to the existing DB value instead,
      // so a temporarily missing API response never corrupts stored scores.
      const duration = fd.score.duration;
      const wentToPens = duration === "PENALTY_SHOOTOUT";

      let homeScore: number | null = existing.homeScore;
      let awayScore: number | null = existing.awayScore;

      if (duration === "REGULAR" || duration === "EXTRA_TIME") {
        if (fd.score.fullTime.home != null && fd.score.fullTime.away != null) {
          homeScore = fd.score.fullTime.home;
          awayScore = fd.score.fullTime.away;
        }
      } else if (duration === "PENALTY_SHOOTOUT") {
        if (
          fd.score.regularTime?.home != null &&
          fd.score.regularTime?.away != null
        ) {
          homeScore = fd.score.regularTime.home;
          awayScore = fd.score.regularTime.away;
        }
      }
      // If duration is null (match not started/in progress), we fall through
      // with existing values — no write needed for score fields.

      let winnerTeamId: string | null = existing.winnerTeamId;
      if (status === MatchStatus.FINISHED) {
        if (wentToPens && fd.score.penalties) {
          winnerTeamId =
            fd.score.penalties.home! > fd.score.penalties.away!
              ? existing.homeTeamId
              : existing.awayTeamId;
        } else if (fd.score.winner === "HOME_TEAM") {
          winnerTeamId = existing.homeTeamId;
        } else if (fd.score.winner === "AWAY_TEAM") {
          winnerTeamId = existing.awayTeamId;
        }
      }

      const gradedResultChanged =
        existing.homeScore !== homeScore ||
        existing.awayScore !== awayScore ||
        existing.winnerTeamId !== winnerTeamId;

      await prisma.match.update({
        where: { id: existing.id },
        data: {
          status,
          homeScore,
          awayScore,
          wentToPens,
          penHomeScore: fd.score.penalties?.home ?? null,
          penAwayScore: fd.score.penalties?.away ?? null,
          winnerTeamId,
        },
      });

      updated.push(existing.id);
      if (gradedResultChanged) {
        resultChanged.push({ id: existing.id, slotKey: existing.slotKey });
      }
    } catch (err) {
      console.error(`Failed to sync match ${externalId}:`, err);
      errors.push({
        externalId,
        error: err instanceof Error ? err.message : "Unknown error",
      });
    }
  }

  return {
    updatedCount: updated.length,
    updatedMatchIds: updated,
    resultChanged,
    skippedExternalIds: skipped,
    errors,
  };
}
