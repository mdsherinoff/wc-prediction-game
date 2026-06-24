import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin";
import { syncResultsFromFootballData } from "@/lib/football-data";
import { scoreFinishedMatches, maybeUnlockBracket } from "@/lib/scoring-engine";

/**
 * POST /api/admin/sync-results
 * Triggers a pull from football-data.org, updates match statuses/scores,
 * scores any newly-finished matches, and checks whether the bracket
 * predictor should unlock.
 *
 * Can be called by:
 *  - A signed-in admin clicking "Sync now" in /admin
 *  - A cron job / external scheduler hitting this with header
 *    "x-sync-secret: <SYNC_SECRET>" instead of a session (e.g. Vercel Cron)
 */
async function runSync(req: NextRequest) {
  // Two ways this endpoint can be authorized without a user session:
  //  1. Vercel Cron sends "Authorization: Bearer <CRON_SECRET>" automatically
  //     (see vercel.json + CRON_SECRET env var) via a GET request
  //  2. A custom external scheduler can send "x-sync-secret: <SYNC_SECRET>"
  const authHeader = req.headers.get("authorization");
  const isVercelCron =
    !!process.env.CRON_SECRET && authHeader === `Bearer ${process.env.CRON_SECRET}`;

  const customSecret = req.headers.get("x-sync-secret");
  const isCustomCron = !!customSecret && customSecret === process.env.SYNC_SECRET;

  const isCron = isVercelCron || isCustomCron;

  if (!isCron) {
    const adminSession = await requireAdmin();
    if (!adminSession) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
  }

  try {
    const syncResult = await syncResultsFromFootballData();
    const scoreResult = await scoreFinishedMatches();
    const bracketJustUnlocked = await maybeUnlockBracket();

    return NextResponse.json({
      ok: true,
      syncResult,
      scoreResult,
      bracketJustUnlocked,
    });
  } catch (err) {
    console.error("Sync failed:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Sync failed" },
      { status: 500 }
    );
  }
}

// Vercel Cron triggers a GET request by default.
export async function GET(req: NextRequest) {
  return runSync(req);
}

// The admin "Sync now" button (and any custom external scheduler) calls POST.
export async function POST(req: NextRequest) {
  return runSync(req);
}
