/**
 * Slice 3A — Route test for GET /api/v2/monitor/overview.
 *
 * Uses the global `requireTenantAccess` mock from __tests__/setup.ts. Validates:
 *   - tenant scoping (every aggregation query receives the resolved tenantId)
 *   - filter pushdown via query string
 *   - empty-tenant state returns request_count=0
 *   - privacy_note copy is present (metadata-only posture)
 */

import { NextRequest } from 'next/server';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { GET } from '@/app/api/v2/monitor/overview/route';
import db from '@/lib/db';

const TENANT = '22222222-2222-2222-2222-222222222222';

// Re-installed each test because the global afterEach in __tests__/setup.ts
// calls vi.restoreAllMocks(), which would restore db.query back to the real
// Pool implementation between tests.
let querySpy: ReturnType<typeof vi.spyOn>;

beforeEach(() => {
    querySpy = vi.spyOn(db as unknown as { query: (...args: unknown[]) => unknown }, 'query');
});

afterEach(() => {
    querySpy.mockReset();
});

function mockPoolReturning(rows: Record<string, unknown>[][]) {
    for (const r of rows) {
        querySpy.mockResolvedValueOnce({ rows: r } as never);
    }
    return { expected: rows.length };
}

function req(url: string): NextRequest {
    return new NextRequest(url, { headers: { 'x-p402-tenant': TENANT } });
}

describe('GET /api/v2/monitor/overview', () => {
    it('returns the panel envelope with metadata-only privacy_note', async () => {
        // Order matches the Promise.all in the route: totals, 5x group spend,
        // provider/model, coverage, privacy distribution, outcome panels.
        mockPoolReturning([
            // totals
            [{
                spend_usd: 1.23, request_count: 10, total_tokens: 5000, avg_latency_ms: 200,
                success_col_total: 10, success_col_true: 9,
                status_code_total: 0, status_code_success: 0,
                output_status_total: 0, output_status_success: 0,
            }],
            [],  // spend_by_department
            [],  // spend_by_employee
            [],  // spend_by_workflow
            [],  // spend_by_customer
            [],  // spend_by_feature
            [],  // spend_by_provider_model
            // coverage
            [{
                total: 10, with_evidence: 4,
                has_department: 8, has_employee: 5, has_workflow: 7, has_customer: 3, has_feature: 2,
            }],
            [{ privacy_mode: 'metadata_only', count: 10 }],  // privacy distribution
            // outcome panels
            [{ total_events: 10, events_with_outcome: 0, accepted_count: 0, accepted_cost: 0 }],
        ]);

        const res = await GET(req(`http://x/api/v2/monitor/overview`));
        expect(res.status).toBe(200);
        const body = await res.json();
        expect(body.totals.request_count).toBe(10);
        expect(body.totals.success_rate_source).toBe('success_column');
        expect(body.evidence_coverage.with_evidence_bundle_pct).toBe(40);
        expect(body.cost_per_accepted_output.status).toBe('insufficient_outcome_data');
        expect(body.privacy_mode_distribution).toEqual([
            { privacy_mode: 'metadata_only', count: 10, pct: 100 },
        ]);
        expect(body.privacy_note).toMatch(/metadata fields only/);
        // Every aggregation must have used the resolved tenant id as $1.
        for (const call of querySpy.mock.calls) {
            const params = call[1] as unknown[];
            expect(params[0]).toBe(TENANT);
        }
    });

    it('pushes attribution filters into the query parameters', async () => {
        // 10 queries, return empty rows for all
        mockPoolReturning([
            [{ spend_usd: 0, request_count: 0, total_tokens: 0, avg_latency_ms: null,
               success_col_total: 0, success_col_true: 0,
               status_code_total: 0, status_code_success: 0,
               output_status_total: 0, output_status_success: 0 }],
            [], [], [], [], [], [],
            [{ total: 0, with_evidence: 0, has_department: 0, has_employee: 0,
               has_workflow: 0, has_customer: 0, has_feature: 0 }],
            [],
            [{ total_events: 0, events_with_outcome: 0, accepted_count: 0, accepted_cost: 0 }],
        ]);

        const res = await GET(req(
            `http://x/api/v2/monitor/overview?department_id=eng&provider=openrouter`,
        ));
        expect(res.status).toBe(200);

        // Every query should have received the two attribution filters as extra
        // params after [tenantId, since, until].
        for (const call of querySpy.mock.calls) {
            const params = call[1] as unknown[];
            expect(params).toContain('eng');
            expect(params).toContain('openrouter');
        }
    });

    it('with no since/until, defaults to a real 30-day period (never empty strings)', async () => {
        mockPoolReturning([
            [{ spend_usd: 0, request_count: 0, total_tokens: 0, avg_latency_ms: null,
               success_col_total: 0, success_col_true: 0,
               status_code_total: 0, status_code_success: 0,
               output_status_total: 0, output_status_success: 0 }],
            [], [], [], [], [], [],
            [{ total: 0, with_evidence: 0, has_department: 0, has_employee: 0,
               has_workflow: 0, has_customer: 0, has_feature: 0 }],
            [],
            [{ total_events: 0, events_with_outcome: 0, accepted_count: 0, accepted_cost: 0 }],
        ]);

        const before = Date.now();
        const res = await GET(req(`http://x/api/v2/monitor/overview`));
        const after = Date.now();
        expect(res.status).toBe(200);
        const body = await res.json();

        // Period is always materialized — never empty strings.
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

        // Filters echoed back also carry the materialized window (not '').
        expect(body.filters_applied.since).toBe(body.period.since);
        expect(body.filters_applied.until).toBe(body.period.until);

        // The aggregation layer must have received the same window as $2/$3.
        for (const call of querySpy.mock.calls) {
            const params = call[1] as unknown[];
            expect(params[0]).toBe(TENANT);
            expect(params[1]).toBe(body.period.since);
            expect(params[2]).toBe(body.period.until);
        }
    });

    it('returns empty-tenant state (request_count=0) when there are no events', async () => {
        mockPoolReturning([
            [{ spend_usd: 0, request_count: 0, total_tokens: 0, avg_latency_ms: null,
               success_col_total: 0, success_col_true: 0,
               status_code_total: 0, status_code_success: 0,
               output_status_total: 0, output_status_success: 0 }],
            [], [], [], [], [], [],
            [{ total: 0, with_evidence: 0, has_department: 0, has_employee: 0,
               has_workflow: 0, has_customer: 0, has_feature: 0 }],
            [],
            [{ total_events: 0, events_with_outcome: 0, accepted_count: 0, accepted_cost: 0 }],
        ]);

        const res = await GET(req(`http://x/api/v2/monitor/overview`));
        expect(res.status).toBe(200);
        const body = await res.json();
        expect(body.totals.request_count).toBe(0);
        expect(body.totals.success_rate_available).toBe(false);
        expect(body.evidence_coverage.with_evidence_bundle).toBe(0);
        expect(body.attribution_completeness.total_events).toBe(0);
        expect(body.cost_per_accepted_output.status).toBe('insufficient_outcome_data');
        expect(body.privacy_note).toMatch(/metadata fields only/);
    });
});
