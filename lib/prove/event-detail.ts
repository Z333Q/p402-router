/**
 * Slice 3H — Event detail data layer.
 *
 * Pure SQL surface for /api/v2/prove/economic-events/[request_id]. Every
 * query is tenant-scoped on $1, request_id is bound as $2, no SQL
 * fragments interpolated from request input. The projection mirrors the
 * Slice 3G allow-list — NO prompt / response / messages / completion /
 * body / fingerprint columns are referenced.
 */

import type { EventExplanation } from './explain';

export interface EventDetailQueryable {
    query(text: string, values?: unknown[]): Promise<{ rows: Array<Record<string, unknown>> }>;
}

/**
 * Shape returned by the SQL projection. Everything here is metadata; the
 * route returns this verbatim under `event`. `metadata_*` fields are the
 * two JSONB sub-keys we expose (decision_source, deny_rule) — the rest
 * of the JSONB stays inside the DB and is not surfaced to clients.
 */
export interface EventDetailRow {
    event_time: string;
    request_id: string;
    tenant_id: string;
    source: string;
    route: string | null;
    provider: string | null;
    model_used: string | null;
    model_requested: string | null;
    status_code: number | null;
    success: boolean | null;
    cost_usd: string;
    direct_cost_usd: string;
    input_tokens: number;
    output_tokens: number;
    total_tokens: number;
    latency_ms: number | null;
    cache_hit: boolean | null;
    department_id: string | null;
    employee_id: string | null;
    api_key_id: string | null;
    workflow_id: string | null;
    customer_id: string | null;
    feature_id: string | null;
    owner_type: string | null;
    owner_id: string | null;
    budget_id: string | null;
    policy_id: string | null;
    mandate_id: string | null;
    governance_decision: string | null;
    deny_code: string | null;
    privacy_mode: string;
    prompt_stored: boolean;
    response_stored: boolean;
    redaction_applied: boolean;
    retention_expires_at: string | null;
    evidence_bundle_id: string | null;
    metadata_decision_source: string | null;
    metadata_deny_rule: string | null;
    created_at: string;
    updated_at: string;
}

export interface AttributionView {
    api_key_id: string | null;
    department_id: string | null;
    employee_id: string | null;
    workflow_id: string | null;
    customer_id: string | null;
    feature_id: string | null;
    owner_type: string | null;
    owner_id: string | null;
    /** 0..6 — count of the six FK fields that are present. */
    completeness_count: number;
    /** completeness_count / 6, as a percentage. */
    completeness_pct: number;
    /** Field labels that are missing. */
    missing: Array<'department' | 'employee' | 'api_key' | 'workflow' | 'customer' | 'feature'>;
    /** Derived banner state — same vocabulary the search uses. */
    status: 'attributed' | 'partial' | 'unattributed';
}

export interface RelatedEventSummary {
    request_id: string;
    event_time: string;
    provider: string | null;
    model_used: string | null;
    governance_decision: string | null;
    deny_code: string | null;
    cost_usd: string;
    /** Which match driver placed this row in the related panel. */
    match_reason: 'department' | 'employee' | 'workflow' | 'customer' | 'provider_model' | 'deny_code' | 'nearby';
}

export interface EventDetailResponse {
    ok: true;
    event: EventDetailRow;
    attribution: AttributionView;
    governance: {
        decision: string | null;
        deny_code: string | null;
        deny_rule: string | null;
        decision_source: string | null;
        budget_id: string | null;
        policy_id: string | null;
        mandate_id: string | null;
        status_code: number | null;
        success: boolean | null;
        provider_call_blocked: boolean;
    };
    privacy: {
        privacy_mode: string;
        prompt_stored: boolean;
        response_stored: boolean;
        redaction_applied: boolean;
        retention_expires_at: string | null;
        /** Reminder for the page header. */
        content_displayed: false;
    };
    evidence: {
        evidence_bundle_id: string | null;
        present: boolean;
        bundle_url: string | null;
    };
    cost: {
        cost_usd: number;
        direct_cost_usd: number;
        input_tokens: number;
        output_tokens: number;
        total_tokens: number;
        avg_cost_per_1k_tokens: number | null;
        /** True when the row is denied; included so the dashboard can
         *  render the "blocked before provider call, $0" explainer. */
        zero_cost_denied: boolean;
    };
    related_events: RelatedEventSummary[];
    explanation: EventExplanation;
}

// ─────────────────────────────────────────────────────────────────────────
// SQL
// ─────────────────────────────────────────────────────────────────────────

/**
 * Projection: only metadata + privacy posture + evidence pointer + the
 * two metadata JSONB sub-keys. NO prompt/response/messages/completion
 * columns. NO fingerprint columns (those would leak content shape).
 */
const EVENT_SELECT = `
    event_time,
    request_id,
    tenant_id,
    source,
    CASE source
        WHEN 'chat_completions' THEN '/api/v2/chat/completions'
        WHEN 'meter_only'       THEN '/api/v2/meter/events'
        ELSE NULL
    END AS route,
    provider,
    model_used,
    model_requested,
    status_code,
    success,
    cost_usd,
    direct_cost_usd,
    input_tokens,
    output_tokens,
    total_tokens,
    latency_ms,
    cache_hit,
    department_id,
    employee_id,
    api_key_id,
    workflow_id,
    customer_id,
    feature_id,
    owner_type,
    owner_id,
    budget_id,
    policy_id,
    mandate_id,
    governance_decision,
    deny_code,
    privacy_mode,
    prompt_stored,
    response_stored,
    redaction_applied,
    retention_expires_at,
    evidence_bundle_id,
    (metadata ->> 'decision_source') AS metadata_decision_source,
    (metadata ->> 'deny_rule')       AS metadata_deny_rule,
    created_at,
    updated_at
`;

export async function loadEventByRequestId(
    pool: EventDetailQueryable,
    tenantId: string,
    requestId: string,
): Promise<EventDetailRow | null> {
    const { rows } = await pool.query(
        `SELECT ${EVENT_SELECT}
           FROM ai_economic_events
          WHERE tenant_id = $1 AND request_id = $2
          LIMIT 1`,
        [tenantId, requestId],
    );
    if (rows.length === 0) return null;
    return normalizeRow(rows[0]!);
}

export function buildAttributionView(row: EventDetailRow): AttributionView {
    const fields = {
        department: row.department_id,
        employee:   row.employee_id,
        api_key:    row.api_key_id,
        workflow:   row.workflow_id,
        customer:   row.customer_id,
        feature:    row.feature_id,
    };
    const missing: AttributionView['missing'] = (Object.entries(fields) as Array<[keyof typeof fields, string | null]>)
        .filter(([, v]) => v == null)
        .map(([k]) => k);
    const completeness_count = 6 - missing.length;
    const status: AttributionView['status'] = missing.length === 6
        ? 'unattributed'
        : missing.length === 0 ? 'attributed' : 'partial';
    return {
        api_key_id: row.api_key_id,
        department_id: row.department_id,
        employee_id: row.employee_id,
        workflow_id: row.workflow_id,
        customer_id: row.customer_id,
        feature_id: row.feature_id,
        owner_type: row.owner_type,
        owner_id: row.owner_id,
        completeness_count,
        completeness_pct: (completeness_count / 6) * 100,
        missing,
        status,
    };
}

// ─────────────────────────────────────────────────────────────────────────
// Related events
// ─────────────────────────────────────────────────────────────────────────

/**
 * Related events panel — same tenant, NOT the same request_id, matching
 * any of:
 *   - same department_id
 *   - same employee_id
 *   - same workflow_id
 *   - same customer_id
 *   - same provider + model_used pair
 *   - same deny_code
 *   - nearby event_time window (±24h)
 *
 * Limit 10, ordered by event_time DESC. The match_reason is computed
 * row-wise so the UI can label why each row is related.
 *
 * Window is a string interval bound into the query via positional
 * params (postgres accepts `event_time BETWEEN $N - INTERVAL '24 hours'
 * AND $N + INTERVAL '24 hours'`).
 */
export async function loadRelatedEvents(
    pool: EventDetailQueryable,
    tenantId: string,
    seed: EventDetailRow,
    limit = 10,
): Promise<RelatedEventSummary[]> {
    const params: unknown[] = [tenantId, seed.request_id, seed.event_time, limit];
    const driverClauses: string[] = [];
    const matchReason: string[] = [];

    // event_time nearby window — always bound.
    driverClauses.push(`event_time BETWEEN ($3::timestamptz - INTERVAL '24 hours') AND ($3::timestamptz + INTERVAL '24 hours')`);
    matchReason.push(`WHEN event_time BETWEEN ($3::timestamptz - INTERVAL '1 hour') AND ($3::timestamptz + INTERVAL '1 hour') THEN 'nearby'`);

    function addOptional(value: string | null, column: string, reason: string): void {
        if (value == null) return;
        params.push(value);
        const idx = params.length;
        driverClauses.push(`${column} = $${idx}`);
        matchReason.push(`WHEN ${column} = $${idx} THEN '${reason}'`);
    }
    addOptional(seed.department_id, 'department_id', 'department');
    addOptional(seed.employee_id,   'employee_id',   'employee');
    addOptional(seed.workflow_id,   'workflow_id',   'workflow');
    addOptional(seed.customer_id,   'customer_id',   'customer');
    addOptional(seed.deny_code,     'deny_code',     'deny_code');

    // provider + model combination
    if (seed.provider != null && seed.model_used != null) {
        params.push(seed.provider, seed.model_used);
        const pIdx = params.length - 1;
        const mIdx = params.length;
        driverClauses.push(`(provider = $${pIdx} AND model_used = $${mIdx})`);
        matchReason.push(`WHEN provider = $${pIdx} AND model_used = $${mIdx} THEN 'provider_model'`);
    }

    const sql = `
        SELECT request_id,
               event_time,
               provider,
               model_used,
               governance_decision,
               deny_code,
               cost_usd,
               CASE
                   ${matchReason.join('\n                   ')}
                   ELSE 'nearby'
               END AS match_reason
          FROM ai_economic_events
         WHERE tenant_id = $1
           AND request_id <> $2
           AND (${driverClauses.join(' OR ')})
         ORDER BY event_time DESC
         LIMIT $4
    `;

    const { rows } = await pool.query(sql, params);
    return rows.map((r) => ({
        request_id: String(r.request_id),
        event_time: r.event_time instanceof Date ? r.event_time.toISOString() : String(r.event_time),
        provider: r.provider == null ? null : String(r.provider),
        model_used: r.model_used == null ? null : String(r.model_used),
        governance_decision: r.governance_decision == null ? null : String(r.governance_decision),
        deny_code: r.deny_code == null ? null : String(r.deny_code),
        cost_usd: String(r.cost_usd ?? '0'),
        match_reason: r.match_reason as RelatedEventSummary['match_reason'],
    }));
}

// ─────────────────────────────────────────────────────────────────────────
// Row normalization
// ─────────────────────────────────────────────────────────────────────────

function normalizeRow(r: Record<string, unknown>): EventDetailRow {
    const iso = (v: unknown): string => (v instanceof Date ? v.toISOString() : String(v ?? ''));
    return {
        event_time: iso(r.event_time),
        request_id: String(r.request_id ?? ''),
        tenant_id:  String(r.tenant_id ?? ''),
        source:     String(r.source ?? ''),
        route:      r.route == null ? null : String(r.route),
        provider:   r.provider == null ? null : String(r.provider),
        model_used: r.model_used == null ? null : String(r.model_used),
        model_requested: r.model_requested == null ? null : String(r.model_requested),
        status_code: r.status_code == null ? null : Number(r.status_code),
        success:     r.success == null ? null : Boolean(r.success),
        cost_usd:    String(r.cost_usd ?? '0'),
        direct_cost_usd: String(r.direct_cost_usd ?? '0'),
        input_tokens:  Number(r.input_tokens ?? 0),
        output_tokens: Number(r.output_tokens ?? 0),
        total_tokens:  Number(r.total_tokens ?? 0),
        latency_ms:    r.latency_ms == null ? null : Number(r.latency_ms),
        cache_hit:     r.cache_hit == null ? null : Boolean(r.cache_hit),
        department_id: r.department_id == null ? null : String(r.department_id),
        employee_id:   r.employee_id == null ? null : String(r.employee_id),
        api_key_id:    r.api_key_id == null ? null : String(r.api_key_id),
        workflow_id:   r.workflow_id == null ? null : String(r.workflow_id),
        customer_id:   r.customer_id == null ? null : String(r.customer_id),
        feature_id:    r.feature_id == null ? null : String(r.feature_id),
        owner_type:    r.owner_type == null ? null : String(r.owner_type),
        owner_id:      r.owner_id == null ? null : String(r.owner_id),
        budget_id:     r.budget_id == null ? null : String(r.budget_id),
        policy_id:     r.policy_id == null ? null : String(r.policy_id),
        mandate_id:    r.mandate_id == null ? null : String(r.mandate_id),
        governance_decision: r.governance_decision == null ? null : String(r.governance_decision),
        deny_code:           r.deny_code == null ? null : String(r.deny_code),
        privacy_mode:        String(r.privacy_mode ?? 'metadata_only'),
        prompt_stored:       Boolean(r.prompt_stored),
        response_stored:     Boolean(r.response_stored),
        redaction_applied:   Boolean(r.redaction_applied),
        retention_expires_at: r.retention_expires_at == null ? null : iso(r.retention_expires_at),
        evidence_bundle_id:  r.evidence_bundle_id == null ? null : String(r.evidence_bundle_id),
        metadata_decision_source: r.metadata_decision_source == null ? null : String(r.metadata_decision_source),
        metadata_deny_rule:       r.metadata_deny_rule == null ? null : String(r.metadata_deny_rule),
        created_at: iso(r.created_at),
        updated_at: iso(r.updated_at),
    };
}
