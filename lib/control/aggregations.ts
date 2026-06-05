/**
 * Slice 3B — Control aggregations.
 *
 * Read-only DB layer for /api/v2/control/overview. Every query is
 * tenant-scoped (`tenant_id = $1`) and metadata-only — no prompt/response
 * content is read.
 *
 * Slice 3C source-of-truth note: every spend aggregation here sources
 * `ai_economic_events`, matching the shared spend service
 * (lib/spend/month-to-date.ts) primary. Runtime budget enforcement still
 * reads `traffic_events` until the Slice 3D flip gate; dashboard and
 * simulator agree on `ai_economic_events`.
 *
 * Budget burn semantics:
 *   - Spend is month-to-date (since first instant of current UTC month),
 *     independent of the dashboard filter window. Monthly caps are compared
 *     against monthly spend.
 *   - Attribution filters from the dashboard (department/employee/etc) DO
 *     apply to the MTD aggregations.
 *
 * Other panels (deny-code breakdown, human review, control coverage) use the
 * dashboard's filter window directly.
 */

import {
    buildBaseWhere,
    renderWhere,
} from '../sql/where-builder.js';
import type {
    AllowlistPanel,
    AllowlistStatusRow,
    BudgetBurnRow,
    ControlCoveragePanel,
    ControlFilters,
    DenyCodeBreakdownRow,
    HumanReviewSummary,
    MaxCostPerRequestPanel,
    PolicyDeniedSpendPanel,
    WorkflowBudgetBurnRow,
} from './types.js';

/** Minimal pool surface used by every aggregation. Mirrors monitor's. */
export interface ControlQueryable {
    query(text: string, values?: unknown[]): Promise<{ rows: Array<Record<string, unknown>> }>;
}

function startOfMonthUtc(now: Date): Date {
    return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
}

function budgetStatus(spend: number, budget: number | null): BudgetBurnRow['status'] {
    if (budget === null) return 'no_budget';
    if (budget <= 0) return 'no_budget';
    const pct = (spend / budget) * 100;
    if (pct >= 100) return 'over';
    if (pct >= 80) return 'at_risk';
    return 'ok';
}

function pct(n: number, d: number): number {
    if (d === 0) return 0;
    return Number(((n / d) * 100).toFixed(2));
}

// ---------------------------------------------------------------------------
// Budget burn — api_key level (UUID join: events.api_key_id -> api_keys.id)
// ---------------------------------------------------------------------------

export async function fetchApiKeyBudgetBurn(
    pool: ControlQueryable,
    tenantId: string,
    _filters: ControlFilters,
    now: Date,
): Promise<BudgetBurnRow[]> {
    // Budget burn is MTD by construction (monthly caps). LEFT JOIN preserves
    // keys with zero spend so the dashboard can flag unused budgets too.
    const monthStart = startOfMonthUtc(now).toISOString();
    const sql = `
        SELECT
            k.id::text                                       AS id,
            k.name                                           AS name,
            k.monthly_budget_usd::float                      AS budget_usd,
            COALESCE(SUM(e.cost_usd), 0)::float              AS spend_usd
        FROM api_keys k
        LEFT JOIN ai_economic_events e
               ON e.tenant_id = k.tenant_id
              AND e.api_key_id = k.id
              AND e.event_time >= $2
        WHERE k.tenant_id = $1
          AND k.status = 'active'
        GROUP BY k.id, k.name, k.monthly_budget_usd
        ORDER BY spend_usd DESC, k.name ASC
    `;
    const res = await pool.query(sql, [tenantId, monthStart]);
    return res.rows.map((r) => {
        const spend = Number(r.spend_usd ?? 0);
        const budget = r.budget_usd == null ? null : Number(r.budget_usd);
        return {
            id: String(r.id),
            key: String(r.name ?? r.id),
            spend_usd: spend,
            budget_usd: budget,
            budget_pct: budget == null || budget <= 0 ? null : pct(spend, budget),
            status: budgetStatus(spend, budget),
        };
    });
}

// ---------------------------------------------------------------------------
// Budget burn — department level
// Joins through api_keys (api_keys.department_id is UUID FK).
// ---------------------------------------------------------------------------

export async function fetchDepartmentBudgetBurn(
    pool: ControlQueryable,
    tenantId: string,
    _filters: ControlFilters,
    now: Date,
): Promise<BudgetBurnRow[]> {
    const monthStart = startOfMonthUtc(now).toISOString();
    const sql = `
        SELECT
            d.id::text                                         AS id,
            d.name                                             AS name,
            COALESCE(d.budget_usd, NULL)::float                AS budget_usd,
            COALESCE(SUM(e.cost_usd), 0)::float                AS spend_usd
        FROM departments d
        LEFT JOIN api_keys k
               ON k.tenant_id = d.tenant_id
              AND k.department_id = d.id
        LEFT JOIN ai_economic_events e
               ON e.tenant_id = d.tenant_id
              AND e.api_key_id = k.id
              AND e.event_time >= $2
        WHERE d.tenant_id = $1
        GROUP BY d.id, d.name, d.budget_usd
        ORDER BY spend_usd DESC, d.name ASC
    `;
    const res = await pool.query(sql, [tenantId, monthStart]);
    return res.rows.map((r) => {
        const spend = Number(r.spend_usd ?? 0);
        const budget = r.budget_usd == null ? null : Number(r.budget_usd);
        return {
            id: String(r.id),
            key: String(r.name ?? r.id),
            spend_usd: spend,
            budget_usd: budget,
            budget_pct: budget == null || budget <= 0 ? null : pct(spend, budget),
            status: budgetStatus(spend, budget),
        };
    });
}

// ---------------------------------------------------------------------------
// Budget burn — employee level
// ---------------------------------------------------------------------------

export async function fetchEmployeeBudgetBurn(
    pool: ControlQueryable,
    tenantId: string,
    _filters: ControlFilters,
    now: Date,
): Promise<BudgetBurnRow[]> {
    const monthStart = startOfMonthUtc(now).toISOString();
    const sql = `
        SELECT
            emp.id::text                                       AS id,
            emp.name                                           AS name,
            COALESCE(emp.monthly_budget_usd, NULL)::float      AS budget_usd,
            COALESCE(SUM(e.cost_usd), 0)::float                AS spend_usd
        FROM employees emp
        LEFT JOIN api_keys k
               ON k.tenant_id = emp.tenant_id
              AND k.employee_id = emp.id
        LEFT JOIN ai_economic_events e
               ON e.tenant_id = emp.tenant_id
              AND e.api_key_id = k.id
              AND e.event_time >= $2
        WHERE emp.tenant_id = $1
          AND emp.status = 'active'
        GROUP BY emp.id, emp.name, emp.monthly_budget_usd
        ORDER BY spend_usd DESC, emp.name ASC
    `;
    const res = await pool.query(sql, [tenantId, monthStart]);
    return res.rows.map((r) => {
        const spend = Number(r.spend_usd ?? 0);
        const budget = r.budget_usd == null ? null : Number(r.budget_usd);
        return {
            id: String(r.id),
            key: String(r.name ?? r.id),
            spend_usd: spend,
            budget_usd: budget,
            budget_pct: budget == null || budget <= 0 ? null : pct(spend, budget),
            status: budgetStatus(spend, budget),
        };
    });
}

// ---------------------------------------------------------------------------
// Budget burn — workflow level
//
// Per directive: spend grouped by workflow_id from economic events; budget
// is the SUM of monthly_budget_usd from api_keys attached to that workflow.
// Labelled "Configured key budget attached to workflow" — NOT a true
// workflow budget.
// ---------------------------------------------------------------------------

export async function fetchWorkflowBudgetBurn(
    pool: ControlQueryable,
    tenantId: string,
    _filters: ControlFilters,
    now: Date,
): Promise<WorkflowBudgetBurnRow[]> {
    const monthStart = startOfMonthUtc(now).toISOString();
    const sql = `
        WITH
        workflow_spend AS (
            SELECT
                workflow_id,
                COALESCE(SUM(cost_usd), 0)::float AS spend_usd
            FROM ai_economic_events
            WHERE tenant_id = $1
              AND event_time >= $2
              AND workflow_id IS NOT NULL
              AND workflow_id <> ''
            GROUP BY workflow_id
        ),
        workflow_key_budget AS (
            SELECT
                workflow_id,
                SUM(monthly_budget_usd)::float AS configured_key_budget_usd
            FROM api_keys
            WHERE tenant_id = $1
              AND status = 'active'
              AND workflow_id IS NOT NULL
              AND workflow_id <> ''
              AND monthly_budget_usd IS NOT NULL
            GROUP BY workflow_id
        )
        SELECT
            COALESCE(s.workflow_id, b.workflow_id)              AS workflow_id,
            COALESCE(s.spend_usd, 0)::float                     AS spend_usd,
            b.configured_key_budget_usd                         AS configured_key_budget_usd
        FROM workflow_spend s
        FULL OUTER JOIN workflow_key_budget b
            ON s.workflow_id = b.workflow_id
        ORDER BY spend_usd DESC, workflow_id ASC
    `;
    const res = await pool.query(sql, [tenantId, monthStart]);
    return res.rows.map((r) => {
        const spend = Number(r.spend_usd ?? 0);
        const configured = r.configured_key_budget_usd == null ? null : Number(r.configured_key_budget_usd);
        const hasBudget = configured !== null && configured > 0;
        return {
            workflow_id: String(r.workflow_id),
            spend_usd: spend,
            configured_key_budget_usd: configured,
            budget_label: hasBudget ? 'Configured key budget attached to workflow' as const : null,
            budget_pct: hasBudget ? pct(spend, configured as number) : null,
            status: !hasBudget
                ? 'no_configured_budget' as const
                : ((spend / (configured as number)) * 100 >= 100
                    ? 'over' as const
                    : (spend / (configured as number)) * 100 >= 80
                        ? 'at_risk' as const
                        : 'ok' as const),
        };
    });
}

// ---------------------------------------------------------------------------
// Allowlist status — models + task types
//
// For each active api_key, compare its allowed_* JSONB array against the
// distinct values actually observed for that key's events in the window.
// ---------------------------------------------------------------------------

async function fetchAllowlist(
    pool: ControlQueryable,
    tenantId: string,
    filters: ControlFilters,
    column: 'model_used' | 'task_type',
    allowedJsonbColumn: 'allowed_models' | 'allowed_task_types',
): Promise<AllowlistStatusRow[]> {
    const b = buildBaseWhere(tenantId, filters, 'e');
    const sql = `
        SELECT
            k.id::text                                  AS api_key_id,
            k.name                                      AS api_key_name,
            COALESCE(k.${allowedJsonbColumn}, '[]'::jsonb) AS allowed,
            COALESCE(
                jsonb_agg(DISTINCT e.${column}) FILTER (
                    WHERE e.${column} IS NOT NULL
                      AND e.${column} <> ''
                      AND (
                          k.${allowedJsonbColumn} IS NULL
                          OR jsonb_array_length(k.${allowedJsonbColumn}) = 0
                          OR NOT (k.${allowedJsonbColumn} ? e.${column})
                      )
                ),
                '[]'::jsonb
            )                                           AS observed_outside
        FROM api_keys k
        LEFT JOIN ai_economic_events e
               ON e.tenant_id = k.tenant_id
              AND e.api_key_id = k.id
              AND ${b.where.slice(1).map((w) => w.replace(/^e\./, 'e.')).join(' AND ') || 'TRUE'}
        WHERE k.tenant_id = $1
          AND k.status = 'active'
        GROUP BY k.id, k.name, k.${allowedJsonbColumn}
        ORDER BY k.name ASC
    `;
    const res = await pool.query(sql, b.params);
    return res.rows.map((r) => {
        const allowed: string[] = Array.isArray(r.allowed) ? (r.allowed as string[]) : [];
        const observedOutside: string[] = Array.isArray(r.observed_outside) ? (r.observed_outside as string[]) : [];
        const isUnrestricted = allowed.length === 0;
        return {
            api_key_id: String(r.api_key_id),
            api_key_name: String(r.api_key_name ?? r.api_key_id),
            allowed,
            observed_outside_allowlist: observedOutside,
            status: isUnrestricted
                ? 'unrestricted' as const
                : observedOutside.length === 0
                    ? 'ok' as const
                    : 'violations' as const,
        };
    });
}

export async function fetchAllowlistPanel(
    pool: ControlQueryable,
    tenantId: string,
    filters: ControlFilters,
): Promise<AllowlistPanel> {
    const [models, taskTypes] = await Promise.all([
        fetchAllowlist(pool, tenantId, filters, 'model_used', 'allowed_models'),
        fetchAllowlist(pool, tenantId, filters, 'task_type', 'allowed_task_types'),
    ]);
    return { models, task_types: taskTypes };
}

// ---------------------------------------------------------------------------
// Max cost per request panel
// ---------------------------------------------------------------------------

export async function fetchMaxCostPerRequest(
    pool: ControlQueryable,
    tenantId: string,
    filters: ControlFilters,
): Promise<MaxCostPerRequestPanel> {
    const keysSql = `
        SELECT
            COUNT(*) FILTER (WHERE max_cost_per_request_usd IS NOT NULL)::int AS keys_with_cap,
            COUNT(*) FILTER (WHERE max_cost_per_request_usd IS NULL)::int     AS keys_without_cap
        FROM api_keys
        WHERE tenant_id = $1
          AND status = 'active'
    `;
    const overSqlBuild = buildBaseWhere(tenantId, filters, 'e');
    const overSql = `
        SELECT
            COUNT(*)::int                          AS over_cap_events,
            COALESCE(SUM(e.cost_usd), 0)::float    AS over_cap_spend_usd
        FROM ai_economic_events e
        JOIN api_keys k
          ON k.tenant_id = e.tenant_id
         AND k.id = e.api_key_id
        ${renderWhere(overSqlBuild)}
          AND k.max_cost_per_request_usd IS NOT NULL
          AND e.cost_usd > k.max_cost_per_request_usd
    `;
    const [keysRes, overRes] = await Promise.all([
        pool.query(keysSql, [tenantId]),
        pool.query(overSql, overSqlBuild.params),
    ]);
    const k = keysRes.rows[0] ?? {};
    const o = overRes.rows[0] ?? {};
    return {
        keys_with_cap: Number(k.keys_with_cap ?? 0),
        keys_without_cap: Number(k.keys_without_cap ?? 0),
        over_cap_events: Number(o.over_cap_events ?? 0),
        over_cap_spend_usd: Number(o.over_cap_spend_usd ?? 0),
    };
}

// ---------------------------------------------------------------------------
// Policy-denied spend + deny-code breakdown
// ---------------------------------------------------------------------------

export async function fetchPolicyDeniedSpend(
    pool: ControlQueryable,
    tenantId: string,
    filters: ControlFilters,
): Promise<PolicyDeniedSpendPanel> {
    const b = buildBaseWhere(tenantId, filters);
    const totalSql = `
        SELECT
            COUNT(*)::int                                              AS total_events,
            COUNT(*) FILTER (WHERE governance_decision = 'denied')::int AS denied_events,
            COALESCE(SUM(cost_usd) FILTER (WHERE governance_decision = 'denied'), 0)::float
                                                                         AS denied_spend_usd
        FROM ai_economic_events
        ${renderWhere(b)}
    `;
    const breakdownSql = `
        SELECT
            COALESCE(NULLIF(deny_code, ''), 'UNKNOWN') AS deny_code,
            COUNT(*)::int                              AS count,
            COALESCE(SUM(cost_usd), 0)::float          AS spend_usd
        FROM ai_economic_events
        ${renderWhere(b)}
          AND governance_decision = 'denied'
        GROUP BY 1
        ORDER BY count DESC, deny_code ASC
    `;
    const [totalRes, breakdownRes] = await Promise.all([
        pool.query(totalSql, b.params),
        pool.query(breakdownSql, b.params),
    ]);
    const t = totalRes.rows[0] ?? {};
    const totalEvents = Number(t.total_events ?? 0);
    const deniedEvents = Number(t.denied_events ?? 0);
    const deniedSpendUsd = Number(t.denied_spend_usd ?? 0);
    const breakdown: DenyCodeBreakdownRow[] = breakdownRes.rows.map((r) => ({
        deny_code: String(r.deny_code),
        count: Number(r.count),
        spend_usd: Number(r.spend_usd),
        pct_of_denied_events: deniedEvents === 0 ? 0 : pct(Number(r.count), deniedEvents),
    }));
    return {
        denied_events: deniedEvents,
        denied_spend_usd: deniedSpendUsd,
        denied_event_pct: pct(deniedEvents, totalEvents),
        breakdown,
    };
}

// ---------------------------------------------------------------------------
// Human review summary
// ---------------------------------------------------------------------------

export async function fetchHumanReviewSummary(
    pool: ControlQueryable,
    tenantId: string,
    filters: ControlFilters,
): Promise<HumanReviewSummary> {
    const b = buildBaseWhere(tenantId, filters);
    const sql = `
        SELECT
            COUNT(*) FILTER (WHERE human_review_status = 'required')::int   AS required,
            COUNT(*) FILTER (WHERE human_review_status = 'pending')::int    AS pending,
            COUNT(*) FILTER (WHERE human_review_status = 'approved')::int   AS approved,
            COUNT(*) FILTER (WHERE human_review_status = 'rejected')::int   AS rejected,
            COUNT(*) FILTER (WHERE human_review_status = 'escalated')::int  AS escalated,
            COUNT(*) FILTER (WHERE human_review_status = 'expired')::int    AS expired
        FROM ai_economic_events
        ${renderWhere(b)}
    `;
    const res = await pool.query(sql, b.params);
    const r = res.rows[0] ?? {};
    const required = Number(r.required ?? 0);
    const pending = Number(r.pending ?? 0);
    return {
        required,
        pending,
        approved: Number(r.approved ?? 0),
        rejected: Number(r.rejected ?? 0),
        escalated: Number(r.escalated ?? 0),
        expired: Number(r.expired ?? 0),
        open_review_queue: required + pending,
    };
}

// ---------------------------------------------------------------------------
// Control coverage
// ---------------------------------------------------------------------------

export async function fetchControlCoverage(
    pool: ControlQueryable,
    tenantId: string,
    filters: ControlFilters,
): Promise<ControlCoveragePanel> {
    const b = buildBaseWhere(tenantId, filters);
    const sql = `
        SELECT
            COUNT(*)::int                                                  AS total_events,
            COUNT(*) FILTER (WHERE
                COALESCE(NULLIF(policy_id, ''), NULL)             IS NOT NULL
                OR COALESCE(NULLIF(budget_id, ''), NULL)          IS NOT NULL
                OR COALESCE(NULLIF(mandate_id, ''), NULL)         IS NOT NULL
                OR governance_decision                            IS NOT NULL
                OR COALESCE(NULLIF(deny_code, ''), NULL)          IS NOT NULL
            )::int                                                         AS with_any,
            COUNT(*) FILTER (WHERE policy_id IS NOT NULL AND policy_id <> '')::int  AS has_policy,
            COUNT(*) FILTER (WHERE budget_id IS NOT NULL AND budget_id <> '')::int  AS has_budget,
            COUNT(*) FILTER (WHERE mandate_id IS NOT NULL AND mandate_id <> '')::int AS has_mandate,
            COUNT(*) FILTER (WHERE governance_decision IS NOT NULL)::int            AS has_decision,
            COUNT(*) FILTER (WHERE deny_code IS NOT NULL AND deny_code <> '')::int  AS has_deny
        FROM ai_economic_events
        ${renderWhere(b)}
    `;
    const res = await pool.query(sql, b.params);
    const r = res.rows[0] ?? {};
    const total = Number(r.total_events ?? 0);
    const withAny = Number(r.with_any ?? 0);
    const fieldCount = (n: unknown) => Number(n ?? 0);
    const fields = [
        { field: 'policy_id', present: fieldCount(r.has_policy) },
        { field: 'budget_id', present: fieldCount(r.has_budget) },
        { field: 'mandate_id', present: fieldCount(r.has_mandate) },
        { field: 'governance_decision', present: fieldCount(r.has_decision) },
        { field: 'deny_code', present: fieldCount(r.has_deny) },
    ];
    return {
        total_events: total,
        with_any_control_signal: withAny,
        coverage_pct: pct(withAny, total),
        fields: fields.map((f) => ({ ...f, present_pct: pct(f.present, total) })),
    };
}
