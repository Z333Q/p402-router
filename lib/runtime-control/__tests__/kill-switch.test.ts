/**
 * Slice 3X-Shadow — kill-switch unit tests.
 *
 * Two-layer model: global key + per-tenant override. Fail-closed on
 * Redis errors (off → no shadow runs).
 */

import { describe, it, expect, vi } from 'vitest';

import {
    GLOBAL_SHADOW_KEY,
    isShadowEnabled,
    tenantShadowKey,
    type RedisLike,
} from '../kill-switch';

const TENANT = '00000000-0000-0000-0000-0000000000aa';

function fakeRedis(map: Record<string, string | null>, opts: { throwOn?: string[] } = {}): RedisLike {
    return {
        get: vi.fn(async (k: string) => {
            if (opts.throwOn?.includes(k)) throw new Error('redis down');
            return map[k] ?? null;
        }),
    };
}

describe('isShadowEnabled', () => {
    it('returns false when nothing is set (fail-safe default)', async () => {
        expect(await isShadowEnabled(TENANT, fakeRedis({}))).toBe(false);
    });

    it('returns true when global=1 and no tenant override', async () => {
        expect(await isShadowEnabled(TENANT, fakeRedis({ [GLOBAL_SHADOW_KEY]: '1' }))).toBe(true);
    });

    it('per-tenant "1" forces on, regardless of global "0"', async () => {
        expect(await isShadowEnabled(TENANT, fakeRedis({
            [GLOBAL_SHADOW_KEY]: '0',
            [tenantShadowKey(TENANT)]: '1',
        }))).toBe(true);
    });

    it('per-tenant "0" forces off, regardless of global "1"', async () => {
        expect(await isShadowEnabled(TENANT, fakeRedis({
            [GLOBAL_SHADOW_KEY]: '1',
            [tenantShadowKey(TENANT)]: '0',
        }))).toBe(false);
    });

    it('returns false on Redis error (fail-closed)', async () => {
        expect(await isShadowEnabled(TENANT, fakeRedis(
            { [GLOBAL_SHADOW_KEY]: '1' },
            { throwOn: [tenantShadowKey(TENANT)] },
        ))).toBe(false);
    });

    it('does not read any p402:tcs:enforce key', async () => {
        // Source-shape pin: confirm via spy that only the two documented
        // keys are queried.
        const r = fakeRedis({});
        await isShadowEnabled(TENANT, r);
        const calls = (r.get as ReturnType<typeof vi.fn>).mock.calls.map((c) => c[0]);
        for (const k of calls) {
            expect(k).not.toMatch(/enforce/);
        }
    });
});
