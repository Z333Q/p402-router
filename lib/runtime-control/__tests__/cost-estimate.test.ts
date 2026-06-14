/**
 * Slice 3Y-Shadow-Wireup — unit tests for the pure cost estimator.
 *
 * Pins:
 *   - never throws on any bad input
 *   - returns 0 for unknown model
 *   - returns 0 when registry lookup fails
 *   - returns finite non-negative number for valid inputs
 *   - reads message LENGTH only, not content
 *   - default output token estimate when max_tokens missing
 */

import { describe, it, expect } from 'vitest';

import { estimateModelCostUsd, type CostRegistryLike } from '../cost-estimate';

function fakeRegistry(models: Array<{ id: string; inputCostPer1k?: number; outputCostPer1k?: number }>): CostRegistryLike {
    return {
        getAllModels: () => models.map((m) => ({ provider: 'fake', model: m })),
    };
}

describe('estimateModelCostUsd — never throws', () => {
    it('returns 0 for undefined model', () => {
        expect(estimateModelCostUsd(undefined, [], 100, fakeRegistry([]))).toBe(0);
    });
    it('returns 0 for non-string model', () => {
        expect(estimateModelCostUsd(42, [], 100, fakeRegistry([]))).toBe(0);
        expect(estimateModelCostUsd({}, [], 100, fakeRegistry([]))).toBe(0);
        expect(estimateModelCostUsd(null, [], 100, fakeRegistry([]))).toBe(0);
    });
    it('returns 0 for empty-string model', () => {
        expect(estimateModelCostUsd('', [], 100, fakeRegistry([]))).toBe(0);
    });
    it('returns 0 for unknown model id', () => {
        expect(estimateModelCostUsd('not-in-catalog', [], 100, fakeRegistry([
            { id: 'gemini-3.0-flash', inputCostPer1k: 0.00005, outputCostPer1k: 0.0002 },
        ]))).toBe(0);
    });
    it('returns 0 when registry returns non-array', () => {
        const broken: CostRegistryLike = { getAllModels: () => null as unknown as never };
        expect(estimateModelCostUsd('claude-haiku-4-5', [], 100, broken)).toBe(0);
    });
    it('returns 0 when registry.getAllModels throws', () => {
        const broken: CostRegistryLike = { getAllModels: () => { throw new Error('boom'); } };
        expect(estimateModelCostUsd('claude-haiku-4-5', [], 100, broken)).toBe(0);
    });
    it('returns 0 when registry is missing inputCostPer1k', () => {
        expect(estimateModelCostUsd('m', [], 100, fakeRegistry([{ id: 'm' }]))).toBe(0);
    });
    it('returns 0 when registry costs are non-finite', () => {
        expect(estimateModelCostUsd('m', [], 100, fakeRegistry([
            { id: 'm', inputCostPer1k: Number.NaN, outputCostPer1k: 0.001 },
        ]))).toBe(0);
        expect(estimateModelCostUsd('m', [], 100, fakeRegistry([
            { id: 'm', inputCostPer1k: 0.001, outputCostPer1k: Number.POSITIVE_INFINITY },
        ]))).toBe(0);
    });
    it('returns 0 when registry costs are negative', () => {
        expect(estimateModelCostUsd('m', [], 100, fakeRegistry([
            { id: 'm', inputCostPer1k: -0.001, outputCostPer1k: 0.001 },
        ]))).toBe(0);
    });
});

describe('estimateModelCostUsd — happy path', () => {
    const REGISTRY = fakeRegistry([
        { id: 'claude-haiku-4-5', inputCostPer1k: 0.0005, outputCostPer1k: 0.0025 },
        { id: 'gemini-3.0-flash', inputCostPer1k: 0.00005, outputCostPer1k: 0.0002 },
    ]);

    it('returns a finite non-negative number for valid inputs', () => {
        const c = estimateModelCostUsd('claude-haiku-4-5',
            [{ content: 'hello' }, { content: 'world' }], 100, REGISTRY);
        expect(Number.isFinite(c)).toBe(true);
        expect(c).toBeGreaterThanOrEqual(0);
    });

    it('input token count is derived from message LENGTH only (no content stored)', () => {
        // 10-char content → 3 tokens (ceil(10/4) = 3, max(1, 3) = 3)
        // max_tokens=100 → output=100
        // input cost: 3/1000 * 0.0005 = 0.0000015
        // output cost: 100/1000 * 0.0025 = 0.00025
        // total ≈ 0.0002515
        const c = estimateModelCostUsd('claude-haiku-4-5', [{ content: '0123456789' }], 100, REGISTRY);
        expect(c).toBeCloseTo(0.0002515, 7);
    });

    it('Gemini Flash is cheaper than Claude Haiku for the same payload', () => {
        const haiku = estimateModelCostUsd('claude-haiku-4-5', [{ content: 'x'.repeat(100) }], 1000, REGISTRY);
        const flash = estimateModelCostUsd('gemini-3.0-flash', [{ content: 'x'.repeat(100) }], 1000, REGISTRY);
        expect(flash).toBeLessThan(haiku);
    });

    it('default output tokens when max_tokens omitted', () => {
        // With messages=[] and max_tokens undefined, the estimator uses
        // the 1024 default output token estimate.
        const c = estimateModelCostUsd('claude-haiku-4-5', [], undefined, REGISTRY);
        // input: 1 token (min), output: 1024 → ~0.00256
        expect(c).toBeGreaterThan(0);
        expect(c).toBeCloseTo(1 / 1000 * 0.0005 + 1024 / 1000 * 0.0025, 6);
    });

    it('supports OpenAI-style content parts (length-only)', () => {
        const messages = [
            { content: [{ type: 'text', text: 'hello' }, { type: 'text', text: 'world' }] },
        ];
        const c = estimateModelCostUsd('claude-haiku-4-5', messages, 100, REGISTRY);
        expect(c).toBeGreaterThan(0);
    });

    it('non-string content is ignored without throwing', () => {
        const messages = [
            { content: 42 },
            { content: null },
            { content: { nested: 'object' } },  // ignored
            { content: 'real text' },
        ];
        const c = estimateModelCostUsd('claude-haiku-4-5', messages, 100, REGISTRY);
        expect(Number.isFinite(c)).toBe(true);
        expect(c).toBeGreaterThan(0);
    });

    it('messages=undefined yields min-1 input token', () => {
        const c = estimateModelCostUsd('claude-haiku-4-5', undefined, 100, REGISTRY);
        expect(c).toBeGreaterThan(0);
        // 1/1000 * 0.0005 + 100/1000 * 0.0025 = 0.0005 + 0.25 = 0.0002505
        expect(c).toBeCloseTo(0.0002505, 7);
    });

    it('messages contains non-objects without throwing', () => {
        const c = estimateModelCostUsd('claude-haiku-4-5', ['oops', null, 42], 100, REGISTRY);
        expect(Number.isFinite(c)).toBe(true);
        expect(c).toBeGreaterThan(0);
    });

    it('non-numeric max_tokens falls back to default', () => {
        const c = estimateModelCostUsd('claude-haiku-4-5', [{ content: 'hi' }], 'lots', REGISTRY);
        expect(c).toBeGreaterThan(0);
    });
});
