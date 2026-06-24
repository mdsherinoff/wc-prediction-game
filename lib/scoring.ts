import { Match, MatchStatus, Stage } from "@prisma/client";

/** A prediction locks 1 hour before kickoff. */
export const LOCK_WINDOW_MS = 60 * 60 * 1000;

export function lockTime(kickoff: Date): Date {
  return new Date(kickoff.getTime() - LOCK_WINDOW_MS);
}

export function isLocked(kickoff: Date, now: Date = new Date()): boolean {
  return now.getTime() >= lockTime(kickoff).getTime();
}

/**
 * For the bracket predictor: all picks for a given round lock at
 * (kickoff of the first match of that round) - 1 hour.
 */
export function roundLockTime(firstMatchKickoffInRound: Date): Date {
  return lockTime(firstMatchKickoffInRound);
}

/** Group stage scoring: exact scoreline correct = 1 point. Nothing for "right winner only". */
export function scoreGroupPrediction(
  predHome: number,
  predAway: number,
  actualHome: number,
  actualAway: number
): number {
  return predHome === actualHome && predAway === actualAway ? 1 : 0;
}

/**
 * Knockout scoring: correct winner = 1 point, +2 bonus if exact scoreline
 * (regulation/ET score, not penalties) is also correct. Max 3 points/match.
 * If the prediction didn't include a scoreline guess, only winner points apply.
 */
export function scoreKnockoutPrediction(params: {
  predictedWinnerTeamId: string;
  predHome?: number | null;
  predAway?: number | null;
  actualWinnerTeamId: string;
  actualHome: number;
  actualAway: number;
}): number {
  const { predictedWinnerTeamId, predHome, predAway, actualWinnerTeamId, actualHome, actualAway } =
    params;

  let points = 0;
  if (predictedWinnerTeamId === actualWinnerTeamId) {
    points += 1;
    if (
      predHome != null &&
      predAway != null &&
      predHome === actualHome &&
      predAway === actualAway
    ) {
      points += 2;
    }
  }
  return points;
}

/** Bracket predictor: 1 point if the picked team is indeed the real winner of that slot. */
export function scoreBracketPick(pickedTeamId: string, actualWinnerTeamId: string): number {
  return pickedTeamId === actualWinnerTeamId ? 1 : 0;
}

export function stageLabel(stage: Stage): string {
  switch (stage) {
    case "GROUP":
      return "Group Stage";
    case "R32":
      return "Round of 32";
    case "R16":
      return "Round of 16";
    case "QF":
      return "Quarter-Final";
    case "SF":
      return "Semi-Final";
    case "THIRD_PLACE":
      return "Third Place Playoff";
    case "FINAL":
      return "Final";
    default:
      return stage;
  }
}

export function isKnockoutStage(stage: Stage): boolean {
  return stage !== "GROUP";
}

export function matchIsFinished(match: Pick<Match, "status">): boolean {
  return match.status === MatchStatus.FINISHED;
}
