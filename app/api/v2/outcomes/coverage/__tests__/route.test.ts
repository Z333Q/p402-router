/**
 * Slice 3K — /api/v2/outcomes/coverage tests.
 *
 *   - tenant-scoped on every aggregation
 *   - read-only
 *   - response shape covers verdict + totals + segments + matrix +
 *     leaderboard + disclaimers
 *   - no content-bearing columns referenced in any query
 *   - LEFT JOIN against request_outcomes, status normalization via CASE
 *   - cost-per-accepted-output withheld when thresholds not met
 *   - segment readiness statuses derive from the same thresholds as the
 *     top-level verdict
 *   - response contains NO recommendation / savings fields
 */

import { NextRequest } from 'next/server';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { GET } from '@/app/api/v2/outcomes/coverage/route';
import db from '@/lib/db';

const TENANT = 'dddddddd-dddd-dddd-dddd-dddddddddddd';

let querySpy: ReturnType<typeof vi.spyOn>;

beforeEach(() => {
    querySpy = vi.spyOn(db as unknown as { query: (...args: unknown[]) => unknown }, 'query');
    // Force the same since/until math as the route by clearing thresholds env.
    delete process.env.OUTCOME_MIN_COVERAGE_PCT;
    delete process.env.OUTCOME_MIN_ACCEPTED_COUNT;
    delete process.env.OUTCOME_MIN_BASELINE_DAYS;
});
afterEach(() => querySpy.mockReset());

function req(qs = ''): NextRequest {
    return new NextRequest(`http://x/api/v2/outcomes/coverage${qs ? `?${qs}` : ''}`, {
        headers: { 'x-p402-tenant': TENANT },
    });
}

function mockEmpty() {
    querySpy.mockImplementation(async (sql: string) => {
        if (/WITH base AS/i.test(sql) && /events_with_outcome/i.test(sql) && /accepted_count/i.test(sql) && !/UNION ALL/i.test(sql)) {
            // Fetch-totals query
            return { rows: [{
                total_events: 0, events_with_outcome: 0,
                accepted_count: 0, rejected_count: 0, revised_count: 0,
                escalated_count: 0, failed_count: 0, pending_review_count: 0, unknown_count: 0,
                total_spend_usd: 0, accepted_spend_usd: 0,
                most_recent_outcome_at: null,
            }] };
        }
        // Segment + provider/model + leaderboard queries return empty.
        return { rows: [] };
    });
}

// ────────────────────────────────────────────────────────────────────────
// Response shape
// ────────────────────────────────────────────────────────────────────────

describe('GET /api/v2/outcomes/coverage — response shape', () => {
    it('returns the full readiness envelope', async () => {
        mockEmpty();
        const res = await GET(req());
        expect(res.status).toBe(200);
        const body = await res.json();
        for (const k of [
            'ok','generated_at','filters_applied','thresholds','readiness',
            'totals','segments','provider_model_matrix','missing_outcome_leaderboard',
            'disclaimers',
        ]) {
            expect(body).toHaveProperty(k);
        }
        expect(body.segments).toHaveProperty('by_department');
        expect(body.segments).toHaveProperty('by_workflow');
        expect(body.segments).toHaveProperty('by_customer');
        expect(body.segments).toHaveProperty('by_feature');
        expect(body.disclaimers).toEqual({
            readiness_not_recommendation: true,
            no_savings_claim: true,
            content_displayed: false,
        });
    });

    it('empty tenant yields blocked verdict (no events)', async () => {
        mockEmpty();
        const body = await (await GET(req())).json();
        expect(body.readiness.status).toBe('blocked');
        expect(body.readiness.reason).toBe('no_events');
        expect(body.totals.total_events).toBe(0);
        expect(body.totals.cost_per_accepted_output_usd).toBeNull();
        expect(body.totals.cost_per_accepted_insufficient_data).toBe(true);
    });

    it('response contains NO recommendation / savings / route-change fields', async () => {
        mockEmpty();
        const body = await (await GET(req())).json();
        const json = JSON.stringify(body).toLowerCase();
        for (const forbidden of [
            'savings_usd', 'recommended_provider', 'recommended_model',
            'route_change', 'switch_to', 'projected_savings', 'optimization_action',
        ]) {
            expect(json).not.toContain(forbidden);
        }
    });
});

// ────────────────────────────────────────────────────────────────────────
// Tenant scope + read-only + content exclusion
// ────────────────────────────────────────────────────────────────────────

describe('Read-only + tenant scope', () => {
    it('issues only SELECTs and binds tenant_id = $1 on every aggregate', async () => {
        mockEmpty();
        await GET(req());
        const calls = querySpy.mock.calls as Array<[string, unknown[]?]>;
        expect(calls.length).toBeGreaterThan(0);
        for (const [sql, params] of calls) {
            expect(sql).toMatch(/^\s*(SELECT|WITH)/i);
            expect(sql).not.toMatch(/\bINSERT\b/i);
            expect(sql).not.toMatch(/\bUPDATE\b/i);
            expect(sql).not.toMatch(/\bDELETE\b/i);
            expect(sql).not.toMatch(/\bON\s+CONFLICT\b/i);
            // tenant_id = $1 on aliased ai_economic_events.
            expect(sql).toMatch(/(e\.tenant_id|\btenant_id)\s*=\s*\$1/i);
            expect(params?.[0]).toBe(TENANT);
        }
    });

    it('LEFT JOINs against request_outcomes with tenant_id = e.tenant_id', async () => {
        mockEmpty();
        await GET(req());
        const totalsSql = String((querySpy.mock.calls[0]! as [string])[0]);
        expect(totalsSql).toMatch(/LEFT JOIN\s+request_outcomes\s+o/i);
        expect(totalsSql).toMatch(/o\.tenant_id\s*=\s*e\.tenant_id/i);
        expect(totalsSql).toMatch(/o\.request_id\s*=\s*e\.request_id/i);
    });

    it('normalizes legacy outcome statuses in SQL (retried -> revised, human_reviewed -> accepted)', async () => {
        mockEmpty();
        await GET(req());
        const totalsSql = String((querySpy.mock.calls[0]! as [string])[0]);
        expect(totalsSql).toMatch(/WHEN\s+'retried'\s+THEN\s+'revised'/i);
        expect(totalsSql).toMatch(/WHEN\s+'human_reviewed'\s+THEN\s+'accepted'/i);
    });

    it('no query references content-bearing columns', async () => {
        mockEmpty();
        await GET(req());
        for (const [sql] of querySpy.mock.calls as Array<[string]>) {
            const s = String(sql).toLowerCase();
            for (const re of [
                /\bprompt_fingerprint\b/, /\bresponse_fingerprint\b/,
                /\bprompt_text\b/, /\bresponse_text\b/,
                /\bresponse_body\b/, /\brequest_body\b/,
                /\bmessages\b/, /\bcompletion\b/, /\bcontent\b/, /\btranscript\b/,
            ]) {
                expect(s).not.toMatch(re);
            }
        }
    });
});

// ────────────────────────────────────────────────────────────────────────
// Threshold-driven cost-per-accepted-output
// ────────────────────────────────────────────────────────────────────────

describe('cost-per-accepted-output gating', () => {
    it('reports cost-per-accepted when coverage AND accepted count both meet thresholds', async () => {
        querySpy.mockImplementation(async (sql: string) => {
            if (/WITH base AS/i.test(sql) && /accepted_count/i.test(sql) && !/UNION ALL/i.test(sql)) {
                return { rows: [{
                    total_events: 1000, events_with_outcome: 500,
                    accepted_count: 100, rejected_count: 50, revised_count: 0,
                    escalated_count: 0, failed_count: 0, pending_review_count: 0, unknown_count: 0,
                    total_spend_usd: 200, accepted_spend_usd: 50,
                    most_recent_outcome_at: new Date(),
                }] };
            }
            return { rows: [] };
        });
        const body = await (await GET(req())).json();
        expect(body.totals.cost_per_accepted_insufficient_data).toBe(false);
        expect(body.totals.cost_per_accepted_output_usd).toBeCloseTo(0.5, 4); // 50/100
        // Coverage 50% met (min 20), accepted 100 met (min 30); window default 30d met -> ready
        expect(body.readiness.status).toBe('ready_for_optimize_analysis');
    });

    it('withholds cost-per-accepted when accepted count is below threshold', async () => {
        querySpy.mockImplementation(async (sql: string) => {
            if (/WITH base AS/i.test(sql) && /accepted_count/i.test(sql) && !/UNION ALL/i.test(sql)) {
                return { rows: [{
                    total_events: 1000, events_with_outcome: 500,
                    accepted_count: 5, rejected_count: 0, revised_count: 0,
                    escalated_count: 0, failed_count: 0, pending_review_count: 0, unknown_count: 0,
                    total_spend_usd: 200, accepted_spend_usd: 10,
                    most_recent_outcome_at: new Date(),
                }] };
            }
            return { rows: [] };
        });
        const body = await (await GET(req())).json();
        expect(body.totals.cost_per_accepted_insufficient_data).toBe(true);
        expect(body.totals.cost_per_accepted_output_usd).toBeNull();
        expect(body.readiness.status).toBe('not_ready');
        expect(body.readiness.reason).toContain('accepted_below_threshold');
    });

    it('withholds cost-per-accepted when coverage is below threshold', async () => {
        querySpy.mockImplementation(async (sql: string) => {
            if (/WITH base AS/i.test(sql) && /accepted_count/i.test(sql) && !/UNION ALL/i.test(sql)) {
                return { rows: [{
                    total_events: 1000, events_with_outcome: 100, // 10%
                    accepted_count: 80, rejected_count: 0, revised_count: 0,
                    escalated_count: 0, failed_count: 0, pending_review_count: 0, unknown_count: 0,
                    total_spend_usd: 200, accepted_spend_usd: 40,
                    most_recent_outcome_at: new Date(),
                }] };
            }
            return { rows: [] };
        });
        const body = await (await GET(req())).json();
        expect(body.totals.cost_per_accepted_insufficient_data).toBe(true);
        expect(body.readiness.status).toBe('not_ready');
        expect(body.readiness.reason).toContain('coverage_below_threshold');
    });
});

// ────────────────────────────────────────────────────────────────────────
// pending_review + unknown counted under V5 canonical vocabulary
// ────────────────────────────────────────────────────────────────────────

describe('Canonical V5 status counts', () => {
    it('surfaces pending_review and unknown counts in totals.status', async () => {
        querySpy.mockImplementation(async (sql: string) => {
            if (/WITH base AS/i.test(sql) && /accepted_count/i.test(sql) && !/UNION ALL/i.test(sql)) {
                return { rows: [{
                    total_events: 100, events_with_outcome: 100,
                    accepted_count: 40, rejected_count: 10, revised_count: 10,
                    escalated_count: 10, failed_count: 10,
                    pending_review_count: 15, unknown_count: 5,
                    total_spend_usd: 50, accepted_spend_usd: 20,
                    most_recent_outcome_at: new Date(),
                }] };
            }
            return { rows: [] };
        });
        const body = await (await GET(req())).json();
        expect(body.totals.status.pending_review).toBe(15);
        expect(body.totals.status.unknown).toBe(5);
        expect(body.totals.status.revised).toBe(10);
    });
});
