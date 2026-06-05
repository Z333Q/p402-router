/**
 * Slice 3A — Monitor aggregations.
 *
 * Pure DB layer. Each function takes a pg pool, a tenantId, and a MonitorFilters
 * envelope, and returns the typed panel shape. Every query filters by
 * `tenant_id = $1` first — that's the auditable rule for this slice.
 *
 * No prompt or response content is read; we only ever touch metadata columns on
 * `ai_economic_events` and the status column on `request_outcomes`.
 */

import {
    ATTRIBUTION_FIELDS,
    COST_PER_ACCEPTED_OUTPUT_THRESHOLDS,
    UNATTRIBUTED,
    type AttributionCompletenessPanel,
    type AttributionField,
    type CostPerAcceptedOutputPanel,
    type EvidenceCoveragePanel,
    type GroupSpendRow,
    type MonitorFilters,
    type MonitorTotals,
    type OutcomeCompletenessPanel,
    type PrivacyModeRow,
    type ProviderModelSpendRow,
    type SuccessRateSource,
} from './types.js';
import { buildBaseWhere, renderWhere } from '../sql/where-builder.js';
export { buildBaseWhere } from '../sql/where-builder.js';

/**
 * Minimal pool surface used by every aggregation. The real `pg.Pool` satisfies
 * this; tests can pass a `{ query: vi.fn(...) }` stub without wrestling with
 * pg's overloaded query signatures.
 */
export interface MonitorQueryable {
    query(text: string, values?: unknown[]): Promise<{ rows: Array<Record<string, unknown>> }>;
}

// Filter-clause builder lives in lib/sql/where-builder.ts (shared with Control).
// Re-exported above so existing Monitor test imports stay stable.

// ---------------------------------------------------------------------------
// Totals: headline KPIs + success-rate precedence
// ---------------------------------------------------------------------------

interface TotalsRow {
    spend_usd: string | number;
    request_count: string | number;
    total_tokens: string | number;
    avg_latency_ms: string | number | null;
    success_col_total: string | number;
    success_col_true: string | number;
    status_code_total: string | number;
    status_code_success: string | number;
    output_status_total: string | number;
    output_status_success: string | number;
}

/**
 * Success-rate precedence (Slice 3A directive):
 *   1. If `success` is non-null, use it.
 *   2. Else if `status_code` non-null, success = status_code BETWEEN 200 AND 299.
 *   3. Else if `output_status` non-null and = 'accepted'.
 *   4. Else success_rate_pct = null, source = null.
 */
export function pickSuccessRate(row: TotalsRow): {
    pct: number | null;
    source: SuccessRateSource;
    available: boolean;
} {
    const succTotal = Number(row.success_col_total);
    if (succTotal > 0) {
        return {
            pct: (Number(row.success_col_true) / succTotal) * 100,
            source: 'success_column',
            available: true,
        };
    }
    const statusTotal = Number(row.status_code_total);
    if (statusTotal > 0) {
        return {
            pct: (Number(row.status_code_success) / statusTotal) * 100,
            source: 'status_code',
            available: true,
        };
    }
    const outcomeTotal = Number(row.output_status_total);
    if (outcomeTotal > 0) {
        return {
            pct: (Number(row.output_status_success) / outcomeTotal) * 100,
            source: 'output_status',
            available: true,
        };
    }
    return { pct: null, source: null, available: false };
}

export async function fetchTotals(
    pool: MonitorQueryable,
    tenantId: string,
    filters: MonitorFilters,
): Promise<MonitorTotals> {
    const b = buildBaseWhere(tenantId, filters);
    const sql = `
        SELECT
            COALESCE(SUM(cost_usd), 0)::float                                       AS spend_usd,
            COUNT(*)::int                                                            AS request_count,
            COALESCE(SUM(total_tokens), 0)::bigint                                   AS total_tokens,
            AVG(latency_ms)::float                                                   AS avg_latency_ms,
            COUNT(*) FILTER (WHERE success IS NOT NULL)::int                         AS success_col_total,
            COUNT(*) FILTER (WHERE success = true)::int                              AS success_col_true,
            COUNT(*) FILTER (WHERE status_code IS NOT NULL)::int                     AS status_code_total,
            COUNT(*) FILTER (WHERE status_code BETWEEN 200 AND 299)::int             AS status_code_success,
            COUNT(*) FILTER (WHERE output_status IS NOT NULL)::int                   AS output_status_total,
            COUNT(*) FILTER (WHERE output_status = 'accepted')::int                  AS output_status_success
        FROM ai_economic_events
        ${renderWhere(b)}
    `;
    const res = await pool.query(sql, b.params);
    const r = (res.rows[0] ?? {}) as unknown as TotalsRow;

    const success = pickSuccessRate(r);
    return {
        spend_usd: Number(r.spend_usd ?? 0),
        request_count: Number(r.request_count ?? 0),
        total_tokens: Number(r.total_tokens ?? 0),
        avg_latency_ms: r.avg_latency_ms == null ? null : Number(r.avg_latency_ms),
        success_rate_pct: success.pct == null ? null : Number(success.pct.toFixed(2)),
        success_rate_source: success.source,
        success_rate_available: success.available,
    };
}

// ---------------------------------------------------------------------------
// Spend by attribution group (Unattributed rows included)
// ---------------------------------------------------------------------------

const GROUP_COLUMNS: Record<AttributionField, string> = {
    department_id: 'department_id',
    employee_id: 'employee_id',
    workflow_id: 'workflow_id',
    customer_id: 'customer_id',
    feature_id: 'feature_id',
};

export async function fetchSpendByGroup(
    pool: MonitorQueryable,
    tenantId: string,
    filters: MonitorFilters,
    field: AttributionField,
): Promise<GroupSpendRow[]> {
    const column = GROUP_COLUMNS[field];
    const b = buildBaseWhere(tenantId, filters);
    // COALESCE the attribution column to 'Unattributed' so missing-attribution
    // events are visible as a row rather than dropped — that surface is part
    // of the Monitor story (it tells operators where attribution is missing).
    const sql = `
        SELECT
            COALESCE(NULLIF(${column}, ''), '${UNATTRIBUTED}') AS key,
            COUNT(*)::int                                       AS request_count,
            COALESCE(SUM(cost_usd), 0)::float                   AS total_cost_usd,
            COALESCE(AVG(cost_usd), 0)::float                   AS avg_cost_usd
        FROM ai_economic_events
        ${renderWhere(b)}
        GROUP BY 1
        ORDER BY total_cost_usd DESC, request_count DESC
    `;
    const res = await pool.query(sql, b.params);
    return res.rows.map((r) => ({
        key: String(r.key),
        request_count: Number(r.request_count),
        total_cost_usd: Number(r.total_cost_usd),
        avg_cost_usd: Number(r.avg_cost_usd),
    }));
}

// ---------------------------------------------------------------------------
// Spend by provider + model
// ---------------------------------------------------------------------------

export async function fetchSpendByProviderModel(
    pool: MonitorQueryable,
    tenantId: string,
    filters: MonitorFilters,
): Promise<ProviderModelSpendRow[]> {
    const b = buildBaseWhere(tenantId, filters);
    const sql = `
        SELECT
            COALESCE(NULLIF(provider, ''), '${UNATTRIBUTED}')   AS provider,
            COALESCE(NULLIF(model_used, ''), '${UNATTRIBUTED}') AS model_used,
            COUNT(*)::int                                        AS request_count,
            COALESCE(SUM(cost_usd), 0)::float                    AS total_cost_usd,
            COALESCE(AVG(cost_usd), 0)::float                    AS avg_cost_usd
        FROM ai_economic_events
        ${renderWhere(b)}
        GROUP BY 1, 2
        ORDER BY total_cost_usd DESC, request_count DESC
    `;
    const res = await pool.query(sql, b.params);
    return res.rows.map((r) => ({
        provider: String(r.provider),
        model_used: String(r.model_used),
        request_count: Number(r.request_count),
        total_cost_usd: Number(r.total_cost_usd),
        avg_cost_usd: Number(r.avg_cost_usd),
    }));
}

// ---------------------------------------------------------------------------
// Evidence coverage + attribution completeness (single scan)
// ---------------------------------------------------------------------------

interface CoverageRow {
    total: string | number;
    with_evidence: string | number;
    has_department: string | number;
    has_employee: string | number;
    has_workflow: string | number;
    has_customer: string | number;
    has_feature: string | number;
}

export async function fetchCoverage(
    pool: MonitorQueryable,
    tenantId: string,
    filters: MonitorFilters,
): Promise<{
    evidence: EvidenceCoveragePanel;
    attribution: AttributionCompletenessPanel;
}> {
    const b = buildBaseWhere(tenantId, filters);
    const sql = `
        SELECT
            COUNT(*)::int                                                            AS total,
            COUNT(*) FILTER (WHERE evidence_bundle_id IS NOT NULL
                              AND evidence_bundle_id <> '')::int                     AS with_evidence,
            COUNT(*) FILTER (WHERE department_id IS NOT NULL
                              AND department_id <> '')::int                          AS has_department,
            COUNT(*) FILTER (WHERE employee_id IS NOT NULL
                              AND employee_id <> '')::int                            AS has_employee,
            COUNT(*) FILTER (WHERE workflow_id IS NOT NULL
                              AND workflow_id <> '')::int                            AS has_workflow,
            COUNT(*) FILTER (WHERE customer_id IS NOT NULL
                              AND customer_id <> '')::int                            AS has_customer,
            COUNT(*) FILTER (WHERE feature_id IS NOT NULL
                              AND feature_id <> '')::int                             AS has_feature
        FROM ai_economic_events
        ${renderWhere(b)}
    `;
    const res = await pool.query(sql, b.params);
    const r = (res.rows[0] ?? {}) as unknown as CoverageRow;
    const total = Number(r.total ?? 0);
    const withEvidence = Number(r.with_evidence ?? 0);

    const pct = (n: number) => (total === 0 ? 0 : Number(((n / total) * 100).toFixed(2)));

    const presenceByField: Record<AttributionField, number> = {
        department_id: Number(r.has_department ?? 0),
        employee_id: Number(r.has_employee ?? 0),
        workflow_id: Number(r.has_workflow ?? 0),
        customer_id: Number(r.has_customer ?? 0),
        feature_id: Number(r.has_feature ?? 0),
    };

    return {
        evidence: {
            with_evidence_bundle: withEvidence,
            missing_evidence_bundle: total - withEvidence,
            with_evidence_bundle_pct: pct(withEvidence),
        },
        attribution: {
            total_events: total,
            fields: ATTRIBUTION_FIELDS.map((field) => {
                const present = presenceByField[field];
                return {
                    field,
                    present,
                    missing: total - present,
                    present_pct: pct(present),
                };
            }),
        },
    };
}

// ---------------------------------------------------------------------------
// Privacy mode distribution
// ---------------------------------------------------------------------------

export async function fetchPrivacyModeDistribution(
    pool: MonitorQueryable,
    tenantId: string,
    filters: MonitorFilters,
): Promise<PrivacyModeRow[]> {
    const b = buildBaseWhere(tenantId, filters);
    const sql = `
        SELECT
            privacy_mode,
            COUNT(*)::int AS count
        FROM ai_economic_events
        ${renderWhere(b)}
        GROUP BY privacy_mode
        ORDER BY count DESC, privacy_mode ASC
    `;
    const res = await pool.query(sql, b.params);
    const total = res.rows.reduce((sum, r) => sum + Number(r.count), 0);
    return res.rows.map((r) => ({
        privacy_mode: String(r.privacy_mode),
        count: Number(r.count),
        pct: total === 0 ? 0 : Number(((Number(r.count) / total) * 100).toFixed(2)),
    }));
}

// ---------------------------------------------------------------------------
// Outcome panels: cost-per-accepted-output + outcome completeness
// ---------------------------------------------------------------------------

interface OutcomeRow {
    total_events: string | number;
    events_with_outcome: string | number;
    accepted_count: string | number;
    accepted_cost: string | number;
}

/**
 * Threshold gate (Slice 3A directive):
 *   show "insufficient outcome data" when outcome coverage < 5% OR accepted < 20.
 */
export function evaluateCostPerAcceptedOutput(args: {
    totalEvents: number;
    eventsWithOutcome: number;
    acceptedCount: number;
    acceptedCost: number;
}): CostPerAcceptedOutputPanel {
    const { totalEvents, eventsWithOutcome, acceptedCount, acceptedCost } = args;
    const coverage = totalEvents === 0 ? 0 : (eventsWithOutcome / totalEvents) * 100;
    const coveragePct = Number(coverage.toFixed(2));

    const belowCoverage = coverage < COST_PER_ACCEPTED_OUTPUT_THRESHOLDS.min_outcome_coverage_pct;
    const belowAccepted = acceptedCount < COST_PER_ACCEPTED_OUTPUT_THRESHOLDS.min_accepted_count;
    const insufficient = belowCoverage || belowAccepted;

    return {
        cost_per_accepted_output_usd: insufficient || acceptedCount === 0
            ? null
            : Number((acceptedCost / acceptedCount).toFixed(6)),
        accepted_count: acceptedCount,
        total_events_in_window: totalEvents,
        events_with_outcome: eventsWithOutcome,
        outcome_coverage_pct: coveragePct,
        status: insufficient ? 'insufficient_outcome_data' : 'ok',
        thresholds: COST_PER_ACCEPTED_OUTPUT_THRESHOLDS,
    };
}

export async function fetchOutcomePanels(
    pool: MonitorQueryable,
    tenantId: string,
    filters: MonitorFilters,
): Promise<{
    costPerAccepted: CostPerAcceptedOutputPanel;
    outcomeCompleteness: OutcomeCompletenessPanel;
}> {
    const b = buildBaseWhere(tenantId, filters, 'e');
    // LEFT JOIN so the denominator (total events in the filtered window) stays
    // honest even when no outcomes have been recorded yet. cost_per_accepted
    // only counts request_outcomes.status='accepted' — never status_code, never
    // output_status — that's the definitional rule of the panel.
    const sql = `
        SELECT
            COUNT(DISTINCT e.request_id)::int                                  AS total_events,
            COUNT(DISTINCT e.request_id) FILTER (WHERE o.request_id IS NOT NULL)::int
                                                                                AS events_with_outcome,
            COUNT(*) FILTER (WHERE o.status = 'accepted')::int                 AS accepted_count,
            COALESCE(SUM(e.cost_usd) FILTER (WHERE o.status = 'accepted'), 0)::float
                                                                                AS accepted_cost
        FROM ai_economic_events e
        LEFT JOIN request_outcomes o
               ON o.tenant_id = e.tenant_id
              AND o.request_id = e.request_id
        ${renderWhere(b)}
    `;
    const res = await pool.query(sql, b.params);
    const r = (res.rows[0] ?? {}) as unknown as OutcomeRow;

    const totalEvents = Number(r.total_events ?? 0);
    const eventsWithOutcome = Number(r.events_with_outcome ?? 0);
    const acceptedCount = Number(r.accepted_count ?? 0);
    const acceptedCost = Number(r.accepted_cost ?? 0);

    const coveragePct = totalEvents === 0
        ? 0
        : Number(((eventsWithOutcome / totalEvents) * 100).toFixed(2));

    return {
        costPerAccepted: evaluateCostPerAcceptedOutput({
            totalEvents,
            eventsWithOutcome,
            acceptedCount,
            acceptedCost,
        }),
        outcomeCompleteness: {
            total_events: totalEvents,
            events_with_outcome: eventsWithOutcome,
            outcome_coverage_pct: coveragePct,
        },
    };
}
