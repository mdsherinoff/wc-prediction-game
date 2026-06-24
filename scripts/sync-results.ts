import { syncResultsFromFootballData } from "@/lib/football-data";
import { scoreFinishedMatches, maybeUnlockBracket } from "@/lib/scoring-engine";

async function main() {
  console.log("Syncing results from football-data.org...");
  const syncResult = await syncResultsFromFootballData();
  console.log("Sync result:", syncResult);

  console.log("Scoring finished matches...");
  const scoreResult = await scoreFinishedMatches();
  console.log("Score result:", scoreResult);

  const unlocked = await maybeUnlockBracket();
  if (unlocked) {
    console.log("Bracket predictor just unlocked!");
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
