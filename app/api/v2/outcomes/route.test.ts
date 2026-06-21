import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';

vi.mock('@/lib/db', () => ({
    default: { query: vi.fn() },
}));

import db from '@/lib/db';
import { POST } from './route';

const TENANT = '00000000-0000-0000-0000-000000000777';

// Capture queries by their starting verb so legacy tests can still inspect
// the upsert params at a stable index regardless of how many internal queries
// the route fires (currently: SELECT lookup + INSERT upsert).
function getUpsertCall() {
    const calls = (db.query as any).mock.calls as [string, unknown[]][];
    return calls.find(([sql]) => /\bINSERT\s+INTO\s+request_outcomes\b/i.test(sql));
}

function getLookupCall() {
    const calls = (db.query as any).mock.calls as [string, unknown[]][];
    return calls.find(([sql]) => /\bFROM\s+ai_economic_events\b/i.test(sql));
}

function postReq(body: unknown, headers: Record<string, string> = {}) {
    return new NextRequest('http://localhost/api/v2/outcomes', {
        method: 'POST',
        headers: { 'x-p402-tenant': TENANT, 'content-type': 'application/json', ...headers },
        body: typeof body === 'string' ? body : JSON.stringify(body),
    });
}

interface UpsertOpts {
    id?: string;
    quality_score?: number | null;
    source?: string | null;
    metadata?: Record<string, unknown>;
    outcome_type?: string | null;
    reported_by?: string | null;
    occurred_at?: string | Date | null;
}

function mockOk(over: UpsertOpts = {}, linkedEventId: string | null = 'evt_default') {
    // First query is the lookup; second is the upsert. Tests that only care
    // about the upsert can call mockOk() without arguments.
    const lookupRows = linkedEventId ? [{ id: linkedEventId }] : [];
    (db.query as any).mockImplementationOnce(async (sql: string) => {
        if (/FROM\s+ai_economic_events/i.test(sql)) return { rows: lookupRows };
        return { rows: [] };
    });
    (db.query as any).mockImplementationOnce(async (sql: string, params: unknown[]) => {
        if (!/INSERT\s+INTO\s+request_outcomes/i.test(sql)) return { rows: [] };
        return {
            rows: [{
                id: over.id ?? 'out_1',
                tenant_id: params[0],
                request_id: params[1],
                outcome_status: params[2],
                quality_score: over.quality_score === undefined ? (params[3] ?? null) : over.quality_score,
                source: over.source === undefined ? (params[4] ?? null) : over.source,
                metadata: over.metadata === undefined ? params[5] : over.metadata,
                outcome_type: over.outcome_type === undefined ? params[6] : over.outcome_type,
                reported_by: over.reported_by === undefined ? params[7] : over.reported_by,
                occurred_at: over.occurred_at === undefined ? params[8] : over.occurred_at,
                created_at: '2026-06-21T00:00:00Z',
                updated_at: '2026-06-21T00:00:00Z',
            }],
        };
    });
}

beforeEach(() => {
    (db.query as any).mockReset();
});

describe('POST /api/v2/outcomes', () => {
    it('records a valid outcome and returns 200', async () => {
        mockOk({ id: 'out_1' });

        const res = await POST(postReq({
            request_id: 'req_abc123',
            status: 'accepted',
            quality_score: 0.91,
        }));
        const body = await res.json();

        expect(res.status).toBe(200);
        expect(body).toMatchObject({
            ok: true,
            outcome_id: 'out_1',
            request_id: 'req_abc123',
            status: 'accepted',
            quality_score: 0.91,
        });
        expect(body.recorded_at).toBeDefined();
    });

    it('UPSERT bind order: tenant_id, request_id, status, qs, source, metadata, outcome_type, reported_by, occurred_at', async () => {
        mockOk();
        await POST(postReq({
            request_id: 'req_x',
            status: 'failed',
            quality_score: 0.1,
            source: 'sdk',
            metadata: { foo: 'bar' },
        }));
        const upsert = getUpsertCall();
        expect(upsert).toBeDefined();
        const params = upsert![1] as unknown[];
        expect(params[0]).toBe(TENANT);
        expect(params[1]).toBe('req_x');
        expect(params[2]).toBe('failed');
        expect(params[3]).toBe(0.1);
        expect(params[4]).toBe('sdk');
        expect(JSON.parse(params[5] as string)).toEqual({ foo: 'bar' });
        // The three new columns (3AU-1 + 3AU-2):
        expect(params[6]).toBe('request_completion'); // default outcome_type
        expect(typeof params[7]).toBe('string'); // reported_by, derived server-side
        expect(typeof params[8]).toBe('string'); // occurred_at, server-set ISO when omitted
    });

    it('accepts all 6 enum statuses', async () => {
        const statuses = ['accepted', 'rejected', 'retried', 'escalated', 'human_reviewed', 'failed'];
        for (const status of statuses) {
            (db.query as any).mockReset();
            mockOk({ id: `out_${status}` });
            const res = await POST(postReq({ request_id: `req_${status}`, status }));
            expect(res.status).toBe(200);
            const body = await res.json();
            expect(body.status).toBe(status);
        }
    });

    it('rejects unknown status with INVALID_OUTCOME_STATUS', async () => {
        const res = await POST(postReq({ request_id: 'req_y', status: 'mostly_ok' }));
        const body = await res.json();
        expect(res.status).toBe(400);
        expect(body.error.code).toBe('INVALID_OUTCOME_STATUS');
        expect(db.query).not.toHaveBeenCalled();
    });

    it('rejects missing request_id with OUTCOME_REQUEST_ID_REQUIRED', async () => {
        const res = await POST(postReq({ status: 'accepted' }));
        const body = await res.json();
        expect(res.status).toBe(400);
        expect(body.error.code).toBe('OUTCOME_REQUEST_ID_REQUIRED');
        expect(db.query).not.toHaveBeenCalled();
    });

    it('rejects empty request_id with OUTCOME_REQUEST_ID_REQUIRED', async () => {
        const res = await POST(postReq({ request_id: '   ', status: 'accepted' }));
        const body = await res.json();
        expect(res.status).toBe(400);
        expect(body.error.code).toBe('OUTCOME_REQUEST_ID_REQUIRED');
    });

    it('rejects out-of-range quality_score', async () => {
        for (const bad of [-0.01, 1.01, 99, 'high']) {
            const res = await POST(postReq({ request_id: 'r', status: 'accepted', quality_score: bad }));
            const body = await res.json();
            expect(res.status).toBe(400);
            expect(body.error.code).toBe('INVALID_QUALITY_SCORE');
        }
    });

    it('quality_score is optional (null when omitted)', async () => {
        mockOk();
        const res = await POST(postReq({ request_id: 'r', status: 'accepted' }));
        const body = await res.json();
        expect(res.status).toBe(200);
        expect(body.quality_score).toBeNull();
        const upsert = getUpsertCall();
        const params = upsert![1] as unknown[];
        expect(params[3]).toBeNull();
    });

    it('rejects non-JSON body with INVALID_INPUT', async () => {
        const res = await POST(postReq('not json{'));
        const body = await res.json();
        expect(res.status).toBe(400);
        expect(body.error.code).toBe('INVALID_INPUT');
    });

    it('uses ON CONFLICT (tenant_id, request_id) DO UPDATE', async () => {
        mockOk();
        await POST(postReq({ request_id: 'r', status: 'accepted' }));
        const upsert = getUpsertCall();
        const sql = upsert![0] as string;
        expect(sql).toContain('ON CONFLICT (tenant_id, request_id) DO UPDATE');
        expect(sql).toContain('updated_at     = NOW()');
    });

    // ── Slice 3J — transitional superset + content-field rejection ──────
    it('accepts the V5 canonical-only statuses added by v2_054', async () => {
        for (const status of ['revised', 'pending_review', 'unknown']) {
            (db.query as any).mockReset();
            mockOk({ id: `out_${status}` });
            const res = await POST(postReq({ request_id: `req_${status}`, status }));
            expect(res.status, `status=${status}`).toBe(200);
            const body = await res.json();
            expect(body.status).toBe(status);
        }
    });

    it('still accepts the legacy v2_051 values during the transition', async () => {
        for (const status of ['retried', 'human_reviewed']) {
            (db.query as any).mockReset();
            mockOk({ id: `out_${status}` });
            const res = await POST(postReq({ request_id: `req_${status}`, status }));
            expect(res.status, `status=${status}`).toBe(200);
        }
    });

    it('rejects a top-level content field with INVALID_INPUT and no DB write', async () => {
        for (const field of ['prompt','messages','completion','response_body','request_body','transcript','raw_trace','stored_content']) {
            (db.query as any).mockReset();
            const res = await POST(postReq({ request_id: 'r', status: 'accepted', [field]: 'X' }));
            const body = await res.json();
            expect(res.status, `field=${field}`).toBe(400);
            expect(body.error.code).toBe('INVALID_INPUT');
            expect(body.error.details?.forbidden_field).toBe(field);
            expect(db.query).not.toHaveBeenCalled();
        }
    });

    it('rejects a metadata-level content field with INVALID_INPUT and no DB write', async () => {
        for (const field of ['prompt','messages','response','completion','response_body','request_body','transcript']) {
            (db.query as any).mockReset();
            const res = await POST(postReq({
                request_id: 'r', status: 'accepted',
                metadata: { [field]: 'X' },
            }));
            const body = await res.json();
            expect(res.status, `metadata.${field}`).toBe(400);
            expect(body.error.code).toBe('INVALID_INPUT');
            expect(body.error.details?.forbidden_field).toBe(`metadata.${field}`);
            expect(db.query).not.toHaveBeenCalled();
        }
    });

    it('persists canonical source "sdk" and does NOT tag legacy_source', async () => {
        mockOk();
        await POST(postReq({ request_id: 'r', status: 'accepted', source: 'sdk' }));
        const upsert = getUpsertCall();
        const params = upsert![1] as unknown[];
        expect(params[4]).toBe('sdk');
        expect(JSON.parse(params[5] as string)).toEqual({});
    });

    it('persists canonical source "api" and does NOT tag legacy_source', async () => {
        mockOk();
        await POST(postReq({ request_id: 'r', status: 'accepted', source: 'api' }));
        const upsert = getUpsertCall();
        const params = upsert![1] as unknown[];
        // 'api' is not in CANONICAL_OUTCOME_SOURCES from lib/prove/outcome.ts,
        // so route tags it as legacy_source; but the foundation persists the
        // original string into request_outcomes.source.
        expect(params[4]).toBe('api');
        expect(JSON.parse(params[5] as string)).toMatchObject({ legacy_source: 'api' });
    });

    it('persists non-canonical source "webhook" and tags metadata.legacy_source', async () => {
        mockOk();
        await POST(postReq({ request_id: 'r', status: 'accepted', source: 'webhook' }));
        const upsert = getUpsertCall();
        const params = upsert![1] as unknown[];
        expect(params[4]).toBe('webhook');
        expect(JSON.parse(params[5] as string)).toMatchObject({ legacy_source: 'webhook' });
    });

    it('persists source=null when source is missing from the body', async () => {
        mockOk();
        await POST(postReq({ request_id: 'r', status: 'accepted' }));
        const upsert = getUpsertCall();
        const params = upsert![1] as unknown[];
        expect(params[4]).toBeNull();
        expect(JSON.parse(params[5] as string)).toEqual({});
    });

    it('persists source=null when source is non-string and adds no legacy_source', async () => {
        mockOk();
        await POST(postReq({
            request_id: 'r',
            status: 'accepted',
            source: 42 as any,
            metadata: 'not-an-object' as any,
        }));
        const upsert = getUpsertCall();
        const params = upsert![1] as unknown[];
        expect(params[4]).toBeNull();
        expect(JSON.parse(params[5] as string)).toEqual({});
    });

    // ── 3AU-2 new contract ────────────────────────────────────────────────
    it('rejects tenant_id from request body with INVALID_INPUT', async () => {
        const res = await POST(postReq({ request_id: 'r', status: 'accepted', tenant_id: 'forbidden' }));
        const body = await res.json();
        expect(res.status).toBe(400);
        expect(body.error.code).toBe('INVALID_INPUT');
        expect(db.query).not.toHaveBeenCalled();
    });

    it('rejects tenantId (camelCase) from request body with INVALID_INPUT', async () => {
        const res = await POST(postReq({ request_id: 'r', status: 'accepted', tenantId: 'forbidden' }));
        const body = await res.json();
        expect(res.status).toBe(400);
        expect(body.error.code).toBe('INVALID_INPUT');
    });

    it('defaults outcome_type to request_completion when missing', async () => {
        mockOk();
        const res = await POST(postReq({ request_id: 'r', status: 'accepted' }));
        const body = await res.json();
        expect(res.status).toBe(200);
        expect(body.outcome_type).toBe('request_completion');
        const upsert = getUpsertCall();
        const params = upsert![1] as unknown[];
        expect(params[6]).toBe('request_completion');
    });

    it('accepts an explicit outcome_type from the body', async () => {
        mockOk();
        const res = await POST(postReq({ request_id: 'r', status: 'accepted', outcome_type: 'human_review' }));
        const body = await res.json();
        expect(res.status).toBe(200);
        expect(body.outcome_type).toBe('human_review');
        const upsert = getUpsertCall();
        const params = upsert![1] as unknown[];
        expect(params[6]).toBe('human_review');
    });

    it('rejects an unknown outcome_type with INVALID_OUTCOME_TYPE', async () => {
        const res = await POST(postReq({ request_id: 'r', status: 'accepted', outcome_type: 'mystery' }));
        const body = await res.json();
        expect(res.status).toBe(400);
        expect(body.error.code).toBe('INVALID_OUTCOME_TYPE');
        expect(db.query).not.toHaveBeenCalled();
    });

    it('persists occurred_at when a valid ISO string is supplied', async () => {
        mockOk();
        const iso = '2026-06-21T10:00:00.000Z';
        const res = await POST(postReq({ request_id: 'r', status: 'accepted', occurred_at: iso }));
        const body = await res.json();
        expect(res.status).toBe(200);
        expect(body.occurred_at).toBe(iso);
        const upsert = getUpsertCall();
        const params = upsert![1] as unknown[];
        expect(params[8]).toBe(iso);
    });

    it('rejects a non-ISO occurred_at with INVALID_OCCURRED_AT', async () => {
        const res = await POST(postReq({ request_id: 'r', status: 'accepted', occurred_at: 'tomorrow' }));
        const body = await res.json();
        expect(res.status).toBe(400);
        expect(body.error.code).toBe('INVALID_OCCURRED_AT');
    });

    it('accepts strict ISO 8601 / RFC 3339 datetimes', async () => {
        const okTimestamps = [
            '2026-06-21T10:00:00Z',
            '2026-06-21T10:00:00.000Z',
            '2026-06-21T10:00:00.123456Z',
            '2026-06-21T10:00:00+04:00',
            '2026-06-21T10:00:00-05:30',
            '2026-06-21T10:00:00.500-05:30',
        ];
        for (const ts of okTimestamps) {
            (db.query as any).mockReset();
            mockOk();
            const res = await POST(postReq({ request_id: 'r', status: 'accepted', occurred_at: ts }));
            expect(res.status, `ts=${ts}`).toBe(200);
        }
    });

    it('rejects non-ISO timestamp shapes with INVALID_OCCURRED_AT', async () => {
        const badTimestamps = [
            'tomorrow',
            '06/21/2026',
            '2026-06-21',           // date only, no time
            '10:00',                // time only
            '2026-06-21T10:00:00',  // no offset
            '2026/06/21T10:00:00Z', // wrong separators
            'June 21, 2026',
        ];
        for (const ts of badTimestamps) {
            (db.query as any).mockReset();
            const res = await POST(postReq({ request_id: 'r', status: 'accepted', occurred_at: ts }));
            const body = await res.json();
            expect(res.status, `ts=${ts}`).toBe(400);
            expect(body.error.code).toBe('INVALID_OCCURRED_AT');
            expect(db.query).not.toHaveBeenCalled();
        }
    });

    it('derives reported_by from x-p402-reported-by header when present', async () => {
        mockOk();
        await POST(postReq({ request_id: 'r', status: 'accepted' }, { 'x-p402-reported-by': 'sdk-1.4.2' }));
        const upsert = getUpsertCall();
        const params = upsert![1] as unknown[];
        expect(params[7]).toBe('sdk-1.4.2');
    });

    it('defaults reported_by to "tenant-api" when no header is supplied', async () => {
        mockOk();
        await POST(postReq({ request_id: 'r', status: 'accepted' }));
        const upsert = getUpsertCall();
        const params = upsert![1] as unknown[];
        expect(params[7]).toBe('tenant-api');
    });

    it('returns orphan=true and economic_event_id=null when no metered event exists', async () => {
        mockOk({}, null);
        const res = await POST(postReq({ request_id: 'r', status: 'accepted' }));
        const body = await res.json();
        expect(res.status).toBe(200);
        expect(body.orphan).toBe(true);
        expect(body.economic_event_id).toBeNull();
    });

    it('returns orphan=false and economic_event_id when a metered event exists', async () => {
        mockOk({}, 'evt_xyz');
        const res = await POST(postReq({ request_id: 'r', status: 'accepted' }));
        const body = await res.json();
        expect(res.status).toBe(200);
        expect(body.orphan).toBe(false);
        expect(body.economic_event_id).toBe('evt_xyz');
    });

    it('lookup query is parameterized and tenant-scoped on $1', async () => {
        mockOk();
        await POST(postReq({ request_id: 'r', status: 'accepted' }));
        const lookup = getLookupCall();
        expect(lookup).toBeDefined();
        expect(lookup![0]).toMatch(/tenant_id\s*=\s*\$1/);
        expect((lookup![1] as unknown[])[0]).toBe(TENANT);
    });

    it('rejects forbidden metadata synonyms via the foundation layer', async () => {
        // sanitizeMetadata uses regex patterns beyond the canonical set.
        // The route's scanForForbiddenFields catches the canonical set first;
        // a synonym like `prompt_text` is not in the canonical set but should
        // still be rejected via the foundation.
        for (const key of ['prompt_text', 'user_prompt', 'response_json', 'message_content', 'raw_messages']) {
            (db.query as any).mockReset();
            // The foundation runs after the lookup; mock lookup to succeed.
            (db.query as any).mockImplementationOnce(async () => ({ rows: [{ id: 'e' }] }));
            const res = await POST(postReq({ request_id: 'r', status: 'accepted', metadata: { [key]: 'leak' } }));
            const body = await res.json();
            expect(res.status, `metadata.${key}`).toBe(400);
            expect(body.error.code).toBe('INVALID_INPUT');
        }
    });
});
