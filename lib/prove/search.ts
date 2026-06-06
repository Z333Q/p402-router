/**
 * Slice 3G — Prove search engine.
 *
 * Translates a SearchFilters envelope into a tenant-scoped, parameterized
 * SELECT against ai_economic_events. No SQL fragments are interpolated
 * from request input; every value lands as a positional bind.
 *
 * Read-only. Privacy posture is metadata-only: the SELECT projection is
 * an allow-list shared with the export route. Content-bearing columns
 * (prompt_*, response_text, messages, etc.) are NEVER referenced.
 */

import { PRIVACY_MODES } from '@/lib/economic-events/types';
import {
    SEARCH_SORT_COLUMNS,
    type SearchFilters,
    type SearchHit,
    type SearchSortColumn,
} from './types';

export interface SearchQueryable {
    query(text: string, values?: unknown[]): Promise<{ rows: Array<Record<string, unknown>> }>;
}

export const SEARCH_DEFAULT_LIMIT = 100;
export const SEARCH_MAX_LIMIT     = 1_000;

const GOVERNANCE_VALUES = new Set([
    'approved', 'denied', 'warned', 'requires_review',
    'settlement_required', 'settled', 'receipt_reused', 'cached', 'optimized',
]);

/**
 * Free-text search columns. ILIKE on each — these are short identifiers
 * so the substring scan is cheap; we still cap q length below.
 */
const Q_COLUMNS = [
    'request_id',
    'department_id',
    'employee_id',
    'api_key_id',
    'workflow_id',
    'customer_id',
    'feature_id',
    'provider',
    'model_used',
    'source',
    'governance_decision',
    'deny_code',
    'privacy_mode',
    'evidence_bundle_id',
] as const;

/**
 * The exact projection. Mirrors the export route's allow-list (minus
 * tenant_id which is implicit on a tenant-scoped query). NO prompt /
 * response / message / body / content columns.
 */
const SELECT_PROJECTION = `
    event_time,
    request_id,
    source,
    CASE source
        WHEN 'chat_completions' THEN '/api/v2/chat/completions'
        WHEN 'meter_only'       THEN '/api/v2/meter/events'
        ELSE NULL
    END AS route,
    provider,
    model_used,
    status_code,
    success,
    cost_usd,
    input_tokens,
    output_tokens,
    total_tokens,
    department_id,
    employee_id,
    api_key_id,
    workflow_id,
    customer_id,
    feature_id,
    governance_decision,
    deny_code,
    privacy_mode,
    evidence_bundle_id,
    (metadata ->> 'decision_source') AS decision_source,
    (metadata ->> 'deny_rule')       AS deny_rule
`;

function clampLimit(raw: unknown): number {
    const n = Number(raw);
    if (!Number.isFinite(n)) return SEARCH_DEFAULT_LIMIT;
    return Math.min(SEARCH_MAX_LIMIT, Math.max(1, Math.trunc(n)));
}
function clampOffset(raw: unknown): number {
    const n = Number(raw);
    if (!Number.isFinite(n)) return 0;
    return Math.max(0, Math.trunc(n));
}

function pickSort(col: unknown): SearchSortColumn {
    if (typeof col === 'string' && (SEARCH_SORT_COLUMNS as readonly string[]).includes(col)) {
        return col as SearchSortColumn;
    }
    return 'event_time';
}
function pickDir(dir: unknown): 'asc' | 'desc' {
    return dir === 'asc' ? 'asc' : 'desc';
}

interface BuildResult {
    sql: string;
    params: unknown[];
    /** Sanitized filter envelope actually pushed into SQL. */
    applied: SearchFilters;
    explanation: string;
}

/**
 * Compose the WHERE clauses + the human-readable explanation. Pure: no
 * DB access.
 *
 * Validation rules:
 *   - String-valued filters are length-bounded at 256.
 *   - privacy_mode is enum-checked; unknown values are dropped.
 *   - governance_decision is enum-checked; unknown values are dropped.
 *   - evidence_status only accepts present|missing|any.
 *   - success only accepts true|false|any.
 *   - attribution_status only accepts attributed|partial|unattributed|any.
 *   - q is length-bounded at 128.
 *   - cost_min/cost_max/tokens_min/tokens_max are coerced to finite numbers
 *     or dropped.
 */
export function buildSearchSql(
    tenantId: string,
    filters: SearchFilters,
): BuildResult {
    const where: string[] = ['tenant_id = $1'];
    const params: unknown[] = [tenantId];
    const applied: SearchFilters = {};
    const parts: string[] = [];

    function bind(value: unknown): number {
        params.push(value);
        return params.length;
    }

    // Window
    if (filters.date_from) {
        const d = new Date(filters.date_from);
        if (!Number.isNaN(d.getTime())) {
            const i = bind(d);
            where.push(`event_time >= $${i}`);
            applied.date_from = filters.date_from;
            parts.push(`from ${filters.date_from}`);
        }
    }
    if (filters.date_to) {
        const d = new Date(filters.date_to);
        if (!Number.isNaN(d.getTime())) {
            const i = bind(d);
            where.push(`event_time <= $${i}`);
            applied.date_to = filters.date_to;
            parts.push(`to ${filters.date_to}`);
        }
    }

    const ID_FILTERS: Array<[keyof SearchFilters, string]> = [
        ['department_id', 'department_id'],
        ['employee_id',   'employee_id'],
        ['api_key_id',    'api_key_id'],
        ['workflow_id',   'workflow_id'],
        ['customer_id',   'customer_id'],
        ['feature_id',    'feature_id'],
        ['provider',      'provider'],
        ['deny_code',     'deny_code'],
    ];
    for (const [key, col] of ID_FILTERS) {
        const v = filters[key];
        if (typeof v === 'string' && v.length > 0 && v.length <= 256) {
            const i = bind(v);
            where.push(`${col} = $${i}`);
            (applied as Record<string, unknown>)[key] = v;
            parts.push(`${col}=${v}`);
        }
    }

    // model → model_used
    if (typeof filters.model === 'string' && filters.model.length > 0 && filters.model.length <= 256) {
        const i = bind(filters.model);
        where.push(`model_used = $${i}`);
        applied.model = filters.model;
        parts.push(`model=${filters.model}`);
    }

    // governance_decision (enum-checked)
    if (typeof filters.governance_decision === 'string' && GOVERNANCE_VALUES.has(filters.governance_decision)) {
        const i = bind(filters.governance_decision);
        where.push(`governance_decision = $${i}`);
        applied.governance_decision = filters.governance_decision;
        parts.push(`governance_decision=${filters.governance_decision}`);
    }

    // privacy_mode (enum-checked)
    if (typeof filters.privacy_mode === 'string' && PRIVACY_MODES.has(filters.privacy_mode as never)) {
        const i = bind(filters.privacy_mode);
        where.push(`privacy_mode = $${i}`);
        applied.privacy_mode = filters.privacy_mode;
        parts.push(`privacy_mode=${filters.privacy_mode}`);
    }

    // evidence_status
    if (filters.evidence_status === 'present') {
        where.push(`evidence_bundle_id IS NOT NULL`);
        applied.evidence_status = 'present';
        parts.push(`evidence present`);
    } else if (filters.evidence_status === 'missing') {
        where.push(`evidence_bundle_id IS NULL`);
        applied.evidence_status = 'missing';
        parts.push(`missing evidence`);
    }

    // success
    if (filters.success === 'true') {
        where.push(`success IS TRUE`);
        applied.success = 'true';
        parts.push(`success`);
    } else if (filters.success === 'false') {
        where.push(`(success IS FALSE OR success IS NULL)`);
        applied.success = 'false';
        parts.push(`not successful`);
    }

    // attribution_status — ALL of the FK columns null = unattributed.
    if (filters.attribution_status === 'unattributed') {
        where.push(
            `(department_id IS NULL AND employee_id IS NULL AND workflow_id IS NULL ` +
            `AND customer_id IS NULL AND feature_id IS NULL AND api_key_id IS NULL)`,
        );
        applied.attribution_status = 'unattributed';
        parts.push(`unattributed`);
    } else if (filters.attribution_status === 'attributed') {
        where.push(
            `(department_id IS NOT NULL OR employee_id IS NOT NULL OR workflow_id IS NOT NULL ` +
            `OR customer_id IS NOT NULL OR feature_id IS NOT NULL OR api_key_id IS NOT NULL)`,
        );
        applied.attribution_status = 'attributed';
        parts.push(`attributed`);
    } else if (filters.attribution_status === 'partial') {
        // At least one filled AND at least one missing across the 6 FK cols.
        where.push(
            `((department_id IS NOT NULL OR employee_id IS NOT NULL OR workflow_id IS NOT NULL ` +
            `OR customer_id IS NOT NULL OR feature_id IS NOT NULL OR api_key_id IS NOT NULL) ` +
            `AND (department_id IS NULL OR employee_id IS NULL OR workflow_id IS NULL ` +
            `OR customer_id IS NULL OR feature_id IS NULL OR api_key_id IS NULL))`,
        );
        applied.attribution_status = 'partial';
        parts.push(`partially attributed`);
    }

    // Cost range
    const costMin = Number(filters.cost_min);
    if (Number.isFinite(costMin)) {
        const i = bind(costMin);
        where.push(`cost_usd >= $${i}`);
        applied.cost_min = costMin;
        parts.push(`cost >= $${costMin}`);
    }
    const costMax = Number(filters.cost_max);
    if (Number.isFinite(costMax)) {
        const i = bind(costMax);
        where.push(`cost_usd <= $${i}`);
        applied.cost_max = costMax;
        parts.push(`cost <= $${costMax}`);
    }

    // Token range
    const tokMin = Number(filters.tokens_min);
    if (Number.isFinite(tokMin)) {
        const i = bind(tokMin);
        where.push(`total_tokens >= $${i}`);
        applied.tokens_min = tokMin;
        parts.push(`tokens >= ${tokMin}`);
    }
    const tokMax = Number(filters.tokens_max);
    if (Number.isFinite(tokMax)) {
        const i = bind(tokMax);
        where.push(`total_tokens <= $${i}`);
        applied.tokens_max = tokMax;
        parts.push(`tokens <= ${tokMax}`);
    }

    // Free-text q — bound ONCE, repeated across whitelisted columns via OR.
    // No identifier is interpolated; only the literal column names from the
    // whitelist appear in the SQL.
    if (typeof filters.q === 'string' && filters.q.length > 0 && filters.q.length <= 128) {
        const i = bind(`%${filters.q}%`);
        const ors = Q_COLUMNS.map((c) => `${c}::text ILIKE $${i}`).join(' OR ');
        // Also include the metadata JSONB sub-keys we expose.
        const metaOrs = [`metadata ->> 'decision_source' ILIKE $${i}`, `metadata ->> 'deny_rule' ILIKE $${i}`].join(' OR ');
        where.push(`(${ors} OR ${metaOrs})`);
        applied.q = filters.q;
        parts.push(`matching "${filters.q}"`);
    }

    // Sort + pagination
    const sortBy  = pickSort(filters.sort_by);
    const sortDir = pickDir(filters.sort_dir);
    const limit   = clampLimit(filters.limit ?? SEARCH_DEFAULT_LIMIT);
    const offset  = clampOffset(filters.offset ?? 0);
    applied.sort_by = sortBy;
    applied.sort_dir = sortDir;
    applied.limit = limit;
    applied.offset = offset;

    const limitIdx  = bind(limit);
    const offsetIdx = bind(offset);

    const sql = `
        SELECT
            ${SELECT_PROJECTION},
            CASE
                WHEN department_id IS NULL AND employee_id IS NULL AND workflow_id IS NULL
                 AND customer_id  IS NULL AND feature_id  IS NULL AND api_key_id   IS NULL
                THEN 'unattributed'
                WHEN department_id IS NOT NULL AND employee_id IS NOT NULL AND workflow_id IS NOT NULL
                 AND customer_id  IS NOT NULL AND feature_id  IS NOT NULL AND api_key_id   IS NOT NULL
                THEN 'attributed'
                ELSE 'partial'
            END AS attribution_status
          FROM ai_economic_events
         WHERE ${where.join(' AND ')}
         ORDER BY ${sortBy} ${sortDir.toUpperCase()} NULLS LAST, request_id DESC
         LIMIT $${limitIdx} OFFSET $${offsetIdx}
    `;

    const explanation = parts.length === 0
        ? 'Showing all events for the tenant.'
        : `Showing events ${parts.join(', ')}.`;

    return { sql, params, applied, explanation };
}

export async function runSearch(
    pool: SearchQueryable,
    tenantId: string,
    filters: SearchFilters,
): Promise<{ hits: SearchHit[]; applied: SearchFilters; explanation: string }> {
    const built = buildSearchSql(tenantId, filters);
    const { rows } = await pool.query(built.sql, built.params);
    const hits = rows.map((r) => ({
        event_time:         r.event_time instanceof Date ? r.event_time.toISOString() : String(r.event_time ?? ''),
        request_id:         String(r.request_id ?? ''),
        source:             String(r.source ?? ''),
        route:              r.route == null ? null : String(r.route),
        provider:           r.provider == null ? null : String(r.provider),
        model_used:         r.model_used == null ? null : String(r.model_used),
        status_code:        r.status_code == null ? null : Number(r.status_code),
        success:            r.success == null ? null : Boolean(r.success),
        cost_usd:           String(r.cost_usd ?? '0'),
        input_tokens:       Number(r.input_tokens ?? 0),
        output_tokens:      Number(r.output_tokens ?? 0),
        total_tokens:       Number(r.total_tokens ?? 0),
        department_id:      r.department_id == null ? null : String(r.department_id),
        employee_id:        r.employee_id == null ? null : String(r.employee_id),
        api_key_id:         r.api_key_id == null ? null : String(r.api_key_id),
        workflow_id:        r.workflow_id == null ? null : String(r.workflow_id),
        customer_id:        r.customer_id == null ? null : String(r.customer_id),
        feature_id:         r.feature_id == null ? null : String(r.feature_id),
        governance_decision: r.governance_decision == null ? null : String(r.governance_decision),
        deny_code:          r.deny_code == null ? null : String(r.deny_code),
        privacy_mode:       String(r.privacy_mode ?? 'unknown'),
        evidence_bundle_id: r.evidence_bundle_id == null ? null : String(r.evidence_bundle_id),
        decision_source:    r.decision_source == null ? null : String(r.decision_source),
        deny_rule:          r.deny_rule == null ? null : String(r.deny_rule),
        attribution_status: (r.attribution_status as SearchHit['attribution_status']) ?? 'partial',
    } satisfies SearchHit));
    return { hits, applied: built.applied, explanation: built.explanation };
}
