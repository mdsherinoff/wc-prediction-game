import { describe, it, expect } from "vitest";
import {
  LOCK_WINDOW_MS,
  OPEN_WINDOW_MS,
  lockTime,
  openTime,
  isLocked,
  isNotYetOpen,
  isPredictable,
  isAwardPicksLocked,
  scoreGroupPrediction,
  scoreKnockoutPrediction,
  scoreBracketPick,
  scoreAwardPick,
  stageLabel,
  isKnockoutStage,
  matchIsFinished,
} from "./scoring";

const KICKOFF = new Date("2026-06-15T18:00:00.000Z");

describe("lock / open windows", () => {
  it("locks exactly 1 minute before kickoff", () => {
    expect(LOCK_WINDOW_MS).toBe(60 * 1000);
    expect(lockTime(KICKOFF).getTime()).toBe(KICKOFF.getTime() - 60 * 1000);
  });

  it("opens 16 hours before kickoff", () => {
    expect(OPEN_WINDOW_MS).toBe(16 * 60 * 60 * 1000);
    expect(openTime(KICKOFF).getTime()).toBe(
      KICKOFF.getTime() - 16 * 60 * 60 * 1000,
    );
  });

  it("is not yet open more than 16h out", () => {
    const now = new Date(KICKOFF.getTime() - 17 * 60 * 60 * 1000);
    expect(isNotYetOpen(KICKOFF, now)).toBe(true);
    expect(isPredictable(KICKOFF, now)).toBe(false);
  });

  it("is predictable inside the window (e.g. 2h before)", () => {
    const now = new Date(KICKOFF.getTime() - 2 * 60 * 60 * 1000);
    expect(isNotYetOpen(KICKOFF, now)).toBe(false);
    expect(isLocked(KICKOFF, now)).toBe(false);
    expect(isPredictable(KICKOFF, now)).toBe(true);
  });

  it("locks within the final minute", () => {
    const now = new Date(KICKOFF.getTime() - 30 * 1000);
    expect(isLocked(KICKOFF, now)).toBe(true);
    expect(isPredictable(KICKOFF, now)).toBe(false);
  });

  it("is locked once at/after the lock time boundary", () => {
    expect(isLocked(KICKOFF, lockTime(KICKOFF))).toBe(true);
  });
});

describe("scoreGroupPrediction", () => {
  it("awards points for an exact scoreline", () => {
    expect(scoreGroupPrediction(2, 1, 2, 1, false, 1)).toBe(1);
    expect(scoreGroupPrediction(2, 1, 2, 1, false, 3)).toBe(3);
  });

  it("gives nothing for right winner but wrong scoreline", () => {
    expect(scoreGroupPrediction(3, 0, 2, 0, false, 1)).toBe(0);
  });

  it("gives nothing when marked known-incorrect", () => {
    expect(scoreGroupPrediction(2, 1, 2, 1, true, 1)).toBe(0);
  });

  it("gives nothing for a null prediction", () => {
    expect(scoreGroupPrediction(null, null, 0, 0, false, 1)).toBe(0);
    expect(scoreGroupPrediction(1, null, 1, 0, false, 1)).toBe(0);
  });
});

describe("scoreKnockoutPrediction", () => {
  const base = {
    actualWinnerTeamId: "teamA",
    pointsForWinner: 1,
    pointsForExactBonus: 2,
  };

  it("awards winner points for the right winner, wrong score", () => {
    expect(
      scoreKnockoutPrediction({
        ...base,
        predictedWinnerTeamId: "teamA",
        predHome: 3,
        predAway: 0,
        actualHome: 1,
        actualAway: 0,
      }),
    ).toBe(1);
  });

  it("awards winner + bonus for right winner and exact score", () => {
    expect(
      scoreKnockoutPrediction({
        ...base,
        predictedWinnerTeamId: "teamA",
        predHome: 1,
        predAway: 0,
        actualHome: 1,
        actualAway: 0,
      }),
    ).toBe(3);
  });

  it("gives nothing for the wrong winner", () => {
    expect(
      scoreKnockoutPrediction({
        ...base,
        predictedWinnerTeamId: "teamB",
        predHome: 0,
        predAway: 1,
        actualHome: 1,
        actualAway: 0,
      }),
    ).toBe(0);
  });

  it("awards only the exact-score bonus on a draw where the shootout winner was called wrong", () => {
    // Regulation ended 1-1, teamA won on penalties, user nailed 1-1 but
    // picked teamB (or nobody) to win the shootout.
    expect(
      scoreKnockoutPrediction({
        ...base,
        predictedWinnerTeamId: "teamB",
        predHome: 1,
        predAway: 1,
        actualHome: 1,
        actualAway: 1,
      }),
    ).toBe(2);
  });

  it("awards winner + bonus on a draw where the shootout winner was also correct", () => {
    expect(
      scoreKnockoutPrediction({
        ...base,
        predictedWinnerTeamId: "teamA",
        predHome: 1,
        predAway: 1,
        actualHome: 1,
        actualAway: 1,
      }),
    ).toBe(3);
  });

  it("gives nothing when marked known-incorrect", () => {
    expect(
      scoreKnockoutPrediction({
        ...base,
        predictedWinnerTeamId: "teamA",
        predHome: 1,
        predAway: 0,
        actualHome: 1,
        actualAway: 0,
        knownIncorrect: true,
      }),
    ).toBe(0);
  });

  it("scores winner-only when no scoreline was guessed", () => {
    expect(
      scoreKnockoutPrediction({
        ...base,
        predictedWinnerTeamId: "teamA",
        actualHome: 2,
        actualAway: 1,
      }),
    ).toBe(1);
  });
});

describe("bracket / award picks", () => {
  it("scores a correct bracket advancer", () => {
    expect(scoreBracketPick("teamA", "teamA", 1)).toBe(1);
    expect(scoreBracketPick("teamA", "teamB", 1)).toBe(0);
  });

  it("scores a correct award pick", () => {
    expect(scoreAwardPick("p1", "p1", 5)).toBe(5);
    expect(scoreAwardPick("p1", "p2", 5)).toBe(0);
  });

  it("locks award picks at the first QF kickoff, no buffer", () => {
    const qf = KICKOFF;
    expect(isAwardPicksLocked(qf, new Date(qf.getTime() - 1))).toBe(false);
    expect(isAwardPicksLocked(qf, qf)).toBe(true);
  });
});

describe("labels / helpers", () => {
  it("labels stages", () => {
    expect(stageLabel("GROUP")).toBe("Group Stage");
    expect(stageLabel("R32")).toBe("Round of 32");
    expect(stageLabel("FINAL")).toBe("Final");
  });

  it("identifies knockout stages", () => {
    expect(isKnockoutStage("GROUP")).toBe(false);
    expect(isKnockoutStage("QF")).toBe(true);
  });

  it("detects finished matches", () => {
    expect(matchIsFinished({ status: "FINISHED" })).toBe(true);
    expect(matchIsFinished({ status: "SCHEDULED" })).toBe(false);
  });
});
