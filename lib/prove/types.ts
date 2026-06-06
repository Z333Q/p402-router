/**
 * Slice 3G — Prove dashboard types.
 *
 * Read-only types for /api/v2/prove/{overview,search} and the dashboard
 * page. Like Monitor (Slice 3A), Prove aggregates ai_economic_events
 * metadata only: no prompt or response content is ever read.
 *
 * The shape is finance-grade: every field is something a CFO,
 * procurement lead, or executive can read without opening a log.
 */

export const UNATTRIBUTED = 'Unattributed' as const;

export const PROVE_DIMENSIONS = [
    'department_id',
    'employee_id',
    'api_key_id',
    'workflow_id',
    'customer_id',
    'feature_id',
    'provider',
    'model_used',
    'governance_decision',
] as const;
export type ProveDimension = (typeof PROVE_DIMENSIONS)[number];

/** Comparison-window payload — current vs previous period for trend tiles. */
export interface PeriodComparison {
    current_usd: number;
    previous_usd: number;
    /** Positive = spend up vs previous; negative = down. null when no previous. */
    delta_pct: number | null;
}

export interface ProveTotals {
    total_spend_usd: number;
    total_requests: number;
    denied_requests: number;
    denied_provider_cost_prevented_usd: number;
    avg_cost_per_request_usd: number;
    cost_per_accepted_output_usd: number | null;
    evidence_coverage_pct: number;
    unattributed_spend_usd: number;
    unattributed_request_count: number;
    events_missing_evidence: number;
}

export interface ProveBreakdownRow {
    /** Attribution value or 'Unattributed'. */
    key: string;
    request_count: number;
    total_cost_usd: number;
    /** Subset that were denied — for ranked bar overlays. */
    denied_count: number;
}

export interface DeniedByCodeRow {
    deny_code: string;
    count: number;
    /** Sum of cost_usd on those rows; always 0 for budget-guard denials,
     *  but kept for completeness if other paths ever populate cost. */
    total_cost_usd: number;
    /** Rule that produced the denial, sourced from metadata.deny_rule. */
    deny_rule: string | null;
}

export interface PrivacyModeRow {
    privacy_mode: string;
    count: number;
    prompt_stored_count: number;
    response_stored_count: number;
    redaction_applied_count: number;
}

export interface EvidenceCoverageRow {
    dimension: ProveDimension | 'overall';
    key: string;
    events: number;
    with_evidence: number;
    missing_evidence: number;
    coverage_pct: number;
}

export interface DenialOverTimePoint {
    bucket: string; // ISO date (UTC day)
    denied: number;
    approved: number;
}

export interface ProveOverviewResponse {
    ok: true;
    generated_at: string;
    window: { since: string; until: string };
    previous_window: { since: string; until: string };

    totals: ProveTotals;
    spend_period_comparison: PeriodComparison;

    breakdowns: {
        by_department: ProveBreakdownRow[];
        by_employee:   ProveBreakdownRow[];
        by_api_key:    ProveBreakdownRow[];
        by_workflow:   ProveBreakdownRow[];
        by_customer:   ProveBreakdownRow[];
        by_feature:    ProveBreakdownRow[];
        by_provider:   ProveBreakdownRow[];
        by_model:      ProveBreakdownRow[];
        by_governance: ProveBreakdownRow[];
    };

    denied: {
        by_code:      DeniedByCodeRow[];
        by_department: ProveBreakdownRow[];
        by_api_key:    ProveBreakdownRow[];
        by_model:      ProveBreakdownRow[];
        over_time:     DenialOverTimePoint[];
        top_deny_rules: Array<{ deny_rule: string; count: number }>;
    };

    privacy: {
        distribution: PrivacyModeRow[];
    };
    evidence: {
        coverage_overall: EvidenceCoverageRow;
        coverage_by_department: EvidenceCoverageRow[];
        coverage_by_workflow:   EvidenceCoverageRow[];
        coverage_by_provider:   EvidenceCoverageRow[];
    };
}

// ─────────────────────────────────────────────────────────────────────────
// Search
// ─────────────────────────────────────────────────────────────────────────

export type SearchEvidenceStatus = 'present' | 'missing' | 'any';
export type SearchAttributionStatus = 'attributed' | 'partial' | 'unattributed' | 'any';
export type SearchSuccess = 'true' | 'false' | 'any';

/**
 * Sort columns the search endpoint accepts. Whitelist only — no
 * user-supplied identifiers ever reach the ORDER BY.
 */
export const SEARCH_SORT_COLUMNS = [
    'event_time',
    'cost_usd',
    'total_tokens',
    'status_code',
    'governance_decision',
    'privacy_mode',
] as const;
export type SearchSortColumn = (typeof SEARCH_SORT_COLUMNS)[number];

export interface SearchFilters {
    date_from?: string;
    date_to?: string;
    department_id?: string;
    employee_id?: string;
    api_key_id?: string;
    workflow_id?: string;
    customer_id?: string;
    feature_id?: string;
    provider?: string;
    model?: string;
    governance_decision?: string;
    deny_code?: string;
    privacy_mode?: string;
    evidence_status?: SearchEvidenceStatus;
    success?: SearchSuccess;
    cost_min?: number;
    cost_max?: number;
    tokens_min?: number;
    tokens_max?: number;
    attribution_status?: SearchAttributionStatus;
    q?: string;
    sort_by?: SearchSortColumn;
    sort_dir?: 'asc' | 'desc';
    limit?: number;
    offset?: number;
}

export interface SearchHit {
    event_time: string;
    request_id: string;
    source: string;
    route: string | null;
    provider: string | null;
    model_used: string | null;
    status_code: number | null;
    success: boolean | null;
    cost_usd: string;
    input_tokens: number;
    output_tokens: number;
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
    decision_source: string | null;
    deny_rule: string | null;
    attribution_status: 'attributed' | 'partial' | 'unattributed';
}

export interface SearchResponse {
    ok: true;
    generated_at: string;
    filters_applied: SearchFilters;
    /** Plain-English description of the search the user just ran. */
    explanation: string;
    count: number;
    limit: number;
    offset: number;
    hits: SearchHit[];
}
