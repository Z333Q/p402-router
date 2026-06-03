import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';

vi.mock('@/lib/db', () => ({
    default: { query: vi.fn() },
}));

import db from '@/lib/db';
import { getServerSession } from 'next-auth';
import { GET, POST } from './route';

const TENANT = '00000000-0000-0000-0000-000000000bbb';
const OWNER  = 'owner@example.com';

function req(method: 'GET' | 'POST', body?: unknown) {
    return new NextRequest('http://localhost/api/v2/privacy/scope-overrides', {
        method,
        headers: { 'x-p402-tenant': TENANT, 'content-type': 'application/json' },
        body: body ? JSON.stringify(body) : undefined,
    });
}

function setOwnerSession() {
    (getServerSession as any).mockResolvedValue({
        user: { email: OWNER, tenantId: TENANT, isAdmin: false },
    });
}

beforeEach(() => {
    (db.query as any).mockReset();
    (getServerSession as any).mockReset();
});

describe('GET /api/v2/privacy/scope-overrides', () => {
    it('lists overrides ordered by scope, scope_id', async () => {
        (db.query as any).mockResolvedValueOnce({
            rows: [
                { id: 'o1', scope: 'department', scope_id: 'claims',  privacy_mode: 'redacted_trace' },
                { id: 'o2', scope: 'workflow',   scope_id: 'support', privacy_mode: 'metadata_only' },
            ],
        });
        const res = await GET(req('GET'));
        const body = await res.json();
        expect(res.status).toBe(200);
        expect(body.count).toBe(2);
        expect(body.overrides[0].id).toBe('o1');
    });
});

describe('POST /api/v2/privacy/scope-overrides — admin gate + widening', () => {
    it('401 when no session', async () => {
        (getServerSession as any).mockResolvedValue(null);
        const res = await POST(req('POST', {
            scope: 'department', scope_id: 'claims', privacy_mode: 'full_trace',
        }));
        expect(res.status).toBe(401);
        expect(db.query).not.toHaveBeenCalled();
    });

    it('403 when caller is not the tenant owner', async () => {
        (getServerSession as any).mockResolvedValue({
            user: { email: 'stranger@example.com', tenantId: TENANT, isAdmin: false },
        });
        (db.query as any).mockResolvedValueOnce({ rows: [{ owner_email: OWNER }] });
        const res = await POST(req('POST', {
            scope: 'department', scope_id: 'claims', privacy_mode: 'full_trace',
        }));
        expect(res.status).toBe(403);
    });

    it('owner CAN save a widening override (tenant default + workflow=full_trace)', async () => {
        // This is the V5 widening rule in action — saved by an authorized admin.
        setOwnerSession();
        (db.query as any)
            .mockResolvedValueOnce({ rows: [{ owner_email: OWNER }] }) // owner check
            .mockResolvedValueOnce({                                    // UPSERT
                rows: [{
                    id: 'o1', tenant_id: TENANT, scope: 'workflow',
                    scope_id: 'engineering_debug', privacy_mode: 'full_trace',
                    store_prompts: true, store_responses: true,
                    retention_days: 14,
                    metadata: { last_modified_by_email: OWNER, widening_save: true },
                }],
            });

        const res = await POST(req('POST', {
            scope: 'workflow',
            scope_id: 'engineering_debug',
            privacy_mode: 'full_trace',
            store_prompts: true,
            store_responses: true,
            retention_days: 14,
        }));
        const body = await res.json();
        expect(res.status).toBe(200);
        expect(body.override.privacy_mode).toBe('full_trace');
        // Audit metadata is bound at position 8 (last)
        const upsertCall = (db.query as any).mock.calls[1];
        const auditMeta = upsertCall[1][7];
        expect(auditMeta.last_modified_by_email).toBe(OWNER);
        expect(auditMeta.widening_save).toBe(true);
    });

    it('rejects invalid scope', async () => {
        setOwnerSession();
        (db.query as any).mockResolvedValueOnce({ rows: [{ owner_email: OWNER }] });
        const res = await POST(req('POST', {
            scope: 'galaxy', scope_id: 'gid', privacy_mode: 'metadata_only',
        }));
        expect(res.status).toBe(400);
    });

    it('rejects invalid privacy_mode', async () => {
        setOwnerSession();
        (db.query as any).mockResolvedValueOnce({ rows: [{ owner_email: OWNER }] });
        const res = await POST(req('POST', {
            scope: 'department', scope_id: 'claims', privacy_mode: 'wide_open',
        }));
        expect(res.status).toBe(400);
    });

    it('rejects retention_days out of range', async () => {
        setOwnerSession();
        (db.query as any).mockResolvedValueOnce({ rows: [{ owner_email: OWNER }] });
        const res = await POST(req('POST', {
            scope: 'department', scope_id: 'claims', privacy_mode: 'metadata_only',
            retention_days: 0,
        }));
        expect(res.status).toBe(400);
    });

    it('null store_prompts/store_responses are bound as-is (means inherit)', async () => {
        setOwnerSession();
        (db.query as any)
            .mockResolvedValueOnce({ rows: [{ owner_email: OWNER }] })
            .mockResolvedValueOnce({ rows: [{ id: 'o1' }] });
        await POST(req('POST', {
            scope: 'department', scope_id: 'claims', privacy_mode: 'redacted_trace',
            // omit store_prompts and store_responses entirely
        }));
        const upsertCall = (db.query as any).mock.calls[1];
        // bind positions: tenant(0), scope(1), scope_id(2), mode(3), store_prompts(4), store_responses(5), retention(6), meta(7)
        expect(upsertCall[1][4]).toBeNull();
        expect(upsertCall[1][5]).toBeNull();
    });
});
