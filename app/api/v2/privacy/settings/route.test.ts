import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';

vi.mock('@/lib/db', () => ({
    default: { query: vi.fn() },
}));

import db from '@/lib/db';
import { getServerSession } from 'next-auth';
import { GET, PUT } from './route';

const TENANT  = '00000000-0000-0000-0000-000000000aaa';
const OWNER   = 'owner@example.com';
const STRANGER = 'other@example.com';

function req(method: 'GET' | 'PUT', body?: unknown) {
    return new NextRequest('http://localhost/api/v2/privacy/settings', {
        method,
        headers: { 'x-p402-tenant': TENANT, 'content-type': 'application/json' },
        body: body ? JSON.stringify(body) : undefined,
    });
}

function setSession(opts: { email?: string; tenantId?: string; isAdmin?: boolean } | null) {
    (getServerSession as any).mockResolvedValue(
        opts === null ? null : {
            user: {
                email:    opts.email,
                tenantId: opts.tenantId,
                isAdmin:  opts.isAdmin ?? false,
            },
        },
    );
}

beforeEach(() => {
    (db.query as any).mockReset();
    (getServerSession as any).mockReset();
});

describe('GET /api/v2/privacy/settings', () => {
    it('returns system default when no row exists', async () => {
        (db.query as any).mockResolvedValueOnce({ rows: [] });
        const res = await GET(req('GET'));
        const body = await res.json();
        expect(res.status).toBe(200);
        expect(body.settings.default_privacy_mode).toBe('metadata_only');
        expect(body.settings.store_prompts).toBe(false);
        expect(body.settings.source).toBe('system_default');
    });

    it('returns tenant default when row exists', async () => {
        (db.query as any).mockResolvedValueOnce({
            rows: [{
                default_privacy_mode: 'redacted_trace',
                store_prompts: false,
                store_responses: false,
                allow_fingerprints: true,
                allow_redacted_traces: true,
                retention_days: 60,
                require_redaction: true,
                customer_managed_key: false,
                metadata: {},
            }],
        });
        const res = await GET(req('GET'));
        const body = await res.json();
        expect(body.settings.default_privacy_mode).toBe('redacted_trace');
        expect(body.settings.source).toBe('tenant_default');
    });
});

describe('PUT /api/v2/privacy/settings — admin gate', () => {
    it('401 when no session', async () => {
        setSession(null);
        const res = await PUT(req('PUT', { default_privacy_mode: 'redacted_trace' }));
        expect(res.status).toBe(401);
        expect(db.query).not.toHaveBeenCalled();
    });

    it('403 when session user is not the tenant owner', async () => {
        setSession({ email: STRANGER, tenantId: TENANT, isAdmin: false });
        // owner_email lookup returns OWNER
        (db.query as any).mockResolvedValueOnce({ rows: [{ owner_email: OWNER }] });
        const res = await PUT(req('PUT', { default_privacy_mode: 'redacted_trace' }));
        expect(res.status).toBe(403);
        const body = await res.json();
        expect(body.error).toContain('tenant-admin');
    });

    it('happy path: owner saves new defaults; records audit metadata', async () => {
        setSession({ email: OWNER, tenantId: TENANT, isAdmin: false });
        // (1) owner_email lookup
        (db.query as any).mockResolvedValueOnce({ rows: [{ owner_email: OWNER }] });
        // (2) UPSERT returning the row
        (db.query as any).mockResolvedValueOnce({
            rows: [{
                tenant_id: TENANT,
                default_privacy_mode: 'redacted_trace',
                store_prompts: false,
                store_responses: false,
                allow_fingerprints: true,
                allow_redacted_traces: true,
                retention_days: 60,
                require_redaction: true,
                customer_managed_key: false,
                metadata: { last_modified_by_email: OWNER },
            }],
        });

        const res = await PUT(req('PUT', {
            default_privacy_mode: 'redacted_trace',
            allow_redacted_traces: true,
            retention_days: 60,
        }));
        const body = await res.json();
        expect(res.status).toBe(200);
        expect(body.settings.default_privacy_mode).toBe('redacted_trace');
        // Audit metadata is bound at position 10 (last) — confirm the email was passed
        const upsertCall = (db.query as any).mock.calls[1];
        const auditMeta = upsertCall[1][9];
        expect(auditMeta.last_modified_by_email).toBe(OWNER);
        expect(auditMeta.last_modified_at).toMatch(/^\d{4}-\d{2}-\d{2}T/);
    });

    it('global admin bypasses owner check', async () => {
        setSession({ email: 'p402-admin@example.com', tenantId: TENANT, isAdmin: true });
        // No owner_email lookup expected — admin bypasses it.
        (db.query as any).mockResolvedValueOnce({ rows: [{
            tenant_id: TENANT,
            default_privacy_mode: 'metadata_only',
            store_prompts: false,
            store_responses: false,
            allow_fingerprints: true,
            allow_redacted_traces: false,
            retention_days: 30,
            require_redaction: true,
            customer_managed_key: false,
            metadata: {},
        }] });

        const res = await PUT(req('PUT', { default_privacy_mode: 'metadata_only' }));
        expect(res.status).toBe(200);
        // Only one query (the UPSERT) — owner lookup skipped.
        expect((db.query as any).mock.calls.length).toBe(1);
    });

    it('rejects unknown privacy_mode', async () => {
        setSession({ email: OWNER, tenantId: TENANT, isAdmin: false });
        (db.query as any).mockResolvedValueOnce({ rows: [{ owner_email: OWNER }] });
        const res = await PUT(req('PUT', { default_privacy_mode: 'public_internet' }));
        expect(res.status).toBe(400);
        const body = await res.json();
        expect(body.error.code).toBe('INVALID_INPUT');
    });

    it('coerces invalid retention_days to clamped range', async () => {
        setSession({ email: OWNER, tenantId: TENANT, isAdmin: false });
        (db.query as any).mockResolvedValueOnce({ rows: [{ owner_email: OWNER }] });
        (db.query as any).mockResolvedValueOnce({ rows: [{
            tenant_id: TENANT, default_privacy_mode: 'metadata_only',
            store_prompts: false, store_responses: false,
            allow_fingerprints: true, allow_redacted_traces: false,
            retention_days: 3650, require_redaction: true,
            customer_managed_key: false, metadata: {},
        }] });
        await PUT(req('PUT', { retention_days: 999999 }));
        // Bind value at position 7 (retention_days) clamped to 3650
        const upsertCall = (db.query as any).mock.calls[1];
        expect(upsertCall[1][6]).toBe(3650);
    });
});
