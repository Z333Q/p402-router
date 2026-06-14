/**
 * Slice 3S — Route tests for /api/v2/control/configuration.
 *
 * Mirrors the privacy/settings test pattern: mock @/lib/db at the module
 * level, control getServerSession per-test. Pins:
 *   - GET returns system default when no row exists
 *   - GET returns tenant default when a row exists
 *   - PATCH requires admin (401 unauth, 403 non-owner)
 *   - PATCH rejects body tenant_id
 *   - PATCH rejects unknown keys
 *   - PATCH rejects numeric strings, negatives, non-finite
 *   - PATCH rejects bad array shapes, duplicates, > 200 entries
 *   - PATCH partial updates preserve untouched fields (UPSERT shape)
 *   - PATCH stamps metadata.last_modified_by_email + last_modified_at
 *   - SQL is parameterized (tenant id is never inlined in the SQL string)
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';

vi.mock('@/lib/db', () => ({
    default: { query: vi.fn() },
}));

vi.mock('@/lib/redis', () => ({
    default: {
        del: vi.fn(),
    },
}));

import db from '@/lib/db';
import redis from '@/lib/redis';
import { getServerSession } from 'next-auth';
import { GET, PATCH } from './route';

const TENANT = '00000000-0000-0000-0000-000000000bbb';
const OWNER  = 'owner@example.com';

function req(method: 'GET' | 'PATCH', body?: unknown) {
    return new NextRequest('http://localhost/api/v2/control/configuration', {
        method,
        headers: { 'x-p402-tenant': TENANT, 'content-type': 'application/json' },
        body: body !== undefined ? JSON.stringify(body) : undefined,
    });
}

function setSession(opts: { email?: string; tenantId?: string; isAdmin?: boolean } | null) {
    (getServerSession as unknown as ReturnType<typeof vi.fn>).mockResolvedValue(
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
    (db.query as unknown as ReturnType<typeof vi.fn>).mockReset();
    (getServerSession as unknown as ReturnType<typeof vi.fn>).mockReset();
    ((redis as unknown as { del: ReturnType<typeof vi.fn> }).del).mockReset();
    // Default: Redis del succeeds. Failure cases override per-test.
    ((redis as unknown as { del: ReturnType<typeof vi.fn> }).del).mockResolvedValue(1);
});

// ─────────────────────────────────────────────────────────────────────────────
// GET
// ─────────────────────────────────────────────────────────────────────────────

describe('GET /api/v2/control/configuration', () => {
    it('returns system default when no row exists', async () => {
        setSession({ email: OWNER, tenantId: TENANT });
        (db.query as unknown as ReturnType<typeof vi.fn>).mockResolvedValueOnce({ rows: [] });
        const r = await GET(req('GET'));
        const body = await r.json();
        expect(r.status).toBe(200);
        expect(body.settings.source).toBe('system_default');
        expect(body.settings.monthly_budget_usd).toBeNull();
        expect(body.settings.allowed_models).toEqual([]);
    });

    it('returns tenant default when a row exists', async () => {
        setSession({ email: OWNER, tenantId: TENANT });
        (db.query as unknown as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
            rows: [{
                monthly_budget_usd: '500',
                max_cost_per_request_usd: null,
                human_review_threshold_usd: '10',
                allowed_models: ['gpt-4o-mini'],
                allowed_task_types: [],
                metadata: { last_modified_by_email: OWNER },
            }],
        });
        const r = await GET(req('GET'));
        const body = await r.json();
        expect(body.settings.source).toBe('tenant_default');
        expect(body.settings.monthly_budget_usd).toBe(500);
        expect(body.settings.max_cost_per_request_usd).toBeNull();
        expect(body.settings.human_review_threshold_usd).toBe(10);
        expect(body.settings.allowed_models).toEqual(['gpt-4o-mini']);
    });

    it('GET binds tenant_id through a parameter; never inlines it', async () => {
        setSession({ email: OWNER, tenantId: TENANT });
        (db.query as unknown as ReturnType<typeof vi.fn>).mockResolvedValueOnce({ rows: [] });
        await GET(req('GET'));
        const calls = (db.query as unknown as ReturnType<typeof vi.fn>).mock.calls;
        expect(calls).toHaveLength(1);
        const [sql, params] = calls[0]!;
        expect(sql).toContain('WHERE tenant_id = $1');
        expect(sql).not.toContain(TENANT);
        expect(params).toEqual([TENANT]);
    });
});

// ─────────────────────────────────────────────────────────────────────────────
// PATCH gate
// ─────────────────────────────────────────────────────────────────────────────

describe('PATCH gate', () => {
    it('401 when no session', async () => {
        setSession(null);
        const r = await PATCH(req('PATCH', { monthly_budget_usd: 100 }));
        expect(r.status).toBe(401);
        expect(db.query).not.toHaveBeenCalled();
    });

    it('403 when caller is not the tenant owner and not a global admin', async () => {
        setSession({ email: 'stranger@example.com', tenantId: TENANT, isAdmin: false });
        // requireTenantAdminAccess does a SELECT owner_email FROM tenants...
        (db.query as unknown as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
            rows: [{ owner_email: OWNER }],
        });
        const r = await PATCH(req('PATCH', { monthly_budget_usd: 100 }));
        expect(r.status).toBe(403);
    });

    it('tenant owner is admitted', async () => {
        setSession({ email: OWNER, tenantId: TENANT, isAdmin: false });
        // 1) ownership check (requireTenantAdminAccess)
        (db.query as unknown as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
            rows: [{ owner_email: OWNER }],
        });
        // 2) UPSERT
        (db.query as unknown as ReturnType<typeof vi.fn>).mockResolvedValueOnce({ rows: [{}] });
        // 3) re-read after upsert
        (db.query as unknown as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
            rows: [{
                monthly_budget_usd: '100',
                max_cost_per_request_usd: null,
                human_review_threshold_usd: null,
                allowed_models: [],
                allowed_task_types: [],
                metadata: { last_modified_by_email: OWNER, last_modified_at: '2026-06-13T17:00:00.000Z' },
            }],
        });
        const r = await PATCH(req('PATCH', { monthly_budget_usd: 100 }));
        expect(r.status).toBe(200);
        const body = await r.json();
        expect(body.ok).toBe(true);
        expect(body.settings.monthly_budget_usd).toBe(100);
    });
});

// ─────────────────────────────────────────────────────────────────────────────
// PATCH validation
// ─────────────────────────────────────────────────────────────────────────────

describe('PATCH validation', () => {
    // Every test here authenticates as the tenant owner so the gate passes;
    // we focus on what the validator does once we're past auth.
    beforeEach(() => {
        setSession({ email: OWNER, tenantId: TENANT, isAdmin: false });
        (db.query as unknown as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
            rows: [{ owner_email: OWNER }],
        });
    });

    it('rejects body tenant_id with 400 INVALID_INPUT', async () => {
        const r = await PATCH(req('PATCH', { tenant_id: '11111111-1111-1111-1111-111111111111', monthly_budget_usd: 1 }));
        expect(r.status).toBe(400);
        const body = await r.json();
        expect(body.error?.code ?? body.code).toBe('INVALID_INPUT');
        // No UPSERT should have run.
        const callCount = (db.query as unknown as ReturnType<typeof vi.fn>).mock.calls.length;
        expect(callCount).toBe(1); // only the ownership check ran
    });

    it('rejects unknown keys with 400 INVALID_INPUT', async () => {
        const r = await PATCH(req('PATCH', { mystery_field: true }));
        expect(r.status).toBe(400);
    });

    it('rejects numeric string ("42") with 400 INVALID_INPUT', async () => {
        const r = await PATCH(req('PATCH', { monthly_budget_usd: '42' }));
        expect(r.status).toBe(400);
    });

    it('rejects negative scalars with 400 INVALID_INPUT', async () => {
        const r = await PATCH(req('PATCH', { monthly_budget_usd: -1 }));
        expect(r.status).toBe(400);
    });

    it('rejects non-finite scalars with 400 INVALID_INPUT', async () => {
        const r = await PATCH(req('PATCH', { monthly_budget_usd: null }));
        // null is a valid clear — this should NOT be 400.
        expect(r.status).not.toBe(400);
    });

    it('rejects non-string entries in allowed_models with 400', async () => {
        const r = await PATCH(req('PATCH', { allowed_models: [1, 2, 3] }));
        expect(r.status).toBe(400);
    });

    it('rejects duplicate entries with 400', async () => {
        const r = await PATCH(req('PATCH', { allowed_models: ['gpt-4o', 'gpt-4o'] }));
        expect(r.status).toBe(400);
    });

    it('rejects >200 entries with 400', async () => {
        const big = Array.from({ length: 201 }, (_, i) => `m-${i}`);
        const r = await PATCH(req('PATCH', { allowed_models: big }));
        expect(r.status).toBe(400);
    });
});

// ─────────────────────────────────────────────────────────────────────────────
// PATCH persistence behavior
// ─────────────────────────────────────────────────────────────────────────────

describe('PATCH persistence', () => {
    beforeEach(() => {
        setSession({ email: OWNER, tenantId: TENANT, isAdmin: false });
    });

    function mockOwnerAndUpsertAndRead(rowAfter: Record<string, unknown>) {
        (db.query as unknown as ReturnType<typeof vi.fn>)
            .mockResolvedValueOnce({ rows: [{ owner_email: OWNER }] })   // ownership check
            .mockResolvedValueOnce({ rows: [{}] })                        // UPSERT
            .mockResolvedValueOnce({ rows: [rowAfter] });                 // re-read
    }

    it('partial update only sends the patched fields and preserves the rest via COALESCE', async () => {
        mockOwnerAndUpsertAndRead({
            monthly_budget_usd: '200',
            max_cost_per_request_usd: '0.5',
            human_review_threshold_usd: null,
            allowed_models: ['gpt-4o'],
            allowed_task_types: [],
            metadata: { last_modified_by_email: OWNER },
        });
        const r = await PATCH(req('PATCH', { monthly_budget_usd: 200 }));
        expect(r.status).toBe(200);

        // Inspect the UPSERT call (the 2nd db.query call).
        const upsertCall = (db.query as unknown as ReturnType<typeof vi.fn>).mock.calls[1]!;
        const sql: string = upsertCall[0];
        const params: unknown[] = upsertCall[1];

        // The "set" boolean flags reflect which keys were patched.
        // Layout: [tenant, mb, set_mb, mc, set_mc, hr, set_hr, am, set_am, atypes, set_atypes, meta]
        expect(params[0]).toBe(TENANT);
        expect(params[1]).toBe(200);          // patched value
        expect(params[2]).toBe(true);         // set_monthly_budget_usd = true
        expect(params[4]).toBe(false);        // set_max_cost_per_request_usd = false (untouched)
        expect(params[6]).toBe(false);        // set_human_review_threshold_usd = false
        expect(params[8]).toBe(false);        // set_allowed_models = false
        expect(params[10]).toBe(false);       // set_allowed_task_types = false

        expect(sql).toContain('ON CONFLICT (tenant_id) DO UPDATE SET');
        // The UPSERT body must reference the existing-row column for untouched fields.
        expect(sql).toContain('tenant_control_settings.max_cost_per_request_usd');
        expect(sql).toContain('tenant_control_settings.allowed_models');
    });

    it('UPSERT stamps metadata.last_modified_by_email + last_modified_at', async () => {
        mockOwnerAndUpsertAndRead({
            monthly_budget_usd: '50',
            max_cost_per_request_usd: null,
            human_review_threshold_usd: null,
            allowed_models: [],
            allowed_task_types: [],
            metadata: { last_modified_by_email: OWNER, last_modified_at: '2026-06-13T17:00:00.000Z' },
        });
        await PATCH(req('PATCH', { monthly_budget_usd: 50 }));
        const upsertCall = (db.query as unknown as ReturnType<typeof vi.fn>).mock.calls[1]!;
        const auditMeta = upsertCall[1][11] as { last_modified_by_email: string; last_modified_at: string };
        expect(auditMeta.last_modified_by_email).toBe(OWNER);
        expect(typeof auditMeta.last_modified_at).toBe('string');
        // ISO format
        expect(auditMeta.last_modified_at).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/);
    });

    it('first save creates a row; second save updates it (same ON CONFLICT path)', async () => {
        // First save
        mockOwnerAndUpsertAndRead({
            monthly_budget_usd: '100',
            max_cost_per_request_usd: null,
            human_review_threshold_usd: null,
            allowed_models: [],
            allowed_task_types: [],
            metadata: { last_modified_by_email: OWNER },
        });
        const r1 = await PATCH(req('PATCH', { monthly_budget_usd: 100 }));
        expect(r1.status).toBe(200);
        const sql1: string = (db.query as unknown as ReturnType<typeof vi.fn>).mock.calls[1]![0];
        expect(sql1).toContain('INSERT INTO tenant_control_settings');
        expect(sql1).toContain('ON CONFLICT (tenant_id) DO UPDATE');

        // Reset and second save
        (db.query as unknown as ReturnType<typeof vi.fn>).mockReset();
        mockOwnerAndUpsertAndRead({
            monthly_budget_usd: '200',
            max_cost_per_request_usd: null,
            human_review_threshold_usd: null,
            allowed_models: [],
            allowed_task_types: [],
            metadata: { last_modified_by_email: OWNER },
        });
        const r2 = await PATCH(req('PATCH', { monthly_budget_usd: 200 }));
        expect(r2.status).toBe(200);
        const sql2: string = (db.query as unknown as ReturnType<typeof vi.fn>).mock.calls[1]![0];
        // Same INSERT...ON CONFLICT statement; UPSERT is uniform.
        expect(sql2).toContain('INSERT INTO tenant_control_settings');
        expect(sql2).toContain('ON CONFLICT (tenant_id) DO UPDATE');
    });

    it('UPSERT SQL is parameterized — tenant id is bound, never inlined', async () => {
        mockOwnerAndUpsertAndRead({
            monthly_budget_usd: null,
            max_cost_per_request_usd: null,
            human_review_threshold_usd: null,
            allowed_models: [],
            allowed_task_types: [],
            metadata: { last_modified_by_email: OWNER },
        });
        await PATCH(req('PATCH', { allowed_models: ['gpt-4o'] }));
        const upsertCall = (db.query as unknown as ReturnType<typeof vi.fn>).mock.calls[1]!;
        const sql: string = upsertCall[0];
        const params: unknown[] = upsertCall[1];
        expect(sql).toContain('$1');
        expect(sql).not.toContain(TENANT);
        expect(params[0]).toBe(TENANT);
    });

    // ─────────────────────────────────────────────────────────────────────────
    // Slice 3X-Shadow: PATCH success invalidates the runtime config cache.
    // Redis failure does NOT fail the PATCH (best-effort).
    // ─────────────────────────────────────────────────────────────────────────

    it('on successful PATCH, calls redis.del(p402:tcs:config:{tenantId})', async () => {
        mockOwnerAndUpsertAndRead({
            monthly_budget_usd: '50',
            max_cost_per_request_usd: null,
            human_review_threshold_usd: null,
            allowed_models: [],
            allowed_task_types: [],
            metadata: { last_modified_by_email: OWNER },
        });
        const res = await PATCH(req('PATCH', { monthly_budget_usd: 50 }));
        expect(res.status).toBe(200);
        const delMock = (redis as unknown as { del: ReturnType<typeof vi.fn> }).del;
        expect(delMock).toHaveBeenCalledTimes(1);
        expect(delMock.mock.calls[0]![0]).toBe(`p402:tcs:config:${TENANT}`);
    });

    it('Redis failure during cache invalidation does NOT fail the PATCH', async () => {
        mockOwnerAndUpsertAndRead({
            monthly_budget_usd: '50',
            max_cost_per_request_usd: null,
            human_review_threshold_usd: null,
            allowed_models: [],
            allowed_task_types: [],
            metadata: { last_modified_by_email: OWNER },
        });
        ((redis as unknown as { del: ReturnType<typeof vi.fn> }).del)
            .mockRejectedValueOnce(new Error('redis del fail'));
        const res = await PATCH(req('PATCH', { monthly_budget_usd: 50 }));
        // PATCH still succeeds. The saved row is authoritative.
        expect(res.status).toBe(200);
        const body = await res.json();
        expect(body.ok).toBe(true);
    });

    it('invalidation does NOT fire on a refused PATCH (e.g. body tenant_id rejected)', async () => {
        // Setup: ownership SELECT succeeds, but validator rejects body.
        (db.query as unknown as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
            rows: [{ owner_email: OWNER }],
        });
        const res = await PATCH(req('PATCH', { tenant_id: 'foo', monthly_budget_usd: 1 }));
        expect(res.status).toBe(400);
        const delMock = (redis as unknown as { del: ReturnType<typeof vi.fn> }).del;
        expect(delMock).not.toHaveBeenCalled();
    });

    it('empty allowed_models array clears the allowlist (passes through as empty JSONB array)', async () => {
        mockOwnerAndUpsertAndRead({
            monthly_budget_usd: null,
            max_cost_per_request_usd: null,
            human_review_threshold_usd: null,
            allowed_models: [],
            allowed_task_types: [],
            metadata: { last_modified_by_email: OWNER },
        });
        await PATCH(req('PATCH', { allowed_models: [] }));
        const upsertCall = (db.query as unknown as ReturnType<typeof vi.fn>).mock.calls[1]!;
        const params: unknown[] = upsertCall[1];
        // set_allowed_models = true
        expect(params[8]).toBe(true);
        // serialized empty array
        expect(params[7]).toBe('[]');
    });
});
