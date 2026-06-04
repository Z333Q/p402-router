// Types for the canonical ai_economic_events ledger (v2_052).
// One row per AI action. Privacy fields are present from day one.

export type PrivacyMode =
    | 'metadata_only'
    | 'fingerprint_only'
    | 'redacted_trace'
    | 'private_gateway'
    | 'full_trace';

export const PRIVACY_MODES: ReadonlySet<PrivacyMode> = new Set<PrivacyMode>([
    'metadata_only', 'fingerprint_only', 'redacted_trace', 'private_gateway', 'full_trace',
]);

export type Scope =
    | 'tenant' | 'department' | 'employee' | 'workflow' | 'project'
    | 'agent' | 'customer' | 'feature' | 'api_key';

export const SCOPES: ReadonlySet<Scope> = new Set<Scope>([
    'tenant', 'department', 'employee', 'workflow', 'project',
    'agent', 'customer', 'feature', 'api_key',
]);

export type GovernanceDecision =
    | 'approved' | 'denied' | 'warned' | 'requires_review'
    | 'settlement_required' | 'settled' | 'receipt_reused' | 'cached' | 'optimized';

export type OutputStatus =
    | 'accepted' | 'rejected' | 'revised' | 'escalated'
    | 'failed' | 'pending_review' | 'unknown';

export type HumanReviewStatus =
    | 'not_required' | 'required' | 'pending'
    | 'approved' | 'rejected' | 'escalated' | 'expired';

export interface EffectivePrivacy {
    privacyMode: PrivacyMode;
    storePrompts: boolean;
    storeResponses: boolean;
    requireRedaction: boolean;
    retentionDays: number;
    /**
     * Which row was used to resolve the mode, useful for the event detail
     * page to explain "metadata_only inherited from tenant default" vs
     * "redacted_trace from department override".
     */
    source: 'system_default' | 'tenant_default' | 'scope_override';
    sourceScope?: Scope;
    sourceScopeId?: string;
}

/**
 * Input shape for writeEconomicEvent. Mirrors the V5 §8.1 canonical fields
 * but allows callers to omit anything they don't have. The writer fills in
 * defaults (privacy_mode from resolveTenantPrivacy, retention_expires_at
 * from retention_days, total_tokens from input+output, etc.).
 *
 * Hosted-routing callers (chat/completions) can pass the prompt/response
 * via `_promptForRedaction` / `_responseForRedaction` for the writer to
 * hash/redact according to privacy_mode. These fields are NEVER persisted
 * directly; they are consumed by the writer and discarded.
 */
export interface EconomicEventInput {
    request_id: string;
    source?: string;
    event_time?: Date;

    api_key_id?: string | null;

    owner_type?: Scope | null;
    owner_id?: string | null;
    department_id?: string | null;
    employee_id?: string | null;
    customer_id?: string | null;
    project_id?: string | null;
    feature_id?: string | null;
    workflow_id?: string | null;

    task_type?: string | null;
    action_type?: string | null;

    provider?: string | null;
    model_requested?: string | null;
    model_used?: string | null;

    input_tokens?: number;
    output_tokens?: number;
    total_tokens?: number;
    cost_usd?: number;
    direct_cost_usd?: number;
    route_savings_usd?: number;
    cache_savings_usd?: number;
    retry_cost_usd?: number;
    context_waste_usd?: number;
    latency_ms?: number | null;
    cache_hit?: boolean;
    status_code?: number | null;
    success?: boolean | null;

    revenue_usd?: number | null;
    gross_margin_pct?: number | null;

    budget_id?: string | null;
    policy_id?: string | null;
    mandate_id?: string | null;
    governance_decision?: GovernanceDecision | null;
    deny_code?: string | null;

    receipt_id?: string | null;
    evidence_bundle_id?: string | null;

    output_status?: OutputStatus | null;
    quality_score?: number | null;
    human_review_status?: HumanReviewStatus | null;

    // Privacy: caller may force a stricter mode than the tenant default
    // (e.g. a public demo request that should never expose content).
    privacy_mode_override?: PrivacyMode;

    // Optional content the writer hashes/redacts under the resolved
    // privacy mode. NEVER persisted as-is.
    _promptForRedaction?: string;
    _responseForRedaction?: string;

    // Originating HTTP/internal call site. NEVER written to
    // ai_economic_events; consumed only by the outbox so the audit panel
    // can answer "which surface failed". Examples:
    //   '/api/v2/chat/completions'
    //   '/api/v2/meter/events'
    //   '/api/internal/cron/economic-events/retry'
    _route?: string;

    metadata?: Record<string, unknown>;
}

export interface EconomicEventRow {
    id: string;
    request_id: string;
    tenant_id: string;
    api_key_id: string | null;
    source: string;
    event_time: string;

    owner_type: string | null;
    owner_id: string | null;
    department_id: string | null;
    employee_id: string | null;
    customer_id: string | null;
    project_id: string | null;
    feature_id: string | null;
    workflow_id: string | null;

    task_type: string | null;
    action_type: string | null;

    provider: string | null;
    model_requested: string | null;
    model_used: string | null;

    input_tokens: number;
    output_tokens: number;
    total_tokens: number;
    cost_usd: string;
    direct_cost_usd: string;
    route_savings_usd: string;
    cache_savings_usd: string;
    retry_cost_usd: string;
    context_waste_usd: string;
    latency_ms: number | null;
    cache_hit: boolean;
    status_code: number | null;
    success: boolean | null;

    revenue_usd: string | null;
    gross_margin_pct: string | null;

    budget_id: string | null;
    policy_id: string | null;
    mandate_id: string | null;
    governance_decision: GovernanceDecision | null;
    deny_code: string | null;

    receipt_id: string | null;
    evidence_bundle_id: string | null;

    output_status: OutputStatus | null;
    quality_score: string | null;
    human_review_status: HumanReviewStatus | null;

    privacy_mode: PrivacyMode;
    prompt_stored: boolean;
    response_stored: boolean;
    prompt_fingerprint: string | null;
    response_fingerprint: string | null;
    redaction_applied: boolean;
    retention_expires_at: string | null;

    metadata: Record<string, unknown>;
    created_at: string;
    updated_at: string;
}
