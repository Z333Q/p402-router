import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';

vi.mock('@/lib/db', () => ({
    default: { query: vi.fn() },
}));

import db from '@/lib/db';
import { POST, GET } from './route';

const TENANT = '00000000-0000-0000-0000-000000000777';

function postReq(body: unknown) {
    return new NextRequest('http://localhost/api/v2/meter/events', {
        method: 'POST',
        headers: { 'x-p402-tenant': TENANT, 'content-type': 'application/json' },
        body: typeof body === 'string' ? body : JSON.stringify(body),
    });
}

function getReq(qs = '') {
    return new NextRequest(`http://localhost/api/v2/meter/events${qs}`, {
        headers: { 'x-p402-tenant': TENANT },
    });
}

// writeEconomicEvent queries: one row per scope candidate (privacy_scope_overrides),
// then one tenant default (tenant_privacy_settings), then INSERT.
// scopeMissCount lets callers pre-stuff empty results for as many scope
// candidates as the body provides (api_key_id, employee_id, department_id, etc.).
function mockWriterStack(insertId = 'event-xyz', scopeMissCount = 0) {
    const q = (db.query as any);
    for (let i = 0; i < scopeMissCount; i++) q.mockResolvedValueOnce({ rows: [] });
    q.mockResolvedValueOnce({
        rows: [{
            default_privacy_mode: 'metadata_only',
            store_prompts: false,
            store_responses: false,
            require_redaction: true,
            retention_days: 30,
        }],
    });
    q.mockResolvedValueOnce({ rows: [{ id: insertId }] });
}

beforeEach(() => (db.query as any).mockReset());

describe('POST /api/v2/meter/events — privacy contract', () => {
    it('rejects "prompt" with INVALID_INPUT and never queries the DB', async () => {
        const res = await POST(postReq({
            request_id: 'r1',
            prompt: 'sensitive text',
        }));
        const body = await res.json();
        expect(res.status).toBe(400);
        expect(body.error.code).toBe('INVALID_INPUT');
        expect(body.error.message).toContain('prompt');
        expect(db.query).not.toHaveBeenCalled();
    });

    it('rejects "messages", "response", "content", "file" etc.', async () => {
        const forbidden = ['messages', 'response', 'content', 'file', 'chat_history', 'transcript'];
        for (const f of forbidden) {
            const res = await POST(postReq({ request_id: 'r1', [f]: 'anything' }));
            expect(res.status).toBe(400);
            const body = await res.json();
            expect(body.error.code).toBe('INVALID_INPUT');
            expect(body.error.details.rejected_field).toBe(f);
        }
        expect(db.query).not.toHaveBeenCalled();
    });

    it('happy path: writes economic event, returns privacy posture', async () => {
        // Body provides employee_id + department_id → 2 scope-override misses
        mockWriterStack('evt_1', 2);
        const res = await POST(postReq({
            request_id: 'req_abc',
            attribution: {
                department_id: 'claims',
                employee_id:   'emp_42',
                action_type:   'claims_summary',
            },
            model: { provider: 'google', model_used: 'gemini-2.0-flash' },
            usage: { input_tokens: 2140, output_tokens: 801, cost_usd: 0.0041, latency_ms: 720 },
            governance: { budget_id: 'bud_q2', decision: 'approved' },
            outcome: { status: 'accepted', quality_score: 0.91 },
        }));
        const body = await res.json();
        expect(res.status).toBe(200);
        expect(body.ok).toBe(true);
        expect(body.event_id).toBe('evt_1');
        expect(body.privacy.mode).toBe('metadata_only');
        expect(body.privacy.prompt_stored).toBe(false);
        expect(body.privacy.response_stored).toBe(false);
        expect(body.privacy.retention_expires_at).toMatch(/^\d{4}-\d{2}-\d{2}T/);
    });

    it('source defaults to "meter_only"', async () => {
        mockWriterStack();
        await POST(postReq({ request_id: 'r' }));
        const insertCall = (db.query as any).mock.calls.find((c: any[]) => /INSERT INTO ai_economic_events/.test(c[0]));
        const params = insertCall![1];
        expect(params).toContain('meter_only');
    });

    it('rejects invalid privacy_mode', async () => {
        const res = await POST(postReq({ request_id: 'r', privacy_mode: 'wide_open' }));
        const body = await res.json();
        expect(res.status).toBe(400);
        expect(body.error.code).toBe('INVALID_INPUT');
        expect(body.error.message).toContain('privacy_mode');
    });

    it('rejects invalid attribution.owner_type', async () => {
        const res = await POST(postReq({
            request_id: 'r',
            attribution: { owner_type: 'galaxy' },
        }));
        const body = await res.json();
        expect(res.status).toBe(400);
        expect(body.error.code).toBe('INVALID_INPUT');
        expect(body.error.message).toContain('owner_type');
    });

    it('rejects out-of-range outcome.quality_score', async () => {
        const res = await POST(postReq({
            request_id: 'r',
            outcome: { status: 'accepted', quality_score: 1.5 },
        }));
        const body = await res.json();
        expect(res.status).toBe(400);
        expect(body.error.code).toBe('INVALID_QUALITY_SCORE');
    });

    it('rejects missing request_id', async () => {
        const res = await POST(postReq({ model: { provider: 'x' } }));
        const body = await res.json();
        expect(res.status).toBe(400);
        expect(body.error.message).toContain('request_id');
    });

    it('rejects non-JSON body', async () => {
        const res = await POST(postReq('not json{'));
        const body = await res.json();
        expect(res.status).toBe(400);
        expect(body.error.code).toBe('INVALID_INPUT');
    });

    it('caller privacy_mode can ratchet tenant tighter', async () => {
        // Tenant default is full_trace + store_prompts true.
        (db.query as any)
            .mockResolvedValueOnce({
                rows: [{
                    default_privacy_mode: 'full_trace',
                    store_prompts: true,
                    store_responses: true,
                    require_redaction: false,
                    retention_days: 90,
                }],
            })
            .mockResolvedValueOnce({ rows: [{ id: 'e1' }] });
        const res = await POST(postReq({
            request_id: 'r',
            privacy_mode: 'metadata_only',
        }));
        const body = await res.json();
        expect(body.privacy.mode).toBe('metadata_only');
        expect(body.privacy.prompt_stored).toBe(false);
        expect(body.privacy.response_stored).toBe(false);
    });
});

describe('POST /api/v2/meter/events — deferred outbox path', () => {
    // Mock the writer stack so the primary INSERT fails and the outbox
    // INSERT succeeds. The writer throws EconomicEventDeferredError; the
    // route must catch it and return 202 with deferred=true.
    function mockDeferredStack() {
        const q = (db.query as any);
        // tenant default
        q.mockResolvedValueOnce({
            rows: [{
                default_privacy_mode: 'metadata_only',
                store_prompts: false, store_responses: false,
                require_redaction: true, retention_days: 30,
            }],
        });
        // primary INSERT into ai_economic_events FAILS (check constraint)
        q.mockRejectedValueOnce(Object.assign(new Error('check'), { code: '23514' }));
        // outbox INSERT succeeds
        q.mockResolvedValueOnce({ rows: [{ id: 'outbox-1', retry_count: 0 }] });
    }

    it('returns 202 deferred=true, NO event_id, prompt/response_stored=false', async () => {
        mockDeferredStack();
        const res = await POST(postReq({
            request_id: 'req_deferred',
            model: { provider: 'openai', model_used: 'gpt-4o-mini' },
            usage: { input_tokens: 10, output_tokens: 5 },
        }));
        const body = await res.json();
        expect(res.status).toBe(202);
        expect(body.ok).toBe(true);
        expect(body.deferred).toBe(true);
        expect(body.request_id).toBe('req_deferred');
        expect(body.event_id).toBeUndefined();
        expect(body.privacy.mode).toBe('metadata_only');
        expect(body.privacy.prompt_stored).toBe(false);
        expect(body.privacy.response_stored).toBe(false);
        expect(body.privacy.retention_expires_at).toMatch(/^\d{4}-\d{2}-\d{2}T/);
    });

    it('the outbox INSERT carries route=/api/v2/meter/events', async () => {
        mockDeferredStack();
        await POST(postReq({ request_id: 'req_meter_surface' }));
        const outboxCall = (db.query as any).mock.calls.find(
            (c: any[]) => /INSERT INTO economic_event_write_failures/.test(c[0]),
        );
        expect(outboxCall).toBeTruthy();
        // bind order: tenant, request_id, source, route, error_code, ...
        expect(outboxCall![1][3]).toBe('/api/v2/meter/events');
        // and the JSONB payload MUST NOT contain _route
        const payload = outboxCall![1][outboxCall![1].length - 1];
        expect(payload).not.toContain('_route');
    });
});

describe('GET /api/v2/meter/events — list', () => {
    it('returns a paged list scoped by tenant', async () => {
        (db.query as any).mockResolvedValueOnce({
            rows: [
                { id: 'e1', request_id: 'r1', privacy_mode: 'metadata_only', prompt_stored: false },
                { id: 'e2', request_id: 'r2', privacy_mode: 'fingerprint_only', prompt_stored: false },
            ],
        });
        const res = await GET(getReq('?limit=10'));
        const body = await res.json();
        expect(res.status).toBe(200);
        expect(body.count).toBe(2);
        expect(body.events[0].request_id).toBe('r1');
    });

    it('binds tenant first and limits last', async () => {
        (db.query as any).mockResolvedValueOnce({ rows: [] });
        await GET(getReq('?limit=25&since=2026-06-01T00:00:00Z'));
        const call = (db.query as any).mock.calls[0];
        expect(call[1][0]).toBe(TENANT);
        // Last bind is limit
        expect(call[1][call[1].length - 1]).toBe(25);
        // SQL filters on tenant_id and event_time
        expect(call[0]).toContain('FROM ai_economic_events');
        expect(call[0]).toContain('tenant_id = $1');
        expect(call[0]).toContain('event_time >=');
        expect(call[0]).toContain('ORDER BY event_time DESC');
    });

    it('caps limit at 200', async () => {
        (db.query as any).mockResolvedValueOnce({ rows: [] });
        await GET(getReq('?limit=99999'));
        const params = (db.query as any).mock.calls[0][1];
        expect(params[params.length - 1]).toBe(200);
    });

    it('binds privacy_mode filter (only valid enum values)', async () => {
        (db.query as any).mockResolvedValueOnce({ rows: [] });
        await GET(getReq('?privacy_mode=fingerprint_only&limit=10'));
        const call = (db.query as any).mock.calls[0];
        expect(call[0]).toContain('privacy_mode = $');
        // Bind order: tenant, privacy_mode, limit
        expect(call[1]).toEqual([TENANT, 'fingerprint_only', 10]);
    });

    it('rejects unknown privacy_mode silently (filter not applied)', async () => {
        (db.query as any).mockResolvedValueOnce({ rows: [] });
        await GET(getReq('?privacy_mode=galaxy_brain&limit=5'));
        const call = (db.query as any).mock.calls[0];
        expect(call[0]).not.toContain('privacy_mode = $');
        expect(call[1]).toEqual([TENANT, 5]);
    });

    it('binds multiple owner-id filters', async () => {
        (db.query as any).mockResolvedValueOnce({ rows: [] });
        await GET(getReq('?department_id=claims&employee_id=emp_42&provider=openai&limit=10'));
        const call = (db.query as any).mock.calls[0];
        expect(call[0]).toContain('department_id = $');
        expect(call[0]).toContain('employee_id = $');
        expect(call[0]).toContain('provider = $');
        // Tenant, department_id, employee_id, provider, limit
        expect(call[1]).toEqual([TENANT, 'claims', 'emp_42', 'openai', 10]);
    });

    it('binds evidence_status=present as NOT NULL filter', async () => {
        (db.query as any).mockResolvedValueOnce({ rows: [] });
        await GET(getReq('?evidence_status=present&limit=5'));
        const call = (db.query as any).mock.calls[0];
        expect(call[0]).toContain('evidence_bundle_id IS NOT NULL');
    });

    it('binds evidence_status=missing as IS NULL filter', async () => {
        (db.query as any).mockResolvedValueOnce({ rows: [] });
        await GET(getReq('?evidence_status=missing&limit=5'));
        const call = (db.query as any).mock.calls[0];
        expect(call[0]).toContain('evidence_bundle_id IS NULL');
    });

    it('ignores oversized filter values', async () => {
        (db.query as any).mockResolvedValueOnce({ rows: [] });
        const long = 'x'.repeat(500);
        await GET(getReq(`?department_id=${long}&limit=5`));
        const call = (db.query as any).mock.calls[0];
        expect(call[0]).not.toContain('department_id = $');
        expect(call[1]).toEqual([TENANT, 5]);
    });
});
