/**
 * Slice 3B — Simulator tests.
 *
 * Covers:
 *   - canonical decision order (first_definitive_decision pinned to the
 *     CANONICAL_DECISION_ORDER, regardless of which checks fire)
 *   - all_triggered_checks lists every hit in canonical order
 *   - margin floor tri-state (pass / not_met / not_evaluable / not_requested)
 *   - human review = requires_review, not denied
 *   - missing mandate context => MANDATE_NOT_FOUND
 *   - mandate budget projection includes the simulator's estimated cost
 *   - empty allowlist means unrestricted (matches budget-guard semantics)
 *   - approve path when nothing fires
 *   - deterministic outputs (calling twice with the same inputs returns the
 *     same hits in the same order)
 */

import { describe, expect, it } from 'vitest';

import { evaluate } from '@/lib/control/simulator';
import {
    CANONICAL_DECISION_ORDER,
    type SimulatorEvaluationContext,
    type SimulatorInput,
    type SimulatorKeyContext,
    type SimulatorMandateContext,
} from '@/lib/control/types';

const TENANT = 'tenant-uuid-1';

function key(overrides: Partial<SimulatorKeyContext> = {}): SimulatorKeyContext {
    return {
        apiKeyId: 'k_1',
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

function ctx(overrides: Partial<SimulatorEvaluationContext> = {}): SimulatorEvaluationContext {
    return { tenantId: TENANT, ...overrides };
}

// ---------------------------------------------------------------------------
// Approve path
// ---------------------------------------------------------------------------

describe('evaluate — approve path', () => {
    it('returns APPROVED when nothing fires', () => {
        const d = evaluate({}, ctx({ key: key() }));
        expect(d.first_definitive_decision.code).toBe('APPROVED');
        expect(d.first_definitive_decision.status).toBe('approved');
        expect(d.all_triggered_checks).toEqual([]);
        expect(d.margin_floor_status).toBe('not_requested');
    });

    it('empty allowlist means unrestricted (no MODEL/TASK hits)', () => {
        const d = evaluate(
            { model_requested: 'gpt-4o', task_type: 'inference' },
            ctx({ key: key({ allowedModels: [], allowedTaskTypes: [] }) }),
        );
        expect(d.first_definitive_decision.code).toBe('APPROVED');
    });

    it('exposes canonical_order for the dashboard debug surface', () => {
        const d = evaluate({}, ctx({ key: key() }));
        expect(d.canonical_order).toEqual(CANONICAL_DECISION_ORDER);
    });
});

// ---------------------------------------------------------------------------
// Per-branch deny / requires_review tests
// ---------------------------------------------------------------------------

describe('evaluate — per-branch', () => {
    it('API_KEY_BUDGET_EXCEEDED when projected key spend > cap', () => {
        const d = evaluate(
            { estimated_cost_usd: 5 },
            ctx({ key: key({ monthlyBudgetUsd: 10, mtdSpend: { keySpendUsd: 8, employeeSpendUsd: 0, departmentSpendUsd: 0 } }) }),
        );
        expect(d.first_definitive_decision.code).toBe('API_KEY_BUDGET_EXCEEDED');
        expect(d.first_definitive_decision.status).toBe('denied');
    });

    it('EMPLOYEE_BUDGET_EXCEEDED when employee cap exceeded but key cap fine', () => {
        const d = evaluate(
            { estimated_cost_usd: 5 },
            ctx({ key: key({ employeeMonthlyBudgetUsd: 10, mtdSpend: { keySpendUsd: 0, employeeSpendUsd: 8, departmentSpendUsd: 0 } }) }),
        );
        expect(d.first_definitive_decision.code).toBe('EMPLOYEE_BUDGET_EXCEEDED');
    });

    it('DEPARTMENT_BUDGET_EXCEEDED isolated', () => {
        const d = evaluate(
            { estimated_cost_usd: 5 },
            ctx({ key: key({ departmentMonthlyBudgetUsd: 10, mtdSpend: { keySpendUsd: 0, employeeSpendUsd: 0, departmentSpendUsd: 8 } }) }),
        );
        expect(d.first_definitive_decision.code).toBe('DEPARTMENT_BUDGET_EXCEEDED');
    });

    it('MODEL_NOT_ALLOWED when model not in non-empty allowlist', () => {
        const d = evaluate(
            { model_requested: 'gpt-4o' },
            ctx({ key: key({ allowedModels: ['claude-sonnet-4-6'] }) }),
        );
        expect(d.first_definitive_decision.code).toBe('MODEL_NOT_ALLOWED');
    });

    it('TASK_TYPE_NOT_ALLOWED in isolation', () => {
        const d = evaluate(
            { task_type: 'finetune' },
            ctx({ key: key({ allowedTaskTypes: ['inference', 'embedding'] }) }),
        );
        expect(d.first_definitive_decision.code).toBe('TASK_TYPE_NOT_ALLOWED');
    });

    it('MAX_COST_PER_REQUEST_EXCEEDED when estimated cost > cap', () => {
        const d = evaluate(
            { estimated_cost_usd: 0.5 },
            ctx({ key: key({ maxCostPerRequestUsd: 0.1 }) }),
        );
        expect(d.first_definitive_decision.code).toBe('MAX_COST_PER_REQUEST_EXCEEDED');
    });
});

// ---------------------------------------------------------------------------
// Margin floor — tri-state
// ---------------------------------------------------------------------------

describe('evaluate — margin floor', () => {
    it('not_requested when caller omits margin_floor_pct', () => {
        const d = evaluate(
            { estimated_cost_usd: 1, revenue_usd: 10 },
            ctx({ key: key() }),
        );
        expect(d.margin_floor_status).toBe('not_requested');
    });

    it('not_evaluable when revenue_usd missing', () => {
        const d = evaluate(
            { margin_floor_pct: 30 },
            ctx({ key: key() }),
        );
        expect(d.margin_floor_status).toBe('not_evaluable');
        // Critical: never deny on missing revenue.
        expect(d.first_definitive_decision.code).toBe('APPROVED');
        expect(d.all_triggered_checks.map((h) => h.code)).not.toContain('MARGIN_FLOOR_NOT_MET');
    });

    it('not_met when projected margin < floor; status is requires_review (not denied)', () => {
        const d = evaluate(
            { margin_floor_pct: 50, revenue_usd: 10, estimated_cost_usd: 7 }, // 30% margin
            ctx({ key: key() }),
        );
        expect(d.margin_floor_status).toBe('not_met');
        expect(d.first_definitive_decision.code).toBe('MARGIN_FLOOR_NOT_MET');
        expect(d.first_definitive_decision.status).toBe('requires_review');
    });

    it('pass when projected margin >= floor', () => {
        const d = evaluate(
            { margin_floor_pct: 30, revenue_usd: 10, estimated_cost_usd: 5 }, // 50% margin
            ctx({ key: key() }),
        );
        expect(d.margin_floor_status).toBe('pass');
        expect(d.first_definitive_decision.code).toBe('APPROVED');
    });

    it('floor exactly at projected margin is pass', () => {
        const d = evaluate(
            { margin_floor_pct: 50, revenue_usd: 10, estimated_cost_usd: 5 },
            ctx({ key: key() }),
        );
        expect(d.margin_floor_status).toBe('pass');
    });
});

// ---------------------------------------------------------------------------
// Human review — gating, not deny
// ---------------------------------------------------------------------------

describe('evaluate — human review', () => {
    it('emits requires_review, not denied', () => {
        const d = evaluate(
            { human_review_required: true },
            ctx({ key: key() }),
        );
        expect(d.first_definitive_decision.code).toBe('HUMAN_REVIEW_REQUIRED');
        expect(d.first_definitive_decision.status).toBe('requires_review');
    });
});

// ---------------------------------------------------------------------------
// Mandate path
// ---------------------------------------------------------------------------

function mandate(overrides: Partial<SimulatorMandateContext> = {}): SimulatorMandateContext {
    return {
        mandateId: 'mnd_1',
        status: 'active',
        validUntil: new Date(Date.now() + 86_400_000).toISOString(),
        maxAmountUsd: 100,
        amountSpentUsd: 0,
        allowedCategories: undefined,
        ...overrides,
    };
}

describe('evaluate — mandate', () => {
    it('MANDATE_NOT_FOUND when mandate_id provided but ctx.mandate missing', () => {
        const d = evaluate({ mandate_id: 'mnd_1' }, ctx({ key: key() }));
        expect(d.first_definitive_decision.code).toBe('MANDATE_NOT_FOUND');
    });

    it('MANDATE_INACTIVE when status != active', () => {
        const d = evaluate(
            { mandate_id: 'mnd_1' },
            ctx({ key: key(), mandate: mandate({ status: 'revoked' }) }),
        );
        expect(d.first_definitive_decision.code).toBe('MANDATE_INACTIVE');
    });

    it('MANDATE_EXPIRED when valid_until in the past', () => {
        const d = evaluate(
            { mandate_id: 'mnd_1' },
            ctx({ key: key(), mandate: mandate({ validUntil: new Date(Date.now() - 86_400_000).toISOString() }) }),
        );
        expect(d.first_definitive_decision.code).toBe('MANDATE_EXPIRED');
    });

    it('MANDATE_BUDGET_EXCEEDED projects estimated cost onto current spend', () => {
        const d = evaluate(
            { mandate_id: 'mnd_1', estimated_cost_usd: 60 },
            ctx({ key: key(), mandate: mandate({ maxAmountUsd: 100, amountSpentUsd: 50 }) }),
        );
        expect(d.first_definitive_decision.code).toBe('MANDATE_BUDGET_EXCEEDED');
    });

    it('MANDATE_CATEGORY_DENIED when category not in allowed_categories', () => {
        const d = evaluate(
            { mandate_id: 'mnd_1', category: 'travel' },
            ctx({ key: key(), mandate: mandate({ allowedCategories: ['software', 'compute'] }) }),
        );
        expect(d.first_definitive_decision.code).toBe('MANDATE_CATEGORY_DENIED');
    });

    it('mandate passes when status/expiry/budget/category all fine', () => {
        const d = evaluate(
            { mandate_id: 'mnd_1', category: 'compute', estimated_cost_usd: 10 },
            ctx({ key: key(), mandate: mandate({ allowedCategories: ['compute'], maxAmountUsd: 100, amountSpentUsd: 20 }) }),
        );
        expect(d.first_definitive_decision.code).toBe('APPROVED');
    });
});

// ---------------------------------------------------------------------------
// Canonical order — the critical invariant
// ---------------------------------------------------------------------------

describe('evaluate — canonical order invariant', () => {
    it('first_definitive_decision follows canonical order when many checks fire', () => {
        // Trip: MODEL, MAX_COST, MARGIN_FLOOR all at once. Canonical order is:
        // API_KEY < EMPLOYEE < DEPARTMENT < MODEL < TASK < MAX_COST < MARGIN < HUMAN < MANDATE_*
        // So MODEL_NOT_ALLOWED should win.
        const d = evaluate(
            {
                model_requested: 'gpt-4o',
                estimated_cost_usd: 5,
                margin_floor_pct: 90,
                revenue_usd: 6,
            },
            ctx({ key: key({ allowedModels: ['claude-sonnet-4-6'], maxCostPerRequestUsd: 1 }) }),
        );
        expect(d.first_definitive_decision.code).toBe('MODEL_NOT_ALLOWED');
        const codes = d.all_triggered_checks.map((h) => h.code);
        expect(codes).toEqual([
            'MODEL_NOT_ALLOWED',
            'MAX_COST_PER_REQUEST_EXCEEDED',
            'MARGIN_FLOOR_NOT_MET',
        ]);
    });

    it('budget checks beat allowlist checks per canonical order', () => {
        const d = evaluate(
            { estimated_cost_usd: 5, model_requested: 'gpt-4o' },
            ctx({
                key: key({
                    monthlyBudgetUsd: 1,
                    mtdSpend: { keySpendUsd: 0, employeeSpendUsd: 0, departmentSpendUsd: 0 },
                    allowedModels: ['claude-sonnet-4-6'],
                }),
            }),
        );
        expect(d.first_definitive_decision.code).toBe('API_KEY_BUDGET_EXCEEDED');
        // Both hits surface; the API-KEY one wins because canonical order
        // ranks budget checks above allowlist checks.
        const codes = d.all_triggered_checks.map((h) => h.code);
        expect(codes[0]).toBe('API_KEY_BUDGET_EXCEEDED');
        expect(codes).toContain('MODEL_NOT_ALLOWED');
    });

    it('all_triggered_checks is sorted by canonical order regardless of input order', () => {
        // Input arranged to make insertion-order match be impossible to confuse with canonical sort.
        const inputA: SimulatorInput = {
            human_review_required: true,
            margin_floor_pct: 90,
            revenue_usd: 10,
            estimated_cost_usd: 2,
            mandate_id: 'mnd_1',
        };
        const d = evaluate(inputA, ctx({ key: key(), mandate: mandate({ maxAmountUsd: 1, amountSpentUsd: 0 }) }));
        const codes = d.all_triggered_checks.map((h) => h.code);
        const expectedCanonical = ['MARGIN_FLOOR_NOT_MET', 'HUMAN_REVIEW_REQUIRED', 'MANDATE_BUDGET_EXCEEDED'];
        expect(codes).toEqual(expectedCanonical);
    });

    it('is deterministic: same inputs return identical results', () => {
        const input: SimulatorInput = {
            model_requested: 'gpt-4o',
            estimated_cost_usd: 5,
            margin_floor_pct: 90,
            revenue_usd: 6,
        };
        const c = ctx({ key: key({ allowedModels: ['claude-sonnet-4-6'], maxCostPerRequestUsd: 1 }) });
        const a = evaluate(input, c);
        const b = evaluate(input, c);
        expect(a).toEqual(b);
    });
});
