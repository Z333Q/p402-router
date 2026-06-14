/**
 * P402 Billing Guard
 * ==================
 * 6-layer security system for AI spending protection.
 * 
 * Layers:
 * 1. Rate Limiting (1,000 req/hr)
 * 2. Daily Circuit Breaker ($1,000/day)
 * 3. Concurrent Reservation Limit (10 max)
 * 4. Anomaly Detection (Z-score)
 * 5. Per-Request Limit ($50 max)
 * 6. Atomic Budget Reservation
 */

import redis from '@/lib/redis';
import pool from '@/lib/db';
import { computeAndEmitShadow } from '@/lib/runtime-control/shadow';

// =============================================================================
// CONFIGURATION
// =============================================================================

const CONFIG = {
    RATE_LIMIT_REQUESTS: 1000,
    /** World ID-verified humans: 2× the standard rate limit (Sentinel Enhancement 2.3) */
    RATE_LIMIT_REQUESTS_VERIFIED: 2000,
    RATE_LIMIT_WINDOW_SECONDS: 3600,
    DAILY_SPEND_LIMIT_USD: 1000,
    MAX_CONCURRENT_RESERVATIONS: 10,
    MAX_SINGLE_REQUEST_USD: 50,
    /** Verified agents: looser anomaly sensitivity (lower Z-score threshold = earlier alert) */
    ANOMALY_ZSCORE_THRESHOLD: 3.0,
    ANOMALY_ZSCORE_THRESHOLD_VERIFIED: 4.0,
    RESERVATION_TTL_SECONDS: 300, // 5 minutes
};

// =============================================================================
// TYPES
// =============================================================================

export interface BillingContext {
    userId: string;
    sessionId?: string;
    tenantId?: string;
    /**
     * True if the request is from a World ID-verified human (AgentBook-registered).
     * Grants 2× rate limit and lower anomaly sensitivity. (Phase 2.3 Sentinel Enhancement)
     */
    humanVerified?: boolean;
    /**
     * Slice 3X-Shadow: optional request id surfaced into the shadow log.
     * The shadow path never blocks; this is metadata only. Existing
     * callers that don't pass requestId still work — the log shape
     * omits the field when absent.
     */
    requestId?: string;
}

export interface CostEstimate {
    estimatedCost: number;
    model: string;
    inputTokens: number;
    outputTokens: number;
}

export interface Reservation {
    reservationId: string;
    amount: number;
    createdAt: number;
}

export class BillingGuardError extends Error {
    constructor(
        message: string,
        public code: string,
        public retryAfterMs?: number
    ) {
        super(message);
        this.name = 'BillingGuardError';
    }
}

// =============================================================================
// BILLING GUARD CLASS
// =============================================================================

export class BillingGuard {

    // -------------------------------------------------------------------------
    // Layer 1: Rate Limiting
    // -------------------------------------------------------------------------

    async checkRateLimit(ctx: BillingContext): Promise<void> {
        const key = `p402:ratelimit:${ctx.userId}`;

        const limit = ctx.humanVerified
            ? CONFIG.RATE_LIMIT_REQUESTS_VERIFIED
            : CONFIG.RATE_LIMIT_REQUESTS;

        try {
            const count = await redis.incr(key);
            if (count === 1) {
                await redis.expire(key, CONFIG.RATE_LIMIT_WINDOW_SECONDS);
            }

            if (count > limit) {
                const ttl = await redis.ttl(key);
                throw new BillingGuardError(
                    `Rate limit exceeded. Try again in ${ttl} seconds.`,
                    'RATE_LIMIT_EXCEEDED',
                    ttl * 1000
                );
            }
        } catch (err) {
            if (err instanceof BillingGuardError) throw err;
            // Redis unavailable — fail-open (consistent with layers 2–4)
            console.warn('[BillingGuard] checkRateLimit: Redis unavailable, skipping rate limit check', (err as Error).message);
        }
    }

    // -------------------------------------------------------------------------
    // Layer 2: Daily Circuit Breaker
    // -------------------------------------------------------------------------

    async checkDailySpend(ctx: BillingContext): Promise<number> {
        const today = new Date().toISOString().split('T')[0];
        const key = `p402:daily_spend:${ctx.userId}:${today}`;

        try {
            const spentStr = await redis.get(key);
            const spent = parseFloat(spentStr || '0');

            if (spent >= CONFIG.DAILY_SPEND_LIMIT_USD) {
                throw new BillingGuardError(
                    `Daily spending limit of $${CONFIG.DAILY_SPEND_LIMIT_USD} reached.`,
                    'DAILY_LIMIT_EXCEEDED'
                );
            }

            return spent;
        } catch (err) {
            if (err instanceof BillingGuardError) throw err;
            console.warn('[BillingGuard] checkDailySpend: Redis unavailable, skipping', (err as Error).message);
            return 0;
        }
    }

    // -------------------------------------------------------------------------
    // Layer 3: Concurrent Reservation Limit
    // -------------------------------------------------------------------------

    async checkConcurrentReservations(ctx: BillingContext): Promise<number> {
        const pattern = `p402:reservation:${ctx.userId}:*`;

        try {
            const keys = await redis.keys(pattern);

            if (keys.length >= CONFIG.MAX_CONCURRENT_RESERVATIONS) {
                throw new BillingGuardError(
                    `Too many concurrent requests. Max ${CONFIG.MAX_CONCURRENT_RESERVATIONS} allowed.`,
                    'TOO_MANY_CONCURRENT'
                );
            }

            return keys.length;
        } catch (err) {
            if (err instanceof BillingGuardError) throw err;
            console.warn('[BillingGuard] checkConcurrentReservations: Redis unavailable, skipping', (err as Error).message);
            return 0;
        }
    }

    // -------------------------------------------------------------------------
    // Layer 4: Anomaly Detection
    // -------------------------------------------------------------------------

    async checkAnomaly(ctx: BillingContext, estimatedCost: number): Promise<void> {
        const key = `p402:cost_history:${ctx.userId}`;

        try {
            const history = await redis.lrange(key, 0, 99);
            if (history.length < 10) return; // Not enough data

            const costs = history.map(parseFloat);
            const mean = costs.reduce((a, b) => a + b, 0) / costs.length;
            const variance = costs.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / costs.length;
            const stdDev = Math.sqrt(variance);

            if (stdDev === 0) return;

            const zScore = (estimatedCost - mean) / stdDev;

            const threshold = ctx.humanVerified
                ? CONFIG.ANOMALY_ZSCORE_THRESHOLD_VERIFIED
                : CONFIG.ANOMALY_ZSCORE_THRESHOLD;

            if (zScore > threshold) {
                const tag = ctx.humanVerified ? '[human-verified]' : '[unverified]';
                console.warn(`[BillingGuard] Anomaly detected ${tag} for ${ctx.userId}: z-score=${zScore.toFixed(2)}, cost=$${estimatedCost}`);
            }
        } catch (err) {
            // Anomaly detection is a soft guard — never block a request due to Redis failure
            console.warn('[BillingGuard] checkAnomaly: Redis unavailable, skipping', (err as Error).message);
        }
    }

    // -------------------------------------------------------------------------
    // Layer 5: Per-Request Limit
    // -------------------------------------------------------------------------

    checkSingleRequestLimit(estimatedCost: number): void {
        if (estimatedCost > CONFIG.MAX_SINGLE_REQUEST_USD) {
            throw new BillingGuardError(
                `Request too expensive. Max $${CONFIG.MAX_SINGLE_REQUEST_USD} per request.`,
                'REQUEST_TOO_EXPENSIVE'
            );
        }
    }

    // -------------------------------------------------------------------------
    // Layer 6: Atomic Budget Reservation
    // -------------------------------------------------------------------------

    async reserveBudget(ctx: BillingContext, amount: number): Promise<Reservation> {
        const reservationId = `${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
        const key = `p402:reservation:${ctx.userId}:${reservationId}`;

        try {
            await redis.setex(key, CONFIG.RESERVATION_TTL_SECONDS, amount.toString());
        } catch (err) {
            console.warn('[BillingGuard] reserveBudget: Redis unavailable, proceeding without reservation', (err as Error).message);
        }

        return {
            reservationId,
            amount,
            createdAt: Date.now()
        };
    }

    async releaseReservation(ctx: BillingContext, reservationId: string): Promise<void> {
        const key = `p402:reservation:${ctx.userId}:${reservationId}`;
        try {
            await redis.del(key);
        } catch (err) {
            console.warn('[BillingGuard] releaseReservation: Redis unavailable', (err as Error).message);
        }
    }

    async finalizeSpend(ctx: BillingContext, reservationId: string, actualCost: number): Promise<void> {
        await this.releaseReservation(ctx, reservationId);

        try {
            const today = new Date().toISOString().split('T')[0];
            const dailyKey = `p402:daily_spend:${ctx.userId}:${today}`;
            await redis.incrbyfloat(dailyKey, actualCost);
            await redis.expire(dailyKey, 86400 * 2);

            const historyKey = `p402:cost_history:${ctx.userId}`;
            await redis.lpush(historyKey, actualCost.toString());
            await redis.ltrim(historyKey, 0, 99);
            await redis.expire(historyKey, 86400 * 30);
        } catch (err) {
            console.warn('[BillingGuard] finalizeSpend: Redis unavailable, spend not recorded in cache', (err as Error).message);
        }
    }

    // -------------------------------------------------------------------------
    // Combined Pre-Check
    // -------------------------------------------------------------------------

    async preCheck(ctx: BillingContext, estimate: CostEstimate): Promise<Reservation> {
        // Layer 1: Rate limit
        await this.checkRateLimit(ctx);

        // Layer 2: Daily spend
        await this.checkDailySpend(ctx);

        // Layer 3: Concurrent reservations
        await this.checkConcurrentReservations(ctx);

        // Layer 4: Anomaly detection
        await this.checkAnomaly(ctx, estimate.estimatedCost);

        // Layer 5: Single request limit
        this.checkSingleRequestLimit(estimate.estimatedCost);

        // Layer 6: Reserve budget
        const reservation = await this.reserveBudget(ctx, estimate.estimatedCost);

        // Slice 3X-Shadow: tenant_control_settings shadow evaluation.
        //
        // Runs ONLY after all six enforcement layers have allowed the
        // request and a reservation has been created. Never denies,
        // never throws, never mutates runtime counters or reservations.
        // Any failure inside the shadow path is caught and emitted as
        // a structured tcs_shadow_failed log; the request continues
        // unchanged and the reservation is returned as before.
        //
        // Requires ctx.tenantId; skipped for anonymous or
        // tenant-less paths (mppx without tenant context).
        if (ctx.tenantId) {
            try {
                await computeAndEmitShadow(
                    {
                        tenantId: ctx.tenantId,
                        requestId: ctx.requestId,
                        estimatedCostUsd: estimate.estimatedCost,
                        modelRequested: estimate.model,
                    },
                    { redis, db: pool },
                );
            } catch {
                // Belt-and-suspenders: the shadow function already catches
                // and logs every failure internally. This outer catch is a
                // hard guarantee that nothing in the shadow path can ever
                // propagate as a runtime denial.
            }
        }

        return reservation;
    }
}

// Export singleton
export const billingGuard = new BillingGuard();
