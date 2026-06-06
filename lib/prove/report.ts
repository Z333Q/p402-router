/**
 * Slice 3I — Executive Prove Report data layer.
 *
 * Pure SQL surface for /api/v2/prove/report. Tenant-scoped on $1, every
 * filter bound positionally, no SQL fragments interpolated from request
 * input. Privacy posture: metadata-only — the SELECT projection NEVER
 * references prompt / response / messages / completion / body /
 * fingerprint columns.
 *
 * The aggregation queries mirror the existing Prove overview shape but
 * accept the full report-filter envelope so a CFO can scope the packet
 * to a department, workflow, vendor, deny code, evidence state, or
 * privacy posture.
 */

import { PRIVACY_MODES } from '@/lib/economic-events/types';
import { UNATTRIBUTED } from './types';

export interface ReportQueryable {
    query(text: string, values?: unknown[]): Promise<{ rows: Array<Record<string, unknown>> }>;
}

// ─────────────────────────────────────────────────────────────────────────
// Filter envelope
// ─────────────────────────────────────────────────────────────────────────

export interface ReportFilters {
    since?: string;
    until?: string;
    department_id?: string;
    workflow_id?: string;
    customer_id?: string;
    provider?: string;
    model?: string;                       // -> model_used column
    governance_decision?: string;
    deny_code?: string;
    privacy_mode?: string;
    evidence_status?: 'present' | 'missing';
    attribution_status?: 'attributed' | 'partial' | 'unattributed';
}

const ID_FILTER_COLUMNS = {
    department_id: 'department_id',
    workflow_id:   'workflow_id',
    customer_id:   'customer_id',
    provider:      'provider',
    deny_code:     'deny_code',
} as const;

const GOVERNANCE_VALUES = new Set([
    'approved', 'denied', 'warned', 'requires_review',
    'settlement_required', 'settled', 'receipt_reused', 'cached', 'optimized',
]);

interface BuildResult {
    where: string[];
    params: unknown[];
    /** Sanitized envelope mirroring what we actually pushed into SQL. */
    applied: ReportFilters;
    /** Bound window dates after defaulting (always present). */
    since: Date;
    until: Date;
}

const DEFAULT_WINDOW_DAYS = 30;

/**
 * Tenant + window + filter -> WHERE clauses. Always returns a populated
 * window: the report contract is "a CFO always sees a real period."
 */
export function buildReportWhere(tenantId: string, filters: ReportFilters): BuildResult {
    const where: string[] = ['tenant_id = $1'];
    const params: unknown[] = [tenantId];
    const applied: ReportFilters = {};

    // Window — always bound.
    const now = new Date();
    const until = filters.until ? new Date(filters.until) : now;
    const since = filters.since
        ? new Date(filters.since)
        : new Date(until.getTime() - DEFAULT_WINDOW_DAYS * 86_400_000);
    params.push(since);
    where.push(`event_time >= $${params.length}`);
    params.push(until);
    where.push(`event_time < $${params.length}`);
    applied.since = since.toISOString();
    applied.until = until.toISOString();

    // ID-like filters
    for (const [key, column] of Object.entries(ID_FILTER_COLUMNS)) {
        const v = (filters as Record<string, unknown>)[key];
        if (typeof v === 'string' && v.length > 0 && v.length <= 256) {
            params.push(v);
            where.push(`${column} = $${params.length}`);
            (applied as Record<string, unknown>)[key] = v;
        }
    }

    // model -> model_used
    if (typeof filters.model === 'string' && filters.model.length > 0 && filters.model.length <= 256) {
        params.push(filters.model);
        where.push(`model_used = $${params.length}`);
        applied.model = filters.model;
    }

    if (typeof filters.governance_decision === 'string' && GOVERNANCE_VALUES.has(filters.governance_decision)) {
        params.push(filters.governance_decision);
        where.push(`governance_decision = $${params.length}`);
        applied.governance_decision = filters.governance_decision;
    }

    if (typeof filters.privacy_mode === 'string' && PRIVACY_MODES.has(filters.privacy_mode as never)) {
        params.push(filters.privacy_mode);
        where.push(`privacy_mode = $${params.length}`);
        applied.privacy_mode = filters.privacy_mode;
    }

    if (filters.evidence_status === 'present') {
        where.push(`evidence_bundle_id IS NOT NULL`);
        applied.evidence_status = 'present';
    } else if (filters.evidence_status === 'missing') {
        where.push(`evidence_bundle_id IS NULL`);
        applied.evidence_status = 'missing';
    }

    if (filters.attribution_status === 'unattributed') {
        where.push(
            `(department_id IS NULL AND employee_id IS NULL AND workflow_id IS NULL ` +
            `AND customer_id IS NULL AND feature_id IS NULL AND api_key_id IS NULL)`,
        );
        applied.attribution_status = 'unattributed';
    } else if (filters.attribution_status === 'attributed') {
        where.push(
            `(department_id IS NOT NULL OR employee_id IS NOT NULL OR workflow_id IS NOT NULL ` +
            `OR customer_id IS NOT NULL OR feature_id IS NOT NULL OR api_key_id IS NOT NULL)`,
        );
        applied.attribution_status = 'attributed';
    } else if (filters.attribution_status === 'partial') {
        where.push(
            `((department_id IS NOT NULL OR employee_id IS NOT NULL OR workflow_id IS NOT NULL ` +
            `OR customer_id IS NOT NULL OR feature_id IS NOT NULL OR api_key_id IS NOT NULL) ` +
            `AND (department_id IS NULL OR employee_id IS NULL OR workflow_id IS NULL ` +
            `OR customer_id IS NULL OR feature_id IS NULL OR api_key_id IS NULL))`,
        );
        applied.attribution_status = 'partial';
    }

    return { where, params, applied, since, until };
}

// ─────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────

const num = (v: unknown, f = 0): number => {
    if (v === null || v === undefined) return f;
    const n = Number(v);
    return Number.isFinite(n) ? n : f;
};
const int = (v: unknown, f = 0): number => Math.trunc(num(v, f));

// ─────────────────────────────────────────────────────────────────────────
// Aggregations
// ─────────────────────────────────────────────────────────────────────────

export interface ExecutiveSummary {
    total_spend_usd: number;
    total_events: number;
    denied_events: number;
    avg_cost_per_request_usd: number;
    total_tokens: number;
    evidence_coverage_pct: number;
    unattributed_event_count: number;
    unattributed_spend_usd: number;
    missing_evidence_count: number;
    /** Always 0 in this slice — denied events never reach the provider. */
    denied_provider_cost_usd: 0;
}

export async function fetchExecutiveSummary(
    pool: ReportQueryable,
    tenantId: string,
    filters: ReportFilters,
): Promise<ExecutiveSummary> {
    const { where, params } = buildReportWhere(tenantId, filters);
    const sql = `
        SELECT
            COALESCE(SUM(cost_usd), 0)::float                       AS total_spend_usd,
            COUNT(*)::int                                           AS total_events,
            COUNT(*) FILTER (WHERE governance_decision = 'denied')::int AS denied_events,
            COALESCE(SUM(total_tokens), 0)::bigint                  AS total_tokens,
            COUNT(*) FILTER (WHERE evidence_bundle_id IS NOT NULL)::int AS with_evidence,
            COUNT(*) FILTER (WHERE evidence_bundle_id IS NULL)::int     AS missing_evidence,
            COUNT(*) FILTER (WHERE department_id IS NULL AND employee_id IS NULL
                              AND workflow_id   IS NULL AND customer_id IS NULL
                              AND feature_id    IS NULL AND api_key_id IS NULL)::int
                                                                    AS unattributed_count,
            COALESCE(SUM(cost_usd) FILTER (WHERE department_id IS NULL AND employee_id IS NULL
                                            AND workflow_id   IS NULL AND customer_id IS NULL
                                            AND feature_id    IS NULL AND api_key_id IS NULL), 0)::float
                                                                    AS unattributed_spend_usd
          FROM ai_economic_events
         WHERE ${where.join(' AND ')}
    `;
    const { rows } = await pool.query(sql, params);
    const r = rows[0] ?? {};
    const total_events = int(r.total_events);
    const total_spend_usd = num(r.total_spend_usd);
    const with_e = int(r.with_evidence);
    const missing_e = int(r.missing_evidence);
    const denom = with_e + missing_e;
    return {
        total_spend_usd,
        total_events,
        denied_events: int(r.denied_events),
        avg_cost_per_request_usd: total_events > 0 ? total_spend_usd / total_events : 0,
        total_tokens: Number(r.total_tokens ?? 0),
        evidence_coverage_pct: denom > 0 ? (with_e / denom) * 100 : 100,
        unattributed_event_count: int(r.unattributed_count),
        unattributed_spend_usd: num(r.unattributed_spend_usd),
        missing_evidence_count: missing_e,
        denied_provider_cost_usd: 0,
    };
}

export interface RankedRow {
    key: string;
    request_count: number;
    total_cost_usd: number;
    denied_count: number;
}

/** Generic top-by-spend ranker. Column comes from a whitelist. */
const RANKER_COLUMN = {
    department_id: 'department_id',
    workflow_id:   'workflow_id',
    provider:      'provider',
    model_used:    'model_used',
} as const;
type RankerKey = keyof typeof RANKER_COLUMN;

export async function fetchRanked(
    pool: ReportQueryable,
    tenantId: string,
    filters: ReportFilters,
    dim: RankerKey,
    limit = 10,
): Promise<RankedRow[]> {
    const { where, params } = buildReportWhere(tenantId, filters);
    const col = RANKER_COLUMN[dim];
    params.push(UNATTRIBUTED, limit);
    const unidx = params.length - 1;
    const lidx = params.length;
    const sql = `
        SELECT COALESCE(${col}::text, $${unidx}) AS key,
               COUNT(*)::int AS request_count,
               COALESCE(SUM(cost_usd), 0)::float AS total_cost_usd,
               COUNT(*) FILTER (WHERE governance_decision = 'denied')::int AS denied_count
          FROM ai_economic_events
         WHERE ${where.join(' AND ')}
         GROUP BY 1
         ORDER BY total_cost_usd DESC NULLS LAST, request_count DESC
         LIMIT $${lidx}
    `;
    const { rows } = await pool.query(sql, params);
    return rows.map((r) => ({
        key: String(r.key ?? UNATTRIBUTED),
        request_count: int(r.request_count),
        total_cost_usd: num(r.total_cost_usd),
        denied_count: int(r.denied_count),
    }));
}

export interface ProviderModelRow extends RankedRow {
    provider: string;
    model_used: string;
}

export async function fetchProviderModel(
    pool: ReportQueryable,
    tenantId: string,
    filters: ReportFilters,
    limit = 10,
): Promise<ProviderModelRow[]> {
    const { where, params } = buildReportWhere(tenantId, filters);
    params.push(UNATTRIBUTED, limit);
    const unidx = params.length - 1;
    const lidx = params.length;
    const sql = `
        SELECT COALESCE(provider::text, $${unidx})   AS provider,
               COALESCE(model_used::text, $${unidx}) AS model_used,
               COUNT(*)::int AS request_count,
               COALESCE(SUM(cost_usd), 0)::float AS total_cost_usd,
               COUNT(*) FILTER (WHERE governance_decision = 'denied')::int AS denied_count
          FROM ai_economic_events
         WHERE ${where.join(' AND ')}
         GROUP BY 1, 2
         ORDER BY total_cost_usd DESC NULLS LAST, request_count DESC
         LIMIT $${lidx}
    `;
    const { rows } = await pool.query(sql, params);
    return rows.map((r) => ({
        provider: String(r.provider ?? UNATTRIBUTED),
        model_used: String(r.model_used ?? UNATTRIBUTED),
        key: `${String(r.provider ?? UNATTRIBUTED)} / ${String(r.model_used ?? UNATTRIBUTED)}`,
        request_count: int(r.request_count),
        total_cost_usd: num(r.total_cost_usd),
        denied_count: int(r.denied_count),
    }));
}

// ─────────────────────────────────────────────────────────────────────────
// Denied summary
// ─────────────────────────────────────────────────────────────────────────

export interface DeniedSummary {
    total_denied: number;
    total_blocked_cost_usd: 0;
    by_code: Array<{ deny_code: string; count: number; deny_rule: string | null }>;
    top_deny_rules: Array<{ deny_rule: string; count: number }>;
}

export async function fetchDeniedSummary(
    pool: ReportQueryable,
    tenantId: string,
    filters: ReportFilters,
    limit = 10,
): Promise<DeniedSummary> {
    const { where: baseWhere, params: baseParams } = buildReportWhere(tenantId, filters);

    // total denied
    const { rows: tRows } = await pool.query(
        `SELECT COUNT(*)::int AS total
           FROM ai_economic_events
          WHERE ${baseWhere.join(' AND ')}
            AND governance_decision = 'denied'`,
        baseParams,
    );
    const total_denied = int(tRows[0]?.total);

    // by deny code
    const { rows: bRows } = await pool.query(
        `SELECT deny_code,
                COUNT(*)::int AS count,
                MAX(metadata ->> 'deny_rule') AS deny_rule
           FROM ai_economic_events
          WHERE ${baseWhere.join(' AND ')}
            AND governance_decision = 'denied'
            AND deny_code IS NOT NULL
          GROUP BY deny_code
          ORDER BY count DESC, deny_code ASC
          LIMIT $${baseParams.length + 1}`,
        [...baseParams, limit],
    );

    // top deny rules
    const { rows: rRows } = await pool.query(
        `SELECT metadata ->> 'deny_rule' AS deny_rule, COUNT(*)::int AS count
           FROM ai_economic_events
          WHERE ${baseWhere.join(' AND ')}
            AND governance_decision = 'denied'
            AND metadata ? 'deny_rule'
          GROUP BY deny_rule
          ORDER BY count DESC
          LIMIT $${baseParams.length + 1}`,
        [...baseParams, limit],
    );

    return {
        total_denied,
        total_blocked_cost_usd: 0,
        by_code: bRows.map((r) => ({
            deny_code: String(r.deny_code),
            count: int(r.count),
            deny_rule: r.deny_rule == null ? null : String(r.deny_rule),
        })),
        top_deny_rules: rRows
            .filter((r) => r.deny_rule != null)
            .map((r) => ({ deny_rule: String(r.deny_rule), count: int(r.count) })),
    };
}

// ─────────────────────────────────────────────────────────────────────────
// Budget / control evidence (counts of referenced control objects)
// ─────────────────────────────────────────────────────────────────────────

export interface BudgetControlEvidence {
    budget_count: number;
    policy_count: number;
    mandate_count: number;
    decision_sources: Array<{ source: string; count: number }>;
}

export async function fetchBudgetControlEvidence(
    pool: ReportQueryable,
    tenantId: string,
    filters: ReportFilters,
): Promise<BudgetControlEvidence> {
    const { where, params } = buildReportWhere(tenantId, filters);
    const { rows: c } = await pool.query(
        `SELECT COUNT(DISTINCT budget_id)  FILTER (WHERE budget_id  IS NOT NULL)::int AS budget_count,
                COUNT(DISTINCT policy_id)  FILTER (WHERE policy_id  IS NOT NULL)::int AS policy_count,
                COUNT(DISTINCT mandate_id) FILTER (WHERE mandate_id IS NOT NULL)::int AS mandate_count
           FROM ai_economic_events
          WHERE ${where.join(' AND ')}`,
        params,
    );
    const { rows: d } = await pool.query(
        `SELECT metadata ->> 'decision_source' AS source, COUNT(*)::int AS count
           FROM ai_economic_events
          WHERE ${where.join(' AND ')}
            AND metadata ? 'decision_source'
          GROUP BY source
          ORDER BY count DESC
          LIMIT 10`,
        params,
    );
    const row = c[0] ?? {};
    return {
        budget_count: int(row.budget_count),
        policy_count: int(row.policy_count),
        mandate_count: int(row.mandate_count),
        decision_sources: d
            .filter((r) => r.source != null)
            .map((r) => ({ source: String(r.source), count: int(r.count) })),
    };
}

// ─────────────────────────────────────────────────────────────────────────
// Privacy distribution
// ─────────────────────────────────────────────────────────────────────────

export interface PrivacyDistributionRow {
    privacy_mode: string;
    count: number;
    prompt_stored: number;
    response_stored: number;
    redaction_applied: number;
}

export async function fetchPrivacyDistribution(
    pool: ReportQueryable,
    tenantId: string,
    filters: ReportFilters,
): Promise<PrivacyDistributionRow[]> {
    const { where, params } = buildReportWhere(tenantId, filters);
    const { rows } = await pool.query(
        `SELECT privacy_mode,
                COUNT(*)::int AS count,
                COUNT(*) FILTER (WHERE prompt_stored     IS TRUE)::int AS prompt_stored,
                COUNT(*) FILTER (WHERE response_stored   IS TRUE)::int AS response_stored,
                COUNT(*) FILTER (WHERE redaction_applied IS TRUE)::int AS redaction_applied
           FROM ai_economic_events
          WHERE ${where.join(' AND ')}
          GROUP BY privacy_mode
          ORDER BY count DESC`,
        params,
    );
    return rows.map((r) => ({
        privacy_mode: String(r.privacy_mode ?? 'unknown'),
        count: int(r.count),
        prompt_stored: int(r.prompt_stored),
        response_stored: int(r.response_stored),
        redaction_applied: int(r.redaction_applied),
    }));
}

// ─────────────────────────────────────────────────────────────────────────
// Attribution gaps
// ─────────────────────────────────────────────────────────────────────────

export interface AttributionGaps {
    unattributed_count: number;
    partial_count: number;
    attributed_count: number;
    /** Which single FK field is most commonly missing across partial+unattributed. */
    most_commonly_missing: Array<{ field: 'department'|'employee'|'workflow'|'customer'|'feature'|'api_key'; missing_count: number }>;
}

export async function fetchAttributionGaps(
    pool: ReportQueryable,
    tenantId: string,
    filters: ReportFilters,
): Promise<AttributionGaps> {
    const { where, params } = buildReportWhere(tenantId, filters);
    const { rows } = await pool.query(
        `SELECT
            COUNT(*) FILTER (
                WHERE department_id IS NULL AND employee_id IS NULL AND workflow_id IS NULL
                  AND customer_id  IS NULL AND feature_id  IS NULL AND api_key_id   IS NULL
            )::int AS unattributed_count,
            COUNT(*) FILTER (
                WHERE department_id IS NOT NULL AND employee_id IS NOT NULL AND workflow_id IS NOT NULL
                  AND customer_id  IS NOT NULL AND feature_id  IS NOT NULL AND api_key_id   IS NOT NULL
            )::int AS attributed_count,
            COUNT(*) FILTER (WHERE department_id IS NULL)::int AS missing_department,
            COUNT(*) FILTER (WHERE employee_id   IS NULL)::int AS missing_employee,
            COUNT(*) FILTER (WHERE workflow_id   IS NULL)::int AS missing_workflow,
            COUNT(*) FILTER (WHERE customer_id   IS NULL)::int AS missing_customer,
            COUNT(*) FILTER (WHERE feature_id    IS NULL)::int AS missing_feature,
            COUNT(*) FILTER (WHERE api_key_id    IS NULL)::int AS missing_api_key,
            COUNT(*)::int AS total
          FROM ai_economic_events
         WHERE ${where.join(' AND ')}`,
        params,
    );
    const r = rows[0] ?? {};
    const total = int(r.total);
    const unattributed_count = int(r.unattributed_count);
    const attributed_count   = int(r.attributed_count);
    const partial_count = Math.max(0, total - unattributed_count - attributed_count);
    const fields: Array<{ field: AttributionGaps['most_commonly_missing'][number]['field']; missing_count: number }> = [
        { field: 'department', missing_count: int(r.missing_department) },
        { field: 'employee',   missing_count: int(r.missing_employee) },
        { field: 'workflow',   missing_count: int(r.missing_workflow) },
        { field: 'customer',   missing_count: int(r.missing_customer) },
        { field: 'feature',    missing_count: int(r.missing_feature) },
        { field: 'api_key',    missing_count: int(r.missing_api_key) },
    ];
    fields.sort((a, b) => b.missing_count - a.missing_count);
    return {
        unattributed_count,
        partial_count,
        attributed_count,
        most_commonly_missing: fields,
    };
}

// ─────────────────────────────────────────────────────────────────────────
// Top events requiring cleanup
//
// "Cleanup" = high-cost, no-evidence, or no-attribution events that a
// finance team can act on. We rank by a cleanup_score that combines
// missing-evidence + missing-attribution + cost.
// ─────────────────────────────────────────────────────────────────────────

export interface CleanupRow {
    event_time: string;
    request_id: string;
    cost_usd: string;
    provider: string | null;
    model_used: string | null;
    governance_decision: string | null;
    deny_code: string | null;
    department_id: string | null;
    employee_id: string | null;
    workflow_id: string | null;
    customer_id: string | null;
    feature_id: string | null;
    api_key_id: string | null;
    evidence_bundle_id: string | null;
    missing_evidence: boolean;
    unattributed: boolean;
    /** 0..3 — higher = needs more cleanup. */
    cleanup_score: number;
}

export async function fetchTopCleanup(
    pool: ReportQueryable,
    tenantId: string,
    filters: ReportFilters,
    limit = 20,
): Promise<CleanupRow[]> {
    const { where, params } = buildReportWhere(tenantId, filters);
    params.push(limit);
    const lidx = params.length;
    const sql = `
        WITH base AS (
            SELECT
                event_time,
                request_id,
                cost_usd,
                provider,
                model_used,
                governance_decision,
                deny_code,
                department_id,
                employee_id,
                workflow_id,
                customer_id,
                feature_id,
                api_key_id,
                evidence_bundle_id,
                (evidence_bundle_id IS NULL)::int AS missing_evidence,
                (department_id IS NULL AND employee_id IS NULL AND workflow_id IS NULL
                 AND customer_id IS NULL AND feature_id IS NULL AND api_key_id IS NULL)::int AS unattributed,
                (cost_usd > 1)::int AS high_cost
              FROM ai_economic_events
             WHERE ${where.join(' AND ')}
        )
        SELECT *,
               (missing_evidence + unattributed + high_cost) AS cleanup_score
          FROM base
         WHERE (missing_evidence + unattributed + high_cost) > 0
         ORDER BY cleanup_score DESC, cost_usd DESC NULLS LAST, event_time DESC
         LIMIT $${lidx}
    `;
    const { rows } = await pool.query(sql, params);
    return rows.map((r) => ({
        event_time:          r.event_time instanceof Date ? r.event_time.toISOString() : String(r.event_time),
        request_id:          String(r.request_id),
        cost_usd:            String(r.cost_usd ?? '0'),
        provider:            r.provider == null ? null : String(r.provider),
        model_used:          r.model_used == null ? null : String(r.model_used),
        governance_decision: r.governance_decision == null ? null : String(r.governance_decision),
        deny_code:           r.deny_code == null ? null : String(r.deny_code),
        department_id:       r.department_id == null ? null : String(r.department_id),
        employee_id:         r.employee_id   == null ? null : String(r.employee_id),
        workflow_id:         r.workflow_id   == null ? null : String(r.workflow_id),
        customer_id:         r.customer_id   == null ? null : String(r.customer_id),
        feature_id:          r.feature_id    == null ? null : String(r.feature_id),
        api_key_id:          r.api_key_id    == null ? null : String(r.api_key_id),
        evidence_bundle_id:  r.evidence_bundle_id == null ? null : String(r.evidence_bundle_id),
        missing_evidence:    Number(r.missing_evidence) === 1,
        unattributed:        Number(r.unattributed) === 1,
        cleanup_score:       Number(r.cleanup_score),
    }));
}

// ─────────────────────────────────────────────────────────────────────────
// Appendix
//
// A bounded slice of the matching events for the report packet. Same
// metadata-only projection as the search route. Hard cap APPENDIX_MAX.
// ─────────────────────────────────────────────────────────────────────────

export const APPENDIX_DEFAULT_LIMIT = 100;
export const APPENDIX_MAX_LIMIT     = 1_000;

export interface AppendixRow {
    event_time: string;
    request_id: string;
    source: string;
    provider: string | null;
    model_used: string | null;
    status_code: number | null;
    success: boolean | null;
    cost_usd: string;
    total_tokens: number;
    department_id: string | null;
    employee_id: string | null;
    api_key_id: string | null;
    workflow_id: string | null;
    customer_id: string | null;
    feature_id: string | null;
    governance_decision: string | null;
    deny_code: string | null;
    privacy_mode: string;
    evidence_bundle_id: string | null;
}

export async function fetchAppendix(
    pool: ReportQueryable,
    tenantId: string,
    filters: ReportFilters,
    limit = APPENDIX_DEFAULT_LIMIT,
): Promise<AppendixRow[]> {
    const cap = Math.min(APPENDIX_MAX_LIMIT, Math.max(1, Math.trunc(limit)));
    const { where, params } = buildReportWhere(tenantId, filters);
    params.push(cap);
    const lidx = params.length;
    const sql = `
        SELECT event_time, request_id, source,
               provider, model_used,
               status_code, success, cost_usd, total_tokens,
               department_id, employee_id, api_key_id,
               workflow_id, customer_id, feature_id,
               governance_decision, deny_code,
               privacy_mode, evidence_bundle_id
          FROM ai_economic_events
         WHERE ${where.join(' AND ')}
         ORDER BY event_time DESC, request_id DESC
         LIMIT $${lidx}
    `;
    const { rows } = await pool.query(sql, params);
    return rows.map((r) => ({
        event_time:          r.event_time instanceof Date ? r.event_time.toISOString() : String(r.event_time),
        request_id:          String(r.request_id),
        source:              String(r.source ?? ''),
        provider:            r.provider == null ? null : String(r.provider),
        model_used:          r.model_used == null ? null : String(r.model_used),
        status_code:         r.status_code == null ? null : Number(r.status_code),
        success:             r.success == null ? null : Boolean(r.success),
        cost_usd:            String(r.cost_usd ?? '0'),
        total_tokens:        Number(r.total_tokens ?? 0),
        department_id:       r.department_id == null ? null : String(r.department_id),
        employee_id:         r.employee_id   == null ? null : String(r.employee_id),
        api_key_id:          r.api_key_id    == null ? null : String(r.api_key_id),
        workflow_id:         r.workflow_id   == null ? null : String(r.workflow_id),
        customer_id:         r.customer_id   == null ? null : String(r.customer_id),
        feature_id:          r.feature_id    == null ? null : String(r.feature_id),
        governance_decision: r.governance_decision == null ? null : String(r.governance_decision),
        deny_code:           r.deny_code == null ? null : String(r.deny_code),
        privacy_mode:        String(r.privacy_mode ?? 'metadata_only'),
        evidence_bundle_id:  r.evidence_bundle_id == null ? null : String(r.evidence_bundle_id),
    }));
}

// ─────────────────────────────────────────────────────────────────────────
// Executive summary text (pure)
// ─────────────────────────────────────────────────────────────────────────

export function buildExecutiveSummaryText(
    summary: ExecutiveSummary,
    byDept: RankedRow[],
    byProviderModel: ProviderModelRow[],
    denied: DeniedSummary,
    privacy: PrivacyDistributionRow[],
    gaps: AttributionGaps,
    window: { since: string; until: string },
): string {
    const top_dept = byDept[0];
    const top_pm   = byProviderModel[0];
    const top_deny = denied.by_code[0];
    const top_privacy = privacy[0];
    const lines: string[] = [];
    lines.push(
        `Between ${window.since.slice(0, 10)} and ${window.until.slice(0, 10)}, this tenant recorded ` +
        `${summary.total_events.toLocaleString()} AI economic events totaling ` +
        `$${summary.total_spend_usd.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} in AI spend.`,
    );
    if (summary.denied_events > 0) {
        lines.push(
            `${summary.denied_events.toLocaleString()} requests were denied before provider execution; ` +
            `denied provider cost was $0 by construction.` +
            (top_deny ? ` The most common deny code was ${top_deny.deny_code} (${top_deny.count}).` : ''),
        );
    } else {
        lines.push(`No requests were denied in this window.`);
    }
    if (top_dept) {
        lines.push(
            `Spend was concentrated in department ${top_dept.key} ` +
            `($${top_dept.total_cost_usd.toFixed(2)}).`,
        );
    }
    if (top_pm) {
        lines.push(
            `The top vendor + model pair by spend was ${top_pm.provider} / ${top_pm.model_used} ` +
            `($${top_pm.total_cost_usd.toFixed(2)}).`,
        );
    }
    if (top_privacy) {
        lines.push(
            `The predominant privacy posture was ${top_privacy.privacy_mode}.`,
        );
    }
    lines.push(
        `Evidence coverage was ${summary.evidence_coverage_pct.toFixed(1)}%; ` +
        `${summary.missing_evidence_count.toLocaleString()} events have no evidence bundle attached.`,
    );
    lines.push(
        `${gaps.unattributed_count.toLocaleString()} events are fully unattributed, ` +
        `representing $${summary.unattributed_spend_usd.toFixed(2)} in spend that finance cannot yet assign to a budget owner.`,
    );
    lines.push(
        `This report is rendered from economic metadata only. Prompts and responses are not displayed in any section.`,
    );
    return lines.join(' ');
}

// ─────────────────────────────────────────────────────────────────────────
// CSV appendix
// ─────────────────────────────────────────────────────────────────────────

export const APPENDIX_FIELDS = [
    'event_time', 'request_id', 'source', 'provider', 'model_used',
    'status_code', 'success', 'cost_usd', 'total_tokens',
    'department_id', 'employee_id', 'api_key_id',
    'workflow_id', 'customer_id', 'feature_id',
    'governance_decision', 'deny_code',
    'privacy_mode', 'evidence_bundle_id',
] as const;

function csvCell(v: unknown): string {
    if (v === null || v === undefined) return '';
    let s: string;
    if (typeof v === 'boolean') s = v ? 'true' : 'false';
    else                        s = String(v);
    if (/[",\r\n]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
    return s;
}

export function appendixToCsv(rows: AppendixRow[]): string {
    const header = APPENDIX_FIELDS.join(',');
    if (rows.length === 0) return header + '\n';
    const lines: string[] = [header];
    for (const r of rows) {
        lines.push(APPENDIX_FIELDS.map((f) => csvCell((r as unknown as Record<string, unknown>)[f])).join(','));
    }
    return lines.join('\n') + '\n';
}
