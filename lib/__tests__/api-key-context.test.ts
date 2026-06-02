import { describe, it, expect, beforeEach, vi } from 'vitest';

vi.mock('@/lib/db', () => ({
    default: { query: vi.fn() },
}));

import db from '@/lib/db';
import { ApiError } from '@/lib/errors';
import {
    extractBearerKey,
    hashKey,
    resolveApiKeyContextByKey,
    rowToContext,
} from '@/lib/api-key-context';

const RAW_KEY = 'p402_live_' + 'a'.repeat(64);
const KEY_HASH = hashKey(RAW_KEY);

function mkRow(overrides: Record<string, unknown> = {}) {
    return {
        id: 'k_1',
        tenant_id: 't_1',
        status: 'active',
        owner_type: 'tenant',
        department_id: null,
        employee_id: null,
        workflow_id: null,
        project_id: null,
        budget_id: null,
        policy_id: null,
        allowed_models: [],
        allowed_task_types: [],
        max_cost_per_request_usd: null,
        monthly_budget_usd: null,
        header_override_policy: 'allow',
        department_monthly_budget_usd: null,
        employee_monthly_budget_usd: null,
        ...overrides,
    };
}

describe('extractBearerKey', () => {
    function req(headers: Record<string, string>) {
        return { headers: { get: (k: string) => headers[k.toLowerCase()] ?? null } } as any;
    }

    it('extracts a well-formed p402_live_ key', () => {
        expect(extractBearerKey(req({ authorization: `Bearer ${RAW_KEY}` }))).toBe(RAW_KEY);
    });

    it('returns null when header is missing', () => {
        expect(extractBearerKey(req({}))).toBeNull();
    });

    it('rejects non-p402 bearer tokens', () => {
        expect(extractBearerKey(req({ authorization: 'Bearer sk-openai-abc' }))).toBeNull();
    });

    it('rejects malformed p402 keys (wrong length)', () => {
        expect(extractBearerKey(req({ authorization: 'Bearer p402_live_short' }))).toBeNull();
    });
});

describe('rowToContext', () => {
    it('parses numerics from strings and arrays default to []', () => {
        const ctx = rowToContext(mkRow({
            max_cost_per_request_usd: '0.50',
            monthly_budget_usd: '1000',
            department_monthly_budget_usd: '5000.25',
            allowed_models: null,
        }) as any);
        expect(ctx.maxCostPerRequestUsd).toBe(0.5);
        expect(ctx.monthlyBudgetUsd).toBe(1000);
        expect(ctx.departmentMonthlyBudgetUsd).toBe(5000.25);
        expect(ctx.allowedModels).toEqual([]);
    });

    it('owner_type=tenant -> ownerId is tenant_id', () => {
        const ctx = rowToContext(mkRow() as any);
        expect(ctx.ownerType).toBe('tenant');
        expect(ctx.ownerId).toBe('t_1');
    });

    it('owner_type=department -> ownerId is department_id', () => {
        const ctx = rowToContext(mkRow({ owner_type: 'department', department_id: 'd_9' }) as any);
        expect(ctx.ownerId).toBe('d_9');
    });

    it('owner_type=employee -> ownerId is employee_id', () => {
        const ctx = rowToContext(mkRow({ owner_type: 'employee', employee_id: 'e_7' }) as any);
        expect(ctx.ownerId).toBe('e_7');
    });

    it('owner_type=workflow / project -> respective ids', () => {
        expect(rowToContext(mkRow({ owner_type: 'workflow', workflow_id: 'wf_1' }) as any).ownerId).toBe('wf_1');
        expect(rowToContext(mkRow({ owner_type: 'project',  project_id: 'pj_1' })  as any).ownerId).toBe('pj_1');
    });

    it('exposes header_override_policy on context', () => {
        const r = rowToContext(mkRow({ header_override_policy: 'restricted' }) as any);
        expect(r.headerOverridePolicy).toBe('restricted');
        const d = rowToContext(mkRow({ header_override_policy: 'deny' }) as any);
        expect(d.headerOverridePolicy).toBe('deny');
    });
});

describe('resolveApiKeyContextByKey', () => {
    beforeEach(() => vi.clearAllMocks());

    it('queries by sha256 hash of raw key', async () => {
        (db.query as any).mockResolvedValueOnce({ rows: [mkRow()] });
        await resolveApiKeyContextByKey(RAW_KEY);
        const params = (db.query as any).mock.calls[0][1];
        expect(params).toEqual([KEY_HASH]);
    });

    it('returns full context for active tenant-owned key', async () => {
        (db.query as any).mockResolvedValueOnce({ rows: [mkRow()] });
        const ctx = await resolveApiKeyContextByKey(RAW_KEY);
        expect(ctx).toMatchObject({
            apiKeyId: 'k_1',
            tenantId: 't_1',
            ownerType: 'tenant',
            ownerId: 't_1',
            headerOverridePolicy: 'allow',
        });
    });

    it('joins department/employee budget caps onto the context', async () => {
        (db.query as any).mockResolvedValueOnce({
            rows: [mkRow({
                owner_type: 'department',
                department_id: 'd_1',
                employee_id: 'e_1',
                department_monthly_budget_usd: '500',
                employee_monthly_budget_usd: '100',
            })],
        });
        const ctx = await resolveApiKeyContextByKey(RAW_KEY);
        expect(ctx.departmentMonthlyBudgetUsd).toBe(500);
        expect(ctx.employeeMonthlyBudgetUsd).toBe(100);
    });

    it('throws API_KEY_NOT_FOUND when no row matches', async () => {
        (db.query as any).mockResolvedValueOnce({ rows: [] });
        await expect(resolveApiKeyContextByKey(RAW_KEY)).rejects.toMatchObject({
            code: 'API_KEY_NOT_FOUND',
            status: 401,
        });
    });

    it('throws API_KEY_REVOKED when row is revoked', async () => {
        (db.query as any).mockResolvedValueOnce({ rows: [mkRow({ status: 'revoked' })] });
        const err = await resolveApiKeyContextByKey(RAW_KEY).catch((e) => e);
        expect(err).toBeInstanceOf(ApiError);
        expect(err.code).toBe('API_KEY_REVOKED');
        expect(err.status).toBe(401);
    });
});
