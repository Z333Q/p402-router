/**
 * Idempotency — Phase 0
 * =====================
 * Prevents duplicate execution when the same Idempotency-Key is submitted
 * more than once. Uses PostgreSQL for durability.
 *
 * Pattern: INSERT ... ON CONFLICT DO NOTHING (same as billing webhook).
 */

import db from '@/lib/db';
import type { ExecuteResult } from '@/lib/contracts/request';

/**
 * Check if a request with this idempotency key has already been processed.
 * Returns the cached response if found, null otherwise.
 */
export async function checkIdempotency(
    key: string,
    tenantId: string
): Promise<ExecuteResult | null> {
    const result = await db.query(
        `SELECT response FROM execute_idempotency
         WHERE idempotency_key = $1 AND tenant_id = $2
         LIMIT 1`,
        [key, tenantId]
    );
    const row = (result.rows as Array<{ response: ExecuteResult }>)[0];
    return row ? row.response : null;
}

/**
 * Store the result of a completed request under its idempotency key.
 * Uses ON CONFLICT DO NOTHING to be safe against races.
 */
export async function storeIdempotencyResult(
    key: string,
    tenantId: string,
    requestId: string,
    response: ExecuteResult
): Promise<void> {
    await db.query(
        `INSERT INTO execute_idempotency (idempotency_key, tenant_id, request_id, response)
         VALUES ($1, $2, $3, $4)
         ON CONFLICT (idempotency_key, tenant_id) DO NOTHING`,
        [key, tenantId, requestId, JSON.stringify(response)]
    );
}
