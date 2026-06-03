import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';

vi.mock('@/lib/db', () => ({
    default: { query: vi.fn() },
}));

import db from '@/lib/db';
import { GET } from './route';

const TENANT = '00000000-0000-0000-0000-000000000777';
const EVENT_ID = '11111111-1111-1111-1111-111111111111';

function req() {
    return new NextRequest(`http://localhost/api/v2/meter/events/${EVENT_ID}`, {
        headers: { 'x-p402-tenant': TENANT },
    });
}

beforeEach(() => (db.query as any).mockReset());

describe('GET /api/v2/meter/events/[id]', () => {
    it('returns the event scoped to tenant', async () => {
        (db.query as any).mockResolvedValueOnce({
            rows: [{
                id: EVENT_ID,
                tenant_id: TENANT,
                request_id: 'r1',
                privacy_mode: 'metadata_only',
                prompt_stored: false,
                response_stored: false,
                redaction_applied: false,
                retention_expires_at: '2026-07-01T00:00:00Z',
            }],
        });
        const res = await GET(req(), { params: Promise.resolve({ id: EVENT_ID }) });
        const body = await res.json();
        expect(res.status).toBe(200);
        expect(body.event.id).toBe(EVENT_ID);
        expect(body.event.privacy_mode).toBe('metadata_only');
    });

    it('binds id and tenant_id (tenant isolation by query, not just by check)', async () => {
        (db.query as any).mockResolvedValueOnce({ rows: [] });
        await GET(req(), { params: Promise.resolve({ id: EVENT_ID }) });
        const call = (db.query as any).mock.calls[0];
        expect(call[0]).toContain('FROM ai_economic_events');
        expect(call[0]).toContain('WHERE id = $1 AND tenant_id = $2');
        expect(call[1]).toEqual([EVENT_ID, TENANT]);
    });

    it('returns 404 when row does not belong to tenant', async () => {
        (db.query as any).mockResolvedValueOnce({ rows: [] });
        const res = await GET(req(), { params: Promise.resolve({ id: EVENT_ID }) });
        const body = await res.json();
        expect(res.status).toBe(404);
        expect(body.error.code).toBe('NOT_FOUND');
    });

    it('rejects oversized id with INVALID_INPUT', async () => {
        const longId = 'x'.repeat(200);
        const res = await GET(
            new NextRequest(`http://localhost/api/v2/meter/events/${longId}`, {
                headers: { 'x-p402-tenant': TENANT },
            }),
            { params: Promise.resolve({ id: longId }) },
        );
        const body = await res.json();
        expect(res.status).toBe(400);
        expect(body.error.code).toBe('INVALID_INPUT');
    });
});
