import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';

vi.mock('@/lib/db', () => ({
    default: { query: vi.fn() },
}));

import db from '@/lib/db';
import { POST } from './route';

const TENANT = '00000000-0000-0000-0000-000000000777';

function postReq(body: unknown) {
    return new NextRequest('http://localhost/api/v2/outcomes', {
        method: 'POST',
        headers: { 'x-p402-tenant': TENANT, 'content-type': 'application/json' },
        body: typeof body === 'string' ? body : JSON.stringify(body),
    });
}

beforeEach(() => {
    (db.query as any).mockReset();
});

describe('POST /api/v2/outcomes', () => {
    it('records a valid outcome and returns 200', async () => {
        (db.query as any).mockResolvedValueOnce({
            rows: [{ id: 'out_1', created_at: '2026-06-03T00:00:00Z', updated_at: '2026-06-03T00:00:00Z' }],
        });

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

    it('UPSERT bind order: tenant_id, request_id, status, qs, source, metadata', async () => {
        (db.query as any).mockResolvedValueOnce({ rows: [{ id: 'x', updated_at: 'now' }] });
        await POST(postReq({
            request_id: 'req_x',
            status: 'failed',
            quality_score: 0.1,
            source: 'sdk',
            metadata: { foo: 'bar' },
        }));
        const params = (db.query as any).mock.calls[0][1];
        expect(params[0]).toBe(TENANT);
        expect(params[1]).toBe('req_x');
        expect(params[2]).toBe('failed');
        expect(params[3]).toBe(0.1);
        expect(params[4]).toBe('sdk');
        expect(params[5]).toEqual({ foo: 'bar' });
    });

    it('accepts all 6 enum statuses', async () => {
        const statuses = ['accepted', 'rejected', 'retried', 'escalated', 'human_reviewed', 'failed'];
        for (const status of statuses) {
            (db.query as any).mockResolvedValueOnce({ rows: [{ id: `out_${status}`, updated_at: 'now' }] });
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
        // NaN/Infinity are excluded from JSON; clients can't transmit them.
        for (const bad of [-0.01, 1.01, 99, 'high']) {
            const res = await POST(postReq({ request_id: 'r', status: 'accepted', quality_score: bad }));
            const body = await res.json();
            expect(res.status).toBe(400);
            expect(body.error.code).toBe('INVALID_QUALITY_SCORE');
        }
    });

    it('quality_score is optional (null when omitted)', async () => {
        (db.query as any).mockResolvedValueOnce({ rows: [{ id: 'x', updated_at: 'now' }] });
        const res = await POST(postReq({ request_id: 'r', status: 'accepted' }));
        const body = await res.json();
        expect(res.status).toBe(200);
        expect(body.quality_score).toBeNull();
        const params = (db.query as any).mock.calls[0][1];
        expect(params[3]).toBeNull();
    });

    it('rejects non-JSON body with INVALID_INPUT', async () => {
        const res = await POST(postReq('not json{'));
        const body = await res.json();
        expect(res.status).toBe(400);
        expect(body.error.code).toBe('INVALID_INPUT');
    });

    // 401 path is covered by __tests__/route-integrity.test.ts globally; the
    // requireTenantAccess test mock in __tests__/setup.ts shortcuts auth, so
    // we can't reproduce a real unauthenticated call from here. The endpoint
    // calls requireTenantAccess and respects { error, status } per the
    // standard pattern shared with every other v1/v2 route.

    it('uses ON CONFLICT (tenant_id, request_id) DO UPDATE', async () => {
        (db.query as any).mockResolvedValueOnce({ rows: [{ id: 'x', updated_at: 'now' }] });
        await POST(postReq({ request_id: 'r', status: 'accepted' }));
        const sql = (db.query as any).mock.calls[0][0];
        expect(sql).toContain('ON CONFLICT (tenant_id, request_id) DO UPDATE');
        expect(sql).toContain('updated_at = NOW()');
    });

    // ── Slice 3J — transitional superset + content-field rejection ──────
    it('accepts the V5 canonical-only statuses added by v2_054', async () => {
        for (const status of ['revised', 'pending_review', 'unknown']) {
            (db.query as any).mockResolvedValueOnce({ rows: [{ id: `out_${status}`, updated_at: 'now' }] });
            const res = await POST(postReq({ request_id: `req_${status}`, status }));
            expect(res.status, `status=${status}`).toBe(200);
            const body = await res.json();
            expect(body.status).toBe(status);
        }
    });

    it('still accepts the legacy v2_051 values during the transition', async () => {
        for (const status of ['retried', 'human_reviewed']) {
            (db.query as any).mockResolvedValueOnce({ rows: [{ id: `out_${status}`, updated_at: 'now' }] });
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

    it('tags non-canonical sources via metadata.legacy_source (backward compat)', async () => {
        (db.query as any).mockResolvedValueOnce({ rows: [{ id: 'x', updated_at: 'now' }] });
        await POST(postReq({ request_id: 'r', status: 'accepted', source: 'webhook' }));
        const params = (db.query as any).mock.calls[0][1];
        expect(params[4]).toBe('webhook');
        expect(params[5]).toMatchObject({ legacy_source: 'webhook' });
    });

    it('does NOT tag legacy_source when the source IS canonical', async () => {
        (db.query as any).mockResolvedValueOnce({ rows: [{ id: 'x', updated_at: 'now' }] });
        await POST(postReq({ request_id: 'r', status: 'accepted', source: 'sdk' }));
        const params = (db.query as any).mock.calls[0][1];
        expect(params[5]).toEqual({});
    });

    it('clamps source to a string and ignores non-string metadata', async () => {
        (db.query as any).mockResolvedValueOnce({ rows: [{ id: 'x', updated_at: 'now' }] });
        await POST(postReq({
            request_id: 'r',
            status: 'accepted',
            source: 42 as any,
            metadata: 'not-an-object' as any,
        }));
        const params = (db.query as any).mock.calls[0][1];
        expect(params[4]).toBeNull();   // source rejected because not string
        expect(params[5]).toEqual({});  // metadata replaced with {} when not object
    });
});
