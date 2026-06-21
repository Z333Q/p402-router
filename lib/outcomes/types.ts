/**
 * The full set the DB physically accepts (v2_054 superset = canonical V5
 * statuses + the v2_051 legacy values still permitted during the transition).
 * Kept in lock-step with STORED_OUTCOME_STATUSES in lib/prove/outcome.ts; a
 * regression test in this directory's __tests__ asserts alignment.
 */
export const OUTCOME_STATUSES = [
    'accepted',
    'rejected',
    'revised',
    'escalated',
    'failed',
    'pending_review',
    'unknown',
    'retried',
    'human_reviewed',
] as const;
export type OutcomeStatus = typeof OUTCOME_STATUSES[number];

export const OUTCOME_SOURCES = ['api', 'sdk', 'mcp', 'cli', 'webhook'] as const;
export type OutcomeSource = typeof OUTCOME_SOURCES[number];

export const OUTCOME_TYPES = [
    'request_completion',
    'caller_action',
    'human_review',
    'instrumentation',
] as const;
export type OutcomeType = typeof OUTCOME_TYPES[number];

/**
 * The allow-list of metadata keys. Anything outside this list is dropped at the
 * boundary by `sanitizeMetadata`. Field meanings are defined in 3AT §5.
 */
export const ALLOWED_METADATA_KEYS = [
    'caller_workflow_step',
    'caller_role',
    'quality_axes',
    'latency_to_acceptance_ms',
    'retry_index',
    'error_class',
    'cost_attribution_hint',
] as const;
export type AllowedMetadataKey = typeof ALLOWED_METADATA_KEYS[number];

export const MAX_METADATA_STRING_LEN = 64;
export const MAX_METADATA_JSON_BYTES = 2048;

export interface OutcomeInput {
    request_id: string;
    outcome_type: OutcomeType;
    outcome_status: OutcomeStatus;
    quality_score?: number | null;
    source: OutcomeSource | string | null;
    client_version?: string | null;
    metadata?: Record<string, unknown>;
    occurred_at?: string | null;
}

export interface OutcomeContext {
    tenant_id: string;
    reported_by: string;
}

export interface OutcomeRecord {
    id: string;
    tenant_id: string;
    request_id: string;
    outcome_type: OutcomeType;
    outcome_status: OutcomeStatus;
    quality_score: number | null;
    source: OutcomeSource | string | null;
    metadata: Record<string, unknown>;
    reported_by: string;
    occurred_at: string;
    created_at: string;
    updated_at: string;
}
