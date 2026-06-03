import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';

vi.mock('@/lib/db', () => ({
    default: { query: vi.fn() },
}));

import db from '@/lib/db';
import { getServerSession } from 'next-auth';
import { DELETE } from './route';

const TENANT = '00000000-0000-0000-0000-000000000ccc';
const OWNER  = 'owner@example.com';
const OVERRIDE_ID = '11111111-1111-1111-1111-111111111111';

function req() {
    return new NextRequest(`http://localhost/api/v2/privacy/scope-overrides/${OVERRIDE_ID}`, {
        method: 'DELETE',
        headers: { 'x-p402-tenant': TENANT },
    });
}

beforeEach(() => {
    (db.query as any).mockReset();
    (getServerSession as any).mockReset();
});

describe('DELETE /api/v2/privacy/scope-overrides/[id]', () => {
    it('401 when no session', async () => {
        (getServerSession as any).mockResolvedValue(null);
        const res = await DELETE(req(), { params: Promise.resolve({ id: OVERRIDE_ID }) });
        expect(res.status).toBe(401);
        expect(db.query).not.toHaveBeenCalled();
    });

    it('deletes a row owned by tenant', async () => {
        (getServerSession as any).mockResolvedValue({
            user: { email: OWNER, tenantId: TENANT, isAdmin: false },
        });
        (db.query as any)
            .mockResolvedValueOnce({ rows: [{ owner_email: OWNER }] }) // owner check
            .mockResolvedValueOnce({ rows: [{ id: OVERRIDE_ID }] });   // DELETE returning

        const res = await DELETE(req(), { params: Promise.resolve({ id: OVERRIDE_ID }) });
        const body = await res.json();
        expect(res.status).toBe(200);
        expect(body.deleted_id).toBe(OVERRIDE_ID);
        // Bound (id, tenant_id) — tenant isolation by query
        const deleteCall = (db.query as any).mock.calls[1];
        expect(deleteCall[1]).toEqual([OVERRIDE_ID, TENANT]);
    });

    it('404 when row not found or wrong tenant', async () => {
        (getServerSession as any).mockResolvedValue({
            user: { email: OWNER, tenantId: TENANT, isAdmin: false },
        });
        (db.query as any)
            .mockResolvedValueOnce({ rows: [{ owner_email: OWNER }] })
            .mockResolvedValueOnce({ rows: [] });

        const res = await DELETE(req(), { params: Promise.resolve({ id: OVERRIDE_ID }) });
        const body = await res.json();
        expect(res.status).toBe(404);
        expect(body.error.code).toBe('NOT_FOUND');
    });
});
