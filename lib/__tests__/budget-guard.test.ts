import { describe, it, expect, beforeEach, vi } from 'vitest';

vi.mock('@/lib/db', () => ({
    default: { query: vi.fn() },
}));

import db from '@/lib/db';
import { ApiError } from '@/lib/errors';
import type { ApiKeyContext } from '@/lib/types/api-key';
import {
    enforcePreRouting,
    enforcePostRouting,
    getMonthToDateSpend,
} from '@/lib/budget-guard';

function ctx(overrides: Partial<ApiKeyContext> = {}): ApiKeyContext {
    return {
        apiKeyId: 'k_1',
        tenantId: 't_1',
        ownerType: 'tenant',
        ownerId: 't_1',
        departmentId: null,
        employeeId: null,
        workflowId: null,
        projectId: null,
        budgetId: null,
        policyId: null,
        allowedModels: [],
        allowedTaskTypes: [],
        maxCostPerRequestUsd: null,
        monthlyBudgetUsd: null,
        headerOverridePolicy: 'allow',
        departmentMonthlyBudgetUsd: null,
        employeeMonthlyBudgetUsd: null,
        ...overrides,
    };
}

beforeEach(() => vi.clearAllMocks());

describe('enforcePreRouting — allow-lists', () => {
    it('passes through when allowedModels is empty (legacy default)', async () => {
        await expect(
            enforcePreRouting(ctx(), { model: 'gpt-4o' }),
        ).resolves.toBeUndefined();
        expect(db.query).not.toHaveBeenCalled();
    });

    it('throws MODEL_NOT_ALLOWED when model is outside allowlist', async () => {
        const err = await enforcePreRouting(
            ctx({ allowedModels: ['gpt-4o-mini', 'claude-haiku-4-5'] }),
            { model: 'gpt-4o' },
        ).catch((e) => e);
        expect(err).toBeInstanceOf(ApiError);
        expect(err.code).toBe('MODEL_NOT_ALLOWED');
        expect(err.status).toBe(403);
    });

    it('passes when model is in allowlist', async () => {
        await expect(
            enforcePreRouting(
                ctx({ allowedModels: ['gpt-4o-mini'] }),
                { model: 'gpt-4o-mini' },
            ),
        ).resolves.toBeUndefined();
    });

    it('throws TASK_TYPE_NOT_ALLOWED when taskType is outside allowlist', async () => {
        const err = await enforcePreRouting(
            ctx({ allowedTaskTypes: ['embedding'] }),
            { taskType: 'inference' },
        ).catch((e) => e);
        expect(err.code).toBe('TASK_TYPE_NOT_ALLOWED');
        expect(err.status).toBe(403);
    });
});

describe('enforcePreRouting — MTD spend caps', () => {
    it('short-circuits DB read when no caps are set', async () => {
        await enforcePreRouting(ctx(), { model: 'gpt-4o' });
        expect(db.query).not.toHaveBeenCalled();
    });

    it('queries traffic_events filtered to current calendar month UTC', async () => {
        const now = new Date('2026-06-15T12:34:56Z');
        (db.query as any).mockResolvedValueOnce({
            rows: [{ key_spend: 0, employee_spend: 0, department_spend: 0 }],
        });
        await enforcePreRouting(
            ctx({ monthlyBudgetUsd: 100 }),
            { model: 'gpt-4o', now },
        );
        const params = (db.query as any).mock.calls[0][1];
        expect(params[0]).toBe('t_1');         // tenantId
        expect(params[1]).toBe('k_1');         // apiKeyId
        expect(params[4]).toEqual(new Date('2026-06-01T00:00:00Z')); // monthStart UTC
    });

    it('throws API_KEY_BUDGET_EXCEEDED when key MTD spend >= cap', async () => {
        (db.query as any).mockResolvedValueOnce({
            rows: [{ key_spend: 100, employee_spend: 0, department_spend: 0 }],
        });
        const err = await enforcePreRouting(
            ctx({ monthlyBudgetUsd: 100 }),
            { model: 'gpt-4o' },
        ).catch((e) => e);
        expect(err.code).toBe('API_KEY_BUDGET_EXCEEDED');
        expect(err.status).toBe(402);
    });

    it('throws EMPLOYEE_BUDGET_EXCEEDED when employee bucket exceeds cap', async () => {
        (db.query as any).mockResolvedValueOnce({
            rows: [{ key_spend: 5, employee_spend: 200, department_spend: 50 }],
        });
        const err = await enforcePreRouting(
            ctx({
                employeeId: 'e_1',
                employeeMonthlyBudgetUsd: 150,
                departmentMonthlyBudgetUsd: 1000,
            }),
            { model: 'gpt-4o' },
        ).catch((e) => e);
        expect(err.code).toBe('EMPLOYEE_BUDGET_EXCEEDED');
    });

    it('throws DEPARTMENT_BUDGET_EXCEEDED when only the department bucket exceeds', async () => {
        (db.query as any).mockResolvedValueOnce({
            rows: [{ key_spend: 0, employee_spend: 0, department_spend: 600 }],
        });
        const err = await enforcePreRouting(
            ctx({
                departmentId: 'd_1',
                departmentMonthlyBudgetUsd: 500,
            }),
            { model: 'gpt-4o' },
        ).catch((e) => e);
        expect(err.code).toBe('DEPARTMENT_BUDGET_EXCEEDED');
    });

    it('passes when all buckets are under cap', async () => {
        (db.query as any).mockResolvedValueOnce({
            rows: [{ key_spend: 50, employee_spend: 10, department_spend: 100 }],
        });
        await expect(
            enforcePreRouting(
                ctx({
                    monthlyBudgetUsd: 100,
                    employeeMonthlyBudgetUsd: 50,
                    departmentMonthlyBudgetUsd: 500,
                }),
                { model: 'gpt-4o' },
            ),
        ).resolves.toBeUndefined();
    });
});

describe('enforcePostRouting', () => {
    it('no-op when maxCostPerRequestUsd is null', () => {
        expect(() =>
            enforcePostRouting(ctx(), { estimatedCostUsd: 1000 }),
        ).not.toThrow();
    });

    it('throws MAX_COST_PER_REQUEST_EXCEEDED when over cap', () => {
        try {
            enforcePostRouting(
                ctx({ maxCostPerRequestUsd: 0.10 }),
                { estimatedCostUsd: 0.25 },
            );
            throw new Error('should have thrown');
        } catch (e: any) {
            expect(e).toBeInstanceOf(ApiError);
            expect(e.code).toBe('MAX_COST_PER_REQUEST_EXCEEDED');
            expect(e.status).toBe(402);
        }
    });

    it('passes when at or under cap', () => {
        expect(() =>
            enforcePostRouting(
                ctx({ maxCostPerRequestUsd: 0.10 }),
                { estimatedCostUsd: 0.10 },
            ),
        ).not.toThrow();
    });
});

describe('getMonthToDateSpend', () => {
    it('coerces null SUMs to 0', async () => {
        (db.query as any).mockResolvedValueOnce({ rows: [{}] });
        const out = await getMonthToDateSpend(ctx());
        expect(out).toEqual({ keySpendUsd: 0, employeeSpendUsd: 0, departmentSpendUsd: 0 });
    });
});
