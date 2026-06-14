/**
 * Slice 3X-Shadow — cache unit tests.
 *
 * Pins: TTLs, cache-miss DB fallback, fail-open on Redis read errors,
 * non-fatal Redis write errors, negative-result caching for tenants
 * with no row.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@/lib/control/configuration', async () => ({
    getTenantControlSettings: vi.fn(),
}));

import { getTenantControlSettings } from '@/lib/control/configuration';
import {
    CONFIG_CACHE_TTL_SECONDS,
    MTD_CACHE_TTL_SECONDS,
    configCacheKey,
    mtdCacheKey,
    getCachedTenantSettings,
    getCachedTenantMtd,
    invalidateConfigCache,
    type DbLike,
    type RedisLike,
} from '../cache';

const TENANT = '00000000-0000-0000-0000-0000000000bb';

function fakeRedis(opts: {
    map?: Record<string, string | null>;
    throwOnGet?: boolean;
    throwOnSetex?: boolean;
    throwOnDel?: boolean;
} = {}): RedisLike & { calls: { get: string[]; setex: Array<{key: string; ttl: number; value: string}>; del: string[] } } {
    const calls = { get: [] as string[], setex: [] as Array<{key: string; ttl: number; value: string}>, del: [] as string[] };
    const map = { ...(opts.map ?? {}) };
    return {
        async get(k: string) {
            calls.get.push(k);
            if (opts.throwOnGet) throw new Error('redis read fail');
            return map[k] ?? null;
        },
        async setex(k: string, ttl: number, v: string) {
            calls.setex.push({ key: k, ttl, value: v });
            if (opts.throwOnSetex) throw new Error('redis write fail');
            map[k] = v;
            return 'OK';
        },
        async del(k: string) {
            calls.del.push(k);
            if (opts.throwOnDel) throw new Error('redis del fail');
            delete map[k];
            return 1;
        },
        calls,
    } as RedisLike & { calls: typeof calls };
}

function fakeDb(rows: Array<Record<string, unknown>>, opts: { throw?: boolean } = {}): DbLike {
    return {
        query: vi.fn(async () => {
            if (opts.throw) throw new Error('db query fail');
            return { rows };
        }),
    };
}

beforeEach(() => {
    (getTenantControlSettings as unknown as ReturnType<typeof vi.fn>).mockReset();
});

// ─────────────────────────────────────────────────────────────────────────────
// getCachedTenantSettings
// ─────────────────────────────────────────────────────────────────────────────

describe('getCachedTenantSettings', () => {
    it('returns parsed cache hit without calling DB', async () => {
        const cached = JSON.stringify({
            monthly_budget_usd: 100,
            max_cost_per_request_usd: null,
            human_review_threshold_usd: null,
            allowed_models: [],
            allowed_task_types: [],
        });
        const r = fakeRedis({ map: { [configCacheKey(TENANT)]: cached } });
        const out = await getCachedTenantSettings(TENANT, r);
        expect(out?.monthly_budget_usd).toBe(100);
        expect(getTenantControlSettings).not.toHaveBeenCalled();
    });

    it('returns null for system_default tenants and caches the negative result', async () => {
        const r = fakeRedis();
        (getTenantControlSettings as unknown as ReturnType<typeof vi.fn>).mockResolvedValue({
            monthly_budget_usd: null,
            max_cost_per_request_usd: null,
            human_review_threshold_usd: null,
            allowed_models: [],
            allowed_task_types: [],
            source: 'system_default',
        });
        const out = await getCachedTenantSettings(TENANT, r);
        expect(out).toBeNull();
        expect(r.calls.setex.length).toBe(1);
        expect(r.calls.setex[0]!.key).toBe(configCacheKey(TENANT));
        expect(r.calls.setex[0]!.ttl).toBe(CONFIG_CACHE_TTL_SECONDS);
        expect(r.calls.setex[0]!.value).toBe('null');
    });

    it('writes tenant_default to cache with 60s TTL', async () => {
        const r = fakeRedis();
        (getTenantControlSettings as unknown as ReturnType<typeof vi.fn>).mockResolvedValue({
            monthly_budget_usd: 500,
            max_cost_per_request_usd: null,
            human_review_threshold_usd: null,
            allowed_models: ['gpt-4o-mini'],
            allowed_task_types: [],
            metadata: {},
            source: 'tenant_default',
        });
        const out = await getCachedTenantSettings(TENANT, r);
        expect(out?.monthly_budget_usd).toBe(500);
        expect(r.calls.setex[0]!.ttl).toBe(CONFIG_CACHE_TTL_SECONDS);
    });

    it('fails open on Redis read error: falls through to DB', async () => {
        const r = fakeRedis({ throwOnGet: true });
        (getTenantControlSettings as unknown as ReturnType<typeof vi.fn>).mockResolvedValue({
            monthly_budget_usd: 100,
            max_cost_per_request_usd: null,
            human_review_threshold_usd: null,
            allowed_models: [],
            allowed_task_types: [],
            metadata: {},
            source: 'tenant_default',
        });
        const out = await getCachedTenantSettings(TENANT, r);
        expect(out?.monthly_budget_usd).toBe(100);
    });

    it('survives corrupt cache values by falling through to DB', async () => {
        const r = fakeRedis({ map: { [configCacheKey(TENANT)]: '{{not json' } });
        (getTenantControlSettings as unknown as ReturnType<typeof vi.fn>).mockResolvedValue({
            monthly_budget_usd: null,
            max_cost_per_request_usd: null,
            human_review_threshold_usd: null,
            allowed_models: [],
            allowed_task_types: [],
            source: 'system_default',
        });
        const out = await getCachedTenantSettings(TENANT, r);
        expect(out).toBeNull();
    });

    it('Redis write failure is non-fatal', async () => {
        const r = fakeRedis({ throwOnSetex: true });
        (getTenantControlSettings as unknown as ReturnType<typeof vi.fn>).mockResolvedValue({
            monthly_budget_usd: 100,
            max_cost_per_request_usd: null,
            human_review_threshold_usd: null,
            allowed_models: [],
            allowed_task_types: [],
            metadata: {},
            source: 'tenant_default',
        });
        const out = await getCachedTenantSettings(TENANT, r);
        expect(out?.monthly_budget_usd).toBe(100);
    });

    it('DB error propagates (caller catches in shadow runtime)', async () => {
        const r = fakeRedis();
        (getTenantControlSettings as unknown as ReturnType<typeof vi.fn>).mockRejectedValue(new Error('db unreachable'));
        await expect(getCachedTenantSettings(TENANT, r)).rejects.toThrow(/db unreachable/);
    });
});

// ─────────────────────────────────────────────────────────────────────────────
// getCachedTenantMtd
// ─────────────────────────────────────────────────────────────────────────────

describe('getCachedTenantMtd', () => {
    const NOW = new Date('2026-06-13T18:00:00.000Z');

    it('returns parsed cache hit without DB', async () => {
        const r = fakeRedis({ map: { [mtdCacheKey(TENANT, NOW)]: '42.5' } });
        const db = fakeDb([]);
        const out = await getCachedTenantMtd(TENANT, NOW, r, db);
        expect(out).toBe(42.5);
        expect(db.query).not.toHaveBeenCalled();
    });

    it('queries ai_economic_events tenant-scoped on cache miss', async () => {
        const r = fakeRedis();
        const db = fakeDb([{ tenant_spend: 99.99 }]);
        const out = await getCachedTenantMtd(TENANT, NOW, r, db);
        expect(out).toBe(99.99);
        const [sql, params] = (db.query as ReturnType<typeof vi.fn>).mock.calls[0]!;
        expect(sql).toMatch(/FROM ai_economic_events/);
        expect(sql).toMatch(/tenant_id\s*=\s*\$1/);
        expect((params as unknown[])[0]).toBe(TENANT);
    });

    it('caches the result with 30s TTL', async () => {
        const r = fakeRedis();
        const db = fakeDb([{ tenant_spend: 12.34 }]);
        await getCachedTenantMtd(TENANT, NOW, r, db);
        expect(r.calls.setex[0]!.ttl).toBe(MTD_CACHE_TTL_SECONDS);
    });

    it('fails open on Redis read error: falls through to DB', async () => {
        const r = fakeRedis({ throwOnGet: true });
        const db = fakeDb([{ tenant_spend: 7 }]);
        const out = await getCachedTenantMtd(TENANT, NOW, r, db);
        expect(out).toBe(7);
    });

    it('DB error propagates (caller catches)', async () => {
        const r = fakeRedis();
        const db = fakeDb([], { throw: true });
        await expect(getCachedTenantMtd(TENANT, NOW, r, db)).rejects.toThrow(/db query fail/);
    });
});

// ─────────────────────────────────────────────────────────────────────────────
// invalidateConfigCache
// ─────────────────────────────────────────────────────────────────────────────

describe('invalidateConfigCache', () => {
    it('issues a DEL on the tenant config key', async () => {
        const r = fakeRedis();
        await invalidateConfigCache(TENANT, r);
        expect(r.calls.del).toEqual([configCacheKey(TENANT)]);
    });

    it('propagates Redis errors so the caller can log + decide to swallow', async () => {
        const r = fakeRedis({ throwOnDel: true });
        await expect(invalidateConfigCache(TENANT, r)).rejects.toThrow(/redis del fail/);
    });
});
