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
    type SimulatorCheckHit,
    type SimulatorDecision,
    type SimulatorEvaluationContext,
    type SimulatorInput,
} from './types.js';

interface RawHit {
    code: ControlDecisionCode;
    matched_rule: string;
    detail?: Record<string, unknown>;
}

/** Push a hit onto the raw list (no ordering yet — sorted at the end). */
function add(hits: RawHit[], code: ControlDecisionCode, matched_rule: string, detail?: Record<string, unknown>) {
    hits.push({ code, matched_rule, detail });
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
            });
        }
        const empProjected = mtdSpend.employeeSpendUsd + (input.estimated_cost_usd ?? 0);
        if (employeeMonthlyBudgetUsd !== null && empProjected > employeeMonthlyBudgetUsd) {
            add(hits, 'EMPLOYEE_BUDGET_EXCEEDED', 'employee.monthly_budget_usd', {
                projected_spend_usd: empProjected,
                cap_usd: employeeMonthlyBudgetUsd,
            });
        }
        const deptProjected = mtdSpend.departmentSpendUsd + (input.estimated_cost_usd ?? 0);
        if (departmentMonthlyBudgetUsd !== null && deptProjected > departmentMonthlyBudgetUsd) {
            add(hits, 'DEPARTMENT_BUDGET_EXCEEDED', 'department.budget_usd', {
                projected_spend_usd: deptProjected,
                cap_usd: departmentMonthlyBudgetUsd,
            });
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
            });
        }
        if (
            input.task_type &&
            ctx.key.allowedTaskTypes.length > 0 &&
            !ctx.key.allowedTaskTypes.includes(input.task_type)
        ) {
            add(hits, 'TASK_TYPE_NOT_ALLOWED', 'api_key.allowed_task_types', {
                task_type: input.task_type,
                allowed: ctx.key.allowedTaskTypes,
            });
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
            });
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
                });
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
                });
            } else {
                marginStatus = 'pass';
            }
        }
    }

    // -----------------------------------------------------------------------
    // Human review. Informational gating state.
    // -----------------------------------------------------------------------
    if (input.human_review_required === true) {
        add(hits, 'HUMAN_REVIEW_REQUIRED', 'simulator.human_review_required', {});
    }

    // -----------------------------------------------------------------------
    // Mandate checks. Tenant scoping enforced by the route; we trust the ctx.
    // -----------------------------------------------------------------------
    if (input.mandate_id) {
        if (!ctx.mandate) {
            add(hits, 'MANDATE_NOT_FOUND', 'ap2_mandates', {
                mandate_id: input.mandate_id,
            });
        } else {
            const m = ctx.mandate;
            if (m.status !== 'active') {
                add(hits, 'MANDATE_INACTIVE', 'ap2_mandates.status', {
                    status: m.status,
                });
            }
            if (m.validUntil && new Date(m.validUntil).getTime() < Date.now()) {
                add(hits, 'MANDATE_EXPIRED', 'ap2_mandates.constraints.valid_until', {
                    valid_until: m.validUntil,
                });
            }
            const projected = m.amountSpentUsd + (input.estimated_cost_usd ?? 0);
            if (projected > m.maxAmountUsd) {
                add(hits, 'MANDATE_BUDGET_EXCEEDED', 'ap2_mandates.constraints.max_amount_usd', {
                    projected_spend_usd: projected,
                    cap_usd: m.maxAmountUsd,
                });
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
                });
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
    }));

    const first = sortedHits[0];
    const decision: SimulatorDecision = {
        first_definitive_decision: first
            ? {
                code: first.code,
                status: statusForCode(first.code),
                matched_rule: first.matched_rule,
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
