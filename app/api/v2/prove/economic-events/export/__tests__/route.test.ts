/**
 * Slice 3G — Prove-lite Finance Export route tests.
 *
 * Payment-grade invariants:
 *
 *   - tenant-scoped via requireTenantAccess + WHERE tenant_id = $1
 *   - read-only: no INSERT/UPDATE/DELETE/ON CONFLICT issued
 *   - SELECT projection NEVER references prompt/response/content columns
 *   - CSV header row is the canonical EXPORT_FIELDS list
 *   - JSON shape carries `events: [...]` with every EXPORT_FIELDS key
 *   - filters are pushed into SQL with bound parameters (no fragments)
 *   - denied events round-trip with cost_usd=0, governance_decision='denied',
 *     deny_code populated, success=false
 *   - empty export still returns the CSV header row / `events: []`
 *   - row cap honored
 *   - no Optimize modules touched
 */

import { NextRequest } from 'next/server';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { GET } from '@/app/api/v2/prove/economic-events/export/route';
import { EXPORT_FIELDS } from '@/app/api/v2/prove/economic-events/export/_fields';
import db from '@/lib/db';

const TENANT = '55555555-5555-5555-5555-555555555555';

let querySpy: ReturnType<typeof vi.spyOn>;

beforeEach(() => {
    querySpy = vi.spyOn(db as unknown as { query: (...args: unknown[]) => unknown }, 'query');
});
afterEach(() => querySpy.mockReset());

function req(url: string): NextRequest {
    return new NextRequest(url, { headers: { 'x-p402-tenant': TENANT } });
}

function mockRows(rows: Array<Record<string, unknown>>) {
    querySpy.mockResolvedValue({ rows });
}

function approvedRow(over: Record<string, unknown> = {}): Record<string, unknown> {
    return {
        event_time: new Date('2026-06-04T12:00:00Z'),
        request_id: 'req-approved-1',
        tenant_id: TENANT,
        source: 'chat_completions',
        route: '/api/v2/chat/completions',
        provider: 'openai',
        model_used: 'gpt-4o-mini',
        status_code: 200,
        success: true,
        cost_usd: '0.012300',
        input_tokens: 100,
        output_tokens: 50,
        total_tokens: 150,
        department_id: 'dept_1',
        employee_id: 'emp_1',
        api_key_id: 'ak_1',
        workflow_id: null,
        customer_id: null,
        feature_id: null,
        budget_id: null,
        policy_id: null,
        mandate_id: null,
        governance_decision: 'approved',
        deny_code: null,
        privacy_mode: 'metadata_only',
        prompt_stored: false,
        response_stored: false,
        redaction_applied: false,
        retention_expires_at: new Date('2026-07-04T12:00:00Z'),
        evidence_bundle_id: null,
        decision_source: null,
        deny_rule: null,
        ...over,
    };
}

function deniedRow(over: Record<string, unknown> = {}): Record<string, unknown> {
    return approvedRow({
        request_id: 'req-denied-1',
        provider: null,
        model_used: null,
        status_code: 403,
        success: false,
        cost_usd: '0.000000',
        input_tokens: 0,
        output_tokens: 0,
        total_tokens: 0,
        governance_decision: 'denied',
        deny_code: 'MODEL_NOT_ALLOWED',
        decision_source: 'budget_guard',
        deny_rule: 'api_key.allowed_models',
        ...over,
    });
}

// ────────────────────────────────────────────────────────────────────────
// Read-only invariants
// ────────────────────────────────────────────────────────────────────────

describe('GET /api/v2/prove/economic-events/export — read-only invariants', () => {
    it('issues a single SELECT and no INSERT/UPDATE/DELETE', async () => {
        mockRows([]);
        await GET(req('http://x/api/v2/prove/economic-events/export?format=json'));
        const calls = (querySpy.mock.calls as Array<[string, unknown[]?]>);
        expect(calls.length).toBe(1);
        const sql = calls[0]![0];
        expect(sql).toMatch(/^\s*SELECT\b/i);
        expect(sql).not.toMatch(/\bINSERT\b/i);
        expect(sql).not.toMatch(/\bUPDATE\b/i);
        expect(sql).not.toMatch(/\bDELETE\b/i);
        expect(sql).not.toMatch(/\bON\s+CONFLICT\b/i);
    });

    it('binds tenant_id as $1 on every query', async () => {
        mockRows([]);
        await GET(req('http://x/api/v2/prove/economic-events/export?format=json'));
        const [sql, params] = querySpy.mock.calls[0]! as [string, unknown[]];
        expect(sql).toMatch(/WHERE\s+tenant_id\s*=\s*\$1/i);
        expect(params[0]).toBe(TENANT);
    });

    it('SELECT projection does NOT reference prompt/response/content columns', async () => {
        mockRows([]);
        await GET(req('http://x/api/v2/prove/economic-events/export?format=json'));
        const sql = String((querySpy.mock.calls[0] as [string])[0]).toLowerCase();
        // Word-boundary checks: we ban references to content-bearing
        // COLUMNS, not the source enum value 'chat_completions' (which is
        // a constant in the CASE branch deriving route).
        const FORBIDDEN_COLUMN_PATTERNS = [
            /\bprompt_fingerprint\b/,
            /\bresponse_fingerprint\b/,
            /\bprompt_text\b/,
            /\bresponse_text\b/,
            /\bprompt_body\b/,
            /\bresponse_body\b/,
            /\brequest_body\b/,
            /\bmessages\b/,
            /\bcompletion\b/,             // singular "completion" column would be a leak
            /\bcontent\b/,
            /\btranscript\b/,
            /\bfile_content\b/,
        ];
        for (const re of FORBIDDEN_COLUMN_PATTERNS) {
            expect(sql, `SQL must not reference ${re}`).not.toMatch(re);
        }
        // Only the privacy-posture booleans are referenced.
        expect(sql).toMatch(/\bprompt_stored\b/);
        expect(sql).toMatch(/\bresponse_stored\b/);
    });
});

// ────────────────────────────────────────────────────────────────────────
// CSV shape
// ────────────────────────────────────────────────────────────────────────

describe('CSV format', () => {
    it('returns Content-Type text/csv with attachment Content-Disposition', async () => {
        mockRows([]);
        const res = await GET(req('http://x/api/v2/prove/economic-events/export?format=csv'));
        expect(res.headers.get('content-type')).toMatch(/text\/csv/);
        expect(res.headers.get('content-disposition')).toMatch(/attachment;\s*filename=/);
        expect(res.headers.get('cache-control')).toBe('no-store');
    });

    it('empty export still returns the canonical header row', async () => {
        mockRows([]);
        const res = await GET(req('http://x/api/v2/prove/economic-events/export?format=csv'));
        const body = await res.text();
        const firstLine = body.split('\n')[0];
        expect(firstLine).toBe(EXPORT_FIELDS.join(','));
        // Header line + trailing newline only.
        expect(body.trimEnd().split('\n').length).toBe(1);
    });

    it('serializes approved + denied rows with correct cells and ISO timestamps', async () => {
        mockRows([approvedRow(), deniedRow()]);
        const res = await GET(req('http://x/api/v2/prove/economic-events/export?format=csv'));
        const body = await res.text();
        const [header, approved, denied] = body.split('\n');
        expect(header).toBe(EXPORT_FIELDS.join(','));
        // approved row: request id + provider visible, deny_code empty
        const approvedCols = approved!.split(',');
        const denyIdx = EXPORT_FIELDS.indexOf('deny_code');
        const govIdx  = EXPORT_FIELDS.indexOf('governance_decision');
        const reqIdx  = EXPORT_FIELDS.indexOf('request_id');
        const tsIdx   = EXPORT_FIELDS.indexOf('event_time');
        expect(approvedCols[reqIdx]).toBe('req-approved-1');
        expect(approvedCols[denyIdx]).toBe('');
        expect(approvedCols[govIdx]).toBe('approved');
        expect(approvedCols[tsIdx]).toBe('2026-06-04T12:00:00.000Z');
        // denied row: deny_code populated, cost=0
        const deniedCols = denied!.split(',');
        const costIdx = EXPORT_FIELDS.indexOf('cost_usd');
        const successIdx = EXPORT_FIELDS.indexOf('success');
        expect(deniedCols[denyIdx]).toBe('MODEL_NOT_ALLOWED');
        expect(deniedCols[govIdx]).toBe('denied');
        expect(deniedCols[costIdx]).toBe('0.000000');
        expect(deniedCols[successIdx]).toBe('false');
    });

    it('escapes commas, quotes, and newlines per RFC 4180', async () => {
        mockRows([approvedRow({
            request_id: 'req,with,commas',
            deny_code: 'has "quotes" inside',
            model_used: 'line1\nline2',
        })]);
        const res = await GET(req('http://x/api/v2/prove/economic-events/export?format=csv'));
        const body = await res.text();
        // Quoted on the data row.
        expect(body).toContain('"req,with,commas"');
        expect(body).toContain('"has ""quotes"" inside"');
        expect(body).toContain('"line1\nline2"');
    });
});

// ────────────────────────────────────────────────────────────────────────
// JSON shape
// ────────────────────────────────────────────────────────────────────────

describe('JSON format', () => {
    it('returns { ok, count, limit, offset, events } with every EXPORT_FIELDS key', async () => {
        mockRows([approvedRow(), deniedRow()]);
        const res = await GET(req('http://x/api/v2/prove/economic-events/export?format=json'));
        expect(res.headers.get('content-type')).toMatch(/application\/json/);
        const body = await res.json();
        expect(body.ok).toBe(true);
        expect(body.count).toBe(2);
        expect(typeof body.limit).toBe('number');
        expect(typeof body.offset).toBe('number');
        expect(Array.isArray(body.events)).toBe(true);
        for (const evt of body.events) {
            for (const f of EXPORT_FIELDS) {
                expect(evt, `event missing key: ${f}`).toHaveProperty(f);
            }
            // Content keys must NOT leak in.
            for (const forbidden of ['prompt', 'response', 'messages', 'completion', 'response_body', 'request_body']) {
                expect(evt).not.toHaveProperty(forbidden);
            }
        }
    });

    it('empty export returns events: []', async () => {
        mockRows([]);
        const res = await GET(req('http://x/api/v2/prove/economic-events/export?format=json'));
        const body = await res.json();
        expect(body.events).toEqual([]);
        expect(body.count).toBe(0);
    });

    it('denied-event row carries the canonical denial fields', async () => {
        mockRows([deniedRow()]);
        const res = await GET(req('http://x/api/v2/prove/economic-events/export?format=json'));
        const body = await res.json();
        const evt = body.events[0];
        expect(evt.governance_decision).toBe('denied');
        expect(evt.deny_code).toBe('MODEL_NOT_ALLOWED');
        expect(evt.success).toBe(false);
        expect(evt.cost_usd).toBe('0.000000');
        expect(evt.decision_source).toBe('budget_guard');
        expect(evt.deny_rule).toBe('api_key.allowed_models');
    });

    it('privacy-posture fields are surfaced verbatim', async () => {
        mockRows([approvedRow({
            privacy_mode: 'fingerprint_only',
            prompt_stored: false,
            response_stored: false,
            redaction_applied: true,
        })]);
        const res = await GET(req('http://x/api/v2/prove/economic-events/export?format=json'));
        const evt = (await res.json()).events[0];
        expect(evt.privacy_mode).toBe('fingerprint_only');
        expect(evt.prompt_stored).toBe(false);
        expect(evt.response_stored).toBe(false);
        expect(evt.redaction_applied).toBe(true);
    });
});

// ────────────────────────────────────────────────────────────────────────
// Filters
// ────────────────────────────────────────────────────────────────────────

describe('Filters pushed into SQL', () => {
    it('id filters appear as tenant_id-scoped bound parameters', async () => {
        mockRows([]);
        await GET(req(
            'http://x/api/v2/prove/economic-events/export?format=json' +
            '&department_id=dept_x&employee_id=emp_y&workflow_id=wf_z' +
            '&customer_id=cust_a&feature_id=feat_b&api_key_id=ak_c',
        ));
        const [sql, params] = querySpy.mock.calls[0]! as [string, unknown[]];
        for (const k of ['department_id', 'employee_id', 'workflow_id', 'customer_id', 'feature_id', 'api_key_id']) {
            expect(sql).toMatch(new RegExp(`\\b${k}\\s*=\\s*\\$\\d+`));
        }
        // Bound values are present in the param list (tenant_id is $1).
        expect(params).toEqual(expect.arrayContaining([
            'dept_x', 'emp_y', 'wf_z', 'cust_a', 'feat_b', 'ak_c',
        ]));
    });

    it('provider, model, governance_decision, deny_code, privacy_mode are bound', async () => {
        mockRows([]);
        await GET(req(
            'http://x/api/v2/prove/economic-events/export?format=json' +
            '&provider=openai&model=gpt-4o-mini&governance_decision=denied' +
            '&deny_code=API_KEY_BUDGET_EXCEEDED&privacy_mode=metadata_only',
        ));
        const [sql, params] = querySpy.mock.calls[0]! as [string, unknown[]];
        expect(sql).toMatch(/\bprovider\s*=\s*\$\d+/);
        expect(sql).toMatch(/\bmodel_used\s*=\s*\$\d+/);          // url ?model maps to column
        expect(sql).toMatch(/\bgovernance_decision\s*=\s*\$\d+/);
        expect(sql).toMatch(/\bdeny_code\s*=\s*\$\d+/);
        expect(sql).toMatch(/\bprivacy_mode\s*=\s*\$\d+/);
        expect(params).toEqual(expect.arrayContaining([
            'openai', 'gpt-4o-mini', 'denied', 'API_KEY_BUDGET_EXCEEDED', 'metadata_only',
        ]));
    });

    it('since/until are bound as Dates against event_time', async () => {
        mockRows([]);
        await GET(req(
            'http://x/api/v2/prove/economic-events/export?format=json' +
            '&since=2026-05-01T00:00:00Z&until=2026-05-31T23:59:59Z',
        ));
        const [sql, params] = querySpy.mock.calls[0]! as [string, unknown[]];
        expect(sql).toMatch(/\bevent_time\s*>=\s*\$\d+/);
        expect(sql).toMatch(/\bevent_time\s*<=\s*\$\d+/);
        const dates = params.filter((p): p is Date => p instanceof Date);
        expect(dates.length).toBe(2);
    });

    it('rejects an unsupported format with INVALID_INPUT', async () => {
        const res = await GET(req('http://x/api/v2/prove/economic-events/export?format=xml'));
        expect(res.status).toBe(400);
        const body = await res.json();
        expect(body.error.code).toBe('INVALID_INPUT');
    });

    it('rejects malformed since/until with INVALID_INPUT', async () => {
        const res = await GET(req('http://x/api/v2/prove/economic-events/export?format=json&since=not-a-date'));
        expect(res.status).toBe(400);
        const body = await res.json();
        expect(body.error.code).toBe('INVALID_INPUT');
    });

    it('invalid privacy_mode is ignored (not bound) — no SQL injection vector', async () => {
        mockRows([]);
        await GET(req('http://x/api/v2/prove/economic-events/export?format=json&privacy_mode=DROP+TABLE'));
        const [sql, params] = querySpy.mock.calls[0]! as [string, unknown[]];
        expect(sql).not.toMatch(/privacy_mode\s*=/);
        expect(params).not.toContain('DROP TABLE');
    });
});

// ────────────────────────────────────────────────────────────────────────
// Pagination
// ────────────────────────────────────────────────────────────────────────

describe('Pagination / row cap', () => {
    it('caps limit at 50_000 even when caller requests more', async () => {
        mockRows([]);
        await GET(req('http://x/api/v2/prove/economic-events/export?format=json&limit=10000000'));
        const [, params] = querySpy.mock.calls[0]! as [string, unknown[]];
        // Last two params are (limit, offset). The cap is applied before
        // bind, so the stored value must be 50_000.
        expect(params[params.length - 2]).toBe(50_000);
    });

    it('passes through a sensible default limit when none is provided', async () => {
        mockRows([]);
        await GET(req('http://x/api/v2/prove/economic-events/export?format=json'));
        const [, params] = querySpy.mock.calls[0]! as [string, unknown[]];
        expect(params[params.length - 2]).toBe(10_000);
        expect(params[params.length - 1]).toBe(0);
    });

    it('binds offset for paged exports', async () => {
        mockRows([]);
        await GET(req('http://x/api/v2/prove/economic-events/export?format=json&limit=1000&offset=5000'));
        const [, params] = querySpy.mock.calls[0]! as [string, unknown[]];
        expect(params[params.length - 2]).toBe(1000);
        expect(params[params.length - 1]).toBe(5000);
    });
});
