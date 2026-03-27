/**
 * Budget Reservation — Phase 0
 * ============================
 * Reserve budget before execution, track consumed vs reserved,
 * release on failure.
 *
 * Primary storage: PostgreSQL (budget_reservations table).
 * Fast check: Redis (optional, degrades gracefully to DB-only).
 */

import db from '@/lib/db';
import { ApiError } from '@/lib/errors';
import { DEFAULT_BUDGET_CAP } from '@/lib/contracts/money';

let redis: import('ioredis').Redis | null = null;
async function getRedis(): Promise<import('ioredis').Redis | null> {
    if (!process.env['REDIS_URL']) return null;
    if (redis) return redis;
    try {
        const { default: Redis } = await import('ioredis');
        redis = new Redis(process.env['REDIS_URL'], { lazyConnect: true, enableOfflineQueue: false });
        return redis;
    } catch {
        return null;
    }
}

const REDIS_BUDGET_TTL_SECONDS = 300; // 5 minutes reservation window

// ── Public API ────────────────────────────────────────────────────────────────

export interface BudgetReservation {
    id: string;
    amount: number;
}

/**
 * Reserve budget for a request. Throws BUDGET_INSUFFICIENT if the
 * tenant cannot afford the reservation amount.
 */
export async function reserveBudget(
    tenantId: string,
    requestId: string,
    amountUsd: number,
    budgetCapUsd: number
): Promise<BudgetReservation> {
    if (amountUsd > budgetCapUsd) {
        throw new ApiError({
            code: 'BUDGET_INSUFFICIENT',
            status: 402,
            message: `Estimated cost $${amountUsd.toFixed(4)} exceeds budget cap $${budgetCapUsd.toFixed(2)}`,
            requestId,
        });
    }

    // Try Redis fast path for concurrent reservation check
    const r = await getRedis();
    if (r) {
        const key = `budget:reserved:${tenantId}`;
        const currentStr = await r.get(key).catch(() => null);
        const current = parseFloat(currentStr ?? '0');
        if (current + amountUsd > budgetCapUsd) {
            throw new ApiError({
                code: 'BUDGET_INSUFFICIENT',
                status: 402,
                message: `Concurrent budget reservations ($${(current + amountUsd).toFixed(4)}) would exceed cap $${budgetCapUsd.toFixed(2)}`,
                requestId,
            });
        }
    }

    // Persist reservation
    const result = await db.query(
        `INSERT INTO budget_reservations (tenant_id, request_id, reserved_amount, status)
         VALUES ($1, $2, $3, 'reserved')
         RETURNING id`,
        [tenantId, requestId, amountUsd.toFixed(8)]
    );
    const row = (result.rows as Array<{ id: string }>)[0];
    if (!row) {
        throw new ApiError({
            code: 'BUDGET_RESERVATION_FAILED',
            status: 500,
            message: 'Failed to create budget reservation',
            requestId,
        });
    }

    // Update Redis counter (best-effort)
    if (r) {
        const key = `budget:reserved:${tenantId}`;
        await r.incrbyfloat(key, amountUsd).catch(() => null);
        await r.expire(key, REDIS_BUDGET_TTL_SECONDS).catch(() => null);
    }

    return { id: row.id, amount: amountUsd };
}

/**
 * Mark a reservation as consumed with the actual amount spent.
 */
export async function consumeBudgetReservation(
    reservationId: string,
    actualAmount: number,
    tenantId: string
): Promise<void> {
    await db.query(
        `UPDATE budget_reservations
         SET status = 'consumed',
             consumed_amount = $1,
             released_amount = reserved_amount - $1
         WHERE id = $2 AND tenant_id = $3`,
        [actualAmount.toFixed(8), reservationId, tenantId]
    );

    // Update Redis counter (best-effort)
    const r = await getRedis();
    if (r) {
        const key = `budget:reserved:${tenantId}`;
        const res = await db.query(
            'SELECT reserved_amount FROM budget_reservations WHERE id = $1',
            [reservationId]
        );
        const reserved = parseFloat((res.rows as Array<{ reserved_amount: string }>)[0]?.reserved_amount ?? '0');
        const released = reserved - actualAmount;
        if (released > 0) {
            await r.incrbyfloat(key, -released).catch(() => null);
        }
    }
}

/**
 * Release a reservation entirely (on execution failure).
 */
export async function releaseBudgetReservation(
    reservationId: string,
    tenantId: string
): Promise<void> {
    await db.query(
        `UPDATE budget_reservations
         SET status = 'released',
             released_amount = reserved_amount
         WHERE id = $1 AND tenant_id = $2`,
        [reservationId, tenantId]
    );

    // Update Redis counter (best-effort)
    const r = await getRedis();
    if (r) {
        const res = await db.query(
            'SELECT reserved_amount FROM budget_reservations WHERE id = $1',
            [reservationId]
        );
        const reserved = parseFloat((res.rows as Array<{ reserved_amount: string }>)[0]?.reserved_amount ?? '0');
        if (reserved > 0) {
            const key = `budget:reserved:${tenantId}`;
            await r.incrbyfloat(key, -reserved).catch(() => null);
        }
    }
}

/** Parse the budget cap from the request, defaulting to DEFAULT_BUDGET_CAP. */
export function parseBudgetCap(budget: { cap: string; currency?: string } | undefined | null): number {
    if (!budget) return parseFloat(DEFAULT_BUDGET_CAP);
    const cap = parseFloat(budget.cap);
    return isNaN(cap) || cap <= 0 ? parseFloat(DEFAULT_BUDGET_CAP) : cap;
}
