/**
 * Slice 3G — /api/v2/prove/search route test.
 *
 * The query builder is exhaustively covered in lib/prove/__tests__/search.test.ts.
 * Here we pin the HTTP boundary:
 *   - tenant_id = $1 on the issued query
 *   - read-only
 *   - default response shape: ok / count / limit / offset / hits / explanation
 *   - hits round-trip with correct attribution_status
 *   - empty result returns hits: [] without crashing
 *   - request_id exact-lookup style filter
 */

import { NextRequest } from 'next/server';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { GET } from '@/app/api/v2/prove/search/route';
import db from '@/lib/db';

const TENANT = '88888888-8888-8888-8888-888888888888';

let querySpy: ReturnType<typeof vi.spyOn>;

beforeEach(() => {
    querySpy = vi.spyOn(db as unknown as { query: (...args: unknown[]) => unknown }, 'query');
});
afterEach(() => querySpy.mockReset());

function req(qs = ''): NextRequest {
    return new NextRequest(`http://x/api/v2/prove/search${qs ? `?${qs}` : ''}`, {
        headers: { 'x-p402-tenant': TENANT },
    });
}

function hit(over: Record<string, unknown> = {}): Record<string, unknown> {
    return {
        event_time: new Date('2026-06-05T10:00:00Z'),
        request_id: 'req-abc',
        source: 'chat_completions',
        route: '/api/v2/chat/completions',
        provider: 'openai',
        model_used: 'gpt-4o-mini',
        status_code: 200,
        success: true,
        cost_usd: '0.0123',
        input_tokens: 100, output_tokens: 50, total_tokens: 150,
        department_id: 'dept_1', employee_id: 'emp_1', api_key_id: 'ak_1',
        workflow_id: 'wf_1', customer_id: 'cust_1', feature_id: 'feat_1',
        governance_decision: 'approved', deny_code: null,
        privacy_mode: 'metadata_only',
        evidence_bundle_id: 'bndl_1',
        decision_source: null, deny_rule: null,
        attribution_status: 'attributed',
        ...over,
    };
}

describe('GET /api/v2/prove/search', () => {
    it('returns ok envelope with explanation, hits, count, limit, offset', async () => {
        querySpy.mockResolvedValue({ rows: [hit()] });
        const res = await GET(req('limit=10'));
        expect(res.status).toBe(200);
        const body = await res.json();
        expect(body.ok).toBe(true);
        expect(typeof body.explanation).toBe('string');
        expect(body.count).toBe(1);
        expect(body.limit).toBe(10);
        expect(body.offset).toBe(0);
        expect(body.hits[0].request_id).toBe('req-abc');
        expect(body.hits[0].attribution_status).toBe('attributed');
    });

    it('issues a single SELECT scoped to tenant_id = $1', async () => {
        querySpy.mockResolvedValue({ rows: [] });
        await GET(req('q=hello'));
        expect(querySpy.mock.calls.length).toBe(1);
        const [sql, params] = querySpy.mock.calls[0]! as [string, unknown[]];
        expect(sql).toMatch(/^\s*SELECT/i);
        expect(sql).toMatch(/WHERE\s+tenant_id\s*=\s*\$1/i);
        expect(params[0]).toBe(TENANT);
        expect(sql).not.toMatch(/\b(INSERT|UPDATE|DELETE|ON\s+CONFLICT)\b/i);
    });

    it('does not select content-bearing columns', async () => {
        querySpy.mockResolvedValue({ rows: [] });
        await GET(req('q=hello'));
        const sql = String((querySpy.mock.calls[0] as [string])[0]).toLowerCase();
        for (const re of [
            /\bprompt_fingerprint\b/, /\bresponse_fingerprint\b/,
            /\bprompt_text\b/, /\bresponse_text\b/,
            /\bresponse_body\b/, /\brequest_body\b/,
            /\bmessages\b/, /\bcompletion\b/, /\bcontent\b/,
        ]) {
            expect(sql).not.toMatch(re);
        }
    });

    it('empty result returns hits: []', async () => {
        querySpy.mockResolvedValue({ rows: [] });
        const res = await GET(req());
        const body = await res.json();
        expect(body.hits).toEqual([]);
        expect(body.count).toBe(0);
    });

    it('request_id exact lookup binds the q parameter', async () => {
        querySpy.mockResolvedValue({ rows: [hit({ request_id: 'req-specific-789' })] });
        const res = await GET(req('q=req-specific-789'));
        const body = await res.json();
        expect(body.hits[0].request_id).toBe('req-specific-789');
        expect(body.explanation).toContain('"req-specific-789"');
    });

    it('rejects unknown sort_by and falls back to event_time', async () => {
        querySpy.mockResolvedValue({ rows: [] });
        await GET(req('sort_by=DROP'));
        const sql = String((querySpy.mock.calls[0] as [string])[0]);
        expect(sql).toMatch(/ORDER BY\s+event_time\s+DESC/i);
    });
});
