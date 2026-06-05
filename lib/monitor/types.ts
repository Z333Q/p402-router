/**
 * Slice 3A — Monitor foundation dashboard.
 *
 * Read-only types for `/api/v2/monitor/overview`. The endpoint aggregates over
 * `ai_economic_events` (v2_052) and `request_outcomes` (v2_051) only. Privacy
 * posture is metadata-only: no fields here represent prompt or response content.
 */

export const UNATTRIBUTED = 'Unattributed' as const;

export const ATTRIBUTION_FIELDS = [
    'department_id',
    'employee_id',
    'workflow_id',
    'customer_id',
    'feature_id',
] as const;
export type AttributionField = (typeof ATTRIBUTION_FIELDS)[number];

/** Combined floor — see Slice 3A directive. Lifting either side requires both. */
export const COST_PER_ACCEPTED_OUTPUT_THRESHOLDS = {
    min_outcome_coverage_pct: 5,
    min_accepted_count: 20,
} as const;

export interface MonitorFilters {
    since?: string;            // ISO timestamp; optional — builder indexes dynamically
    until?: string;            // ISO timestamp; optional — builder indexes dynamically
    department_id?: string;
    employee_id?: string;
    workflow_id?: string;
    customer_id?: string;
    feature_id?: string;
    provider?: string;
    model_used?: string;
}

export interface GroupSpendRow {
    /** Either the attribution value or 'Unattributed' when the column was null. */
    key: string;
    request_count: number;
    total_cost_usd: number;
    avg_cost_usd: number;
}

export interface ProviderModelSpendRow {
    provider: string;
    model_used: string;
    request_count: number;
    total_cost_usd: number;
    avg_cost_usd: number;
}

export interface PrivacyModeRow {
    privacy_mode: string;
    count: number;
    pct: number;
}

/**
 * Success-rate provenance. The schema offers three signals (`success`,
 * `status_code`, `output_status`). We pick the strongest one with data in the
 * window so the dashboard never silently mixes definitions.
 */
export type SuccessRateSource =
    | 'success_column'
    | 'status_code'
    | 'output_status'
    | null;

export interface MonitorTotals {
    spend_usd: number;
    request_count: number;
    total_tokens: number;
    avg_latency_ms: number | null;
    success_rate_pct: number | null;
    success_rate_source: SuccessRateSource;
    /** True iff at least one signal was determinable across the window. */
    success_rate_available: boolean;
}

export interface CostPerAcceptedOutputPanel {
    cost_per_accepted_output_usd: number | null;
    accepted_count: number;
    total_events_in_window: number;
    events_with_outcome: number;
    outcome_coverage_pct: number;
    status: 'ok' | 'insufficient_outcome_data';
    thresholds: typeof COST_PER_ACCEPTED_OUTPUT_THRESHOLDS;
}

export interface EvidenceCoveragePanel {
    with_evidence_bundle: number;
    missing_evidence_bundle: number;
    with_evidence_bundle_pct: number;
}

export interface AttributionFieldStat {
    field: AttributionField;
    present: number;
    missing: number;
    present_pct: number;
}

export interface AttributionCompletenessPanel {
    total_events: number;
    fields: AttributionFieldStat[];
}

export interface OutcomeCompletenessPanel {
    total_events: number;
    events_with_outcome: number;
    outcome_coverage_pct: number;
}

export interface MonitorOverviewResponse {
    period: { since: string; until: string; window_days: number };
    filters_applied: MonitorFilters;
    totals: MonitorTotals;
    spend_by_department: GroupSpendRow[];
    spend_by_employee: GroupSpendRow[];
    spend_by_workflow: GroupSpendRow[];
    spend_by_customer: GroupSpendRow[];
    spend_by_feature: GroupSpendRow[];
    spend_by_provider_model: ProviderModelSpendRow[];
    cost_per_accepted_output: CostPerAcceptedOutputPanel;
    evidence_coverage: EvidenceCoveragePanel;
    attribution_completeness: AttributionCompletenessPanel;
    outcome_completeness: OutcomeCompletenessPanel;
    privacy_mode_distribution: PrivacyModeRow[];
    privacy_note: string;
}
