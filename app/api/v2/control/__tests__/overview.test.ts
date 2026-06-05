/**
 * Slice 3B — Route test for GET /api/v2/control/overview.
 *
 * Validates:
 *   - tenant scoping (every panel query receives the resolved tenantId)
 *   - default-period guarantee (since/until materialized when omitted)
 *   - empty-tenant state (request counts/spend = 0)
 *   - privacy_note copy (metadata-only posture)
 *   - filter pushdown
 */

import { NextRequest } from 'next/server';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { GET } from '@/app/api/v2/control/overview/route';
import db from '@/lib/db';

const TENANT = '22222222-2222-2222-2222-222222222222';

let querySpy: ReturnType<typeof vi.spyOn>;

beforeEach(() => {
    querySpy = vi.spyOn(db as unknown as { query: (...args: unknown[]) => unknown }, 'query');
});

afterEach(() => {
    querySpy.mockReset();
});

/**
 * Returns enough mocked rows for one full GET. The route fires 12 queries:
 *   1 api_key burn, 1 dept burn, 1 emp burn, 1 workflow burn,
 *   2 allowlist (models + task_types),
 *   2 max-cost (keys + over-cap),
 *   2 policy-denied (totals + breakdown),
 *   1 human review, 1 control coverage.
 */
function mockEmptyOverview() {
    const rows: Array<Record<string, unknown>[]> = [
        [],  // api_key burn
        [],  // dept burn
        [],  // emp burn
        [],  // workflow burn
        [],  // allowlist models
        [],  // allowlist task_types
        [{ keys_with_cap: 0, keys_without_cap: 0 }],
        [{ over_cap_events: 0, over_cap_spend_usd: 0 }],
        [{ total_events: 0, denied_events: 0, denied_spend_usd: 0 }],
        [],  // denied breakdown
        [{ required: 0, pending: 0, approved: 0, rejected: 0, escalated: 0, expired: 0 }],
        [{ total_events: 0, with_any: 0, has_policy: 0, has_budget: 0, has_mandate: 0, has_decision: 0, has_deny: 0 }],
    ];
    for (const r of rows) {
        querySpy.mockResolvedValueOnce({ rows: r } as never);
    }
}

function req(url: string): NextRequest {
    return new NextRequest(url, { headers: { 'x-p402-tenant': TENANT } });
}

describe('GET /api/v2/control/overview', () => {
    it('returns the panel envelope with metadata-only privacy_note', async () => {
        mockEmptyOverview();
        const res = await GET(req(`http://x/api/v2/control/overview`));
        expect(res.status).toBe(200);
        const body = await res.json();
        expect(body.privacy_note).toMatch(/metadata fields only/);
        expect(body.budget_burn).toEqual({
            api_keys: [], departments: [], employees: [], workflows: [],
        });
        expect(body.allowlist).toEqual({ models: [], task_types: [] });
        expect(body.policy_denied_spend.denied_events).toBe(0);
        expect(body.control_coverage.total_events).toBe(0);
    });

    it('every panel query is tenant-scoped', async () => {
        mockEmptyOverview();
        await GET(req(`http://x/api/v2/control/overview`));
        for (const call of querySpy.mock.calls) {
            const params = call[1] as unknown[];
            expect(params[0]).toBe(TENANT);
        }
    });

    it('with no since/until, defaults to a real 30-day period (never empty strings)', async () => {
        mockEmptyOverview();
        const before = Date.now();
        const res = await GET(req(`http://x/api/v2/control/overview`));
        const after = Date.now();
        expect(res.status).toBe(200);
        const body = await res.json();

        expect(body.period.since).toMatch(/^\d{4}-\d{2}-\d{2}T/);
        expect(body.period.until).toMatch(/^\d{4}-\d{2}-\d{2}T/);
        expect(body.period.since).not.toBe('');
        expect(body.period.until).not.toBe('');
        expect(body.period.window_days).toBe(30);

        const sinceMs = Date.parse(body.period.since);
        const untilMs = Date.parse(body.period.until);
        expect(untilMs - sinceMs).toBeCloseTo(30 * 24 * 60 * 60 * 1000, -3);
        expect(untilMs).toBeGreaterThanOrEqual(before);
        expect(untilMs).toBeLessThanOrEqual(after);

        expect(body.filters_applied.since).toBe(body.period.since);
        expect(body.filters_applied.until).toBe(body.period.until);
    });

    it('pushes attribution filters into the query parameters', async () => {
        mockEmptyOverview();
        const res = await GET(req(`http://x/api/v2/control/overview?department_id=eng&provider=openrouter`));
        expect(res.status).toBe(200);
        // Only the windowed panels carry attribution filters (budget burn is
        // MTD-only). Find at least one query that received both.
        const hits = querySpy.mock.calls.filter((c: unknown[]) => {
            const params = c[1] as unknown[];
            return params.includes('eng') && params.includes('openrouter');
        });
        expect(hits.length).toBeGreaterThan(0);
    });
});
