import { queryAll, query, queryOne } from "../db";
import { logError } from "../logging";
import { getPlatformAdapter } from "./platforms";

interface AccountToRefresh {
  id: string;
  user_id: string;
  platform: string;
  username: string;
  refresh_interval_hours: number;
  refresh_fail_count: number;
}

// Calculate exponential backoff, max 24 hours
function calculateNextRefreshTime(
  failCount: number,
  intervalHours: number,
): Date {
  let backoffHours = Math.pow(2, Math.min(failCount, 4)); // 1, 2, 4, 8, 16 hours
  backoffHours = Math.min(backoffHours, 24); // Cap at 24 hours
  const nextRefresh = new Date();
  nextRefresh.setHours(nextRefresh.getHours() + backoffHours);
  return nextRefresh;
}

async function refreshAccount(account: AccountToRefresh): Promise<void> {
  const correlationId = `worker-${account.id}`;

  try {
    // Set last_refresh_attempt_at
    await query(
      "UPDATE social_accounts SET last_refresh_attempt_at = NOW() WHERE id = $1",
      [account.id],
    );

    // Get platform adapter and fetch new metrics
    const adapter = getPlatformAdapter(account.platform as any);
    const metrics = await adapter.fetchMetrics(account.username);

    // Success: clear error, reset fail count, update metrics, calculate next refresh
    const nextRefresh = new Date();
    nextRefresh.setHours(
      nextRefresh.getHours() + account.refresh_interval_hours,
    );

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
        metrics.engagement_rate || null,
        metrics.is_verified || false,
        nextRefresh.toISOString(),
        account.id,
      ],
    );

    // Create metrics snapshot
    await query(
      `INSERT INTO social_metrics_snapshots (
        social_account_id, followers, engagement_rate, captured_at
      ) VALUES ($1, $2, $3, NOW())`,
      [account.id, metrics.follower_count, metrics.engagement_rate || null],
    );

    console.log(
      `[Worker] Successfully refreshed ${account.platform}/@${account.username}`,
    );
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    const failCount = account.refresh_fail_count + 1;
    const nextRefresh = calculateNextRefreshTime(
      failCount,
      account.refresh_interval_hours,
    );

    logError(
      { correlationId, accountId: account.id },
      `Failed to refresh ${account.platform}/@${account.username}`,
      error instanceof Error ? error : new Error(errorMsg),
    );

    // Failure: increment fail count, set error, schedule retry with backoff
    await query(
      `UPDATE social_accounts SET
        refresh_error = $1,
        refresh_fail_count = $2,
        status = CASE WHEN $2 >= 5 THEN 'error' ELSE status END,
        next_refresh_at = $3,
        updated_at = NOW()
      WHERE id = $4`,
      [errorMsg, failCount, nextRefresh.toISOString(), account.id],
    );
  }
}

export async function runRefreshCycle(): Promise<void> {
  try {
    // Find all accounts due for refresh
    const duAccounts = await queryAll<AccountToRefresh>(
      `SELECT id, user_id, platform, username, refresh_interval_hours, refresh_fail_count
       FROM social_accounts
       WHERE refresh_mode = 'scheduled'
       AND next_refresh_at IS NOT NULL
       AND next_refresh_at <= NOW()
       AND status != 'paused'
       ORDER BY next_refresh_at ASC
       LIMIT 100`, // Process max 100 per cycle to avoid overload
      [],
    );

    if (duAccounts.length === 0) {
      // No accounts to refresh right now
      return;
    }

    console.log(`[Worker] Found ${duAccounts.length} accounts due for refresh`);

    // Process each account
    for (const account of duAccounts) {
      try {
        await refreshAccount(account);
      } catch (err) {
        logError(
          { accountId: account.id },
          "Worker failed to process account",
          err instanceof Error ? err : new Error(String(err)),
        );
        // Continue to next account even if one fails
      }
    }

    console.log(
      `[Worker] Refresh cycle completed (${duAccounts.length} accounts processed)`,
    );
  } catch (error) {
    logError(
      { context: "refreshWorker" },
      "Fatal error in refresh worker",
      error instanceof Error ? error : new Error(String(error)),
    );
  }
}

let workerInterval: NodeJS.Timer | null = null;

export function startRefreshWorker(intervalMs: number = 10 * 60 * 1000): void {
  if (workerInterval) {
    console.warn("[Worker] Refresh worker already running");
    return;
  }

  console.log(`[Worker] Starting refresh worker (interval: ${intervalMs}ms)`);

  // Run immediately on start
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
  if (workerInterval) {
    clearInterval(workerInterval);
    workerInterval = null;
    console.log("[Worker] Refresh worker stopped");
  }
}
