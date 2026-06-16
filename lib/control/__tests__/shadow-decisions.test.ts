/**
 * Slice 3AA-Impl — shadow-decisions read aggregator.
 *
 * Pins:
 *   - every query carries `WHERE tenant_id = $1`
 *   - undefined_table (42P01) surfaces as migration_pending=true
 *   - aggregations shape matches the fixture
 *   - window clamped at MAX_WINDOW_DAYS
 *   - source-shape: no p402:tcs:enforce; no Optimize / savings / etc.
 */

import { describe, it, expect, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve as resolvePath } from 'node:path';

import {
    getShadowDecisionsByAxis,
    getShadowDecisionsByCode,
    getRecentShadowDecisions,
    getShadowDecisionsSummary,
    MAX_WINDOW_DAYS,
} from '../shadow-decisions';

const SRC = readFileSync(
    resolvePath(process.cwd(), 'lib/control/shadow-decisions.ts'),
    'utf8',
);

const TENANT_A = '00000000-0000-0000-0000-00000000aaaa';
const TENANT_B = '00000000-0000-0000-0000-00000000bbbb';

function dbFromFixture(rowsByQuery: Record<string, Array<Record<string, unknown>>>) {
    const calls: Array<{ text: string; params?: unknown[] }> = [];
    return {
        calls,
        async query(text: string, params?: unknown[]) {
            calls.push({ text, params });
            const key = Object.keys(rowsByQuery).find((k) => text.includes(k));
            return { rows: key ? rowsByQuery[key]! : [] };
        },
    };
}

// ─────────────────────────────────────────────────────────────────────────────
// Tenant scoping
// ─────────────────────────────────────────────────────────────────────────────

describe('shadow-decisions — tenant scoping', () => {
    it('byAxis: WHERE tenant_id = $1 is present', async () => {
        const db = dbFromFixture({ 'FROM runtime_control_shadow_decisions': [] });
        await getShadowDecisionsByAxis(TENANT_A, new Date(0), new Date(1), db);
        expect(db.calls[0]!.text).toMatch(/WHERE tenant_id = \$1/);
        expect(db.calls[0]!.params?.[0]).toBe(TENANT_A);
    });

    it('byCode: WHERE tenant_id = $1 is present', async () => {
        const db = dbFromFixture({ 'FROM runtime_control_shadow_decisions': [] });
        await getShadowDecisionsByCode(TENANT_A, new Date(0), new Date(1), db);
        expect(db.calls[0]!.text).toMatch(/WHERE tenant_id = \$1/);
        expect(db.calls[0]!.params?.[0]).toBe(TENANT_A);
    });

    it('recent: WHERE tenant_id = $1 is present', async () => {
        const db = dbFromFixture({ 'FROM runtime_control_shadow_decisions': [] });
        await getRecentShadowDecisions(TENANT_A, 50, db);
        expect(db.calls[0]!.text).toMatch(/WHERE tenant_id = \$1/);
        expect(db.calls[0]!.params?.[0]).toBe(TENANT_A);
    });

    it('a row written for tenant A is invisible to tenant B (DB layer responsibility, pinned via query shape)', async () => {
        const db = {
            calls: [] as Array<{ text: string; params?: unknown[] }>,
            async query(text: string, params?: unknown[]) {
                db.calls.push({ text, params });
                // Simulate a DB that filters strictly by params[0].
                if (params?.[0] === TENANT_A) {
                    return { rows: [{ code: 'MODEL_NOT_ALLOWED', n: 3 }] };
                }
                return { rows: [] };
            },
        };
        const a = await getShadowDecisionsByCode(TENANT_A, new Date(0), new Date(), db);
        const b = await getShadowDecisionsByCode(TENANT_B, new Date(0), new Date(), db);
        expect(a.length).toBe(1);
        expect(b.length).toBe(0);
    });
});

// ─────────────────────────────────────────────────────────────────────────────
// Migration-pending handling
// ─────────────────────────────────────────────────────────────────────────────

describe('shadow-decisions — migration_pending fallback', () => {
    function missingRelationError(): Error {
        const e = new Error('relation "runtime_control_shadow_decisions" does not exist') as Error & { code?: string };
        e.code = '42P01';
        return e;
    }

    it('summary tolerates missing table and returns empty arrays', async () => {
        const db = {
            async query(_text: string, _params?: unknown[]) {
                throw missingRelationError();
            },
        };
        const s = await getShadowDecisionsSummary(TENANT_A, undefined, undefined, db);
        expect(s.migration_pending).toBe(true);
        expect(s.byAxis).toEqual([]);
        expect(s.byCode).toEqual([]);
        expect(s.topGaps).toEqual([]);
        expect(s.recent).toEqual([]);
    });

    it('matches missing-table by message text too (no SQLSTATE)', async () => {
        const db = {
            async query(_text: string, _params?: unknown[]) {
                throw new Error('relation runtime_control_shadow_decisions does not exist');
            },
        };
        const s = await getShadowDecisionsSummary(TENANT_A, undefined, undefined, db);
        expect(s.migration_pending).toBe(true);
    });

    it('unrelated DB error still throws', async () => {
        const db = {
            async query(_text: string, _params?: unknown[]) {
                throw new Error('connection refused');
            },
        };
        await expect(
            getShadowDecisionsSummary(TENANT_A, undefined, undefined, db),
        ).rejects.toThrow(/connection refused/);
    });
});

// ─────────────────────────────────────────────────────────────────────────────
// Aggregations + window clamp
// ─────────────────────────────────────────────────────────────────────────────

describe('shadow-decisions — aggregations + window', () => {
    it('byAxis maps rows to AxisHourBucket shape', async () => {
        const hour = new Date('2026-06-15T10:00:00Z');
        const db = dbFromFixture({
            'FROM runtime_control_shadow_decisions': [
                { axis: 'max_cost_per_request_usd', hour, n: 4 },
                { axis: 'allowed_models', hour, n: 1 },
            ],
        });
        const out = await getShadowDecisionsByAxis(TENANT_A, new Date(0), new Date(), db);
        expect(out).toEqual([
            { axis: 'max_cost_per_request_usd', hour: hour.toISOString(), n: 4 },
            { axis: 'allowed_models', hour: hour.toISOString(), n: 1 },
        ]);
    });

    it('window clamps to MAX_WINDOW_DAYS', async () => {
        const db = dbFromFixture({ 'FROM runtime_control_shadow_decisions': [] });
        const until = new Date('2026-06-15T00:00:00Z');
        const farPast = new Date('2025-01-01T00:00:00Z');
        const s = await getShadowDecisionsSummary(TENANT_A, farPast, until, db);
        const sinceMs = Date.parse(s.window.since);
        const expectedMs = until.getTime() - MAX_WINDOW_DAYS * 24 * 60 * 60 * 1000;
        expect(sinceMs).toBe(expectedMs);
    });
});

// ─────────────────────────────────────────────────────────────────────────────
// Source-shape regressions
// ─────────────────────────────────────────────────────────────────────────────

describe('shadow-decisions.ts source shape', () => {
    it('does not reference p402:tcs:enforce', () => {
        expect(SRC).not.toMatch(/p402:tcs:enforce/);
    });

    it('does not contain Optimize / savings / recommendation / auto-apply copy', () => {
        for (const banned of [
            'optimize', 'savings', 'recommendation', 'auto-apply', 'auto_apply', 'savings_proof',
        ]) {
            expect(SRC.toLowerCase()).not.toContain(banned.toLowerCase());
        }
    });

    it('every SELECT carries WHERE tenant_id = $1', () => {
        const selects = SRC.split('SELECT').slice(1);
        for (const seg of selects) {
            // Until the next ';' or end-of-segment, there must be a tenant filter.
            const chunk = seg.split(';')[0]!;
            expect(chunk).toMatch(/WHERE tenant_id = \$1/);
        }
    });
});
