export const OUTCOME_STATUSES = [
    'accepted',
    'rejected',
    'retried',
    'escalated',
    'human_reviewed',
    'failed',
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
    source: OutcomeSource;
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
    source: OutcomeSource;
    metadata: Record<string, unknown>;
    reported_by: string;
    occurred_at: string;
    created_at: string;
    updated_at: string;
}
