/**
 * Human-Anchored Reputation
 * =========================
 * Reputation is tracked per World ID nullifier hash (human_id_hash), not per
 * wallet address. One human = one reputation score across all their agent wallets.
 *
 * Score components:
 *   settlement_score  (weight 0.4) — successful payment settlements
 *   session_score     (weight 0.3) — session completion rate
 *   dispute_score     (weight 0.2) — inverse of dispute rate (starts at 1.0)
 *   sentinel_score    (weight 0.1) — anomaly-free requests (starts at 1.0)
 *
 * Overall score ∈ [0.0, 1.0], new humans start at 0.5000 (neutral).
 * Score is cached in Redis for 5 minutes to avoid a DB hit on every request.
 */

import db from '@/lib/db';
import redis from '@/lib/redis';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface ReputationRecord {
    humanIdHash: string;
    score: number;
    settlementScore: number;
    sessionScore: number;
    disputeScore: number;
    sentinelScore: number;
    settledCount: number;
    sessionCount: number;
    sessionCompletedCount: number;
    disputeCount: number;
    anomalyCount: number;
    firstSeenAt: string;
    lastUpdatedAt: string;
    publicProfile: boolean;
}

// ---------------------------------------------------------------------------
// Weights — must sum to 1.0
// ---------------------------------------------------------------------------

const WEIGHTS = {
    settlement: 0.4,
    session: 0.3,
    dispute: 0.2,
    sentinel: 0.1,
} as const;

// ---------------------------------------------------------------------------
// Cache helpers
// ---------------------------------------------------------------------------

const CACHE_TTL_SECONDS = 300; // 5 minutes

function cacheKey(humanIdHash: string) {
    return `p402:reputation:${humanIdHash}`;
}

async function getCached(humanIdHash: string): Promise<number | null> {
    try {
        const val = await redis.get(cacheKey(humanIdHash));
        return val !== null ? parseFloat(val) : null;
    } catch {
        return null;
    }
}

async function setCache(humanIdHash: string, score: number): Promise<void> {
    try {
        await redis.setex(cacheKey(humanIdHash), CACHE_TTL_SECONDS, score.toFixed(4));
    } catch { /* non-blocking */ }
}

async function invalidateCache(humanIdHash: string): Promise<void> {
    try {
        await redis.del(cacheKey(humanIdHash));
    } catch { /* non-blocking */ }
}

// ---------------------------------------------------------------------------
// Score calculation
// ---------------------------------------------------------------------------

function computeScore(row: {
    settlement_score: string;
    session_score: string;
    dispute_score: string;
    sentinel_score: string;
}): number {
    const score =
        parseFloat(row.settlement_score) * WEIGHTS.settlement +
        parseFloat(row.session_score) * WEIGHTS.session +
        parseFloat(row.dispute_score) * WEIGHTS.dispute +
        parseFloat(row.sentinel_score) * WEIGHTS.sentinel;
    return Math.max(0, Math.min(1, score));
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Get the reputation record for a human. Returns null if the human has no
 * record yet (first interaction creates it lazily via upsert events).
 * The overall score is cached in Redis; a DB read backs cache misses.
 */
export async function getReputation(humanIdHash: string): Promise<ReputationRecord | null> {
    try {
        const res = await db.query(
            `SELECT * FROM agent_reputation WHERE human_id_hash = $1`,
            [humanIdHash]
        );
        const row = res.rows[0] as {
            human_id_hash: string;
            score: string;
            settlement_score: string;
            session_score: string;
            dispute_score: string;
            sentinel_score: string;
            settled_count: number;
            session_count: number;
            session_completed_count: number;
            dispute_count: number;
            anomaly_count: number;
            first_seen_at: string;
            last_updated_at: string;
            public_profile: boolean;
        } | undefined;

        if (!row) return null;

        return {
            humanIdHash: row.human_id_hash,
            score: parseFloat(row.score),
            settlementScore: parseFloat(row.settlement_score),
            sessionScore: parseFloat(row.session_score),
            disputeScore: parseFloat(row.dispute_score),
            sentinelScore: parseFloat(row.sentinel_score),
            settledCount: row.settled_count,
            sessionCount: row.session_count,
            sessionCompletedCount: row.session_completed_count,
            disputeCount: row.dispute_count,
            anomalyCount: row.anomaly_count,
            firstSeenAt: row.first_seen_at,
            lastUpdatedAt: row.last_updated_at,
            publicProfile: row.public_profile,
        };
    } catch {
        return null;
    }
}

/**
 * Get just the reputation score for a human (Redis-cached for 5 min).
 * Returns null when no record exists.
 */
export async function getReputationScore(humanIdHash: string): Promise<number | null> {
    const cached = await getCached(humanIdHash);
    if (cached !== null) return cached;

    const rep = await getReputation(humanIdHash);
    if (!rep) return null;

    await setCache(humanIdHash, rep.score);
    return rep.score;
}

/**
 * Record a successful payment settlement.
 * Upserts the human record and recalculates the settlement component.
 *
 * Settlement score = sigmoid-like function of settled_count:
 *   0 settlements → 0.5 (neutral)
 *   5 settlements → 0.7
 *   20 settlements → 0.85
 *   50+ settlements → approaches 0.95
 */
export async function recordSettlement(humanIdHash: string): Promise<void> {
    try {
        // Increment settled count
        await db.query(
            `INSERT INTO agent_reputation (human_id_hash, settled_count, settlement_score, score, last_updated_at)
             VALUES ($1, 1, 0.5, 0.5, NOW())
             ON CONFLICT (human_id_hash) DO UPDATE
             SET settled_count = agent_reputation.settled_count + 1,
                 last_updated_at = NOW()`,
            [humanIdHash]
        );

        // Recompute settlement score
        const res = await db.query(
            `SELECT settled_count, session_score, dispute_score, sentinel_score
             FROM agent_reputation WHERE human_id_hash = $1`,
            [humanIdHash]
        );
        const row = res.rows[0] as {
            settled_count: number;
            session_score: string;
            dispute_score: string;
            sentinel_score: string;
        } | undefined;
        if (!row) return;

        // settlement_score: starts at 0.5, approaches 0.95 asymptotically
        const n = row.settled_count;
        const settlementScore = Math.min(0.95, 0.5 + 0.45 * (1 - Math.exp(-n / 20)));

        const newScore = computeScore({
            settlement_score: settlementScore.toFixed(4),
            session_score: row.session_score,
            dispute_score: row.dispute_score,
            sentinel_score: row.sentinel_score,
        });

        await db.query(
            `UPDATE agent_reputation
             SET settlement_score = $2, score = $3, last_updated_at = NOW()
             WHERE human_id_hash = $1`,
            [humanIdHash, settlementScore.toFixed(4), newScore.toFixed(4)]
        );

        await invalidateCache(humanIdHash);
    } catch (err) {
        // Non-blocking: reputation updates must never block the settlement flow
        console.warn('[Reputation] recordSettlement failed (non-blocking):', (err as Error).message);
    }
}

/**
 * Record session lifecycle events (started / completed).
 * session_score = completed / total, clamped with regularization for small N.
 */
export async function recordSession(humanIdHash: string, completed: boolean): Promise<void> {
    try {
        await db.query(
            `INSERT INTO agent_reputation (human_id_hash, session_count, session_completed_count, last_updated_at)
             VALUES ($1, 1, $2, NOW())
             ON CONFLICT (human_id_hash) DO UPDATE
             SET session_count = agent_reputation.session_count + 1,
                 session_completed_count = agent_reputation.session_completed_count + $2,
                 last_updated_at = NOW()`,
            [humanIdHash, completed ? 1 : 0]
        );

        const res = await db.query(
            `SELECT session_count, session_completed_count, settlement_score, dispute_score, sentinel_score
             FROM agent_reputation WHERE human_id_hash = $1`,
            [humanIdHash]
        );
        const row = res.rows[0] as {
            session_count: number;
            session_completed_count: number;
            settlement_score: string;
            dispute_score: string;
            sentinel_score: string;
        } | undefined;
        if (!row) return;

        const total = row.session_count;
        const done = row.session_completed_count;
        // Regularized completion rate: prior of 0.5 with weight 4 (equivalent to 2 prior completions / 4 sessions)
        const sessionScore = (done + 2) / (total + 4);

        const newScore = computeScore({
            settlement_score: row.settlement_score,
            session_score: sessionScore.toFixed(4),
            dispute_score: row.dispute_score,
            sentinel_score: row.sentinel_score,
        });

        await db.query(
            `UPDATE agent_reputation
             SET session_score = $2, score = $3, last_updated_at = NOW()
             WHERE human_id_hash = $1`,
            [humanIdHash, sessionScore.toFixed(4), newScore.toFixed(4)]
        );

        await invalidateCache(humanIdHash);
    } catch (err) {
        console.warn('[Reputation] recordSession failed (non-blocking):', (err as Error).message);
    }
}

/**
 * Record a Sentinel anomaly flag.
 * sentinel_score degrades by ~5% per anomaly, recovers slowly with subsequent clean requests.
 */
export async function recordAnomalyFlag(humanIdHash: string): Promise<void> {
    try {
        await db.query(
            `INSERT INTO agent_reputation (human_id_hash, anomaly_count, sentinel_score, last_updated_at)
             VALUES ($1, 1, 0.95, NOW())
             ON CONFLICT (human_id_hash) DO UPDATE
             SET anomaly_count = agent_reputation.anomaly_count + 1,
                 last_updated_at = NOW()`,
            [humanIdHash]
        );

        const res = await db.query(
            `SELECT anomaly_count, settlement_score, session_score, dispute_score
             FROM agent_reputation WHERE human_id_hash = $1`,
            [humanIdHash]
        );
        const row = res.rows[0] as {
            anomaly_count: number;
            settlement_score: string;
            session_score: string;
            dispute_score: string;
        } | undefined;
        if (!row) return;

        // sentinel_score: each anomaly degrades by 5%, floor at 0.3
        const sentinelScore = Math.max(0.3, 1.0 - 0.05 * row.anomaly_count);

        const newScore = computeScore({
            settlement_score: row.settlement_score,
            session_score: row.session_score,
            dispute_score: row.dispute_score,
            sentinel_score: sentinelScore.toFixed(4),
        });

        await db.query(
            `UPDATE agent_reputation
             SET sentinel_score = $2, score = $3, last_updated_at = NOW()
             WHERE human_id_hash = $1`,
            [humanIdHash, sentinelScore.toFixed(4), newScore.toFixed(4)]
        );

        await invalidateCache(humanIdHash);
    } catch (err) {
        console.warn('[Reputation] recordAnomalyFlag failed (non-blocking):', (err as Error).message);
    }
}

/**
 * Record an AP2 mandate violation (budget exceeded, category denied, etc.).
 * dispute_score degrades by ~10% per violation, floor at 0.2.
 * Called when a mandate use is rejected due to a policy violation (not system errors).
 */
export async function recordDispute(humanIdHash: string): Promise<void> {
    try {
        await db.query(
            `INSERT INTO agent_reputation (human_id_hash, dispute_count, dispute_score, last_updated_at)
             VALUES ($1, 1, 0.90, NOW())
             ON CONFLICT (human_id_hash) DO UPDATE
             SET dispute_count = agent_reputation.dispute_count + 1,
                 last_updated_at = NOW()`,
            [humanIdHash]
        );

        const res = await db.query(
            `SELECT dispute_count, settlement_score, session_score, sentinel_score
             FROM agent_reputation WHERE human_id_hash = $1`,
            [humanIdHash]
        );
        const row = res.rows[0] as {
            dispute_count: number;
            settlement_score: string;
            session_score: string;
            sentinel_score: string;
        } | undefined;
        if (!row) return;

        // dispute_score: each violation degrades by 10%, floor at 0.2
        const disputeScore = Math.max(0.2, 1.0 - 0.1 * row.dispute_count);

        const newScore = computeScore({
            settlement_score: row.settlement_score,
            session_score: row.session_score,
            dispute_score: disputeScore.toFixed(4),
            sentinel_score: row.sentinel_score,
        });

        await db.query(
            `UPDATE agent_reputation
             SET dispute_score = $2, score = $3, last_updated_at = NOW()
             WHERE human_id_hash = $1`,
            [humanIdHash, disputeScore.toFixed(4), newScore.toFixed(4)]
        );

        await invalidateCache(humanIdHash);
    } catch (err) {
        console.warn('[Reputation] recordDispute failed (non-blocking):', (err as Error).message);
    }
}

/**
 * Snapshot the current score into reputation_epochs for the current week.
 * Designed to be called by a weekly cron job.
 */
export async function snapshotWeeklyEpoch(humanIdHash?: string): Promise<void> {
    // Monday of the current week
    const now = new Date();
    const day = now.getDay(); // 0 = Sunday
    const diff = (day === 0 ? -6 : 1 - day); // days back to Monday
    const monday = new Date(now);
    monday.setDate(now.getDate() + diff);
    const epochWeek = monday.toISOString().slice(0, 10); // YYYY-MM-DD

    try {
        const query = humanIdHash
            ? `SELECT human_id_hash, score, settled_count, session_count, dispute_count
               FROM agent_reputation WHERE human_id_hash = $1`
            : `SELECT human_id_hash, score, settled_count, session_count, dispute_count
               FROM agent_reputation`;
        const params = humanIdHash ? [humanIdHash] : [];
        const res = await db.query(query, params);

        for (const row of res.rows as Array<{
            human_id_hash: string;
            score: string;
            settled_count: number;
            session_count: number;
            dispute_count: number;
        }>) {
            await db.query(
                `INSERT INTO reputation_epochs (human_id_hash, epoch_week, score, settled_count, session_count, dispute_count)
                 VALUES ($1, $2, $3, $4, $5, $6)
                 ON CONFLICT (human_id_hash, epoch_week) DO UPDATE
                 SET score = $3, settled_count = $4, session_count = $5, dispute_count = $6`,
                [row.human_id_hash, epochWeek, row.score, row.settled_count, row.session_count, row.dispute_count]
            );
        }
    } catch (err) {
        console.warn('[Reputation] snapshotWeeklyEpoch failed:', (err as Error).message);
    }
}
