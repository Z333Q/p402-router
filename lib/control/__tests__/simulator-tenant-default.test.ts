/**
 * Slice 3W — pure-evaluator tests for the new tenant_default rung.
 *
 * Pins the user-approved precedence and labeling contract:
 *   - Budget: tenant rung is independent of api_key/employee/department
 *     (different MTD denominators). Fires when configured.
 *   - max_cost_per_request / allowed_models / allowed_task_types:
 *     most-specific-wins. Tenant rung only fires when the api_key rung
 *     is unset or has no allowlist configured.
 *   - human_review_threshold: tenant-only (no api_key equivalent). Fires
 *     regardless of caller-supplied human_review_required flag.
 *   - "No widening": caller cannot suppress a tenant-default-driven
 *     HUMAN_REVIEW_REQUIRED by omitting the input.
 *   - The decision payload labels the source: NOT API_KEY_BUDGET_EXCEEDED
 *     for a tenant budget. Use TENANT_BUDGET_EXCEEDED with
 *     source: 'tenant_default', scope: 'tenant'.
 *   - Existing simulator behavior is unchanged when no tenant default
 *     row exists (ctx.tenantDefault === undefined).
 */

import { describe, it, expect } from 'vitest';

import { evaluate } from '../simulator';
import type {
    SimulatorEvaluationContext,
    SimulatorInput,
    SimulatorTenantDefaultContext,
    SimulatorKeyContext,
} from '../types';

const TENANT = '00000000-0000-0000-0000-000000000abc';

function tenantDefault(overrides: Partial<SimulatorTenantDefaultContext> = {}): SimulatorTenantDefaultContext {
    return {
        monthlyBudgetUsd:        null,
        maxCostPerRequestUsd:    null,
        humanReviewThresholdUsd: null,
        allowedModels:           [],
        allowedTaskTypes:        [],
        mtdTenantSpendUsd:       0,
        ...overrides,
    };
}

function keyCtx(overrides: Partial<SimulatorKeyContext> = {}): SimulatorKeyContext {
    return {
        apiKeyId: 'k_test',
        allowedModels: [],
        allowedTaskTypes: [],
        maxCostPerRequestUsd: null,
        monthlyBudgetUsd: null,
        employeeMonthlyBudgetUsd: null,
        departmentMonthlyBudgetUsd: null,
        mtdSpend: { keySpendUsd: 0, employeeSpendUsd: 0, departmentSpendUsd: 0 },
        ...overrides,
    };
}

function emptyInput(overrides: Partial<SimulatorInput> = {}): SimulatorInput {
    return { ...overrides };
}

describe('tenant_default budget', () => {
    it('produces TENANT_BUDGET_EXCEEDED labeled as tenant_default when configured', () => {
        const ctx: SimulatorEvaluationContext = {
            tenantId: TENANT,
            tenantDefault: tenantDefault({ monthlyBudgetUsd: 100, mtdTenantSpendUsd: 95 }),
        };
        const d = evaluate(emptyInput({ estimated_cost_usd: 10 }), ctx);
        expect(d.first_definitive_decision.code).toBe('TENANT_BUDGET_EXCEEDED');
        expect(d.first_definitive_decision.source).toBe('tenant_default');
        expect(d.first_definitive_decision.scope).toBe('tenant');
        expect(d.first_definitive_decision.field).toBe('monthly_budget_usd');
        // CRITICAL: must NOT mislabel as API_KEY_BUDGET_EXCEEDED.
        expect(d.first_definitive_decision.code).not.toBe('API_KEY_BUDGET_EXCEEDED');
    });

    it('does not fire when projected tenant spend is under the cap', () => {
        const ctx: SimulatorEvaluationContext = {
            tenantId: TENANT,
            tenantDefault: tenantDefault({ monthlyBudgetUsd: 100, mtdTenantSpendUsd: 50 }),
        };
        const d = evaluate(emptyInput({ estimated_cost_usd: 10 }), ctx);
        expect(d.first_definitive_decision.code).toBe('APPROVED');
    });

    it('api_key budget wins over tenant budget when both fire (canonical order)', () => {
        const ctx: SimulatorEvaluationContext = {
            tenantId: TENANT,
            key: keyCtx({
                monthlyBudgetUsd: 10,
                mtdSpend: { keySpendUsd: 9, employeeSpendUsd: 0, departmentSpendUsd: 0 },
            }),
            tenantDefault: tenantDefault({ monthlyBudgetUsd: 100, mtdTenantSpendUsd: 99 }),
        };
        const d = evaluate(emptyInput({ estimated_cost_usd: 2 }), ctx);
        expect(d.first_definitive_decision.code).toBe('API_KEY_BUDGET_EXCEEDED');
        expect(d.first_definitive_decision.source).toBe('api_key');
        // Both must appear in all_triggered (visibility): api_key + tenant
        const codes = d.all_triggered_checks.map((c) => c.code);
        expect(codes).toContain('API_KEY_BUDGET_EXCEEDED');
        expect(codes).toContain('TENANT_BUDGET_EXCEEDED');
    });
});

describe('tenant_default max_cost_per_request', () => {
    it('fires MAX_COST_PER_REQUEST_EXCEEDED when api_key cap is null and tenant cap is set', () => {
        const ctx: SimulatorEvaluationContext = {
            tenantId: TENANT,
            tenantDefault: tenantDefault({ maxCostPerRequestUsd: 0.10 }),
        };
        const d = evaluate(emptyInput({ estimated_cost_usd: 1.0 }), ctx);
        expect(d.first_definitive_decision.code).toBe('MAX_COST_PER_REQUEST_EXCEEDED');
        expect(d.first_definitive_decision.source).toBe('tenant_default');
        expect(d.first_definitive_decision.field).toBe('max_cost_per_request_usd');
    });

    it('does not fire from tenant rung when api_key cap is set (most-specific-wins)', () => {
        // api_key cap is loose ($10), tenant cap is tight ($0.10). Per the
        // most-specific-wins precedence approved in 3V, the tenant rung
        // does NOT fire because the api_key rung is set.
        const ctx: SimulatorEvaluationContext = {
            tenantId: TENANT,
            key: keyCtx({ maxCostPerRequestUsd: 10 }),
            tenantDefault: tenantDefault({ maxCostPerRequestUsd: 0.10 }),
        };
        const d = evaluate(emptyInput({ estimated_cost_usd: 1.0 }), ctx);
        // Approved: api_key cap of $10 is the one that applies. $1 < $10.
        expect(d.first_definitive_decision.code).toBe('APPROVED');
    });
});

describe('tenant_default allowed_models', () => {
    it('fires MODEL_NOT_ALLOWED when api_key allowlist is empty and tenant allowlist excludes the model', () => {
        const ctx: SimulatorEvaluationContext = {
            tenantId: TENANT,
            tenantDefault: tenantDefault({ allowedModels: ['gpt-4o-mini'] }),
        };
        const d = evaluate(emptyInput({ model_requested: 'gpt-5-ultra' }), ctx);
        expect(d.first_definitive_decision.code).toBe('MODEL_NOT_ALLOWED');
        expect(d.first_definitive_decision.source).toBe('tenant_default');
    });

    it('does not fire from tenant rung when api_key allowlist is non-empty', () => {
        const ctx: SimulatorEvaluationContext = {
            tenantId: TENANT,
            // api_key allowlist includes the model; tenant default does not.
            // The api_key rung is the only one consulted.
            key: keyCtx({ allowedModels: ['gpt-5-ultra'] }),
            tenantDefault: tenantDefault({ allowedModels: ['gpt-4o-mini'] }),
        };
        const d = evaluate(emptyInput({ model_requested: 'gpt-5-ultra' }), ctx);
        expect(d.first_definitive_decision.code).toBe('APPROVED');
    });

    it('passes when tenant allowlist includes the model', () => {
        const ctx: SimulatorEvaluationContext = {
            tenantId: TENANT,
            tenantDefault: tenantDefault({ allowedModels: ['gpt-4o-mini'] }),
        };
        const d = evaluate(emptyInput({ model_requested: 'gpt-4o-mini' }), ctx);
        expect(d.first_definitive_decision.code).toBe('APPROVED');
    });
});

describe('tenant_default allowed_task_types', () => {
    it('fires TASK_TYPE_NOT_ALLOWED from tenant rung when api_key allowlist is empty', () => {
        const ctx: SimulatorEvaluationContext = {
            tenantId: TENANT,
            tenantDefault: tenantDefault({ allowedTaskTypes: ['summarize'] }),
        };
        const d = evaluate(emptyInput({ task_type: 'classify' }), ctx);
        expect(d.first_definitive_decision.code).toBe('TASK_TYPE_NOT_ALLOWED');
        expect(d.first_definitive_decision.source).toBe('tenant_default');
        expect(d.first_definitive_decision.field).toBe('allowed_task_types');
    });
});

describe('tenant_default human_review_threshold_usd', () => {
    it('fires HUMAN_REVIEW_REQUIRED when estimated cost exceeds the threshold', () => {
        const ctx: SimulatorEvaluationContext = {
            tenantId: TENANT,
            tenantDefault: tenantDefault({ humanReviewThresholdUsd: 5 }),
        };
        const d = evaluate(emptyInput({ estimated_cost_usd: 10 }), ctx);
        expect(d.first_definitive_decision.code).toBe('HUMAN_REVIEW_REQUIRED');
        expect(d.first_definitive_decision.source).toBe('tenant_default');
        expect(d.first_definitive_decision.field).toBe('human_review_threshold_usd');
        expect(d.first_definitive_decision.status).toBe('requires_review');
    });

    it('no widening: caller cannot suppress HUMAN_REVIEW_REQUIRED by omitting the flag', () => {
        // Caller did NOT set human_review_required=true. The tenant rung
        // must still fire because the threshold is configured and the
        // request exceeds it. This pins the no-widening invariant.
        const ctx: SimulatorEvaluationContext = {
            tenantId: TENANT,
            tenantDefault: tenantDefault({ humanReviewThresholdUsd: 5 }),
        };
        const input: SimulatorInput = { estimated_cost_usd: 10 };
        // Explicitly NOT set: human_review_required.
        expect(input.human_review_required).toBeUndefined();
        const d = evaluate(input, ctx);
        expect(d.first_definitive_decision.code).toBe('HUMAN_REVIEW_REQUIRED');
        expect(d.first_definitive_decision.source).toBe('tenant_default');
    });

    it('does not fire when estimated cost is under the threshold', () => {
        const ctx: SimulatorEvaluationContext = {
            tenantId: TENANT,
            tenantDefault: tenantDefault({ humanReviewThresholdUsd: 100 }),
        };
        const d = evaluate(emptyInput({ estimated_cost_usd: 1 }), ctx);
        expect(d.first_definitive_decision.code).toBe('APPROVED');
    });
});

describe('back-compat: no tenant_default row', () => {
    it('behavior is unchanged when ctx.tenantDefault is undefined', () => {
        const ctx: SimulatorEvaluationContext = { tenantId: TENANT };
        const d = evaluate(emptyInput({ estimated_cost_usd: 1000 }), ctx);
        expect(d.first_definitive_decision.code).toBe('APPROVED');
        expect(d.all_triggered_checks).toEqual([]);
    });

    it('existing api_key checks remain unchanged', () => {
        const ctx: SimulatorEvaluationContext = {
            tenantId: TENANT,
            key: keyCtx({
                monthlyBudgetUsd: 10,
                mtdSpend: { keySpendUsd: 11, employeeSpendUsd: 0, departmentSpendUsd: 0 },
            }),
            // tenantDefault omitted entirely
        };
        const d = evaluate(emptyInput({ estimated_cost_usd: 1 }), ctx);
        expect(d.first_definitive_decision.code).toBe('API_KEY_BUDGET_EXCEEDED');
        expect(d.first_definitive_decision.source).toBe('api_key');
    });
});
