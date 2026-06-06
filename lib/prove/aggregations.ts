/**
 * Slice 3G — Prove aggregations.
 *
 * Pure DB layer for /api/v2/prove/overview. Every query is tenant-scoped
 * via tenant_id = $1; window + dimension filters are bound positionally;
 * no SQL fragments are interpolated from request input.
 *
 * Privacy posture: metadata only. NO prompt / response / messages columns
 * are read, and the projection only references payment-grade and
 * governance fields.
 */

import { UNATTRIBUTED } from './types.js';
import type {
    DeniedByCodeRow,
    DenialOverTimePoint,
    EvidenceCoverageRow,
    PrivacyModeRow,
    ProveBreakdownRow,
    ProveTotals,
} from './types.js';

export interface ProveQueryable {
    query(text: string, values?: unknown[]): Promise<{ rows: Array<Record<string, unknown>> }>;
}

function num(v: unknown, fallback = 0): number {
    if (v === null || v === undefined) return fallback;
    const n = Number(v);
    return Number.isFinite(n) ? n : fallback;
}

function int(v: unknown, fallback = 0): number {
    return Math.trunc(num(v, fallback));
}

interface WindowParams { since: Date; until: Date; }

// ─────────────────────────────────────────────────────────────────────────
// Totals (headline KPIs)
// ─────────────────────────────────────────────────────────────────────────

export async function fetchTotals(
    pool: ProveQueryable,
    tenantId: string,
    win: WindowParams,
): Promise<ProveTotals> {
    // One query. Aggregates derived from CASE expressions so we don't issue
    // 10 round-trips for the KPI strip.
    const sql = `
        SELECT
            COALESCE(SUM(cost_usd), 0)::float                       AS total_spend_usd,
            COUNT(*)::int                                           AS total_requests,
            COUNT(*) FILTER (WHERE governance_decision = 'denied')::int AS denied_requests,
            COUNT(*) FILTER (WHERE department_id IS NULL
                              AND employee_id   IS NULL
                              AND workflow_id   IS NULL
                              AND customer_id   IS NULL
                              AND feature_id    IS NULL
                              AND api_key_id    IS NULL)::int       AS unattributed_request_count,
            COALESCE(SUM(cost_usd) FILTER (WHERE department_id IS NULL
                                            AND employee_id   IS NULL
                                            AND workflow_id   IS NULL
                                            AND customer_id   IS NULL
                                            AND feature_id    IS NULL
                                            AND api_key_id    IS NULL), 0)::float
                                                                    AS unattributed_spend_usd,
            COUNT(*) FILTER (WHERE evidence_bundle_id IS NOT NULL)::int AS events_with_evidence,
            COUNT(*) FILTER (WHERE evidence_bundle_id IS NULL)::int AS events_missing_evidence
          FROM ai_economic_events
         WHERE tenant_id = $1
           AND event_time >= $2
           AND event_time <  $3
    `;
    const { rows } = await pool.query(sql, [tenantId, win.since, win.until]);
    const r = rows[0] ?? {};
    const total_requests = int(r.total_requests);
    const denied_requests = int(r.denied_requests);
    const total_spend_usd = num(r.total_spend_usd);
    const events_with_evidence = int(r.events_with_evidence);
    const events_missing_evidence = int(r.events_missing_evidence);
    const evidence_total = events_with_evidence + events_missing_evidence;

    // cost_per_accepted_output: only meaningful when we have an
    // outcome signal. For 3G we approximate with success=true rows.
    const sqlAccepted = `
        SELECT COALESCE(SUM(cost_usd), 0)::float AS accepted_spend_usd,
               COUNT(*) FILTER (WHERE success IS TRUE)::int AS accepted_count
          FROM ai_economic_events
         WHERE tenant_id = $1 AND event_time >= $2 AND event_time < $3
           AND success IS TRUE
    `;
    const { rows: rowsAccepted } = await pool.query(sqlAccepted, [tenantId, win.since, win.until]);
    const accepted_count = int(rowsAccepted[0]?.accepted_count);
    const accepted_spend_usd = num(rowsAccepted[0]?.accepted_spend_usd);
    const cost_per_accepted_output_usd = accepted_count > 0 ? accepted_spend_usd / accepted_count : null;

    return {
        total_spend_usd,
        total_requests,
        denied_requests,
        // Provider cost prevented = the per-request avg multiplied by
        // denial count, an order-of-magnitude estimate the dashboard frames
        // as such. We avoid claiming "savings" — see UI copy.
        denied_provider_cost_prevented_usd: total_requests > 0
            ? (total_spend_usd / Math.max(1, total_requests - denied_requests)) * denied_requests
            : 0,
        avg_cost_per_request_usd: total_requests > 0 ? total_spend_usd / total_requests : 0,
        cost_per_accepted_output_usd,
        evidence_coverage_pct: evidence_total > 0 ? (events_with_evidence / evidence_total) * 100 : 100,
        unattributed_spend_usd: num(r.unattributed_spend_usd),
        unattributed_request_count: int(r.unattributed_request_count),
        events_missing_evidence,
    };
}

// ─────────────────────────────────────────────────────────────────────────
// Period comparison — current vs previous window
// ─────────────────────────────────────────────────────────────────────────

export async function fetchSpendInWindow(
    pool: ProveQueryable,
    tenantId: string,
    win: WindowParams,
): Promise<number> {
    const { rows } = await pool.query(
        `SELECT COALESCE(SUM(cost_usd), 0)::float AS spend_usd
           FROM ai_economic_events
          WHERE tenant_id = $1 AND event_time >= $2 AND event_time < $3`,
        [tenantId, win.since, win.until],
    );
    return num(rows[0]?.spend_usd);
}

// ─────────────────────────────────────────────────────────────────────────
// Breakdowns
// ─────────────────────────────────────────────────────────────────────────

const BREAKDOWN_COLUMN_MAP = {
    department_id: 'department_id',
    employee_id:   'employee_id',
    api_key_id:    'api_key_id',
    workflow_id:   'workflow_id',
    customer_id:   'customer_id',
    feature_id:    'feature_id',
    provider:      'provider',
    model_used:    'model_used',
    governance_decision: 'governance_decision',
} as const;
type BreakdownKey = keyof typeof BREAKDOWN_COLUMN_MAP;

/**
 * Group-by-dimension breakdown. Column name comes from the whitelist —
 * never from user input. NULL keys are collapsed to 'Unattributed'.
 */
export async function fetchBreakdown(
    pool: ProveQueryable,
    tenantId: string,
    win: WindowParams,
    dimension: BreakdownKey,
    limit = 25,
): Promise<ProveBreakdownRow[]> {
    const column = BREAKDOWN_COLUMN_MAP[dimension];
    const sql = `
        SELECT COALESCE(${column}::text, $4) AS key,
               COUNT(*)::int AS request_count,
               COALESCE(SUM(cost_usd), 0)::float AS total_cost_usd,
               COUNT(*) FILTER (WHERE governance_decision = 'denied')::int AS denied_count
          FROM ai_economic_events
         WHERE tenant_id = $1 AND event_time >= $2 AND event_time < $3
         GROUP BY 1
         ORDER BY total_cost_usd DESC NULLS LAST, request_count DESC
         LIMIT $5
    `;
    const { rows } = await pool.query(sql, [tenantId, win.since, win.until, UNATTRIBUTED, limit]);
    return rows.map((r) => ({
        key: String(r.key ?? UNATTRIBUTED),
        request_count: int(r.request_count),
        total_cost_usd: num(r.total_cost_usd),
        denied_count: int(r.denied_count),
    }));
}

// ─────────────────────────────────────────────────────────────────────────
// Denied event analysis
// ─────────────────────────────────────────────────────────────────────────

export async function fetchDeniedByCode(
    pool: ProveQueryable,
    tenantId: string,
    win: WindowParams,
    limit = 20,
): Promise<DeniedByCodeRow[]> {
    const sql = `
        SELECT deny_code,
               COUNT(*)::int AS count,
               COALESCE(SUM(cost_usd), 0)::float AS total_cost_usd,
               -- A given deny_code maps to a single deny_rule by construction
               -- (see lib/economic-events/denied.ts DENY_RULE_MAP). MAX picks
               -- the rule deterministically if metadata varies.
               MAX(metadata ->> 'deny_rule') AS deny_rule
          FROM ai_economic_events
         WHERE tenant_id = $1 AND event_time >= $2 AND event_time < $3
           AND governance_decision = 'denied' AND deny_code IS NOT NULL
         GROUP BY deny_code
         ORDER BY count DESC, deny_code ASC
         LIMIT $4
    `;
    const { rows } = await pool.query(sql, [tenantId, win.since, win.until, limit]);
    return rows.map((r) => ({
        deny_code: String(r.deny_code),
        count: int(r.count),
        total_cost_usd: num(r.total_cost_usd),
        deny_rule: r.deny_rule == null ? null : String(r.deny_rule),
    }));
}

export async function fetchTopDenyRules(
    pool: ProveQueryable,
    tenantId: string,
    win: WindowParams,
    limit = 10,
): Promise<Array<{ deny_rule: string; count: number }>> {
    const sql = `
        SELECT metadata ->> 'deny_rule' AS deny_rule,
               COUNT(*)::int            AS count
          FROM ai_economic_events
         WHERE tenant_id = $1 AND event_time >= $2 AND event_time < $3
           AND governance_decision = 'denied'
           AND metadata ? 'deny_rule'
         GROUP BY deny_rule
         ORDER BY count DESC, deny_rule ASC
         LIMIT $4
    `;
    const { rows } = await pool.query(sql, [tenantId, win.since, win.until, limit]);
    return rows
        .filter((r) => r.deny_rule != null)
        .map((r) => ({ deny_rule: String(r.deny_rule), count: int(r.count) }));
}

export async function fetchDenialOverTime(
    pool: ProveQueryable,
    tenantId: string,
    win: WindowParams,
): Promise<DenialOverTimePoint[]> {
    const sql = `
        SELECT date_trunc('day', event_time) AS bucket,
               COUNT(*) FILTER (WHERE governance_decision = 'denied')::int   AS denied,
               COUNT(*) FILTER (WHERE governance_decision = 'approved')::int AS approved
          FROM ai_economic_events
         WHERE tenant_id = $1 AND event_time >= $2 AND event_time < $3
         GROUP BY bucket
         ORDER BY bucket ASC
    `;
    const { rows } = await pool.query(sql, [tenantId, win.since, win.until]);
    return rows.map((r) => ({
        bucket: r.bucket instanceof Date ? r.bucket.toISOString() : String(r.bucket),
        denied: int(r.denied),
        approved: int(r.approved),
    }));
}

// ─────────────────────────────────────────────────────────────────────────
// Privacy + evidence
// ─────────────────────────────────────────────────────────────────────────

export async function fetchPrivacyDistribution(
    pool: ProveQueryable,
    tenantId: string,
    win: WindowParams,
): Promise<PrivacyModeRow[]> {
    const sql = `
        SELECT privacy_mode,
               COUNT(*)::int AS count,
               COUNT(*) FILTER (WHERE prompt_stored      IS TRUE)::int AS prompt_stored_count,
               COUNT(*) FILTER (WHERE response_stored    IS TRUE)::int AS response_stored_count,
               COUNT(*) FILTER (WHERE redaction_applied  IS TRUE)::int AS redaction_applied_count
          FROM ai_economic_events
         WHERE tenant_id = $1 AND event_time >= $2 AND event_time < $3
         GROUP BY privacy_mode
         ORDER BY count DESC
    `;
    const { rows } = await pool.query(sql, [tenantId, win.since, win.until]);
    return rows.map((r) => ({
        privacy_mode: String(r.privacy_mode ?? 'unknown'),
        count: int(r.count),
        prompt_stored_count: int(r.prompt_stored_count),
        response_stored_count: int(r.response_stored_count),
        redaction_applied_count: int(r.redaction_applied_count),
    }));
}

const EVIDENCE_COVERAGE_DIMENSION_MAP = {
    department_id: 'department_id',
    workflow_id: 'workflow_id',
    provider: 'provider',
} as const;
type EvidenceDim = keyof typeof EVIDENCE_COVERAGE_DIMENSION_MAP;

export async function fetchEvidenceCoverageByDim(
    pool: ProveQueryable,
    tenantId: string,
    win: WindowParams,
    dim: EvidenceDim,
    limit = 15,
): Promise<EvidenceCoverageRow[]> {
    const column = EVIDENCE_COVERAGE_DIMENSION_MAP[dim];
    const sql = `
        SELECT COALESCE(${column}::text, $4) AS key,
               COUNT(*)::int AS events,
               COUNT(*) FILTER (WHERE evidence_bundle_id IS NOT NULL)::int AS with_evidence,
               COUNT(*) FILTER (WHERE evidence_bundle_id IS NULL)::int     AS missing_evidence
          FROM ai_economic_events
         WHERE tenant_id = $1 AND event_time >= $2 AND event_time < $3
         GROUP BY 1
         ORDER BY events DESC
         LIMIT $5
    `;
    const { rows } = await pool.query(sql, [tenantId, win.since, win.until, UNATTRIBUTED, limit]);
    return rows.map((r) => {
        const events = int(r.events);
        const withE  = int(r.with_evidence);
        return {
            dimension: dim === 'department_id'
                ? 'department_id'
                : dim === 'workflow_id'
                    ? 'workflow_id'
                    : 'provider',
            key: String(r.key),
            events,
            with_evidence: withE,
            missing_evidence: int(r.missing_evidence),
            coverage_pct: events > 0 ? (withE / events) * 100 : 0,
        };
    });
}

export async function fetchEvidenceCoverageOverall(
    pool: ProveQueryable,
    tenantId: string,
    win: WindowParams,
): Promise<EvidenceCoverageRow> {
    const sql = `
        SELECT COUNT(*)::int AS events,
               COUNT(*) FILTER (WHERE evidence_bundle_id IS NOT NULL)::int AS with_evidence,
               COUNT(*) FILTER (WHERE evidence_bundle_id IS NULL)::int     AS missing_evidence
          FROM ai_economic_events
         WHERE tenant_id = $1 AND event_time >= $2 AND event_time < $3
    `;
    const { rows } = await pool.query(sql, [tenantId, win.since, win.until]);
    const r = rows[0] ?? {};
    const events = int(r.events);
    const withE  = int(r.with_evidence);
    return {
        dimension: 'overall',
        key: 'overall',
        events,
        with_evidence: withE,
        missing_evidence: int(r.missing_evidence),
        coverage_pct: events > 0 ? (withE / events) * 100 : 100,
    };
}
