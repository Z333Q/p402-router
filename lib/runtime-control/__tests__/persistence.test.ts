/**
 * Slice 3AA-Impl — persistShadowDecision writer.
 *
 * Pins:
 *   - default off (Redis flag absent / "0" / read error → no INSERT)
 *   - "1" → one parameterized INSERT
 *   - DB failure → tcs_shadow_persist_failed (error severity); no throw
 *   - source-shape: no p402:tcs:enforce, no message/prompt/content
 *     imports, no Optimize / savings / recommendation / proof /
 *     auto-apply copy
 */

import { describe, it, expect, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve as resolvePath } from 'node:path';

import {
    persistShadowDecision,
    SHADOW_PERSIST_FLAG_KEY,
    type PersistableShadowRecord,
    type PersistenceDependencies,
} from '../persistence';

const SRC = readFileSync(
    resolvePath(process.cwd(), 'lib/runtime-control/persistence.ts'),
    'utf8',
);

const TENANT = '00000000-0000-0000-0000-0000000000aa';

function record(overrides: Partial<PersistableShadowRecord> = {}): PersistableShadowRecord {
    return {
        tenant_id: TENANT,
        request_id: 'req-1',
        axis: 'max_cost_per_request_usd',
        code: 'MAX_COST_PER_REQUEST_EXCEEDED',
        field: 'max_cost_per_request_usd',
        configured_value: 0.0000001,
        observed_value: 0.0000022,
        model_requested: 'openai/gpt-4o',
        enforcement_mode: 'shadow',
        ...overrides,
    };
}

function deps(opts: {
    flag?: string | null;
    redisThrows?: boolean;
    dbThrows?: Error | null;
    logger?: (r: Record<string, unknown>) => void;
} = {}): PersistenceDependencies & {
    dbCalls: Array<{ text: string; params?: unknown[] }>;
    redisCalls: string[];
} {
    const dbCalls: Array<{ text: string; params?: unknown[] }> = [];
    const redisCalls: string[] = [];
    return {
        redis: {
            async get(k: string) {
                redisCalls.push(k);
                if (opts.redisThrows) throw new Error('redis down');
                return opts.flag ?? null;
            },
        },
        db: {
            async query(text: string, params?: unknown[]) {
                dbCalls.push({ text, params });
                if (opts.dbThrows) throw opts.dbThrows;
                return { rows: [] };
            },
        },
        logger: opts.logger,
        dbCalls,
        redisCalls,
    };
}

// ─────────────────────────────────────────────────────────────────────────────
// Default-off behaviour
// ─────────────────────────────────────────────────────────────────────────────

describe('persistShadowDecision — default off', () => {
    it('Redis flag absent → no INSERT', async () => {
        const d = deps({ flag: null });
        await persistShadowDecision(record(), d);
        expect(d.dbCalls.length).toBe(0);
        expect(d.redisCalls).toContain(SHADOW_PERSIST_FLAG_KEY);
    });

    it('Redis flag "0" → no INSERT', async () => {
        const d = deps({ flag: '0' });
        await persistShadowDecision(record(), d);
        expect(d.dbCalls.length).toBe(0);
    });

    it('Redis read throws → no INSERT and no throw', async () => {
        const d = deps({ redisThrows: true });
        await expect(persistShadowDecision(record(), d)).resolves.toBeUndefined();
        expect(d.dbCalls.length).toBe(0);
    });
});

// ─────────────────────────────────────────────────────────────────────────────
// Enabled behaviour
// ─────────────────────────────────────────────────────────────────────────────

describe('persistShadowDecision — enabled', () => {
    it('flag "1" → one parameterized INSERT', async () => {
        const d = deps({ flag: '1' });
        await persistShadowDecision(record(), d);
        expect(d.dbCalls.length).toBe(1);
        const call = d.dbCalls[0]!;
        expect(call.text).toContain('INSERT INTO runtime_control_shadow_decisions');
        // Tenant id is the first parameter.
        expect(call.params?.[0]).toBe(TENANT);
        // 9 bind params total (matches the writer's parameter list).
        expect(call.params?.length).toBe(9);
    });

    it('DB failure emits tcs_shadow_persist_failed and resolves', async () => {
        const events: Record<string, unknown>[] = [];
        const d = deps({
            flag: '1',
            dbThrows: new Error('connection refused'),
            logger: (r) => events.push(r),
        });
        await expect(persistShadowDecision(record(), d)).resolves.toBeUndefined();
        expect(d.dbCalls.length).toBe(1);
        expect(events.length).toBe(1);
        const e = events[0]!;
        expect(e.event).toBe('tcs_shadow_persist_failed');
        expect(e.enforcement_mode).toBe('shadow');
        expect(e.failure_stage).toBe('db_insert');
        expect(typeof e.reason).toBe('string');
    });

    it('writer never throws even when both Redis and DB blow up', async () => {
        const d = deps({ redisThrows: true, dbThrows: new Error('boom') });
        await expect(persistShadowDecision(record(), d)).resolves.toBeUndefined();
    });

    it('default emitter for tcs_shadow_persist_failed routes through console.error', async () => {
        const spy = vi.spyOn(console, 'error').mockImplementation(() => undefined);
        try {
            const d = deps({ flag: '1', dbThrows: new Error('x') });
            // Drop the injected logger so default emitter is exercised.
            (d as unknown as { logger?: unknown }).logger = undefined;
            await persistShadowDecision(record(), d);
            expect(spy).toHaveBeenCalledTimes(1);
            const payload = JSON.parse(spy.mock.calls[0]![0] as string) as Record<string, unknown>;
            expect(payload.event).toBe('tcs_shadow_persist_failed');
        } finally {
            spy.mockRestore();
        }
    });
});

// ─────────────────────────────────────────────────────────────────────────────
// Source-shape regressions
// ─────────────────────────────────────────────────────────────────────────────

describe('persistence.ts source shape', () => {
    it('does not reference p402:tcs:enforce', () => {
        expect(SRC).not.toMatch(/p402:tcs:enforce/);
    });

    it('uses the persistence-specific flag key', () => {
        expect(SRC).toContain('p402:tcs:shadow_persist:enabled');
    });

    it('does not import message/body/content/prompt/response/tool_calls types', () => {
        for (const banned of [
            'messages:', 'prompt:', 'response:', 'tool_calls:', 'raw_trace:',
            'content:', 'ip:', 'user_agent:',
            'optimize', 'savings', 'recommendation', 'auto-apply', 'auto_apply', 'savings_proof',
        ]) {
            expect(SRC.toLowerCase()).not.toContain(banned.toLowerCase());
        }
    });

    it('writer parameterizes the INSERT (no string interpolation of values)', () => {
        // The INSERT must use $1..$N placeholders and JSONB casts for
        // the two JSONB columns.
        expect(SRC).toMatch(/\$1, \$2, \$3,/);
        expect(SRC).toContain('$7::jsonb');
        expect(SRC).toContain('$8::jsonb');
    });
});
