/**
 * Slice 3D — Route test for GET /api/v2/control/flip-readiness.
 *
 * Pins the payment-protocol invariants at the HTTP boundary:
 *   - tenant scoping enforced on every loader query
 *   - read-only (no INSERT/UPDATE/DELETE issued)
 *   - returns an assessment with status in the documented set
 *   - fail-closed: loader error → blocked
 *   - default thresholds + denied-write-path-required posture: with
 *     empty data the route must return either blocked or not_ready,
 *     never ready_to_flip
 */

import { NextRequest } from 'next/server';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { GET } from '@/app/api/v2/control/flip-readiness/route';
import db from '@/lib/db';

const TENANT = '22222222-2222-2222-2222-222222222222';

let querySpy: ReturnType<typeof vi.spyOn>;

beforeEach(() => {
    querySpy = vi.spyOn(db as unknown as { query: (...args: unknown[]) => unknown }, 'query');
    // Sanitize any env that the loader inspects so tests are deterministic.
    delete process.env.AEE_DENIED_WRITE_PATH;
    delete process.env.AEE_DENIED_WRITE_PATH_CODE_PRESENT;
    delete process.env.AEE_DENIED_WRITE_PATH_TEST_PROVEN;
    delete process.env.FLIP_REQUIRE_BILLING_CYCLE;
    delete process.env.FLIP_REQUIRE_DENIED_WRITE_PATH;
});

afterEach(() => {
    querySpy.mockReset();
});

/**
 * Empty-tenant baseline. Every query returns a benign empty result. The
 * route should not crash and the loader should produce a fully-populated
 * AssessmentInput.
 *
 * Query order set by Promise.all in loadAssessmentInput. Sufficient to mock
 * a default resolver that handles any incoming query shape.
 */
function mockEmptyLoaderHappyPath() {
    querySpy.mockImplementation(async (sql: string) => {
        if (/FROM traffic_events\s+WHERE/i.test(sql) && /path = '\/api\/v2\/chat\/completions'/i.test(sql)) {
            return { rows: [{ count: 0 }] };
        }
        if (/FROM ai_economic_events\s+WHERE.*source = 'chat_completions'/is.test(sql)) {
            return { rows: [{ count: 0 }] };
        }
        if (/economic_event_write_failures/i.test(sql) && /pending/i.test(sql)) {
            return { rows: [{ pending: 0, abandoned: 0, oldest_pending: null }] };
        }
        if (/economic_event_write_failures/i.test(sql) && /recent_failures/i.test(sql)) {
            return { rows: [{ recent_failures: 0 }] };
        }
        if (/information_schema\.table_constraints/i.test(sql)) {
            return { rows: [{}] };
        }
        if (/information_schema\.columns/i.test(sql)) {
            return {
                rows: [
                    { column_name: 'tenant_id' },
                    { column_name: 'api_key_id' },
                    { column_name: 'request_id' },
                    { column_name: 'route' },
                    { column_name: 'governance_decision' },
                    { column_name: 'budget_id' },
                    { column_name: 'deny_code' },
                    { column_name: 'event_time' },
                ],
            };
        }
        // Worst-bucket delta queries: empty bucket set.
        return { rows: [] };
    });
}

function req(url: string): NextRequest {
    return new NextRequest(url, { headers: { 'x-p402-tenant': TENANT } });
}

describe('GET /api/v2/control/flip-readiness', () => {
    it('returns 200 with an assessment envelope', async () => {
        mockEmptyLoaderHappyPath();
        const res = await GET(req('http://x/api/v2/control/flip-readiness'));
        expect(res.status).toBe(200);
        const body = await res.json();
        expect(body).toHaveProperty('status');
        expect(['ready_to_flip', 'observing', 'not_ready', 'blocked']).toContain(body.status);
        expect(body).toHaveProperty('thresholds');
        expect(body).toHaveProperty('criteria');
        expect(Array.isArray(body.criteria)).toBe(true);
    });

    it('blocked by default in an empty/un-instrumented tenant (denied write path not implemented)', async () => {
        mockEmptyLoaderHappyPath();
        const res = await GET(req('http://x/api/v2/control/flip-readiness'));
        const body = await res.json();
        // No AEE_* env flags set + no health data → denied write path is
        // not implemented → blocked. This proves the gate fails closed
        // for a vanilla tenant.
        expect(body.status).toBe('blocked');
        expect(body.reason).toBe('denied_event_write_path_not_implemented');
    });

    it('fail-closed: any loader query throwing returns blocked, not 500', async () => {
        querySpy.mockImplementation(async () => {
            throw new Error('connection refused');
        });
        const res = await GET(req('http://x/api/v2/control/flip-readiness'));
        expect(res.status).toBe(200);
        const body = await res.json();
        expect(body.status).toBe('blocked');
        expect(body.reason).toMatch(/loader_exception|tenant/);
    });

    it('issues only read queries (no INSERT/UPDATE/DELETE)', async () => {
        mockEmptyLoaderHappyPath();
        await GET(req('http://x/api/v2/control/flip-readiness'));
        const sqls = (querySpy.mock.calls as Array<[string, unknown[]?]>).map((c) => String(c[0]));
        for (const sql of sqls) {
            expect(sql).not.toMatch(/^\s*INSERT\b/i);
            expect(sql).not.toMatch(/^\s*UPDATE\b/i);
            expect(sql).not.toMatch(/^\s*DELETE\b/i);
        }
    });

    it('every query that touches tenant data uses tenant_id binding', async () => {
        mockEmptyLoaderHappyPath();
        await GET(req('http://x/api/v2/control/flip-readiness'));
        const calls = querySpy.mock.calls as Array<[string, unknown[]?]>;
        for (const [sql, params] of calls) {
            if (/information_schema/i.test(sql)) continue; // no tenant scope
            expect(sql).toMatch(/tenant_id\s*=\s*\$1/);
            expect(params?.[0]).toBe(TENANT);
        }
    });
});
