/**
 * Slice 3Z-F — shadow log severity hygiene.
 *
 * Pins:
 *   - tcs_shadow_decision is emitted via console.info
 *   - tcs_shadow_failed   is emitted via console.error
 *   - JSON payload shape is unchanged (event / source / scope /
 *     enforcement_mode / provider_called all preserved)
 *   - No prompt/response/messages content fields appear in either log
 *   - No p402:tcs:enforce key references appear in the source
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve as resolvePath } from 'node:path';

vi.mock('@/lib/control/configuration', async () => ({
    getTenantControlSettings: vi.fn(),
}));

import { getTenantControlSettings } from '@/lib/control/configuration';
import { computeAndEmitShadow, type ShadowDependencies } from '../shadow';
import { tenantShadowKey } from '../kill-switch';
import { configCacheKey } from '../cache';

const TENANT = '00000000-0000-0000-0000-0000000000ff';

function fakeRedis(opts: { map?: Record<string, string | null>; throwOnGet?: string[] } = {}) {
    const map = { ...(opts.map ?? {}) };
    return {
        async get(k: string) {
            if (opts.throwOnGet?.includes(k)) throw new Error('redis get fail');
            return map[k] ?? null;
        },
        async setex(k: string, _ttl: number, v: string) { map[k] = v; return 'OK'; },
        async del(k: string) { delete map[k]; return 1; },
    };
}

function fakeDb() {
    return { query: vi.fn().mockResolvedValue({ rows: [{ sum: '0' }] }) } as unknown as ShadowDependencies['db'];
}

// ─────────────────────────────────────────────────────────────────────────────
// Default-logger severity routing (no injected logger)
// ─────────────────────────────────────────────────────────────────────────────

describe('3Z-F — default logger routes by severity', () => {
    let infoSpy: ReturnType<typeof vi.spyOn>;
    let errorSpy: ReturnType<typeof vi.spyOn>;

    beforeEach(() => {
        infoSpy  = vi.spyOn(console, 'info').mockImplementation(() => undefined);
        errorSpy = vi.spyOn(console, 'error').mockImplementation(() => undefined);
        vi.mocked(getTenantControlSettings).mockReset();
    });

    afterEach(() => {
        infoSpy.mockRestore();
        errorSpy.mockRestore();
    });

    it('tcs_shadow_decision goes to console.info', async () => {
        vi.mocked(getTenantControlSettings).mockResolvedValue({
            monthly_budget_usd:         null,
            max_cost_per_request_usd:   0.001,
            human_review_threshold_usd: null,
            allowed_models:             [],
            allowed_task_types:         [],
            source:                     'tenant_default',
            metadata:                   {},
        });
        const redis = fakeRedis({ map: { [tenantShadowKey(TENANT)]: '1' } });

        await computeAndEmitShadow(
            { tenantId: TENANT, requestId: 'req-info', estimatedCostUsd: 0.5, modelRequested: 'openai/gpt-4o' },
            { redis, db: fakeDb() },
        );

        expect(infoSpy).toHaveBeenCalledTimes(1);
        expect(errorSpy).not.toHaveBeenCalled();
        const payload = JSON.parse(infoSpy.mock.calls[0]![0] as string);
        expect(payload.event).toBe('tcs_shadow_decision');
        expect(payload.source).toBe('tenant_default');
        expect(payload.scope).toBe('tenant');
        expect(payload.enforcement_mode).toBe('shadow');
        expect(payload.provider_called).toBe(true);
        expect(payload.would_have_denied).toBe(true);
    });

    it('tcs_shadow_failed goes to console.error', async () => {
        // Shadow enabled at kill-switch → then force the config read to
        // throw by mocking getTenantControlSettings. The shadow path
        // catches and emits a `tcs_shadow_failed` record at the
        // `config_read` stage.
        vi.mocked(getTenantControlSettings).mockRejectedValue(new Error('forced config fail'));
        const redis = fakeRedis({
            map: {
                [tenantShadowKey(TENANT)]: '1',
                // Force a cache miss so we hit getTenantControlSettings:
                [configCacheKey(TENANT)]: null,
            },
        });

        await computeAndEmitShadow(
            { tenantId: TENANT, requestId: 'req-err', estimatedCostUsd: 0.5, modelRequested: 'openai/gpt-4o' },
            { redis, db: fakeDb() },
        );

        expect(errorSpy).toHaveBeenCalledTimes(1);
        expect(infoSpy).not.toHaveBeenCalled();
        const payload = JSON.parse(errorSpy.mock.calls[0]![0] as string);
        expect(payload.event).toBe('tcs_shadow_failed');
        expect(payload.enforcement_mode).toBe('shadow');
        expect(payload.failure_stage).toBe('config_read');
    });
});

// ─────────────────────────────────────────────────────────────────────────────
// Source-shape regressions
// ─────────────────────────────────────────────────────────────────────────────

describe('3Z-F — shadow.ts source shape', () => {
    const SRC = readFileSync(resolvePath(process.cwd(), 'lib/runtime-control/shadow.ts'), 'utf8');

    it('uses console.info for the decision event', () => {
        expect(SRC).toMatch(/console\.info\(/);
    });

    it('uses console.error for non-decision events (failure path)', () => {
        expect(SRC).toMatch(/console\.error\(/);
    });

    it('JSON payload keys for the decision event are unchanged', () => {
        for (const k of [
            "event:",
            "tenant_id:",
            "request_id:",
            "axis,",
            "code:",
            "source:",
            "scope:",
            "field:",
            "configured_value:",
            "observed_value:",
            "would_have_denied:",
            "enforcement_mode:",
            "provider_called:",
            "timestamp:",
        ]) {
            expect(SRC).toContain(k);
        }
    });

    it('does not reference p402:tcs:enforce', () => {
        expect(SRC).not.toMatch(/p402:tcs:enforce/);
    });

    it('does not log prompt / response / messages / raw_trace content', () => {
        for (const banned of [
            'prompt:', 'response:', 'messages:', 'raw_trace:', 'content:',
            'optimize', 'savings', 'recommendation',
        ]) {
            expect(SRC.toLowerCase()).not.toContain(banned.toLowerCase());
        }
    });
});
