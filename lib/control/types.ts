/**
 * Slice 3B — Control foundation. Types for `/dashboard/control`,
 * `GET /api/v2/control/overview`, and `POST /api/v2/control/simulator`.
 *
 * Privacy posture: metadata-only. No fields here represent prompt or response
 * content. The aggregation layer's SQL is guarded by a content-field test.
 *
 * Decision codes:
 *   `ControlDecisionCode` is intentionally separate from `ApiErrorCode`.
 *   A control decision is not always an error — `APPROVED`,
 *   `HUMAN_REVIEW_REQUIRED`, and `MARGIN_FLOOR_NOT_MET` are governance
 *   outcomes the dashboard renders without raising an API error.
 */

import type { BaseFilters } from '../sql/where-builder.js';

// ---------------------------------------------------------------------------
// Filters (URL/query layer — same envelope shape as Monitor)
// ---------------------------------------------------------------------------

export type ControlFilters = BaseFilters;

// ---------------------------------------------------------------------------
// Decision vocabulary
// ---------------------------------------------------------------------------

/**
 * Decision codes returned by the simulator and surfaced by the dashboard.
 *
 * Naming rules:
 *   - `MANDATE_*` codes prefix the raw codes returned by `AP2PolicyEngine`
 *     (which returns bare `BUDGET_EXCEEDED` / `CATEGORY_NOT_ALLOWED`). The
 *     simulator maps engine codes -> these prefixed codes so the dashboard
 *     can distinguish a mandate-budget breach from an api-key-budget breach.
 *   - `*_BUDGET_EXCEEDED` mirror the existing `ApiErrorCode` strings used by
 *     `budget-guard` at runtime, so a later wiring slice (3C) can map 1:1.
 *   - `MARGIN_FLOOR_NOT_MET` and `HUMAN_REVIEW_REQUIRED` are control states,
 *     not runtime errors. They do not need an `ApiErrorCode` entry.
 */
export type ControlDecisionCode =
    | 'APPROVED'
    | 'API_KEY_BUDGET_EXCEEDED'
    | 'EMPLOYEE_BUDGET_EXCEEDED'
    | 'DEPARTMENT_BUDGET_EXCEEDED'
    | 'TENANT_BUDGET_EXCEEDED'
    | 'MODEL_NOT_ALLOWED'
    | 'TASK_TYPE_NOT_ALLOWED'
    | 'MAX_COST_PER_REQUEST_EXCEEDED'
    | 'MARGIN_FLOOR_NOT_MET'
    | 'HUMAN_REVIEW_REQUIRED'
    | 'MANDATE_NOT_FOUND'
    | 'MANDATE_INACTIVE'
    | 'MANDATE_EXPIRED'
    | 'MANDATE_BUDGET_EXCEEDED'
    | 'MANDATE_CATEGORY_DENIED'
    | 'SECURITY_PACK_BLOCKED';

/**
 * Slice 3W — provenance discriminators for simulator hits. The simulator
 * augments every hit with where the rule lives (`source`), what scope the
 * rule applies to (`scope`), and which configured field produced it
 * (`field`). This lets the UI and API consumers label a tenant-default
 * decision without confusing it with an API-key decision.
 *
 * `source` and `scope` overlap in vocabulary by design: `source` names the
 * configuration rung that holds the rule (e.g. `api_key`, `tenant_default`);
 * `scope` names the operational reach of the rule (e.g. `api_key`, `tenant`).
 * `field` is the specific configured column (e.g. `monthly_budget_usd`).
 */
export type DecisionSource =
    | 'api_key' | 'employee' | 'department' | 'tenant_default'
    | 'mandate' | 'request' | 'simulator' | 'system';
export type DecisionScope =
    | 'api_key' | 'employee' | 'department' | 'tenant'
    | 'mandate' | 'request' | 'simulator' | 'system';

/**
 * Canonical decision order. The simulator runs checks in this order and
 * `first_definitive_decision` is the first non-approve code emitted. The
 * dashboard simulator panel reflects this exact sequence.
 *
 * Order is part of the contract — tests pin it. Most-specific-wins:
 * api_key > employee > department > tenant_default for the budget family.
 */
export const CANONICAL_DECISION_ORDER: readonly ControlDecisionCode[] = Object.freeze([
    'API_KEY_BUDGET_EXCEEDED',
    'EMPLOYEE_BUDGET_EXCEEDED',
    'DEPARTMENT_BUDGET_EXCEEDED',
    'TENANT_BUDGET_EXCEEDED',
    'MODEL_NOT_ALLOWED',
    'TASK_TYPE_NOT_ALLOWED',
    'MAX_COST_PER_REQUEST_EXCEEDED',
    'MARGIN_FLOOR_NOT_MET',
    'HUMAN_REVIEW_REQUIRED',
    'MANDATE_NOT_FOUND',
    'MANDATE_INACTIVE',
    'MANDATE_EXPIRED',
    'MANDATE_BUDGET_EXCEEDED',
    'MANDATE_CATEGORY_DENIED',
    'SECURITY_PACK_BLOCKED',
] as const);

/** Decision status. `denied` is hard-deny; `requires_review` is a gating state. */
export type ControlDecisionStatus = 'approved' | 'denied' | 'warned' | 'requires_review';

/** Mapping decision-code -> status. Pure, no side effects. */
export function statusForCode(code: ControlDecisionCode): ControlDecisionStatus {
    if (code === 'APPROVED') return 'approved';
    if (code === 'MARGIN_FLOOR_NOT_MET' || code === 'HUMAN_REVIEW_REQUIRED') {
        return 'requires_review';
    }
    return 'denied';
}

// ---------------------------------------------------------------------------
// Simulator
// ---------------------------------------------------------------------------

/**
 * Inputs the simulator accepts. All fields are optional; the simulator skips
 * checks for which it has no input. The route handler hydrates `apiKeyCtx`
 * (if `api_key_id` supplied) and the mandate row (if `mandate_id` supplied)
 * before calling the pure evaluate() function.
 */
export interface SimulatorInput {
    /** Caller-supplied request shape. */
    model_requested?: string;
    task_type?: string;
    estimated_cost_usd?: number;
    /** If both `margin_floor_pct` and `revenue_usd` are set, margin is evaluated. */
    margin_floor_pct?: number;
    revenue_usd?: number;
    /** If true, the simulator emits HUMAN_REVIEW_REQUIRED (a requires_review state). */
    human_review_required?: boolean;

    /** Optional dimensions used only for display in the simulator response. */
    department_id?: string;
    employee_id?: string;
    workflow_id?: string;
    customer_id?: string;
    feature_id?: string;
    provider?: string;

    /** Identifiers the route resolves into typed contexts (not surfaced raw to the simulator). */
    api_key_id?: string;
    mandate_id?: string;
    category?: string;
}

/**
 * Hydrated key context the simulator reads from. Subset of `ApiKeyContext`
 * (lib/types/api-key.ts) plus precomputed MTD spend the route fetches. Pure
 * function — no DB calls inside evaluate().
 */
export interface SimulatorKeyContext {
    apiKeyId: string;
    allowedModels: string[];
    allowedTaskTypes: string[];
    maxCostPerRequestUsd: number | null;
    monthlyBudgetUsd: number | null;
    employeeMonthlyBudgetUsd: number | null;
    departmentMonthlyBudgetUsd: number | null;
    /** Month-to-date spend buckets, already computed and tenant-scoped. */
    mtdSpend: {
        keySpendUsd: number;
        employeeSpendUsd: number;
        departmentSpendUsd: number;
    };
}

/**
 * Tenant-scoped mandate snapshot. The route MUST verify the mandate's
 * `tenant_id` matches the caller's tenant before constructing this — the
 * simulator trusts that scoping has already happened.
 */
export interface SimulatorMandateContext {
    mandateId: string;
    status: string;
    validUntil?: string;
    maxAmountUsd: number;
    amountSpentUsd: number;
    allowedCategories?: string[];
}

/**
 * Slice 3W — tenant-default rung. The route loads this from
 * `tenant_control_settings` and supplies it (or `undefined` when the tenant
 * has no saved row). The simulator consults this rung after the key /
 * employee / department rungs and only when a more-specific rung is unset
 * for the relevant axis (most-specific-wins). For the budget axis, the
 * tenant rung is independent: it evaluates a tenant-wide MTD aggregate
 * against `monthlyBudgetUsd` regardless of the lower rungs.
 *
 * This rung does NOT participate in runtime enforcement in slice 3W. The
 * runtime budget-guard (`lib/providers/openrouter/billing-guard.ts`) does
 * not import this type. Wiring runtime to read this rung is deferred to
 * 3X (shadow) and 3Y (enforce).
 */
export interface SimulatorTenantDefaultContext {
    monthlyBudgetUsd:         number | null;
    maxCostPerRequestUsd:     number | null;
    humanReviewThresholdUsd:  number | null;
    allowedModels:            string[];
    allowedTaskTypes:         string[];
    /** Month-to-date spend across the entire tenant. Tenant-scoped query. */
    mtdTenantSpendUsd:        number;
}

export interface SimulatorEvaluationContext {
    tenantId: string;
    key?: SimulatorKeyContext;
    mandate?: SimulatorMandateContext;
    /** Slice 3W. Loaded from tenant_control_settings; undefined when no row. */
    tenantDefault?: SimulatorTenantDefaultContext;
}

/** One triggered check (an evaluator hit). */
export interface SimulatorCheckHit {
    code: ControlDecisionCode;
    status: ControlDecisionStatus;
    matched_rule: string;
    detail?: Record<string, unknown>;
    /** Slice 3W — provenance for the UI label. Always present on simulator
     *  hits emitted after 3W; absent on legacy callers. */
    source?: DecisionSource;
    scope?: DecisionScope;
    field?: string;
}

/**
 * Simulator output.
 *
 *   - `first_definitive_decision` follows {@link CANONICAL_DECISION_ORDER}.
 *   - `all_triggered_checks` lists every hit in the same canonical order so
 *     the UI can show every violation without re-running the simulator.
 *   - `margin_floor_status` is `not_evaluable` if revenue_usd is missing —
 *     missing revenue is visibility, not enforcement.
 *
 * Test invariant: when multiple checks fire, the first_definitive_decision
 * always reflects the canonical order, regardless of input order.
 */
export interface SimulatorDecision {
    first_definitive_decision: {
        code: ControlDecisionCode;
        status: ControlDecisionStatus;
        matched_rule: string;
        /** Slice 3W — provenance for the UI. Present when the hit came from
         *  a configured rung (api_key, employee, department, tenant_default,
         *  mandate, simulator, request). Absent on plain APPROVED. */
        source?: DecisionSource;
        scope?: DecisionScope;
        field?: string;
    };
    all_triggered_checks: SimulatorCheckHit[];
    margin_floor_status: 'pass' | 'not_met' | 'not_evaluable' | 'not_requested';
    /** Echo of the canonical order for the dashboard's debug surface. */
    canonical_order: readonly ControlDecisionCode[];
}

// ---------------------------------------------------------------------------
// Overview panels
// ---------------------------------------------------------------------------

export interface BudgetBurnRow {
    /** Display key (department name / employee name / workflow id / api_key name). */
    key: string;
    /** Stable identifier for joins. */
    id: string;
    spend_usd: number;
    budget_usd: number | null;
    budget_pct: number | null;
    /** `at_risk` at >= 80%, `over` at >= 100%, `ok` otherwise, `no_budget` when null. */
    status: 'ok' | 'at_risk' | 'over' | 'no_budget';
}

export interface WorkflowBudgetBurnRow {
    workflow_id: string;
    spend_usd: number;
    /** Sum of monthly_budget_usd from api_keys attached to this workflow. */
    configured_key_budget_usd: number | null;
    /** "Configured key budget attached to workflow" — exact label per directive. */
    budget_label: 'Configured key budget attached to workflow' | null;
    budget_pct: number | null;
    status: 'ok' | 'at_risk' | 'over' | 'no_configured_budget';
}

export interface AllowlistStatusRow {
    api_key_id: string;
    api_key_name: string;
    allowed: string[];
    observed_outside_allowlist: string[];
    /** `unrestricted` when allowed=[]; `ok` when no observed outside; otherwise `violations`. */
    status: 'unrestricted' | 'ok' | 'violations';
}

export interface AllowlistPanel {
    models: AllowlistStatusRow[];
    task_types: AllowlistStatusRow[];
}

export interface DenyCodeBreakdownRow {
    deny_code: string;
    count: number;
    spend_usd: number;
    pct_of_denied_events: number;
}

export interface PolicyDeniedSpendPanel {
    denied_events: number;
    denied_spend_usd: number;
    /** Of all events in window. */
    denied_event_pct: number;
    breakdown: DenyCodeBreakdownRow[];
}

export interface HumanReviewSummary {
    required: number;
    pending: number;
    approved: number;
    rejected: number;
    escalated: number;
    expired: number;
    /** required + pending. */
    open_review_queue: number;
}

export interface ControlCoveragePanel {
    total_events: number;
    /** Any of: policy_id, budget_id, mandate_id, governance_decision, deny_code. */
    with_any_control_signal: number;
    /** Coverage percent (with / total). */
    coverage_pct: number;
    /** Per-field present counts. */
    fields: Array<{ field: string; present: number; present_pct: number }>;
}

export interface MaxCostPerRequestPanel {
    keys_with_cap: number;
    keys_without_cap: number;
    /** Events whose cost_usd exceeded their key's configured cap, if any. */
    over_cap_events: number;
    over_cap_spend_usd: number;
}

export interface ControlOverviewResponse {
    period: { since: string; until: string; window_days: number };
    filters_applied: ControlFilters;
    budget_burn: {
        api_keys: BudgetBurnRow[];
        departments: BudgetBurnRow[];
        employees: BudgetBurnRow[];
        workflows: WorkflowBudgetBurnRow[];
    };
    allowlist: AllowlistPanel;
    max_cost_per_request: MaxCostPerRequestPanel;
    policy_denied_spend: PolicyDeniedSpendPanel;
    human_review: HumanReviewSummary;
    control_coverage: ControlCoveragePanel;
    privacy_note: string;
}
