import { Match, MatchStatus, Stage } from "@prisma/client";

/** A prediction locks 1 minute before kickoff. */
export const LOCK_WINDOW_MS = 1 * 60 * 1000;

/** Predictions only open 16 hours before kickoff, not before. */
export const OPEN_WINDOW_MS = 16 * 60 * 60 * 1000;

export function lockTime(kickoff: Date): Date {
  return new Date(kickoff.getTime() - LOCK_WINDOW_MS);
}

export function openTime(kickoff: Date): Date {
  return new Date(kickoff.getTime() - OPEN_WINDOW_MS);
}

export function isLocked(kickoff: Date, now: Date = new Date()): boolean {
  return now.getTime() >= lockTime(kickoff).getTime();
}

export function isNotYetOpen(kickoff: Date, now: Date = new Date()): boolean {
  return now.getTime() < openTime(kickoff).getTime();
}

/** True only during the predictable window: open 16h before kickoff, closes 1h before kickoff. */
export function isPredictable(kickoff: Date, now: Date = new Date()): boolean {
  return !isNotYetOpen(kickoff, now) && !isLocked(kickoff, now);
}

/**
 * For the bracket predictor: all picks for a given round lock at
 * (kickoff of the first match of that round) - 1 hour.
 */
export function roundLockTime(firstMatchKickoffInRound: Date): Date {
  return lockTime(firstMatchKickoffInRound);
}

/** Award picks score configurable points if the user's pick matches the real winner. */
export function scoreAwardPick(
  pickedPlayerId: string,
  actualWinnerPlayerId: string,
  pointsForCorrect: number,
): number {
  return pickedPlayerId === actualWinnerPlayerId ? pointsForCorrect : 0;
}

/** Award picks lock exactly at kickoff of the first Quarter-Final match — no buffer. */
export function isAwardPicksLocked(
  firstQfKickoff: Date,
  now: Date = new Date(),
): boolean {
  return now.getTime() >= firstQfKickoff.getTime();
}

/** Group stage scoring: exact scoreline correct = configurable points. Nothing for "right winner only". */
export function scoreGroupPrediction(
  predHome: number | null,
  predAway: number | null,
  actualHome: number,
  actualAway: number,
  knownIncorrect: boolean,
  pointsForExact: number,
): number {
  if (knownIncorrect) return 0;
  if (predHome == null || predAway == null) return 0;
  return predHome === actualHome && predAway === actualAway
    ? pointsForExact
    : 0;
}

/**
 * Knockout scoring: correct winner = 1 point, +2 bonus if exact scoreline
 * (regulation/ET score, not penalties) is also correct. Max 3 points/match.
 * If the prediction didn't include a scoreline guess, only winner points apply.
 */
export function scoreKnockoutPrediction(params: {
  predictedWinnerTeamId: string | null;
  predHome?: number | null;
  predAway?: number | null;
  actualWinnerTeamId: string;
  actualHome: number;
  actualAway: number;
  knownIncorrect?: boolean;
  pointsForWinner: number;
  pointsForExactBonus: number;
}): number {
  const {
    predictedWinnerTeamId,
    predHome,
    predAway,
    actualWinnerTeamId,
    actualHome,
    actualAway,
    knownIncorrect,
    pointsForWinner,
    pointsForExactBonus,
  } = params;

  if (knownIncorrect) return 0;

  const isDraw = actualHome === actualAway;
  const exactScore =
    predHome != null &&
    predAway != null &&
    predHome === actualHome &&
    predAway === actualAway;

  // Drew exactly on the scoreline but called the penalty-shootout winner
  // wrong (or didn't guess one) — still reward the accurate scoreline read,
  // but not the winner points, since the shootout call itself was wrong.
  if (isDraw && exactScore && predictedWinnerTeamId !== actualWinnerTeamId) {
    return pointsForExactBonus;
  }

  if (!predictedWinnerTeamId) return 0;

  let points = 0;
  if (predictedWinnerTeamId === actualWinnerTeamId) {
    points += pointsForWinner;
    if (exactScore) {
      points += pointsForExactBonus;
    }
  }
  return points;
}

/** Bracket predictor: configurable points if the picked team is indeed the real winner of that slot. */
export function scoreBracketPick(
  pickedTeamId: string,
  actualWinnerTeamId: string,
  pointsForCorrect: number,
): number {
  return pickedTeamId === actualWinnerTeamId ? pointsForCorrect : 0;
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
