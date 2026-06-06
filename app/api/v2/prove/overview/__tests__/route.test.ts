/**
 * Slice 3G — /api/v2/prove/overview route test.
 *
 *   - tenant-scoped on every query (tenant_id = $1)
 *   - read-only (no INSERT/UPDATE/DELETE)
 *   - returns the full ProveOverviewResponse shape
 *   - never SELECTs content-bearing columns
 *   - empty tenant yields a usable empty-state response (totals zeroed)
 */

import { NextRequest } from 'next/server';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { GET } from '@/app/api/v2/prove/overview/route';
import db from '@/lib/db';

const TENANT = '77777777-7777-7777-7777-777777777777';

let querySpy: ReturnType<typeof vi.spyOn>;

beforeEach(() => {
    querySpy = vi.spyOn(db as unknown as { query: (...args: unknown[]) => unknown }, 'query');
});
afterEach(() => querySpy.mockReset());

function mockEmpty() {
    querySpy.mockImplementation(async (sql: string) => {
        if (/SUM\(cost_usd\)/i.test(sql) && /total_requests/i.test(sql)) {
            return { rows: [{
                total_spend_usd: 0, total_requests: 0, denied_requests: 0,
                unattributed_request_count: 0, unattributed_spend_usd: 0,
                events_with_evidence: 0, events_missing_evidence: 0,
            }] };
        }
        if (/accepted_spend_usd/i.test(sql)) {
            return { rows: [{ accepted_spend_usd: 0, accepted_count: 0 }] };
        }
        if (/SUM\(cost_usd\)/i.test(sql)) {
            return { rows: [{ spend_usd: 0 }] };
        }
        if (/GROUP BY 1/.test(sql)) return { rows: [] };
        if (/date_trunc\('day'/.test(sql)) return { rows: [] };
        if (/metadata\s+\?\s+'deny_rule'/i.test(sql)) return { rows: [] };
        if (/governance_decision = 'denied' AND deny_code/i.test(sql)) return { rows: [] };
        if (/with_evidence/i.test(sql) && /missing_evidence/i.test(sql) && /COUNT\(\*\)::int AS events/i.test(sql)) {
            return { rows: [{ events: 0, with_evidence: 0, missing_evidence: 0 }] };
        }
        return { rows: [] };
    });
}

function req(): NextRequest {
    return new NextRequest('http://x/api/v2/prove/overview', {
        headers: { 'x-p402-tenant': TENANT },
    });
}

describe('GET /api/v2/prove/overview', () => {
    it('returns a 200 envelope with totals, breakdowns, denied, privacy, and evidence sections', async () => {
        mockEmpty();
        const res = await GET(req());
        expect(res.status).toBe(200);
        const body = await res.json();
        expect(body.ok).toBe(true);
        expect(body).toHaveProperty('window');
        expect(body).toHaveProperty('previous_window');
        expect(body).toHaveProperty('totals');
        expect(body).toHaveProperty('spend_period_comparison');
        expect(body.breakdowns).toMatchObject({
            by_department: expect.any(Array),
            by_employee:   expect.any(Array),
            by_api_key:    expect.any(Array),
            by_workflow:   expect.any(Array),
            by_customer:   expect.any(Array),
            by_feature:    expect.any(Array),
            by_provider:   expect.any(Array),
            by_model:      expect.any(Array),
            by_governance: expect.any(Array),
        });
        expect(body.denied).toMatchObject({
            by_code:        expect.any(Array),
            by_department:  expect.any(Array),
            by_api_key:     expect.any(Array),
            by_model:       expect.any(Array),
            over_time:      expect.any(Array),
            top_deny_rules: expect.any(Array),
        });
        expect(body.privacy.distribution).toBeInstanceOf(Array);
        expect(body.evidence).toHaveProperty('coverage_overall');
    });

    it('reads no content-bearing columns and issues no DML', async () => {
        mockEmpty();
        await GET(req());
        const calls = querySpy.mock.calls as Array<[string, unknown[]?]>;
        for (const [sql] of calls) {
            const s = String(sql).toLowerCase();
            for (const re of [
                /\bprompt_fingerprint\b/, /\bresponse_fingerprint\b/,
                /\bprompt_text\b/, /\bresponse_text\b/,
                /\bresponse_body\b/, /\brequest_body\b/,
                /\bmessages\b/, /\bcompletion\b/, /\bcontent\b/,
                /\binsert\b/, /\bupdate\b/, /\bdelete\b/,
            ]) {
                expect(s, `query ${calls.indexOf([sql] as never)} must not match ${re}`).not.toMatch(re);
            }
        }
    });

    it('binds tenant_id = $1 on every aggregation query', async () => {
        mockEmpty();
        await GET(req());
        const calls = querySpy.mock.calls as Array<[string, unknown[]?]>;
        for (const [sql, params] of calls) {
            expect(sql).toMatch(/tenant_id\s*=\s*\$1/i);
            expect(params?.[0]).toBe(TENANT);
        }
    });

    it('empty-tenant totals are zeroed, evidence_coverage_pct = 100 (no denominator)', async () => {
        mockEmpty();
        const res = await GET(req());
        const body = await res.json();
        expect(body.totals.total_spend_usd).toBe(0);
        expect(body.totals.total_requests).toBe(0);
        expect(body.totals.denied_requests).toBe(0);
        expect(body.totals.evidence_coverage_pct).toBe(100);
        expect(body.totals.cost_per_accepted_output_usd).toBeNull();
    });
});
