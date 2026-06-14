/**
 * Slice 3X-Shadow — Redis caches for the runtime shadow path.
 *
 * Two caches:
 *   - config cache: p402:tcs:config:{tenantId}     TTL 60s
 *   - MTD cache   : p402:tcs:mtd:{tenantId}:{yyyymm} TTL 30s
 *
 * Both caches fail-open: a Redis error falls back to the underlying
 * fetcher (DB read). A DB read failure surfaces to the caller as a
 * rejected promise — the shadow runtime catches it and emits a
 * structured shadow_read_failed log, then continues without denying
 * the request.
 *
 * The shadow runtime is the ONLY runtime caller. The simulator route
 * does its own (uncached) read because the simulator already prefers
 * the freshest tenant state.
 */

import {
    getTenantControlSettings,
    type TenantControlSettings,
} from '@/lib/control/configuration';

export const CONFIG_CACHE_TTL_SECONDS = 60;
export const MTD_CACHE_TTL_SECONDS    = 30;

export function configCacheKey(tenantId: string): string {
    return `p402:tcs:config:${tenantId}`;
}
export function mtdCacheKey(tenantId: string, now: Date): string {
    const yyyy = now.getUTCFullYear().toString();
    const mm = String(now.getUTCMonth() + 1).padStart(2, '0');
    return `p402:tcs:mtd:${tenantId}:${yyyy}${mm}`;
}

export interface RedisLike {
    get(key: string): Promise<string | null>;
    setex(key: string, seconds: number, value: string): Promise<unknown>;
    del(key: string): Promise<unknown>;
}

export interface DbLike {
    query(text: string, params?: unknown[]): Promise<{ rows: Array<Record<string, unknown>> }>;
}

/**
 * Return the cached tenant config, fetching from DB on miss. Returns
 * null when the tenant has no row (system_default) so the caller can
 * skip the entire shadow eval cheaply. Throws only when DB fails after
 * a cache miss; the shadow runtime swallows that.
 */
export async function getCachedTenantSettings(
    tenantId: string,
    redis: RedisLike,
): Promise<TenantControlSettings | null> {
    let cached: string | null = null;
    try {
        cached = await redis.get(configCacheKey(tenantId));
    } catch {
        // Redis read failure — fall through to DB read.
    }
    if (cached !== null) {
        try {
            return JSON.parse(cached) as TenantControlSettings;
        } catch {
            // Corrupt cache value: ignore, fall through to DB.
        }
    }

    // Cache miss (or read failure / corrupt value) → DB.
    const fresh = await getTenantControlSettings(tenantId);
    if (fresh.source === 'system_default') {
        // No row exists. We still cache the negative result as a
        // sentinel ('null'::string) so subsequent misses don't hit DB
        // for the next 60 seconds.
        try {
            await redis.setex(configCacheKey(tenantId), CONFIG_CACHE_TTL_SECONDS, 'null');
        } catch {
            // Cache write failure is non-fatal.
        }
        return null;
    }
    const value: TenantControlSettings = {
        monthly_budget_usd:         fresh.monthly_budget_usd,
        max_cost_per_request_usd:   fresh.max_cost_per_request_usd,
        human_review_threshold_usd: fresh.human_review_threshold_usd,
        allowed_models:             fresh.allowed_models,
        allowed_task_types:         fresh.allowed_task_types,
    };
    try {
        await redis.setex(configCacheKey(tenantId), CONFIG_CACHE_TTL_SECONDS, JSON.stringify(value));
    } catch {
        // Cache write failure is non-fatal.
    }
    return value;
}

/**
 * Tenant-wide MTD spend in USD. Cached for 30s. Fail-open: on Redis or
 * DB error the caller's catch path emits a structured shadow_read_failed
 * log and the runtime continues.
 */
export async function getCachedTenantMtd(
    tenantId: string,
    now: Date,
    redis: RedisLike,
    db: DbLike,
): Promise<number> {
    const key = mtdCacheKey(tenantId, now);
    let cached: string | null = null;
    try {
        cached = await redis.get(key);
    } catch {
        // fall through
    }
    if (cached !== null) {
        const n = Number(cached);
        if (Number.isFinite(n)) return n;
    }

    const monthStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
    const r = await db.query(
        `SELECT COALESCE(SUM(cost_usd), 0)::float AS tenant_spend
           FROM ai_economic_events
          WHERE tenant_id = $1
            AND (status_code IS NULL OR status_code = 200)
            AND event_time >= $2`,
        [tenantId, monthStart],
    );
    const row = r.rows[0] as { tenant_spend?: number } | undefined;
    const value = Number(row?.tenant_spend ?? 0);
    try {
        await redis.setex(key, MTD_CACHE_TTL_SECONDS, String(value));
    } catch {
        // Cache write failure is non-fatal.
    }
    return value;
}

/**
 * Best-effort cache invalidation called by the configuration PATCH
 * route after a successful UPSERT. Failure is logged by the caller;
 * the PATCH still succeeds.
 */
export async function invalidateConfigCache(
    tenantId: string,
    redis: RedisLike,
): Promise<void> {
    await redis.del(configCacheKey(tenantId));
}
