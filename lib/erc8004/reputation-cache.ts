/**
 * ERC-8004 Reputation Cache
 *
 * Caches on-chain reputation scores in PostgreSQL to avoid per-request RPC calls.
 * Scores are refreshed via a cron job or on-demand when stale.
 */

import db from '../db';
import { getSummary } from './reputation-client';

const DEFAULT_TTL_MS = 5 * 60 * 1000; // 5 minutes

function getTTL(): number {
  const envTTL = process.env.ERC8004_REPUTATION_CACHE_TTL_MS;
  if (envTTL) {
    const parsed = parseInt(envTTL, 10);
    if (!isNaN(parsed) && parsed > 0) return parsed;
  }
  return DEFAULT_TTL_MS;
}

/**
 * Get a cached reputation score for a facilitator.
 * Returns null if the facilitator has no ERC-8004 identity.
 * Fetches fresh data if the cache is stale.
 */
export async function getReputationScore(facilitatorId: string): Promise<number | null> {
  const res = await db.query(
    `SELECT erc8004_agent_id, erc8004_reputation_cached, erc8004_reputation_fetched_at
     FROM facilitators WHERE facilitator_id = $1`,
    [facilitatorId]
  );

  const row = res.rows[0];
  if (!row?.erc8004_agent_id) return null;

  const fetchedAt = row.erc8004_reputation_fetched_at
    ? new Date(row.erc8004_reputation_fetched_at).getTime()
    : 0;
  const isStale = Date.now() - fetchedAt > getTTL();

  if (!isStale && row.erc8004_reputation_cached !== null) {
    return parseFloat(row.erc8004_reputation_cached);
  }

  // Fetch fresh from chain
  try {
    const summary = await getSummary(BigInt(row.erc8004_agent_id));
    const score = summary.averageScore;

    await db.query(
      `UPDATE facilitators
       SET erc8004_reputation_cached = $1, erc8004_reputation_fetched_at = NOW()
       WHERE facilitator_id = $2`,
      [score, facilitatorId]
    );

    return score;
  } catch (err) {
    console.error(`[ERC8004] Failed to fetch reputation for ${facilitatorId}:`, err);
    // Return stale cached value if available
    return row.erc8004_reputation_cached !== null
      ? parseFloat(row.erc8004_reputation_cached)
      : null;
  }
}

/**
 * Batch-refresh reputation scores for all facilitators with ERC-8004 identities.
 * Called by the cron job.
 */
export async function refreshReputationScores(): Promise<{
  refreshed: number;
  errors: string[];
}> {
  const res = await db.query(
    `SELECT facilitator_id, erc8004_agent_id
     FROM facilitators
     WHERE erc8004_agent_id IS NOT NULL`
  );

  let refreshed = 0;
  const errors: string[] = [];

  for (const row of res.rows) {
    try {
      const summary = await getSummary(BigInt(row.erc8004_agent_id));
      await db.query(
        `UPDATE facilitators
         SET erc8004_reputation_cached = $1, erc8004_reputation_fetched_at = NOW()
         WHERE facilitator_id = $2`,
        [summary.averageScore, row.facilitator_id]
      );
      refreshed++;
    } catch (err) {
      const msg = `${row.facilitator_id}: ${err instanceof Error ? err.message : String(err)}`;
      errors.push(msg);
      console.error(`[ERC8004] Reputation refresh failed for ${msg}`);
    }
  }

  return { refreshed, errors };
}
