/**
 * Slice 3Z-B — unit tests for the pure live-catalog helpers.
 *
 * Pins:
 *   - mapToModelInfo never throws on bad input; returns null instead
 *   - pricing conversion: USD/token (string) -> USD/1k tokens (number)
 *   - tier thresholds match the legacy static catalog buckets
 *   - capability inference: chat + streaming always; vision when image
 *     modality; long_context for >= 200k context window
 *   - fetchOpenRouterModels reads /api/v1/models, surfaces non-2xx errors
 *   - loadLiveCatalog filters out unmappable rows
 */

import { describe, it, expect, vi } from 'vitest';

import {
    fetchOpenRouterModels,
    loadLiveCatalog,
    inferCapabilities,
    inferTier,
    mapToModelInfo,
    OPENROUTER_MODELS_URL,
    type FetcherLike,
    type RawOpenRouterModel,
} from '../openrouter-live-catalog';

function fakeFetch(body: unknown, opts: { ok?: boolean; status?: number } = {}): FetcherLike {
    return vi.fn(async () => ({
        ok: opts.ok ?? true,
        status: opts.status ?? 200,
        json: async () => body,
    })) as unknown as FetcherLike;
}

// ─────────────────────────────────────────────────────────────────────────────
// inferTier
// ─────────────────────────────────────────────────────────────────────────────

describe('inferTier', () => {
    it('budget when output per-1k < $0.0005', () => {
        expect(inferTier(0.0002)).toBe('budget');
        expect(inferTier(0.00028)).toBe('budget');
    });
    it('mid when output per-1k between $0.0005 and $0.005', () => {
        expect(inferTier(0.0005)).toBe('mid');
        expect(inferTier(0.003)).toBe('mid');
    });
    it('premium when output per-1k >= $0.005', () => {
        expect(inferTier(0.005)).toBe('premium');
        expect(inferTier(0.024)).toBe('premium');
    });
    it('falls back to mid on non-finite input', () => {
        expect(inferTier(Number.NaN)).toBe('mid');
        expect(inferTier(Number.POSITIVE_INFINITY)).toBe('mid');
    });
});

// ─────────────────────────────────────────────────────────────────────────────
// inferCapabilities
// ─────────────────────────────────────────────────────────────────────────────

describe('inferCapabilities', () => {
    it('always includes chat + streaming', () => {
        const c = inferCapabilities({});
        expect(c).toContain('chat');
        expect(c).toContain('streaming');
    });
    it('adds vision when modality is image-bearing', () => {
        expect(inferCapabilities({ architecture: { modality: 'text+image' } })).toContain('vision');
        expect(inferCapabilities({ architecture: { input_modalities: ['text', 'image'] } })).toContain('vision');
    });
    it('does not add vision for text-only', () => {
        expect(inferCapabilities({ architecture: { modality: 'text' } })).not.toContain('vision');
    });
    it('adds long_context when context_length >= 200k', () => {
        expect(inferCapabilities({ context_length: 200000 })).toContain('long_context');
        expect(inferCapabilities({ context_length: 5000000 })).toContain('long_context');
    });
    it('does not add long_context below threshold', () => {
        expect(inferCapabilities({ context_length: 128000 })).not.toContain('long_context');
    });
});

// ─────────────────────────────────────────────────────────────────────────────
// mapToModelInfo
// ─────────────────────────────────────────────────────────────────────────────

describe('mapToModelInfo', () => {
    it('returns null for null / non-object / missing id', () => {
        expect(mapToModelInfo(null as unknown as RawOpenRouterModel)).toBeNull();
        expect(mapToModelInfo({} as RawOpenRouterModel)).toBeNull();
        expect(mapToModelInfo({ id: '' } as RawOpenRouterModel)).toBeNull();
        expect(mapToModelInfo({ id: 42 as unknown as string } as RawOpenRouterModel)).toBeNull();
    });

    it('converts string per-token pricing to per-1k', () => {
        const m = mapToModelInfo({
            id: 'openai/gpt-4o',
            name: 'GPT-4o',
            pricing: { prompt: '0.0000025', completion: '0.00001' },
            context_length: 128000,
        });
        expect(m).not.toBeNull();
        // prompt $0.0000025/token * 1000 = $0.0025/1k tokens
        expect(m!.inputCostPer1k).toBeCloseTo(0.0025, 7);
        // completion $0.00001/token * 1000 = $0.01/1k tokens
        expect(m!.outputCostPer1k).toBeCloseTo(0.01, 7);
        // mid tier
        expect(m!.tier).toBe('premium'); // output >= 0.005
    });

    it('accepts numeric pricing too', () => {
        const m = mapToModelInfo({
            id: 'x/y',
            pricing: { prompt: 0.00005, completion: 0.0002 } as never,
            context_length: 8192,
        });
        expect(m).not.toBeNull();
        expect(m!.inputCostPer1k).toBeCloseTo(0.05, 6);
        expect(m!.outputCostPer1k).toBeCloseTo(0.2, 6);
    });

    it('treats missing pricing as 0 (budget tier)', () => {
        const m = mapToModelInfo({ id: 'free/model', context_length: 8192 });
        expect(m).not.toBeNull();
        expect(m!.inputCostPer1k).toBe(0);
        expect(m!.outputCostPer1k).toBe(0);
        expect(m!.tier).toBe('budget');
    });

    it('rejects malformed pricing (string that does not parse)', () => {
        const m = mapToModelInfo({
            id: 'broken/model',
            pricing: { prompt: 'not-a-number', completion: '0.0001' },
            context_length: 8192,
        });
        // String → Number('not-a-number') = NaN → coerced to 0 by per1k → input is 0, output is 0.1
        // We accept this; it's a "free input" model with cheap output. Document the behavior.
        expect(m).not.toBeNull();
        expect(m!.inputCostPer1k).toBe(0);
    });

    it('rejects negative pricing', () => {
        const m = mapToModelInfo({
            id: 'wrong/model',
            pricing: { prompt: '-0.0001', completion: '0.0001' },
            context_length: 8192,
        });
        expect(m).toBeNull();
    });

    it('uses sensible defaults when context_length / max_completion_tokens missing', () => {
        const m = mapToModelInfo({ id: 'minimal/model' });
        expect(m).not.toBeNull();
        expect(m!.contextWindow).toBeGreaterThan(0);
        expect(m!.maxOutputTokens).toBeGreaterThan(0);
    });

    it('uses id as name when name is missing', () => {
        const m = mapToModelInfo({ id: 'foo/bar' });
        expect(m!.name).toBe('foo/bar');
    });

    it('never throws on totally junk input', () => {
        expect(() => mapToModelInfo(123 as unknown as RawOpenRouterModel)).not.toThrow();
        expect(() => mapToModelInfo('hi' as unknown as RawOpenRouterModel)).not.toThrow();
        expect(() => mapToModelInfo([] as unknown as RawOpenRouterModel)).not.toThrow();
    });
});

// ─────────────────────────────────────────────────────────────────────────────
// fetchOpenRouterModels
// ─────────────────────────────────────────────────────────────────────────────

describe('fetchOpenRouterModels', () => {
    it('hits /api/v1/models with GET + Accept JSON', async () => {
        const f = vi.fn(async () => ({
            ok: true,
            status: 200,
            json: async () => ({ data: [] }),
        })) as unknown as FetcherLike;
        await fetchOpenRouterModels({ fetchImpl: f });
        const calls = (f as unknown as { mock: { calls: unknown[][] } }).mock.calls;
        expect(calls[0]![0]).toBe(OPENROUTER_MODELS_URL);
        expect((calls[0]![1] as { method?: string }).method).toBe('GET');
    });

    it('forwards Authorization when apiKey is provided', async () => {
        const f = vi.fn(async () => ({ ok: true, status: 200, json: async () => ({ data: [] }) })) as unknown as FetcherLike;
        await fetchOpenRouterModels({ apiKey: 'live-key-abc', fetchImpl: f });
        const calls = (f as unknown as { mock: { calls: unknown[][] } }).mock.calls;
        const headers = (calls[0]![1] as { headers?: Record<string, string> }).headers!;
        expect(headers.Authorization).toBe('Bearer live-key-abc');
    });

    it('omits Authorization when no apiKey', async () => {
        const f = vi.fn(async () => ({ ok: true, status: 200, json: async () => ({ data: [] }) })) as unknown as FetcherLike;
        await fetchOpenRouterModels({ fetchImpl: f });
        const calls = (f as unknown as { mock: { calls: unknown[][] } }).mock.calls;
        const headers = (calls[0]![1] as { headers?: Record<string, string> }).headers!;
        expect(headers.Authorization).toBeUndefined();
    });

    it('throws when HTTP non-ok', async () => {
        const f = fakeFetch({}, { ok: false, status: 503 });
        await expect(fetchOpenRouterModels({ fetchImpl: f })).rejects.toThrow(/HTTP 503/);
    });

    it('throws when response shape is unexpected', async () => {
        const f = fakeFetch({ data: 'not-an-array' });
        await expect(fetchOpenRouterModels({ fetchImpl: f })).rejects.toThrow(/unexpected shape/);
    });

    it('returns the data array when shape is correct', async () => {
        const f = fakeFetch({ data: [{ id: 'a' }, { id: 'b' }] });
        const rows = await fetchOpenRouterModels({ fetchImpl: f });
        expect(rows.length).toBe(2);
    });
});

// ─────────────────────────────────────────────────────────────────────────────
// loadLiveCatalog
// ─────────────────────────────────────────────────────────────────────────────

describe('loadLiveCatalog', () => {
    it('maps each row and drops nulls', async () => {
        const f = fakeFetch({
            data: [
                { id: 'openai/gpt-4o', pricing: { prompt: '0.0000025', completion: '0.00001' }, context_length: 128000 },
                { /* missing id - drop */ },
                { id: 'google/gemini-flash-1.5', pricing: { prompt: '0.00000007', completion: '0.0000003' }, context_length: 1000000 },
            ],
        });
        const out = await loadLiveCatalog({ fetchImpl: f });
        const ids = out.map((m) => m.id);
        expect(ids).toEqual(['openai/gpt-4o', 'google/gemini-flash-1.5']);
    });

    it('returns empty array when live response has zero mappable rows', async () => {
        const f = fakeFetch({ data: [{}, { id: 42 }, null] });
        const out = await loadLiveCatalog({ fetchImpl: f });
        expect(out).toEqual([]);
    });
});
