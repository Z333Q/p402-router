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

// =============================================================================
// CONFIGURATION
// =============================================================================

const CONFIG = {
    RATE_LIMIT_REQUESTS: 1000,
    RATE_LIMIT_WINDOW_SECONDS: 3600,
    DAILY_SPEND_LIMIT_USD: 1000,
    MAX_CONCURRENT_RESERVATIONS: 10,
    MAX_SINGLE_REQUEST_USD: 50,
    ANOMALY_ZSCORE_THRESHOLD: 3.0,
    RESERVATION_TTL_SECONDS: 300, // 5 minutes
};

// =============================================================================
// TYPES
// =============================================================================

export interface BillingContext {
    userId: string;
    sessionId?: string;
    tenantId?: string;
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

        const count = await redis.incr(key);
        if (count === 1) {
            await redis.expire(key, CONFIG.RATE_LIMIT_WINDOW_SECONDS);
        }

        if (count > CONFIG.RATE_LIMIT_REQUESTS) {
            const ttl = await redis.ttl(key);
            throw new BillingGuardError(
                `Rate limit exceeded. Try again in ${ttl} seconds.`,
                'RATE_LIMIT_EXCEEDED',
                ttl * 1000
            );
        }
    }

    // -------------------------------------------------------------------------
    // Layer 2: Daily Circuit Breaker
    // -------------------------------------------------------------------------

    async checkDailySpend(ctx: BillingContext): Promise<number> {
        const today = new Date().toISOString().split('T')[0];
        const key = `p402:daily_spend:${ctx.userId}:${today}`;

        const spentStr = await redis.get(key);
        const spent = parseFloat(spentStr || '0');

        if (spent >= CONFIG.DAILY_SPEND_LIMIT_USD) {
            throw new BillingGuardError(
                `Daily spending limit of $${CONFIG.DAILY_SPEND_LIMIT_USD} reached.`,
                'DAILY_LIMIT_EXCEEDED'
            );
        }

        return spent;
    }

    // -------------------------------------------------------------------------
    // Layer 3: Concurrent Reservation Limit
    // -------------------------------------------------------------------------

    async checkConcurrentReservations(ctx: BillingContext): Promise<number> {
        const pattern = `p402:reservation:${ctx.userId}:*`;
        const keys = await redis.keys(pattern);

        if (keys.length >= CONFIG.MAX_CONCURRENT_RESERVATIONS) {
            throw new BillingGuardError(
                `Too many concurrent requests. Max ${CONFIG.MAX_CONCURRENT_RESERVATIONS} allowed.`,
                'TOO_MANY_CONCURRENT'
            );
        }

        return keys.length;
    }

    // -------------------------------------------------------------------------
    // Layer 4: Anomaly Detection
    // -------------------------------------------------------------------------

    async checkAnomaly(ctx: BillingContext, estimatedCost: number): Promise<void> {
        const key = `p402:cost_history:${ctx.userId}`;

        // Get recent costs
        const history = await redis.lrange(key, 0, 99);
        if (history.length < 10) return; // Not enough data

        const costs = history.map(parseFloat);
        const mean = costs.reduce((a, b) => a + b, 0) / costs.length;
        const variance = costs.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / costs.length;
        const stdDev = Math.sqrt(variance);

        if (stdDev === 0) return;

        const zScore = (estimatedCost - mean) / stdDev;

        if (zScore > CONFIG.ANOMALY_ZSCORE_THRESHOLD) {
            // Log anomaly but don't block (soft alert)
            console.warn(`[BillingGuard] Anomaly detected for ${ctx.userId}: z-score=${zScore.toFixed(2)}, cost=$${estimatedCost}`);
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

        // Atomically reserve
        await redis.setex(key, CONFIG.RESERVATION_TTL_SECONDS, amount.toString());

        return {
            reservationId,
            amount,
            createdAt: Date.now()
        };
    }

    async releaseReservation(ctx: BillingContext, reservationId: string): Promise<void> {
        const key = `p402:reservation:${ctx.userId}:${reservationId}`;
        await redis.del(key);
    }

    async finalizeSpend(ctx: BillingContext, reservationId: string, actualCost: number): Promise<void> {
        // Release reservation
        await this.releaseReservation(ctx, reservationId);

        // Record daily spend
        const today = new Date().toISOString().split('T')[0];
        const dailyKey = `p402:daily_spend:${ctx.userId}:${today}`;
        await redis.incrbyfloat(dailyKey, actualCost);
        await redis.expire(dailyKey, 86400 * 2); // Keep for 2 days

        // Update cost history
        const historyKey = `p402:cost_history:${ctx.userId}`;
        await redis.lpush(historyKey, actualCost.toString());
        await redis.ltrim(historyKey, 0, 99);
        await redis.expire(historyKey, 86400 * 30); // Keep for 30 days
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

        return reservation;
    }
}

// Export singleton
export const billingGuard = new BillingGuard();
