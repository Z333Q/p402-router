/**
 * Slice 3B — Pure policy simulator.
 *
 * `evaluate(input, ctx)` runs the canonical decision order non-throwing and
 * returns BOTH the first definitive decision (for deterministic runtime use
 * later) AND every triggered check (for the dashboard's full-violation view).
 *
 * Hard rules pinned by tests:
 *   - The first_definitive_decision follows {@link CANONICAL_DECISION_ORDER},
 *     regardless of the order checks are listed in code.
 *   - Margin floor: not_evaluable when revenue_usd is missing — never deny.
 *     Visibility, not enforcement.
 *   - Human review: requires_review, NOT denied. It's a gating state.
 *   - No DB calls inside evaluate(). The route hydrates ctx beforehand.
 *   - Mandate context arrives already tenant-scoped — the route MUST verify
 *     mandate.tenant_id matches the caller before constructing it.
 */

import {
    CANONICAL_DECISION_ORDER,
    statusForCode,
    type ControlDecisionCode,
    type DecisionScope,
    type DecisionSource,
    type SimulatorCheckHit,
    type SimulatorDecision,
    type SimulatorEvaluationContext,
    type SimulatorInput,
} from './types.js';

interface RawHit {
    code: ControlDecisionCode;
    matched_rule: string;
    detail?: Record<string, unknown>;
    source?: DecisionSource;
    scope?: DecisionScope;
    field?: string;
}

/** Push a hit onto the raw list (no ordering yet — sorted at the end). */
function add(
    hits: RawHit[],
    code: ControlDecisionCode,
    matched_rule: string,
    detail?: Record<string, unknown>,
    provenance?: { source: DecisionSource; scope: DecisionScope; field?: string },
) {
    hits.push({ code, matched_rule, detail, ...provenance });
}

export function evaluate(
    input: SimulatorInput,
    ctx: SimulatorEvaluationContext,
): SimulatorDecision {
    const hits: RawHit[] = [];

    // -----------------------------------------------------------------------
    // Budget checks (key/employee/department). Use precomputed MTD spend.
    // -----------------------------------------------------------------------
    if (ctx.key) {
        const { mtdSpend, monthlyBudgetUsd, employeeMonthlyBudgetUsd, departmentMonthlyBudgetUsd } = ctx.key;
        const projected = mtdSpend.keySpendUsd + (input.estimated_cost_usd ?? 0);
        if (monthlyBudgetUsd !== null && projected > monthlyBudgetUsd) {
            add(hits, 'API_KEY_BUDGET_EXCEEDED', 'api_key.monthly_budget_usd', {
                projected_spend_usd: projected,
                cap_usd: monthlyBudgetUsd,
            }, { source: 'api_key', scope: 'api_key', field: 'monthly_budget_usd' });
        }
        const empProjected = mtdSpend.employeeSpendUsd + (input.estimated_cost_usd ?? 0);
        if (employeeMonthlyBudgetUsd !== null && empProjected > employeeMonthlyBudgetUsd) {
            add(hits, 'EMPLOYEE_BUDGET_EXCEEDED', 'employee.monthly_budget_usd', {
                projected_spend_usd: empProjected,
                cap_usd: employeeMonthlyBudgetUsd,
            }, { source: 'employee', scope: 'employee', field: 'monthly_budget_usd' });
        }
        const deptProjected = mtdSpend.departmentSpendUsd + (input.estimated_cost_usd ?? 0);
        if (departmentMonthlyBudgetUsd !== null && deptProjected > departmentMonthlyBudgetUsd) {
            add(hits, 'DEPARTMENT_BUDGET_EXCEEDED', 'department.budget_usd', {
                projected_spend_usd: deptProjected,
                cap_usd: departmentMonthlyBudgetUsd,
            }, { source: 'department', scope: 'department', field: 'budget_usd' });
        }

        // ---------------------------------------------------------------------
        // Allowlists. Empty list means "all allowed" (matches budget-guard).
        // ---------------------------------------------------------------------
        if (
            input.model_requested &&
            ctx.key.allowedModels.length > 0 &&
            !ctx.key.allowedModels.includes(input.model_requested)
        ) {
            add(hits, 'MODEL_NOT_ALLOWED', 'api_key.allowed_models', {
                model_requested: input.model_requested,
                allowed: ctx.key.allowedModels,
            }, { source: 'api_key', scope: 'api_key', field: 'allowed_models' });
        }
        if (
            input.task_type &&
            ctx.key.allowedTaskTypes.length > 0 &&
            !ctx.key.allowedTaskTypes.includes(input.task_type)
        ) {
            add(hits, 'TASK_TYPE_NOT_ALLOWED', 'api_key.allowed_task_types', {
                task_type: input.task_type,
                allowed: ctx.key.allowedTaskTypes,
            }, { source: 'api_key', scope: 'api_key', field: 'allowed_task_types' });
        }

        // ---------------------------------------------------------------------
        // Max cost per request.
        // ---------------------------------------------------------------------
        if (
            ctx.key.maxCostPerRequestUsd !== null &&
            input.estimated_cost_usd !== undefined &&
            input.estimated_cost_usd > ctx.key.maxCostPerRequestUsd
        ) {
            add(hits, 'MAX_COST_PER_REQUEST_EXCEEDED', 'api_key.max_cost_per_request_usd', {
                estimated_cost_usd: input.estimated_cost_usd,
                cap_usd: ctx.key.maxCostPerRequestUsd,
            }, { source: 'api_key', scope: 'api_key', field: 'max_cost_per_request_usd' });
        }
    }

    // -----------------------------------------------------------------------
    // Slice 3W — tenant_default rung.
    //
    // Most-specific-wins for the per-axis fields. Independent constraint for
    // the tenant-wide monthly budget (the api_key/employee/department budgets
    // operate on different MTD denominators, so the tenant cap is an extra
    // constraint, not an inheritance fallback).
    //
    // The "no widening" invariant: the simulator caller cannot bypass these
    // by omitting their request inputs. Tenant-default human_review_threshold
    // fires from the tenant rung even when the caller did not set
    // human_review_required=true.
    //
    // Runtime enforcement is NOT wired here in 3W. The route logs that the
    // tenant rung participated; billing-guard does not read these values.
    // -----------------------------------------------------------------------
    if (ctx.tenantDefault) {
        const td = ctx.tenantDefault;
        const cost = input.estimated_cost_usd ?? 0;

        // Budget: independent (tenant-wide MTD aggregate). Fires whenever
        // configured, regardless of more-specific budget rungs.
        if (td.monthlyBudgetUsd !== null) {
            const projectedTenant = td.mtdTenantSpendUsd + cost;
            if (projectedTenant > td.monthlyBudgetUsd) {
                add(hits, 'TENANT_BUDGET_EXCEEDED', 'tenant_control_settings.monthly_budget_usd', {
                    projected_spend_usd: projectedTenant,
                    cap_usd: td.monthlyBudgetUsd,
                }, { source: 'tenant_default', scope: 'tenant', field: 'monthly_budget_usd' });
            }
        }

        // Max cost per request: most-specific-wins. Only evaluate the tenant
        // rung when the api_key rung is unset (no key or null cap).
        const keyMaxCost = ctx.key?.maxCostPerRequestUsd ?? null;
        if (
            keyMaxCost === null &&
            td.maxCostPerRequestUsd !== null &&
            input.estimated_cost_usd !== undefined &&
            input.estimated_cost_usd > td.maxCostPerRequestUsd
        ) {
            add(hits, 'MAX_COST_PER_REQUEST_EXCEEDED', 'tenant_control_settings.max_cost_per_request_usd', {
                estimated_cost_usd: input.estimated_cost_usd,
                cap_usd: td.maxCostPerRequestUsd,
            }, { source: 'tenant_default', scope: 'tenant', field: 'max_cost_per_request_usd' });
        }

        // Allowed models: most-specific-wins. Only evaluate the tenant rung
        // when the api_key rung is unset or has no allowlist configured.
        const keyHasModelAllowlist = (ctx.key?.allowedModels.length ?? 0) > 0;
        if (
            !keyHasModelAllowlist &&
            input.model_requested &&
            td.allowedModels.length > 0 &&
            !td.allowedModels.includes(input.model_requested)
        ) {
            add(hits, 'MODEL_NOT_ALLOWED', 'tenant_control_settings.allowed_models', {
                model_requested: input.model_requested,
                allowed: td.allowedModels,
            }, { source: 'tenant_default', scope: 'tenant', field: 'allowed_models' });
        }

        // Allowed task types: same most-specific-wins semantic.
        const keyHasTaskAllowlist = (ctx.key?.allowedTaskTypes.length ?? 0) > 0;
        if (
            !keyHasTaskAllowlist &&
            input.task_type &&
            td.allowedTaskTypes.length > 0 &&
            !td.allowedTaskTypes.includes(input.task_type)
        ) {
            add(hits, 'TASK_TYPE_NOT_ALLOWED', 'tenant_control_settings.allowed_task_types', {
                task_type: input.task_type,
                allowed: td.allowedTaskTypes,
            }, { source: 'tenant_default', scope: 'tenant', field: 'allowed_task_types' });
        }

        // Human review threshold: tenant-only field (no api_key equivalent).
        // Caller cannot suppress by omitting human_review_required — the
        // tenant configuration is the source of truth.
        if (
            td.humanReviewThresholdUsd !== null &&
            input.estimated_cost_usd !== undefined &&
            input.estimated_cost_usd > td.humanReviewThresholdUsd
        ) {
            add(hits, 'HUMAN_REVIEW_REQUIRED', 'tenant_control_settings.human_review_threshold_usd', {
                estimated_cost_usd: input.estimated_cost_usd,
                threshold_usd: td.humanReviewThresholdUsd,
            }, { source: 'tenant_default', scope: 'tenant', field: 'human_review_threshold_usd' });
        }
    }

    // -----------------------------------------------------------------------
    // Margin floor. Caller-supplied only in Slice 3B. Tri-state.
    // -----------------------------------------------------------------------
    let marginStatus: SimulatorDecision['margin_floor_status'] = 'not_requested';
    if (input.margin_floor_pct !== undefined) {
        if (input.revenue_usd === undefined) {
            marginStatus = 'not_evaluable';
        } else if (input.revenue_usd <= 0) {
            // Revenue of 0 (or negative) and a floor > 0 is structurally not-met.
            // Treat as not_met only if a positive floor was requested.
            marginStatus = input.margin_floor_pct > 0 ? 'not_met' : 'pass';
            if (marginStatus === 'not_met') {
                add(hits, 'MARGIN_FLOOR_NOT_MET', 'simulator.margin_floor_pct', {
                    margin_floor_pct: input.margin_floor_pct,
                    revenue_usd: input.revenue_usd,
                    cost_usd: input.estimated_cost_usd ?? 0,
                }, { source: 'simulator', scope: 'simulator', field: 'margin_floor_pct' });
            }
        } else {
            const cost = input.estimated_cost_usd ?? 0;
            const projectedMarginPct = ((input.revenue_usd - cost) / input.revenue_usd) * 100;
            if (projectedMarginPct < input.margin_floor_pct) {
                marginStatus = 'not_met';
                add(hits, 'MARGIN_FLOOR_NOT_MET', 'simulator.margin_floor_pct', {
                    margin_floor_pct: input.margin_floor_pct,
                    projected_margin_pct: Number(projectedMarginPct.toFixed(4)),
                    revenue_usd: input.revenue_usd,
                    cost_usd: cost,
                }, { source: 'simulator', scope: 'simulator', field: 'margin_floor_pct' });
            } else {
                marginStatus = 'pass';
            }
        }
    }

    // -----------------------------------------------------------------------
    // Human review. Informational gating state.
    // -----------------------------------------------------------------------
    if (input.human_review_required === true) {
        add(hits, 'HUMAN_REVIEW_REQUIRED', 'simulator.human_review_required', {},
            { source: 'request', scope: 'request', field: 'human_review_required' });
    }

    // -----------------------------------------------------------------------
    // Mandate checks. Tenant scoping enforced by the route; we trust the ctx.
    // -----------------------------------------------------------------------
    if (input.mandate_id) {
        if (!ctx.mandate) {
            add(hits, 'MANDATE_NOT_FOUND', 'ap2_mandates', {
                mandate_id: input.mandate_id,
            }, { source: 'mandate', scope: 'mandate' });
        } else {
            const m = ctx.mandate;
            if (m.status !== 'active') {
                add(hits, 'MANDATE_INACTIVE', 'ap2_mandates.status', {
                    status: m.status,
                }, { source: 'mandate', scope: 'mandate', field: 'status' });
            }
            if (m.validUntil && new Date(m.validUntil).getTime() < Date.now()) {
                add(hits, 'MANDATE_EXPIRED', 'ap2_mandates.constraints.valid_until', {
                    valid_until: m.validUntil,
                }, { source: 'mandate', scope: 'mandate', field: 'valid_until' });
            }
            const projected = m.amountSpentUsd + (input.estimated_cost_usd ?? 0);
            if (projected > m.maxAmountUsd) {
                add(hits, 'MANDATE_BUDGET_EXCEEDED', 'ap2_mandates.constraints.max_amount_usd', {
                    projected_spend_usd: projected,
                    cap_usd: m.maxAmountUsd,
                }, { source: 'mandate', scope: 'mandate', field: 'max_amount_usd' });
            }
            if (
                input.category &&
                m.allowedCategories &&
                m.allowedCategories.length > 0 &&
                !m.allowedCategories.includes(input.category)
            ) {
                add(hits, 'MANDATE_CATEGORY_DENIED', 'ap2_mandates.constraints.allowed_categories', {
                    category: input.category,
                    allowed_categories: m.allowedCategories,
                }, { source: 'mandate', scope: 'mandate', field: 'allowed_categories' });
            }
        }
    }

    // -----------------------------------------------------------------------
    // Sort hits by canonical order so first_definitive_decision is
    // deterministic regardless of the order checks were appended above.
    // -----------------------------------------------------------------------
    const orderIndex = (c: ControlDecisionCode) => CANONICAL_DECISION_ORDER.indexOf(c);
    const sortedHits = [...hits].sort((a, b) => orderIndex(a.code) - orderIndex(b.code));

    const allTriggered: SimulatorCheckHit[] = sortedHits.map((h) => ({
        code: h.code,
        status: statusForCode(h.code),
        matched_rule: h.matched_rule,
        detail: h.detail,
        source: h.source,
        scope: h.scope,
        field: h.field,
    }));

    const first = sortedHits[0];
    const decision: SimulatorDecision = {
        first_definitive_decision: first
            ? {
                code: first.code,
                status: statusForCode(first.code),
                matched_rule: first.matched_rule,
                source: first.source,
                scope: first.scope,
                field: first.field,
            }
            : {
                code: 'APPROVED',
                status: 'approved',
                matched_rule: 'simulator.default',
            },
        all_triggered_checks: allTriggered,
        margin_floor_status: marginStatus,
        canonical_order: CANONICAL_DECISION_ORDER,
    };
    return decision;
}
