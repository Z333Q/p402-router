/**
 * Slice 3Z-B — OpenRouter adapter hybrid-catalog tests.
 *
 * Pins:
 *   - Adapter reads OPENROUTER_API_KEY from env
 *   - refreshLiveCatalog replaces the static catalog on success
 *   - Stale ids drop out when absent from the live response
 *     (specifically: google/gemini-3-flash absent → not in models)
 *   - Failure keeps the existing catalog (static or last successful live)
 *   - TTL prevents refetch within the window
 *   - Concurrent refresh calls share the same in-flight promise
 *   - Source-shape: adapter does not read ANTHROPIC_API_KEY or
 *     GOOGLE_AI_API_KEY / GEMINI_API_KEY (no direct keys required)
 */

import { describe, it, expect, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve as resolvePath } from 'node:path';

import { OpenRouterAdapter } from '../openrouter';
import type { FetcherLike } from '../openrouter-live-catalog';

function fakeFetch(body: unknown, opts: { ok?: boolean; status?: number } = {}): FetcherLike {
    return vi.fn(async () => ({
        ok: opts.ok ?? true,
        status: opts.status ?? 200,
        json: async () => body,
    })) as unknown as FetcherLike;
}

function liveResponse(ids: string[]): unknown {
    return {
        data: ids.map((id) => ({
            id,
            name: id,
            pricing: { prompt: '0.0000001', completion: '0.0000002' },
            context_length: 128000,
            architecture: { modality: 'text' },
            top_provider: { max_completion_tokens: 4096 },
        })),
    };
}

// ─────────────────────────────────────────────────────────────────────────────
// Env wiring
// ─────────────────────────────────────────────────────────────────────────────

describe('OpenRouterAdapter — env wiring', () => {
    it('reads OPENROUTER_API_KEY from env at construction time', () => {
        const prev = process.env.OPENROUTER_API_KEY;
        try {
            process.env.OPENROUTER_API_KEY = 'live-key-xyz';
            const a = new OpenRouterAdapter();
            expect(a.isAvailable()).toBe(true);
        } finally {
            if (prev === undefined) delete process.env.OPENROUTER_API_KEY;
            else                    process.env.OPENROUTER_API_KEY = prev;
        }
    });

    it('reports unavailable when OPENROUTER_API_KEY is absent', () => {
        const prev = process.env.OPENROUTER_API_KEY;
        try {
            delete process.env.OPENROUTER_API_KEY;
            const a = new OpenRouterAdapter();
            expect(a.isAvailable()).toBe(false);
        } finally {
            if (prev !== undefined) process.env.OPENROUTER_API_KEY = prev;
        }
    });
});

// ─────────────────────────────────────────────────────────────────────────────
// refreshLiveCatalog — replace on success
// ─────────────────────────────────────────────────────────────────────────────

describe('refreshLiveCatalog — replace on success', () => {
    it('replaces models with the mapped live catalog when fetch succeeds', async () => {
        const live = liveResponse([
            'openai/gpt-4o',
            'google/gemini-flash-1.5',
            'deepseek/deepseek-chat',
        ]);
        const adapter = new OpenRouterAdapter({
            apiKey: 'test',
            catalogFetchImpl: fakeFetch(live),
        });
        // Static catalog (pre-refresh) contains an id that is NOT in the
        // mock live response — we use openai/gpt-5.5-pro as the sentinel
        // because it is a forward-looking entry in the static list that
        // is not part of the live snapshot, so its disappearance after
        // refresh proves the replacement worked. (Prior versions of this
        // test used google/gemini-3-flash for the same purpose; that id
        // was retired from the static catalog after production returned
        // HTTP 400 "is not a valid model ID" on 2026-06-23.)
        expect(adapter.models.some((m) => m.id === 'openai/gpt-5.5-pro')).toBe(true);

        await adapter.refreshLiveCatalog();

        const ids = adapter.models.map((m) => m.id).sort();
        expect(ids).toEqual(['deepseek/deepseek-chat', 'google/gemini-flash-1.5', 'openai/gpt-4o']);
        expect(adapter.models.some((m) => m.id === 'openai/gpt-5.5-pro')).toBe(false);
        expect(adapter.getLastCatalogRefreshTs()).toBeGreaterThan(0);
        expect(adapter.getLastCatalogFailureTs()).toBe(0);
    });

    it('keeps the existing catalog if the live response has zero mappable rows', async () => {
        const before = new OpenRouterAdapter({ apiKey: 't' });
        const beforeCount = before.models.length;
        const adapter = new OpenRouterAdapter({
            apiKey: 't',
            catalogFetchImpl: fakeFetch({ data: [{}, { id: 42 }, null] }),
        });
        await adapter.refreshLiveCatalog();
        expect(adapter.models.length).toBe(beforeCount);
        expect(adapter.getLastCatalogFailureTs()).toBeGreaterThan(0);
        expect(adapter.getLastCatalogRefreshTs()).toBe(0);
    });
});

// ─────────────────────────────────────────────────────────────────────────────
// refreshLiveCatalog — failure keeps current
// ─────────────────────────────────────────────────────────────────────────────

describe('refreshLiveCatalog — failure keeps current', () => {
    it('on HTTP failure: leaves static catalog in place, records failure ts', async () => {
        const adapter = new OpenRouterAdapter({
            apiKey: 't',
            catalogFetchImpl: fakeFetch({}, { ok: false, status: 503 }),
        });
        const before = adapter.models.length;
        await adapter.refreshLiveCatalog();
        expect(adapter.models.length).toBe(before);
        expect(adapter.getLastCatalogFailureTs()).toBeGreaterThan(0);
        expect(adapter.getLastCatalogRefreshTs()).toBe(0);
    });

    it('on fetch throw: leaves static catalog in place, never throws', async () => {
        const broken = vi.fn(async () => { throw new Error('network down'); }) as unknown as FetcherLike;
        const adapter = new OpenRouterAdapter({ apiKey: 't', catalogFetchImpl: broken });
        const before = adapter.models.length;
        await expect(adapter.refreshLiveCatalog()).resolves.toBeUndefined();
        expect(adapter.models.length).toBe(before);
        expect(adapter.getLastCatalogFailureTs()).toBeGreaterThan(0);
    });
});

// ─────────────────────────────────────────────────────────────────────────────
// TTL + dedup
// ─────────────────────────────────────────────────────────────────────────────

describe('refreshLiveCatalog — TTL + dedup', () => {
    it('does not refetch within the TTL window', async () => {
        const fetchImpl = vi.fn(async () => ({
            ok: true, status: 200, json: async () => liveResponse(['x/y']),
        })) as unknown as FetcherLike;
        const adapter = new OpenRouterAdapter({
            apiKey: 't',
            catalogTtlMs: 60_000,
            catalogFetchImpl: fetchImpl,
        });
        await adapter.refreshLiveCatalog();
        await adapter.refreshLiveCatalog();
        await adapter.refreshLiveCatalog();
        expect((fetchImpl as unknown as { mock: { calls: unknown[][] } }).mock.calls.length).toBe(1);
    });

    it('force=true bypasses the TTL', async () => {
        const fetchImpl = vi.fn(async () => ({
            ok: true, status: 200, json: async () => liveResponse(['x/y']),
        })) as unknown as FetcherLike;
        const adapter = new OpenRouterAdapter({ apiKey: 't', catalogTtlMs: 60_000, catalogFetchImpl: fetchImpl });
        await adapter.refreshLiveCatalog();
        await adapter.refreshLiveCatalog({ force: true });
        expect((fetchImpl as unknown as { mock: { calls: unknown[][] } }).mock.calls.length).toBe(2);
    });

    it('concurrent calls share the same in-flight promise', async () => {
        let resolveInner!: (v: unknown) => void;
        const fetchImpl = vi.fn(async () => {
            await new Promise((r) => { resolveInner = r as never; });
            return { ok: true, status: 200, json: async () => liveResponse(['x/y']) };
        }) as unknown as FetcherLike;
        const adapter = new OpenRouterAdapter({ apiKey: 't', catalogFetchImpl: fetchImpl });
        const p1 = adapter.refreshLiveCatalog();
        const p2 = adapter.refreshLiveCatalog();
        const p3 = adapter.refreshLiveCatalog();
        resolveInner(null);
        await Promise.all([p1, p2, p3]);
        expect((fetchImpl as unknown as { mock: { calls: unknown[][] } }).mock.calls.length).toBe(1);
    });
});

// ─────────────────────────────────────────────────────────────────────────────
// Source-shape: no direct Anthropic / Google key required
// ─────────────────────────────────────────────────────────────────────────────

describe('source shape — OpenRouter adapter does not require direct provider keys', () => {
    const SRC = readFileSync(
        resolvePath(process.cwd(), 'lib/ai-providers/openrouter.ts'),
        'utf8',
    );

    it('does not read ANTHROPIC_API_KEY', () => {
        expect(SRC).not.toMatch(/process\.env\.ANTHROPIC_API_KEY/);
    });

    it('does not read GOOGLE_AI_API_KEY', () => {
        expect(SRC).not.toMatch(/process\.env\.GOOGLE_AI_API_KEY/);
    });

    it('does not read GEMINI_API_KEY', () => {
        expect(SRC).not.toMatch(/process\.env\.GEMINI_API_KEY/);
    });

    it('reads OPENROUTER_API_KEY (and only the OpenRouter-side OPENROUTER_REFERER)', () => {
        expect(SRC).toContain('process.env.OPENROUTER_API_KEY');
        expect(SRC).toContain('process.env.OPENROUTER_REFERER');
    });
});

// ─────────────────────────────────────────────────────────────────────────────
// Stale-id removal (the original 3Z-B motivating bug)
// ─────────────────────────────────────────────────────────────────────────────

describe('stale id removal — google/gemini-3-flash drops out when absent from live', () => {
    it('after refresh, getModel("google/gemini-3-flash") returns undefined', async () => {
        // Live response includes only the CURRENT ids; google/gemini-3-flash is omitted.
        const live = liveResponse([
            'openai/gpt-4o',
            'google/gemini-flash-1.5',
            'anthropic/claude-3.5-sonnet',
        ]);
        const adapter = new OpenRouterAdapter({
            apiKey: 't',
            catalogFetchImpl: fakeFetch(live),
        });
        await adapter.refreshLiveCatalog();
        expect(adapter.getModel('google/gemini-3-flash')).toBeUndefined();
        expect(adapter.getModel('google/gemini-flash-1.5')).toBeDefined();
    });
});

// ─────────────────────────────────────────────────────────────────────────────
// OpenRouter-native id routing (positive pin via registry)
// ─────────────────────────────────────────────────────────────────────────────

describe('source shape — registry routes OpenRouter-native ids via exact match', () => {
    const REG = readFileSync(
        resolvePath(process.cwd(), 'lib/ai-providers/registry.ts'),
        'utf8',
    );
    it('registry route() does exact-id matching', () => {
        expect(REG).toMatch(/c\.model\.id === targetModelId/);
    });
    it('registry route() also accepts openai\\/, anthropic\\/, google\\/, meta-llama\\/ prefixes as OpenRouter fallback', () => {
        expect(REG).toContain('`openai/${targetModelId}`');
        expect(REG).toContain('`anthropic/${targetModelId}`');
        expect(REG).toContain('`google/${targetModelId}`');
        expect(REG).toContain('`meta-llama/${targetModelId}`');
    });
});
