import { queryAll, query } from "../db";
import { logError } from "../logging";
import { getPlatformAdapter } from "./platforms";

interface AccountToRefresh {
  id: string;
  user_id: string;
  platform: string;
  username: string;
  refresh_interval_hours: number | null;
  refresh_fail_count: number | null;
}

// ---- Small helpers ----

function toInt(n: unknown, fallback: number) {
  const v = typeof n === "number" ? n : Number(n);
  return Number.isFinite(v) ? v : fallback;
}

function safeIso(d: Date) {
  return d.toISOString();
}

/**
 * Exponential backoff (1,2,4,8,16 hours) capped at 24h,
 * but never sooner than the configured interval (intervalHours).
 */
function calculateNextRefreshTime(failCount: number, intervalHours: number): Date {
  const backoffHours = Math.min(Math.pow(2, Math.min(failCount, 4)), 24);
  const delayHours = Math.max(intervalHours, backoffHours);

  const next = new Date();
  next.setHours(next.getHours() + delayHours);
  return next;
}

/**
 * DB readiness gate:
 * Your app initializes DB/migrations on the first request,
 * but the worker starts at boot. So we MUST verify DB is reachable
 * before doing any real work.
 */
async function isDatabaseReady(): Promise<boolean> {
  if (!process.env.DATABASE_URL) return false;

  try {
    // lightweight check
    await query("SELECT 1 as ok", []);
    return true;
  } catch (err) {
    // Don't spam fatal logs—this is expected during cold start
    console.warn("[Worker] DB not ready yet; skipping cycle.");
    return false;
  }
}

async function refreshAccount(account: AccountToRefresh): Promise<void> {
  const correlationId = `worker-${account.id}`;

  const refreshIntervalHours = Math.max(1, toInt(account.refresh_interval_hours, 24));
  const currentFailCount = Math.max(0, toInt(account.refresh_fail_count, 0));

  try {
    // Mark attempt
    await query(
      "UPDATE social_accounts SET last_refresh_attempt_at = NOW() WHERE id = $1",
      [account.id],
    );

    // Fetch metrics
    const adapter = getPlatformAdapter(account.platform as any);
    const metrics = await adapter.fetchMetrics(account.username);

    // Next scheduled refresh
    const nextRefresh = new Date();
    nextRefresh.setHours(nextRefresh.getHours() + refreshIntervalHours);

    await query(
      `UPDATE social_accounts SET
        follower_count = $1,
        post_count = $2,
        engagement_rate = $3,
        is_verified = $4,
        status = 'active',
        refresh_error = NULL,
        refresh_fail_count = 0,
        last_synced_at = NOW(),
        next_refresh_at = $5,
        updated_at = NOW()
      WHERE id = $6`,
      [
        metrics.follower_count,
        metrics.post_count,
        metrics.engagement_rate ?? null,
        metrics.is_verified ?? false,
        safeIso(nextRefresh),
        account.id,
      ],
    );

    // Snapshot
    await query(
      `INSERT INTO social_metrics_snapshots (
        social_account_id, followers, engagement_rate, captured_at
      ) VALUES ($1, $2, $3, NOW())`,
      [account.id, metrics.follower_count, metrics.engagement_rate ?? null],
    );

    console.log(
      `[Worker] Refreshed ${account.platform}/@${account.username} (next in ${refreshIntervalHours}h)`,
    );
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    const nextFailCount = currentFailCount + 1;

    const nextRefresh = calculateNextRefreshTime(nextFailCount, refreshIntervalHours);

    logError(
      { correlationId, accountId: account.id, platform: account.platform, username: account.username },
      `Failed to refresh ${account.platform}/@${account.username}`,
      error instanceof Error ? error : new Error(errorMsg),
    );

    await query(
      `UPDATE social_accounts SET
        refresh_error = $1,
        refresh_fail_count = $2,
        status = CASE WHEN $2 >= 5 THEN 'error' ELSE status END,
        next_refresh_at = $3,
        updated_at = NOW()
      WHERE id = $4`,
      [errorMsg, nextFailCount, safeIso(nextRefresh), account.id],
    );
  }
}

export async function runRefreshCycle(): Promise<void> {
  // Hard gate: if DB isn't ready, do nothing.
  const ready = await isDatabaseReady();
  if (!ready) return;

  try {
    const dueAccounts = await queryAll<AccountToRefresh>(
      `SELECT id, user_id, platform, username, refresh_interval_hours, refresh_fail_count
       FROM social_accounts
       WHERE refresh_mode = 'scheduled'
         AND next_refresh_at IS NOT NULL
         AND next_refresh_at <= NOW()
         AND COALESCE(status, 'active') != 'paused'
       ORDER BY next_refresh_at ASC
       LIMIT 100`,
      [],
    );

    if (!dueAccounts || dueAccounts.length === 0) return;

    console.log(`[Worker] ${dueAccounts.length} accounts due for refresh`);

    for (const account of dueAccounts) {
      try {
        await refreshAccount(account);
      } catch (err) {
        logError(
          { accountId: account.id },
          "Worker failed to process account (continuing)",
          err instanceof Error ? err : new Error(String(err)),
        );
      }
    }

    console.log(`[Worker] Refresh cycle completed (${dueAccounts.length} processed)`);
  } catch (error) {
    // This should be rare now; most startup issues are absorbed by isDatabaseReady()
    logError(
      { context: "refreshWorker" },
      "Fatal error in refresh worker cycle",
      error instanceof Error ? error : new Error(String(error)),
    );
  }
}

let workerInterval: NodeJS.Timeout | null = null;

export function startRefreshWorker(intervalMs: number = 10 * 60 * 1000): void {
  if (workerInterval) {
    console.warn("[Worker] Refresh worker already running");
    return;
  }

  console.log(`[Worker] Starting refresh worker (interval: ${intervalMs}ms)`);

  // Run immediately
  runRefreshCycle().catch((err) => {
    logError(
      { context: "refreshWorker" },
      "Error in initial refresh cycle",
      err instanceof Error ? err : new Error(String(err)),
    );
  });

  // Then run on schedule
  workerInterval = setInterval(() => {
    runRefreshCycle().catch((err) => {
      logError(
        { context: "refreshWorker" },
        "Error in scheduled refresh cycle",
        err instanceof Error ? err : new Error(String(err)),
      );
    });
  }, intervalMs);
}

export function stopRefreshWorker(): void {
  if (!workerInterval) return;
  clearInterval(workerInterval);
  workerInterval = null;
  console.log("[Worker] Refresh worker stopped");
}
