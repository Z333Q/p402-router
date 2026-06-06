/**
 * Slice 3I — /api/v2/prove/report route tests.
 *
 *   - tenant-scoped on every aggregation query
 *   - read-only (only SELECTs issued; no INSERT/UPDATE/DELETE/ON CONFLICT)
 *   - JSON response carries every spec'd section
 *   - CSV-appendix format returns text/csv + attachment
 *   - empty tenant: all aggregations zeroed but the envelope is valid
 *   - NO content-bearing columns referenced in any query
 *   - filters are pushed into SQL
 */

import { NextRequest } from 'next/server';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { GET } from '@/app/api/v2/prove/report/route';
import db from '@/lib/db';

const TENANT = 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb';

let querySpy: ReturnType<typeof vi.spyOn>;

beforeEach(() => {
    querySpy = vi.spyOn(db as unknown as { query: (...args: unknown[]) => unknown }, 'query');
});
afterEach(() => querySpy.mockReset());

function req(qs = ''): NextRequest {
    return new NextRequest(`http://x/api/v2/prove/report${qs ? `?${qs}` : ''}`, {
        headers: { 'x-p402-tenant': TENANT },
    });
}

function mockEmptyTenant() {
    querySpy.mockImplementation(async (sql: string) => {
        // executive summary aggregate
        if (/with_evidence/i.test(sql) && /unattributed_count/i.test(sql)) {
            return { rows: [{
                total_spend_usd: 0, total_events: 0, denied_events: 0,
                total_tokens: 0, with_evidence: 0, missing_evidence: 0,
                unattributed_count: 0, unattributed_spend_usd: 0,
            }] };
        }
        // attribution gaps aggregate
        if (/missing_department/i.test(sql)) {
            return { rows: [{
                unattributed_count: 0, attributed_count: 0, total: 0,
                missing_department: 0, missing_employee: 0, missing_workflow: 0,
                missing_customer: 0, missing_feature: 0, missing_api_key: 0,
            }] };
        }
        // budget/control count aggregate
        if (/COUNT\(DISTINCT budget_id\)/i.test(sql)) {
            return { rows: [{ budget_count: 0, policy_count: 0, mandate_count: 0 }] };
        }
        // denied total
        if (/SELECT COUNT\(\*\)::int AS total/i.test(sql) && /governance_decision = 'denied'/.test(sql)) {
            return { rows: [{ total: 0 }] };
        }
        // everything else: empty
        return { rows: [] };
    });
}

// ────────────────────────────────────────────────────────────────────────
// Shape + empty-state
// ────────────────────────────────────────────────────────────────────────

describe('GET /api/v2/prove/report — JSON envelope', () => {
    it('returns the full board-ready packet structure', async () => {
        mockEmptyTenant();
        const res = await GET(req());
        expect(res.status).toBe(200);
        const body = await res.json();
        for (const k of [
            'ok','generated_at','window','filters_applied',
            'executive_summary','executive_summary_text',
            'by_department','by_workflow','by_provider_model',
            'denied','budget_control_evidence','privacy','evidence',
            'attribution_gaps','top_cleanup','appendix',
        ]) {
            expect(body).toHaveProperty(k);
        }
        expect(body.appendix).toMatchObject({ count: 0, limit: expect.any(Number), rows: [] });
        expect(body.executive_summary.denied_provider_cost_usd).toBe(0);
        expect(typeof body.executive_summary_text).toBe('string');
        expect(body.executive_summary_text.toLowerCase()).toContain('metadata only');
    });

    it('empty tenant yields zeroed totals + 100% evidence coverage (no denominator)', async () => {
        mockEmptyTenant();
        const body = await (await GET(req())).json();
        expect(body.executive_summary.total_spend_usd).toBe(0);
        expect(body.executive_summary.total_events).toBe(0);
        expect(body.executive_summary.denied_events).toBe(0);
        expect(body.executive_summary.evidence_coverage_pct).toBe(100);
    });
});

// ────────────────────────────────────────────────────────────────────────
// Read-only + content-safety
// ────────────────────────────────────────────────────────────────────────

describe('Read-only and content-safety invariants', () => {
    it('issues only SELECTs', async () => {
        mockEmptyTenant();
        await GET(req());
        for (const [sql] of querySpy.mock.calls as Array<[string]>) {
            const s = String(sql);
            expect(s).toMatch(/^\s*(SELECT|WITH)/i);
            expect(s).not.toMatch(/\bINSERT\b/i);
            expect(s).not.toMatch(/\bUPDATE\b/i);
            expect(s).not.toMatch(/\bDELETE\b/i);
            expect(s).not.toMatch(/\bON\s+CONFLICT\b/i);
        }
    });

    it('binds tenant_id = $1 on every query', async () => {
        mockEmptyTenant();
        await GET(req());
        const calls = querySpy.mock.calls as Array<[string, unknown[]?]>;
        expect(calls.length).toBeGreaterThan(0);
        for (const [sql, params] of calls) {
            expect(sql).toMatch(/tenant_id\s*=\s*\$1/i);
            expect(params?.[0]).toBe(TENANT);
        }
    });

    it('no query references prompt / response / messages / completion / body columns', async () => {
        mockEmptyTenant();
        await GET(req('q=should-have-no-effect'));
        for (const [sql] of querySpy.mock.calls as Array<[string]>) {
            const s = String(sql).toLowerCase();
            for (const re of [
                /\bprompt_fingerprint\b/, /\bresponse_fingerprint\b/,
                /\bprompt_text\b/, /\bresponse_text\b/,
                /\bresponse_body\b/, /\brequest_body\b/,
                /\bmessages\b/, /\bcompletion\b/, /\bcontent\b/,
                /\btranscript\b/,
            ]) {
                expect(s).not.toMatch(re);
            }
        }
    });
});

// ────────────────────────────────────────────────────────────────────────
// Filters pushed into SQL
// ────────────────────────────────────────────────────────────────────────

describe('Filters', () => {
    it('department_id, workflow_id, provider, model, deny_code, privacy_mode are bound', async () => {
        mockEmptyTenant();
        await GET(req(
            'department_id=dept_x&workflow_id=wf_x&provider=openai&model=gpt-4o-mini' +
            '&deny_code=API_KEY_BUDGET_EXCEEDED&privacy_mode=metadata_only',
        ));
        // First query (the exec-summary aggregate) carries every bound filter.
        const [sql, params] = querySpy.mock.calls[0]! as [string, unknown[]];
        for (const col of ['department_id','workflow_id','provider','deny_code']) {
            expect(sql).toMatch(new RegExp(`${col}\\s*=\\s*\\$\\d+`));
        }
        expect(sql).toMatch(/\bmodel_used\s*=\s*\$\d+/);
        expect(sql).toMatch(/\bprivacy_mode\s*=\s*\$\d+/);
        expect(params).toEqual(expect.arrayContaining([
            'dept_x','wf_x','openai','gpt-4o-mini','API_KEY_BUDGET_EXCEEDED','metadata_only',
        ]));
    });
});

// ────────────────────────────────────────────────────────────────────────
// CSV-appendix format
// ────────────────────────────────────────────────────────────────────────

describe('CSV-appendix format', () => {
    it('returns text/csv with an attachment Content-Disposition', async () => {
        mockEmptyTenant();
        const res = await GET(req('format=csv-appendix'));
        expect(res.headers.get('content-type')).toMatch(/text\/csv/);
        expect(res.headers.get('content-disposition')).toMatch(/attachment;\s*filename=/);
    });

    it('empty result still includes the canonical header row', async () => {
        mockEmptyTenant();
        const res = await GET(req('format=csv-appendix'));
        const body = await res.text();
        const header = body.split('\n')[0];
        expect(header).toBe([
            'event_time','request_id','source','provider','model_used',
            'status_code','success','cost_usd','total_tokens',
            'department_id','employee_id','api_key_id',
            'workflow_id','customer_id','feature_id',
            'governance_decision','deny_code',
            'privacy_mode','evidence_bundle_id',
        ].join(','));
    });
});
