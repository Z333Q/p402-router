/**
 * Slice 3K — Outcome Coverage and Optimize Readiness.
 *
 * Pure DB + math layer for /api/v2/outcomes/coverage. Tenant-scoped on
 * $1, every filter bound positionally, no SQL fragments interpolated
 * from request input. Privacy posture: metadata-only — never references
 * prompt / response / messages / completion / body / fingerprint columns.
 *
 * This file is a READINESS LAYER, not a recommendation layer. It answers:
 *
 *   - Does the tenant have enough outcome data to begin Optimize work?
 *   - Where is outcome coverage missing?
 *   - Which segments are too thin for trustworthy analysis?
 *
 * It does NOT compute savings, propose route changes, or compare models.
 * That work stays blocked until outcome data is provably sufficient.
 *
 * Legacy outcomes (`retried`, `human_reviewed`) are normalized on read in
 * lib/prove/outcome.ts; this module follows the same V5 vocabulary so
 * `revised` and `accepted` counts include the legacy rewrites.
 */

import { UNATTRIBUTED } from './types.js';

export interface CoverageQueryable {
    query(text: string, values?: unknown[]): Promise<{ rows: Array<Record<string, unknown>> }>;
}

// ─────────────────────────────────────────────────────────────────────────
// Thresholds + readiness vocabulary
// ─────────────────────────────────────────────────────────────────────────

/**
 * Readiness states (slice 3K). Mirrors flip-readiness vocabulary so a
 * future operator surface can compose both.
 */
export type ReadinessStatus =
    | 'blocked'                     // no meaningful outcome data
    | 'not_ready'                   // outcome coverage below threshold
    | 'observing'                   // coverage met, baseline window not yet established
    | 'ready_for_optimize_analysis';  // analysis-only readiness; NOT recommendations

/** Defaults per the 3K brief. Production should leave at these values. */
export interface CoverageThresholds {
    /** Minimum outcome coverage % (events with outcome / total events). */
    min_coverage_pct: number;
    /** Minimum accepted-outcome count before cost-per-accepted-output is reported. */
    min_accepted_count: number;
    /** Baseline window minimum, days. */
    min_baseline_days: number;
}

export const DEFAULT_COVERAGE_THRESHOLDS: CoverageThresholds = {
    min_coverage_pct:   20,
    min_accepted_count: 30,
    min_baseline_days:  14,
};

function envNum(name: string, fallback: number): number {
    const raw = process.env[name];
    if (raw == null || raw === '') return fallback;
    const n = Number(raw);
    return Number.isFinite(n) ? n : fallback;
}

export function resolveCoverageThresholds(): CoverageThresholds {
    return {
        min_coverage_pct:   envNum('OUTCOME_MIN_COVERAGE_PCT',   DEFAULT_COVERAGE_THRESHOLDS.min_coverage_pct),
        min_accepted_count: envNum('OUTCOME_MIN_ACCEPTED_COUNT', DEFAULT_COVERAGE_THRESHOLDS.min_accepted_count),
        min_baseline_days:  envNum('OUTCOME_MIN_BASELINE_DAYS',  DEFAULT_COVERAGE_THRESHOLDS.min_baseline_days),
    };
}

// ─────────────────────────────────────────────────────────────────────────
// Status normalization SQL fragment (legacy values folded in)
// ─────────────────────────────────────────────────────────────────────────

/**
 * Normalize stored outcome status to the V5 canonical vocabulary in SQL.
 *   retried        -> revised
 *   human_reviewed -> accepted
 *   everything else passes through.
 *
 * Inlined as a CASE expression in every aggregate so a future migration
 * that splits the storage layout does not silently miscount accepted /
 * revised events. The pure equivalent lives in lib/prove/outcome.ts and
 * is shared by the GET reader.
 */
const NORMALIZED_STATUS_CASE = `
    CASE o.status
        WHEN 'retried'        THEN 'revised'
        WHEN 'human_reviewed' THEN 'accepted'
        ELSE o.status
    END
`;

// ─────────────────────────────────────────────────────────────────────────
// Filter envelope
// ─────────────────────────────────────────────────────────────────────────

export interface CoverageFilters {
    since?: string;
    until?: string;
    department_id?: string;
    workflow_id?: string;
    customer_id?: string;
    feature_id?: string;
    provider?: string;
    model?: string;  // -> model_used column
}

const ID_FILTER_COLUMNS = {
    department_id: 'e.department_id',
    workflow_id:   'e.workflow_id',
    customer_id:   'e.customer_id',
    feature_id:    'e.feature_id',
    provider:      'e.provider',
} as const;

const DEFAULT_WINDOW_DAYS = 30;

function buildWhere(tenantId: string, filters: CoverageFilters): {
    where: string[]; params: unknown[]; since: Date; until: Date;
} {
    const where: string[] = ['e.tenant_id = $1'];
    const params: unknown[] = [tenantId];
    const now = new Date();
    const until = filters.until ? new Date(filters.until) : now;
    const since = filters.since
        ? new Date(filters.since)
        : new Date(until.getTime() - DEFAULT_WINDOW_DAYS * 86_400_000);
    params.push(since); where.push(`e.event_time >= $${params.length}`);
    params.push(until); where.push(`e.event_time <  $${params.length}`);

    for (const [k, col] of Object.entries(ID_FILTER_COLUMNS)) {
        const v = (filters as Record<string, unknown>)[k];
        if (typeof v === 'string' && v.length > 0 && v.length <= 256) {
            params.push(v);
            where.push(`${col} = $${params.length}`);
        }
    }
    if (typeof filters.model === 'string' && filters.model.length > 0 && filters.model.length <= 256) {
        params.push(filters.model);
        where.push(`e.model_used = $${params.length}`);
    }
    return { where, params, since, until };
}

// ─────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────

const num = (v: unknown, f = 0): number => {
    if (v == null) return f;
    const n = Number(v);
    return Number.isFinite(n) ? n : f;
};
const int = (v: unknown, f = 0): number => Math.trunc(num(v, f));

// ─────────────────────────────────────────────────────────────────────────
// Status distribution (overall)
// ─────────────────────────────────────────────────────────────────────────

export interface OutcomeStatusCounts {
    accepted: number;
    rejected: number;
    revised: number;
    escalated: number;
    failed: number;
    pending_review: number;
    unknown: number;
}

export interface CoverageTotals {
    total_events: number;
    events_with_outcome: number;
    events_without_outcome: number;
    coverage_pct: number;
    status: OutcomeStatusCounts;
    total_spend_usd: number;
    accepted_spend_usd: number;
    cost_per_accepted_output_usd: number | null;
    cost_per_accepted_insufficient_data: boolean;
    /** Spans of the requested window. */
    window_days: number;
    /** Most recent outcome.updated_at observed for this tenant in window. */
    most_recent_outcome_at: string | null;
    /** Seconds since most_recent_outcome_at, or null when no rows. */
    outcome_freshness_seconds: number | null;
}

export async function fetchTotals(
    pool: CoverageQueryable,
    tenantId: string,
    filters: CoverageFilters,
    thresholds: CoverageThresholds,
): Promise<CoverageTotals> {
    const { where, params, since, until } = buildWhere(tenantId, filters);
    const sql = `
        WITH base AS (
            SELECT e.cost_usd,
                   o.request_id AS outcome_id,
                   ${NORMALIZED_STATUS_CASE} AS canonical_status,
                   o.updated_at AS outcome_updated_at
              FROM ai_economic_events e
              LEFT JOIN request_outcomes o
                ON o.tenant_id = e.tenant_id AND o.request_id = e.request_id
             WHERE ${where.join(' AND ')}
        )
        SELECT
            COUNT(*)::int                                                                  AS total_events,
            COUNT(*) FILTER (WHERE outcome_id IS NOT NULL)::int                            AS events_with_outcome,
            COUNT(*) FILTER (WHERE canonical_status = 'accepted')::int                     AS accepted_count,
            COUNT(*) FILTER (WHERE canonical_status = 'rejected')::int                     AS rejected_count,
            COUNT(*) FILTER (WHERE canonical_status = 'revised')::int                      AS revised_count,
            COUNT(*) FILTER (WHERE canonical_status = 'escalated')::int                    AS escalated_count,
            COUNT(*) FILTER (WHERE canonical_status = 'failed')::int                       AS failed_count,
            COUNT(*) FILTER (WHERE canonical_status = 'pending_review')::int               AS pending_review_count,
            COUNT(*) FILTER (WHERE canonical_status = 'unknown')::int                      AS unknown_count,
            COALESCE(SUM(cost_usd), 0)::float                                              AS total_spend_usd,
            COALESCE(SUM(cost_usd) FILTER (WHERE canonical_status = 'accepted'), 0)::float AS accepted_spend_usd,
            MAX(outcome_updated_at)                                                        AS most_recent_outcome_at
          FROM base
    `;
    const { rows } = await pool.query(sql, params);
    const r = rows[0] ?? {};
    const total_events = int(r.total_events);
    const events_with_outcome = int(r.events_with_outcome);
    const coverage_pct = total_events > 0 ? (events_with_outcome / total_events) * 100 : 0;
    const accepted_count = int(r.accepted_count);
    const accepted_spend_usd = num(r.accepted_spend_usd);

    // cost-per-accepted-output is reported only when BOTH thresholds are met.
    const cpa_ok = coverage_pct >= thresholds.min_coverage_pct
        && accepted_count >= thresholds.min_accepted_count;
    const cost_per_accepted_output_usd = cpa_ok && accepted_count > 0
        ? accepted_spend_usd / accepted_count
        : null;

    const recent = r.most_recent_outcome_at instanceof Date
        ? r.most_recent_outcome_at
        : (r.most_recent_outcome_at ? new Date(String(r.most_recent_outcome_at)) : null);
    const recentIso = recent && !Number.isNaN(recent.getTime()) ? recent.toISOString() : null;
    const now = new Date();
    const freshness = recent && !Number.isNaN(recent.getTime())
        ? Math.max(0, Math.floor((now.getTime() - recent.getTime()) / 1000))
        : null;

    const window_days = Math.max(0, Math.floor((until.getTime() - since.getTime()) / 86_400_000));

    return {
        total_events,
        events_with_outcome,
        events_without_outcome: Math.max(0, total_events - events_with_outcome),
        coverage_pct: Number(coverage_pct.toFixed(4)),
        status: {
            accepted:       accepted_count,
            rejected:       int(r.rejected_count),
            revised:        int(r.revised_count),
            escalated:      int(r.escalated_count),
            failed:         int(r.failed_count),
            pending_review: int(r.pending_review_count),
            unknown:        int(r.unknown_count),
        },
        total_spend_usd: num(r.total_spend_usd),
        accepted_spend_usd,
        cost_per_accepted_output_usd,
        cost_per_accepted_insufficient_data: !cpa_ok,
        window_days,
        most_recent_outcome_at: recentIso,
        outcome_freshness_seconds: freshness,
    };
}

// ─────────────────────────────────────────────────────────────────────────
// Segment readiness
// ─────────────────────────────────────────────────────────────────────────

export interface SegmentReadinessRow {
    key: string;
    total_events: number;
    events_with_outcome: number;
    accepted_count: number;
    coverage_pct: number;
    /** null when accepted_count or coverage_pct fail to meet thresholds. */
    cost_per_accepted_output_usd: number | null;
    insufficient_data: boolean;
    status: ReadinessStatus;
    /** Reason text. Empty string when status is ready_for_optimize_analysis. */
    reason: string;
}

const SEGMENT_COLUMN_MAP = {
    department: 'e.department_id',
    workflow:   'e.workflow_id',
    customer:   'e.customer_id',
    feature:    'e.feature_id',
    provider:   'e.provider',
    model:      'e.model_used',
} as const;

export type SegmentDimension = keyof typeof SEGMENT_COLUMN_MAP;

function readinessFor(
    coverage_pct: number,
    accepted_count: number,
    window_days: number,
    thresholds: CoverageThresholds,
    events: number,
): { status: ReadinessStatus; reason: string } {
    if (events === 0) return { status: 'blocked', reason: 'no_events' };
    if (coverage_pct < thresholds.min_coverage_pct) {
        return { status: 'not_ready', reason: `coverage_pct ${coverage_pct.toFixed(1)} < ${thresholds.min_coverage_pct}` };
    }
    if (accepted_count < thresholds.min_accepted_count) {
        return { status: 'not_ready', reason: `accepted_count ${accepted_count} < ${thresholds.min_accepted_count}` };
    }
    if (window_days < thresholds.min_baseline_days) {
        return { status: 'observing', reason: `window_days ${window_days} < ${thresholds.min_baseline_days}` };
    }
    return { status: 'ready_for_optimize_analysis', reason: '' };
}

export async function fetchSegmentReadiness(
    pool: CoverageQueryable,
    tenantId: string,
    filters: CoverageFilters,
    dim: SegmentDimension,
    thresholds: CoverageThresholds,
    limit = 25,
): Promise<SegmentReadinessRow[]> {
    const { where, params, since, until } = buildWhere(tenantId, filters);
    const col = SEGMENT_COLUMN_MAP[dim];
    params.push(UNATTRIBUTED, limit);
    const unidx = params.length - 1;
    const lidx = params.length;
    const sql = `
        SELECT COALESCE(${col}::text, $${unidx}) AS key,
               COUNT(*)::int AS total_events,
               COUNT(*) FILTER (WHERE o.request_id IS NOT NULL)::int AS events_with_outcome,
               COUNT(*) FILTER (WHERE ${NORMALIZED_STATUS_CASE} = 'accepted')::int AS accepted_count,
               COALESCE(SUM(e.cost_usd) FILTER (
                   WHERE ${NORMALIZED_STATUS_CASE} = 'accepted'
               ), 0)::float AS accepted_spend_usd
          FROM ai_economic_events e
          LEFT JOIN request_outcomes o
            ON o.tenant_id = e.tenant_id AND o.request_id = e.request_id
         WHERE ${where.join(' AND ')}
         GROUP BY 1
         ORDER BY total_events DESC
         LIMIT $${lidx}
    `;
    const { rows } = await pool.query(sql, params);
    const window_days = Math.max(0, Math.floor((until.getTime() - since.getTime()) / 86_400_000));

    return rows.map((row) => {
        const total_events = int(row.total_events);
        const events_with_outcome = int(row.events_with_outcome);
        const accepted_count = int(row.accepted_count);
        const accepted_spend_usd = num(row.accepted_spend_usd);
        const coverage_pct = total_events > 0 ? (events_with_outcome / total_events) * 100 : 0;
        const cpa_ok = coverage_pct >= thresholds.min_coverage_pct
            && accepted_count >= thresholds.min_accepted_count;
        const verdict = readinessFor(coverage_pct, accepted_count, window_days, thresholds, total_events);
        return {
            key: String(row.key),
            total_events,
            events_with_outcome,
            accepted_count,
            coverage_pct: Number(coverage_pct.toFixed(4)),
            cost_per_accepted_output_usd: cpa_ok && accepted_count > 0
                ? accepted_spend_usd / accepted_count
                : null,
            insufficient_data: !cpa_ok,
            status: verdict.status,
            reason: verdict.reason,
        };
    });
}

// ─────────────────────────────────────────────────────────────────────────
// Provider/model matrix
// ─────────────────────────────────────────────────────────────────────────

export interface ProviderModelReadinessRow {
    provider: string;
    model_used: string;
    total_events: number;
    events_with_outcome: number;
    accepted_count: number;
    coverage_pct: number;
    cost_per_accepted_output_usd: number | null;
    insufficient_data: boolean;
    status: ReadinessStatus;
    reason: string;
}

export async function fetchProviderModelReadiness(
    pool: CoverageQueryable,
    tenantId: string,
    filters: CoverageFilters,
    thresholds: CoverageThresholds,
    limit = 25,
): Promise<ProviderModelReadinessRow[]> {
    const { where, params, since, until } = buildWhere(tenantId, filters);
    params.push(UNATTRIBUTED, limit);
    const unidx = params.length - 1;
    const lidx = params.length;
    const sql = `
        SELECT COALESCE(e.provider::text, $${unidx})   AS provider,
               COALESCE(e.model_used::text, $${unidx}) AS model_used,
               COUNT(*)::int AS total_events,
               COUNT(*) FILTER (WHERE o.request_id IS NOT NULL)::int AS events_with_outcome,
               COUNT(*) FILTER (WHERE ${NORMALIZED_STATUS_CASE} = 'accepted')::int AS accepted_count,
               COALESCE(SUM(e.cost_usd) FILTER (
                   WHERE ${NORMALIZED_STATUS_CASE} = 'accepted'
               ), 0)::float AS accepted_spend_usd
          FROM ai_economic_events e
          LEFT JOIN request_outcomes o
            ON o.tenant_id = e.tenant_id AND o.request_id = e.request_id
         WHERE ${where.join(' AND ')}
         GROUP BY 1, 2
         ORDER BY total_events DESC
         LIMIT $${lidx}
    `;
    const { rows } = await pool.query(sql, params);
    const window_days = Math.max(0, Math.floor((until.getTime() - since.getTime()) / 86_400_000));
    return rows.map((row) => {
        const total_events = int(row.total_events);
        const events_with_outcome = int(row.events_with_outcome);
        const accepted_count = int(row.accepted_count);
        const accepted_spend_usd = num(row.accepted_spend_usd);
        const coverage_pct = total_events > 0 ? (events_with_outcome / total_events) * 100 : 0;
        const cpa_ok = coverage_pct >= thresholds.min_coverage_pct
            && accepted_count >= thresholds.min_accepted_count;
        const verdict = readinessFor(coverage_pct, accepted_count, window_days, thresholds, total_events);
        return {
            provider: String(row.provider),
            model_used: String(row.model_used),
            total_events,
            events_with_outcome,
            accepted_count,
            coverage_pct: Number(coverage_pct.toFixed(4)),
            cost_per_accepted_output_usd: cpa_ok && accepted_count > 0
                ? accepted_spend_usd / accepted_count
                : null,
            insufficient_data: !cpa_ok,
            status: verdict.status,
            reason: verdict.reason,
        };
    });
}

// ─────────────────────────────────────────────────────────────────────────
// Missing-outcome leaderboard
// ─────────────────────────────────────────────────────────────────────────

export interface MissingOutcomeRow {
    /** Composite key e.g. `department=dept_x`. */
    label: string;
    dimension: 'department' | 'workflow' | 'customer' | 'provider_model';
    key: string;
    missing_count: number;
    total_events: number;
    coverage_pct: number;
    /** A representative recent request_id the operator can drill into. */
    sample_request_id: string | null;
}

export async function fetchMissingOutcomeLeaderboard(
    pool: CoverageQueryable,
    tenantId: string,
    filters: CoverageFilters,
    limit = 15,
): Promise<MissingOutcomeRow[]> {
    const { where, params } = buildWhere(tenantId, filters);
    params.push(UNATTRIBUTED, limit);
    const unidx = params.length - 1;
    const lidx = params.length;
    // We rank by missing_count desc per (department, workflow, customer,
    // provider+model) — UNION ALL across the four dimensions and pick the
    // top N. Each dimension is a separate GROUP BY because mixing keys
    // would be meaningless.
    const sql = `
        WITH base AS (
            SELECT e.*,
                   (o.request_id IS NULL)::int AS missing
              FROM ai_economic_events e
              LEFT JOIN request_outcomes o
                ON o.tenant_id = e.tenant_id AND o.request_id = e.request_id
             WHERE ${where.join(' AND ')}
        ),
        dept AS (
            SELECT 'department'::text AS dimension,
                   COALESCE(department_id::text, $${unidx}) AS key,
                   COUNT(*) FILTER (WHERE missing = 1)::int AS missing_count,
                   COUNT(*)::int AS total_events,
                   (ARRAY_AGG(request_id ORDER BY event_time DESC) FILTER (WHERE missing = 1))[1] AS sample_request_id
              FROM base
             GROUP BY 1, 2
        ),
        wf AS (
            SELECT 'workflow'::text AS dimension,
                   COALESCE(workflow_id::text, $${unidx}) AS key,
                   COUNT(*) FILTER (WHERE missing = 1)::int AS missing_count,
                   COUNT(*)::int AS total_events,
                   (ARRAY_AGG(request_id ORDER BY event_time DESC) FILTER (WHERE missing = 1))[1] AS sample_request_id
              FROM base GROUP BY 1, 2
        ),
        cust AS (
            SELECT 'customer'::text AS dimension,
                   COALESCE(customer_id::text, $${unidx}) AS key,
                   COUNT(*) FILTER (WHERE missing = 1)::int AS missing_count,
                   COUNT(*)::int AS total_events,
                   (ARRAY_AGG(request_id ORDER BY event_time DESC) FILTER (WHERE missing = 1))[1] AS sample_request_id
              FROM base GROUP BY 1, 2
        ),
        pm AS (
            SELECT 'provider_model'::text AS dimension,
                   (COALESCE(provider::text, $${unidx}) || ' / ' || COALESCE(model_used::text, $${unidx})) AS key,
                   COUNT(*) FILTER (WHERE missing = 1)::int AS missing_count,
                   COUNT(*)::int AS total_events,
                   (ARRAY_AGG(request_id ORDER BY event_time DESC) FILTER (WHERE missing = 1))[1] AS sample_request_id
              FROM base GROUP BY 1, 2
        )
        SELECT * FROM dept WHERE missing_count > 0
        UNION ALL
        SELECT * FROM wf   WHERE missing_count > 0
        UNION ALL
        SELECT * FROM cust WHERE missing_count > 0
        UNION ALL
        SELECT * FROM pm   WHERE missing_count > 0
        ORDER BY missing_count DESC
        LIMIT $${lidx}
    `;
    const { rows } = await pool.query(sql, params);
    return rows.map((r) => {
        const total = int(r.total_events);
        const missing = int(r.missing_count);
        const coverage_pct = total > 0 ? ((total - missing) / total) * 100 : 0;
        return {
            label: `${String(r.dimension)}=${String(r.key)}`,
            dimension: r.dimension as MissingOutcomeRow['dimension'],
            key: String(r.key),
            missing_count: missing,
            total_events: total,
            coverage_pct: Number(coverage_pct.toFixed(4)),
            sample_request_id: r.sample_request_id == null ? null : String(r.sample_request_id),
        };
    });
}

// ─────────────────────────────────────────────────────────────────────────
// Top-level readiness verdict
// ─────────────────────────────────────────────────────────────────────────

export interface ReadinessVerdict {
    status: ReadinessStatus;
    reason: string;
    /** Plain-language explainer the dashboard shows below the status chip. */
    explainer: string;
}

export function assessTopLevelReadiness(
    totals: CoverageTotals,
    thresholds: CoverageThresholds,
): ReadinessVerdict {
    if (totals.total_events === 0) {
        return {
            status: 'blocked',
            reason: 'no_events',
            explainer: 'No economic events in this window. Optimize work requires events first.',
        };
    }
    if (totals.events_with_outcome === 0) {
        return {
            status: 'blocked',
            reason: 'no_outcomes_recorded',
            explainer: 'No outcomes have been recorded for events in this window. Optimize work requires the outcome write path to be live.',
        };
    }
    if (totals.coverage_pct < thresholds.min_coverage_pct) {
        return {
            status: 'not_ready',
            reason: `coverage_below_threshold:${totals.coverage_pct.toFixed(1)}<${thresholds.min_coverage_pct}`,
            explainer: `Outcome coverage is ${totals.coverage_pct.toFixed(1)}%. Optimize analysis needs at least ${thresholds.min_coverage_pct}% to avoid silent miscounting.`,
        };
    }
    if (totals.status.accepted < thresholds.min_accepted_count) {
        return {
            status: 'not_ready',
            reason: `accepted_below_threshold:${totals.status.accepted}<${thresholds.min_accepted_count}`,
            explainer: `Only ${totals.status.accepted} accepted outcomes in this window; the cost-per-accepted-output metric needs at least ${thresholds.min_accepted_count}.`,
        };
    }
    if (totals.window_days < thresholds.min_baseline_days) {
        return {
            status: 'observing',
            reason: `window_below_baseline:${totals.window_days}<${thresholds.min_baseline_days}`,
            explainer: `The current window is ${totals.window_days} days. Trend analysis needs a baseline of at least ${thresholds.min_baseline_days} days.`,
        };
    }
    return {
        status: 'ready_for_optimize_analysis',
        reason: 'all_thresholds_met',
        explainer: 'Outcome data is sufficient for Optimize ANALYSIS only. Recommendations remain blocked until explicitly approved.',
    };
}
