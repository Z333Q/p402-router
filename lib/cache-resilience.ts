/**
 * S6-002: Production Redis Resilience Layer
 *
 * Wraps ioredis with explicit fail-open vs fail-closed semantics.
 *
 * Fail-open  (default): On Redis error → returns null, execution continues.
 *   Used by: SemanticCache lookups, ERC-8004 reputation reads.
 *   Rationale: A cache miss is expensive but safe. Routing to the LLM costs
 *   more, but the user's request is fulfilled.
 *
 * Fail-closed (opt-in, failClosedOnConnectionError: true): On Redis error → throws 503.
 *   Used by: AP2 mandate budget checks, billing plan-guard, rate limiter INCR.
 *   Rationale: Allowing "unlimited requests because Redis is down" is an attack
 *   surface. Blocking with a clear 503 protects tenants and operators.
 */

import redis from '@/lib/redis';
import { ApiError } from '@/lib/errors';

export interface CacheResilienceOptions {
    /** If true, throw a 503 instead of returning null when Redis is unreachable. */
    failClosedOnConnectionError?: boolean;
    /** TTL in seconds for SETEX writes. */
    ttlSeconds?: number;
}

// ---------------------------------------------------------------------------
// GET
// ---------------------------------------------------------------------------

/**
 * Safe GET: never throws on connection failure unless failClosed is requested.
 */
export async function safeGet(key: string, options?: CacheResilienceOptions): Promise<string | null> {
    if (!redis) return null;

    try {
        return await redis.get(key);
    } catch (error) {
        console.error(`[REDIS] GET failed for key "${key}":`, error);

        if (options?.failClosedOnConnectionError) {
            throw new ApiError({
                code: 'INTERNAL_ERROR',
                status: 503,
                message: 'Security subsystem temporarily unavailable. Request blocked.',
                requestId: crypto.randomUUID(),
            });
        }

        return null; // fail-open: treat as a cache miss
    }
}

// ---------------------------------------------------------------------------
// SET
// ---------------------------------------------------------------------------

/**
 * Safe SET / SETEX — always best-effort. A failed write only causes a future
 * cache miss; it never corrupts business state.
 */
export async function safeSet(key: string, value: string, options?: CacheResilienceOptions): Promise<void> {
    if (!redis) return;

    try {
        if (options?.ttlSeconds) {
            await redis.setex(key, options.ttlSeconds, value);
        } else {
            await redis.set(key, value);
        }
    } catch (error) {
        console.error(`[REDIS] SET failed for key "${key}":`, error);
        // Always fail-open for writes — never block the caller
    }
}

// ---------------------------------------------------------------------------
// DEL
// ---------------------------------------------------------------------------

/** Safe DEL — always best-effort. */
export async function safeDel(...keys: string[]): Promise<void> {
    if (!redis || keys.length === 0) return;

    try {
        await redis.del(...keys);
    } catch (error) {
        console.error(`[REDIS] DEL failed for keys [${keys.join(', ')}]:`, error);
    }
}

// ---------------------------------------------------------------------------
// INCR (Rate Limiting — always fail-closed)
// ---------------------------------------------------------------------------

/**
 * Atomic INCR with TTL for rate limiters.
 *
 * Always fail-closed: if Redis is down, the rate limiter returns 503.
 * Allowing "unlimited traffic because Redis is down" is unacceptable for a
 * financial API.
 */
export async function safeIncrWithTTL(key: string, ttlSeconds: number): Promise<number> {
    if (!redis) {
        throw new ApiError({
            code: 'INTERNAL_ERROR',
            status: 503,
            message: 'Rate limiting subsystem unavailable. Request blocked.',
            requestId: crypto.randomUUID(),
        });
    }

    try {
        const count = await redis.incr(key);
        if (count === 1) {
            // First request in the window — arm the TTL
            await redis.expire(key, ttlSeconds);
        }
        return count;
    } catch (error) {
        console.error(`[REDIS] INCR failed for rate limit key "${key}":`, error);
        throw new ApiError({
            code: 'INTERNAL_ERROR',
            status: 503,
            message: 'Rate limiting subsystem temporarily unavailable. Request blocked.',
            requestId: crypto.randomUUID(),
        });
    }
}
