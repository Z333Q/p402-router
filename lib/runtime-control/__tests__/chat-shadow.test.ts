/**
 * Slice 3Y-Shadow-Wireup — chat-shadow bridge tests.
 *
 * Pins:
 *   - never throws
 *   - skips when tenantId is missing
 *   - skips when body.model is not a string
 *   - calls computeAndEmitShadow with the expected context shape
 *   - reads body.messages by LENGTH only (no content surfaced)
 *   - failure inside computeAndEmitShadow is swallowed by the outer catch
 *   - returns void
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock the shadow module so we can spy on the call shape.
vi.mock('@/lib/runtime-control/shadow', async () => ({
    computeAndEmitShadow: vi.fn(async () => undefined),
}));

vi.mock('@/lib/redis', () => ({ default: { get: vi.fn(), setex: vi.fn(), del: vi.fn() } }));
vi.mock('@/lib/db',    () => ({ default: { query: vi.fn() } }));

import { computeAndEmitShadow } from '@/lib/runtime-control/shadow';
import { emitChatShadow } from '../chat-shadow';
import type { CostRegistryLike } from '../cost-estimate';

const REGISTRY: CostRegistryLike = {
    getAllModels: () => [
        { provider: 'fake', model: { id: 'claude-haiku-4-5', inputCostPer1k: 0.0005, outputCostPer1k: 0.0025 } },
        { provider: 'fake', model: { id: 'gemini-3.0-flash', inputCostPer1k: 0.00005, outputCostPer1k: 0.0002 } },
    ],
};

beforeEach(() => {
    (computeAndEmitShadow as unknown as ReturnType<typeof vi.fn>).mockReset();
    (computeAndEmitShadow as unknown as ReturnType<typeof vi.fn>).mockResolvedValue(undefined);
});

describe('emitChatShadow', () => {
    it('returns void on the happy path', async () => {
        const r = await emitChatShadow({
            tenantId: 't1',
            requestId: 'req1',
            body: { model: 'claude-haiku-4-5', messages: [{ content: 'hi' }], max_tokens: 10 },
        }, { registry: REGISTRY });
        expect(r).toBeUndefined();
    });

    it('skips when tenantId is null/undefined', async () => {
        await emitChatShadow({ tenantId: null, requestId: 'req1', body: { model: 'claude-haiku-4-5' } }, { registry: REGISTRY });
        await emitChatShadow({ tenantId: undefined, requestId: 'req1', body: { model: 'claude-haiku-4-5' } }, { registry: REGISTRY });
        await emitChatShadow({ tenantId: '', requestId: 'req1', body: { model: 'claude-haiku-4-5' } }, { registry: REGISTRY });
        expect(computeAndEmitShadow).not.toHaveBeenCalled();
    });

    it('skips when body.model is not a string', async () => {
        await emitChatShadow({ tenantId: 't1', requestId: 'req1', body: { model: 42 } as never }, { registry: REGISTRY });
        await emitChatShadow({ tenantId: 't1', requestId: 'req1', body: undefined }, { registry: REGISTRY });
        await emitChatShadow({ tenantId: 't1', requestId: 'req1', body: { model: '' } }, { registry: REGISTRY });
        expect(computeAndEmitShadow).not.toHaveBeenCalled();
    });

    it('passes the expected shadow context shape', async () => {
        await emitChatShadow({
            tenantId: 't1',
            requestId: 'req-abc',
            body: { model: 'gemini-3.0-flash', messages: [{ content: 'hello' }], max_tokens: 50 },
        }, { registry: REGISTRY });
        expect(computeAndEmitShadow).toHaveBeenCalledTimes(1);
        const call = (computeAndEmitShadow as unknown as ReturnType<typeof vi.fn>).mock.calls[0]!;
        const ctx = call[0] as { tenantId: string; requestId: string; modelRequested: string; estimatedCostUsd: number };
        expect(ctx.tenantId).toBe('t1');
        expect(ctx.requestId).toBe('req-abc');
        expect(ctx.modelRequested).toBe('gemini-3.0-flash');
        expect(typeof ctx.estimatedCostUsd).toBe('number');
        expect(Number.isFinite(ctx.estimatedCostUsd)).toBe(true);
        expect(ctx.estimatedCostUsd).toBeGreaterThanOrEqual(0);
    });

    it('swallows internal throws (defense in depth)', async () => {
        (computeAndEmitShadow as unknown as ReturnType<typeof vi.fn>).mockImplementation(async () => {
            throw new Error('synthetic shadow failure');
        });
        await expect(emitChatShadow({
            tenantId: 't1', requestId: 'req1',
            body: { model: 'claude-haiku-4-5' },
        }, { registry: REGISTRY })).resolves.toBeUndefined();
    });

    it('does not surface message content in the shadow context (length-only is the contract)', async () => {
        await emitChatShadow({
            tenantId: 't1',
            requestId: 'req1',
            body: {
                model: 'claude-haiku-4-5',
                messages: [{ content: 'SECRET-PROMPT-CONTENT-12345' }],
                max_tokens: 10,
            },
        }, { registry: REGISTRY });
        const call = (computeAndEmitShadow as unknown as ReturnType<typeof vi.fn>).mock.calls[0]!;
        const serialized = JSON.stringify(call);
        expect(serialized).not.toContain('SECRET-PROMPT-CONTENT-12345');
    });
});
