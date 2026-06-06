/**
 * Slice 3H — Event detail route tests.
 *
 *   - tenant-scoped exact lookup (tenant_id, request_id) = ($1, $2)
 *   - 404 when not found for tenant
 *   - 404 when row belongs to a different tenant (no cross-tenant leak)
 *   - SELECT projection has no prompt / response / content columns
 *   - read-only (no INSERT/UPDATE/DELETE on any issued query)
 *   - related events query is tenant-scoped
 *   - response body shape: event, attribution, governance, privacy,
 *     evidence, cost, related_events, explanation
 *   - denied row exposes provider_call_blocked + zero_cost_denied
 */

import { NextRequest } from 'next/server';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { GET } from '@/app/api/v2/prove/economic-events/[request_id]/route';
import db from '@/lib/db';

const TENANT = '99999999-9999-9999-9999-999999999999';

let querySpy: ReturnType<typeof vi.spyOn>;

beforeEach(() => {
    querySpy = vi.spyOn(db as unknown as { query: (...args: unknown[]) => unknown }, 'query');
});
afterEach(() => querySpy.mockReset());

function req(reqId: string): NextRequest {
    return new NextRequest(`http://x/api/v2/prove/economic-events/${reqId}`, {
        headers: { 'x-p402-tenant': TENANT },
    });
}
function ctx(reqId: string) {
    return { params: Promise.resolve({ request_id: reqId }) };
}

function approvedDbRow(over: Record<string, unknown> = {}): Record<string, unknown> {
    return {
        event_time: new Date('2026-06-05T10:00:00Z'),
        request_id: 'req-detail-1',
        tenant_id: TENANT,
        source: 'chat_completions',
        route: '/api/v2/chat/completions',
        provider: 'openai',
        model_used: 'gpt-4o-mini',
        model_requested: 'gpt-4o-mini',
        status_code: 200,
        success: true,
        cost_usd: '0.036000',
        direct_cost_usd: '0.030000',
        input_tokens: 100, output_tokens: 50, total_tokens: 150,
        latency_ms: 412, cache_hit: false,
        department_id: 'dept_1', employee_id: 'emp_1', api_key_id: 'ak_1',
        workflow_id: 'wf_1', customer_id: 'cust_1', feature_id: 'feat_1',
        owner_type: 'tenant', owner_id: TENANT,
        budget_id: null, policy_id: null, mandate_id: null,
        governance_decision: 'approved', deny_code: null,
        privacy_mode: 'metadata_only',
        prompt_stored: false, response_stored: false, redaction_applied: false,
        retention_expires_at: new Date('2026-07-05T10:00:00Z'),
        evidence_bundle_id: 'bndl_1',
        metadata_decision_source: null, metadata_deny_rule: null,
        created_at: new Date('2026-06-05T10:00:00Z'),
        updated_at: new Date('2026-06-05T10:00:00Z'),
        ...over,
    };
}

function deniedDbRow(over: Record<string, unknown> = {}): Record<string, unknown> {
    return approvedDbRow({
        request_id: 'req-denied-1',
        governance_decision: 'denied',
        deny_code: 'MODEL_NOT_ALLOWED',
        cost_usd: '0',
        direct_cost_usd: '0',
        provider: null, model_used: null,
        status_code: 403, success: false,
        metadata_decision_source: 'budget_guard',
        metadata_deny_rule: 'api_key.allowed_models',
        ...over,
    });
}

function mockFound(row: Record<string, unknown>, related: Array<Record<string, unknown>> = []) {
    querySpy.mockImplementation(async (sql: string) => {
        if (/FROM\s+ai_economic_events\s+WHERE\s+tenant_id\s*=\s*\$1\s+AND\s+request_id\s*=\s*\$2/is.test(sql)) {
            return { rows: [row] };
        }
        if (/FROM\s+ai_economic_events\s+WHERE\s+tenant_id\s*=\s*\$1\s+AND\s+request_id\s*<>\s*\$2/is.test(sql)) {
            return { rows: related };
        }
        return { rows: [] };
    });
}

function mockNotFound() {
    querySpy.mockResolvedValue({ rows: [] });
}

// ────────────────────────────────────────────────────────────────────────
// 404 paths
// ────────────────────────────────────────────────────────────────────────

describe('GET /api/v2/prove/economic-events/[request_id] — 404 paths', () => {
    it('returns 404 when no row exists for the tenant', async () => {
        mockNotFound();
        const res = await GET(req('req-missing'), ctx('req-missing'));
        expect(res.status).toBe(404);
        const body = await res.json();
        expect(body.error.code).toBe('NOT_FOUND');
    });

    it('returns 404 for cross-tenant lookups (row exists but for a different tenant)', async () => {
        // The mock returns [] because the SQL filters by tenant_id = $1.
        // We verify the bound tenant_id matches and no fallback query is issued.
        querySpy.mockImplementation(async (_sql: string, params?: unknown[]) => {
            // Even if the caller passed a different tenant, return [] for any
            // tenant_id that isn't TENANT. This simulates cross-tenant isolation.
            if (params?.[0] === TENANT) return { rows: [] };
            return { rows: [{ request_id: 'leak' }] };
        });
        const res = await GET(req('req-other-tenant'), ctx('req-other-tenant'));
        expect(res.status).toBe(404);
    });
});

// ────────────────────────────────────────────────────────────────────────
// Read-only + content-exclusion invariants
// ────────────────────────────────────────────────────────────────────────

describe('Read-only + content-exclusion invariants', () => {
    it('every issued query is read-only', async () => {
        mockFound(approvedDbRow());
        await GET(req('req-detail-1'), ctx('req-detail-1'));
        const sqls = (querySpy.mock.calls as Array<[string]>).map((c) => String(c[0]));
        for (const sql of sqls) {
            expect(sql).toMatch(/^\s*SELECT/i);
            expect(sql).not.toMatch(/\bINSERT\b/i);
            expect(sql).not.toMatch(/\bUPDATE\b/i);
            expect(sql).not.toMatch(/\bDELETE\b/i);
            expect(sql).not.toMatch(/\bON\s+CONFLICT\b/i);
        }
    });

    it('no query references prompt / response / messages / completion / body columns', async () => {
        mockFound(approvedDbRow());
        await GET(req('req-detail-1'), ctx('req-detail-1'));
        const sqls = (querySpy.mock.calls as Array<[string]>).map((c) => String(c[0]).toLowerCase());
        for (const sql of sqls) {
            for (const re of [
                /\bprompt_fingerprint\b/,
                /\bresponse_fingerprint\b/,
                /\bprompt_text\b/,
                /\bresponse_text\b/,
                /\bresponse_body\b/,
                /\brequest_body\b/,
                /\bmessages\b/,
                /\bcompletion\b/,
                /\bcontent\b/,
                /\btranscript\b/,
            ]) {
                expect(sql).not.toMatch(re);
            }
        }
    });

    it('binds tenant_id = $1 on every query, including related-events', async () => {
        mockFound(approvedDbRow(), [deniedDbRow({ match_reason: 'department' })]);
        await GET(req('req-detail-1'), ctx('req-detail-1'));
        const calls = querySpy.mock.calls as Array<[string, unknown[]?]>;
        expect(calls.length).toBe(2);
        for (const [sql, params] of calls) {
            expect(sql).toMatch(/tenant_id\s*=\s*\$1/i);
            expect(params?.[0]).toBe(TENANT);
        }
        // Related events filter on request_id != $2.
        expect(calls[1]![0]).toMatch(/request_id\s*<>\s*\$2/i);
        expect(calls[1]![1]?.[1]).toBe('req-detail-1');
    });
});

// ────────────────────────────────────────────────────────────────────────
// Response shape
// ────────────────────────────────────────────────────────────────────────

describe('Response shape', () => {
    it('200 envelope contains event, attribution, governance, privacy, evidence, cost, related_events, explanation', async () => {
        mockFound(approvedDbRow());
        const res = await GET(req('req-detail-1'), ctx('req-detail-1'));
        expect(res.status).toBe(200);
        const body = await res.json();
        for (const k of ['event','attribution','governance','privacy','evidence','cost','related_events','explanation']) {
            expect(body).toHaveProperty(k);
        }
        expect(body.event.request_id).toBe('req-detail-1');
        expect(body.attribution.completeness_count).toBe(6);
        expect(body.attribution.status).toBe('attributed');
        expect(body.evidence.present).toBe(true);
        expect(body.evidence.bundle_url).toContain('/api/v1/analytics/evidence-bundle/');
        expect(body.cost.cost_usd).toBeCloseTo(0.036, 3);
    });

    it('denied row exposes provider_call_blocked + zero_cost_denied flags', async () => {
        mockFound(deniedDbRow());
        const body = await (await GET(req('req-denied-1'), ctx('req-denied-1'))).json();
        expect(body.governance.decision).toBe('denied');
        expect(body.governance.provider_call_blocked).toBe(true);
        expect(body.cost.zero_cost_denied).toBe(true);
        expect(body.cost.cost_usd).toBe(0);
        expect(body.explanation.headline).toContain('MODEL_NOT_ALLOWED');
        expect(body.explanation.headline.toLowerCase()).toContain('blocked before provider');
    });

    it('related events come back with normalized match_reason', async () => {
        mockFound(approvedDbRow(), [
            { ...deniedDbRow(), match_reason: 'deny_code' },
            { ...deniedDbRow({ request_id: 'req-rel-2' }), match_reason: 'department' },
        ]);
        const body = await (await GET(req('req-detail-1'), ctx('req-detail-1'))).json();
        expect(body.related_events.length).toBe(2);
        expect(['deny_code','department','employee','workflow','customer','provider_model','nearby'])
            .toContain(body.related_events[0].match_reason);
    });

    it('privacy section flags content_displayed: false (header guard)', async () => {
        mockFound(approvedDbRow());
        const body = await (await GET(req('req-detail-1'), ctx('req-detail-1'))).json();
        expect(body.privacy.content_displayed).toBe(false);
    });
});

// ────────────────────────────────────────────────────────────────────────
// Bad input
// ────────────────────────────────────────────────────────────────────────

describe('Input validation', () => {
    it('rejects an overly long request_id with 400', async () => {
        const huge = 'x'.repeat(257);
        const res = await GET(req(huge), ctx(huge));
        expect(res.status).toBe(400);
        const body = await res.json();
        expect(body.error.code).toBe('INVALID_INPUT');
    });
});
