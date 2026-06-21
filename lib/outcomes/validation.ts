import { FORBIDDEN_CONTENT_FIELD_SET } from '@/lib/prove/outcome';
import {
    ALLOWED_METADATA_KEYS,
    MAX_METADATA_JSON_BYTES,
    MAX_METADATA_STRING_LEN,
    OUTCOME_SOURCES,
    OUTCOME_STATUSES,
    OUTCOME_TYPES,
    type AllowedMetadataKey,
    type OutcomeInput,
    type OutcomeStatus,
    type OutcomeType,
} from './types';

/**
 * Forbidden metadata key patterns layered on top of the canonical
 * FORBIDDEN_CONTENT_FIELD_SET in lib/prove/outcome.ts. The set is intentionally
 * broad so that obvious synonyms are also rejected (e.g. prompt_text, *_prompt).
 */
export const FORBIDDEN_METADATA_PATTERNS: RegExp[] = [
    /^prompt(_|$)/i,
    /(_|^)prompt$/i,
    /^response(_|$)/i,
    /(_|^)response$/i,
    /^messages?$/i,
    /^chat(_|$)/i,
    /^raw(_|$)/i,
    /^completion(_|$)/i,
    /^message_content$/i,
];

export class OutcomeValidationError extends Error {
    public readonly code: string;
    public readonly field?: string;
    constructor(code: string, message: string, field?: string) {
        super(message);
        this.code = code;
        if (field !== undefined) this.field = field;
    }
}

const ALLOWED_KEY_SET = new Set<string>(ALLOWED_METADATA_KEYS);

function isAllowedKey(key: string): key is AllowedMetadataKey {
    return ALLOWED_KEY_SET.has(key);
}

function isForbidden(key: string): boolean {
    if (FORBIDDEN_CONTENT_FIELD_SET.has(key)) return true;
    return FORBIDDEN_METADATA_PATTERNS.some((re) => re.test(key));
}

function isValidStatus(value: unknown): value is OutcomeStatus {
    return typeof value === 'string' && (OUTCOME_STATUSES as readonly string[]).includes(value);
}

function isValidType(value: unknown): value is OutcomeType {
    return typeof value === 'string' && (OUTCOME_TYPES as readonly string[]).includes(value);
}

function isValidSource(value: unknown): boolean {
    return typeof value === 'string' && (OUTCOME_SOURCES as readonly string[]).includes(value);
}

function isUuidV4ish(value: unknown): value is string {
    return typeof value === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value);
}

function jsonByteLength(value: unknown): number {
    return Buffer.byteLength(JSON.stringify(value), 'utf8');
}

function sanitizeQualityAxes(raw: unknown): Record<string, number> | null {
    if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return null;
    const out: Record<string, number> = {};
    for (const [k, v] of Object.entries(raw)) {
        if (typeof k !== 'string' || k.length === 0 || k.length > MAX_METADATA_STRING_LEN) continue;
        if (typeof v !== 'number' || !Number.isFinite(v)) continue;
        out[k] = v;
    }
    return out;
}

/**
 * Strips forbidden keys, drops keys not on the allow-list, and bounds string
 * length. Throws OutcomeValidationError if any forbidden key was present
 * (defense in depth — the caller should treat the call as invalid input).
 */
export function sanitizeMetadata(raw: unknown): Record<string, unknown> {
    if (raw == null) return {};
    if (typeof raw !== 'object' || Array.isArray(raw)) {
        throw new OutcomeValidationError('METADATA_INVALID', 'metadata must be an object', 'metadata');
    }

    const forbiddenFound: string[] = [];
    const out: Record<string, unknown> = {};

    for (const [key, value] of Object.entries(raw as Record<string, unknown>)) {
        if (isForbidden(key)) {
            forbiddenFound.push(key);
            continue;
        }
        if (!isAllowedKey(key)) continue;

        switch (key as AllowedMetadataKey) {
            case 'caller_workflow_step':
            case 'caller_role':
            case 'cost_attribution_hint':
            case 'error_class': {
                if (typeof value !== 'string') break;
                if (value.length > MAX_METADATA_STRING_LEN) break;
                out[key] = value;
                break;
            }
            case 'quality_axes': {
                const sanitized = sanitizeQualityAxes(value);
                if (sanitized) out[key] = sanitized;
                break;
            }
            case 'latency_to_acceptance_ms':
            case 'retry_index': {
                if (typeof value !== 'number' || !Number.isFinite(value) || value < 0) break;
                out[key] = Math.floor(value);
                break;
            }
        }
    }

    if (forbiddenFound.length > 0) {
        throw new OutcomeValidationError(
            'METADATA_FORBIDDEN_KEY',
            `metadata contains forbidden keys: ${forbiddenFound.join(', ')}`,
            'metadata',
        );
    }

    if (jsonByteLength(out) > MAX_METADATA_JSON_BYTES) {
        throw new OutcomeValidationError(
            'METADATA_TOO_LARGE',
            `metadata exceeds ${MAX_METADATA_JSON_BYTES} bytes after sanitization`,
            'metadata',
        );
    }

    return out;
}

export interface ValidatedOutcome {
    request_id: string;
    outcome_type: OutcomeType;
    outcome_status: OutcomeStatus;
    quality_score: number | null;
    source: OutcomeInput['source'];
    metadata: Record<string, unknown>;
    occurred_at: string | null;
}

export interface ValidatedContext {
    tenant_id: string;
    reported_by: string;
}

export function validateContext(input: { tenant_id: unknown; reported_by: unknown }): ValidatedContext {
    if (!isUuidV4ish(input.tenant_id)) {
        throw new OutcomeValidationError('TENANT_REQUIRED', 'tenant_id is required and must be a UUID', 'tenant_id');
    }
    if (typeof input.reported_by !== 'string' || input.reported_by.length === 0 || input.reported_by.length > 128) {
        throw new OutcomeValidationError('REPORTED_BY_INVALID', 'reported_by is required (1..128 chars)', 'reported_by');
    }
    return { tenant_id: input.tenant_id, reported_by: input.reported_by };
}

export function validateOutcome(input: unknown): ValidatedOutcome {
    if (!input || typeof input !== 'object' || Array.isArray(input)) {
        throw new OutcomeValidationError('INPUT_INVALID', 'outcome input must be an object');
    }
    const obj = input as Record<string, unknown>;

    if (typeof obj.request_id !== 'string' || obj.request_id.length === 0 || obj.request_id.length > 256) {
        throw new OutcomeValidationError('REQUEST_ID_REQUIRED', 'request_id is required (1..256 chars)', 'request_id');
    }
    if (!isValidType(obj.outcome_type)) {
        throw new OutcomeValidationError('OUTCOME_TYPE_INVALID', `outcome_type must be one of ${OUTCOME_TYPES.join(', ')}`, 'outcome_type');
    }
    if (!isValidStatus(obj.outcome_status)) {
        throw new OutcomeValidationError('OUTCOME_STATUS_INVALID', `outcome_status must be one of ${OUTCOME_STATUSES.join(', ')}`, 'outcome_status');
    }
    if (!isValidSource(obj.source)) {
        throw new OutcomeValidationError('SOURCE_INVALID', `source must be one of ${OUTCOME_SOURCES.join(', ')}`, 'source');
    }

    let qualityScore: number | null = null;
    if (obj.quality_score !== undefined && obj.quality_score !== null) {
        if (typeof obj.quality_score !== 'number' || !Number.isFinite(obj.quality_score) || obj.quality_score < 0 || obj.quality_score > 1) {
            throw new OutcomeValidationError('QUALITY_SCORE_INVALID', 'quality_score must be a number in [0, 1]', 'quality_score');
        }
        qualityScore = obj.quality_score;
    }

    let occurredAt: string | null = null;
    if (obj.occurred_at !== undefined && obj.occurred_at !== null) {
        if (typeof obj.occurred_at !== 'string' || Number.isNaN(Date.parse(obj.occurred_at))) {
            throw new OutcomeValidationError('OCCURRED_AT_INVALID', 'occurred_at must be an ISO timestamp', 'occurred_at');
        }
        occurredAt = new Date(obj.occurred_at).toISOString();
    }

    const metadata = sanitizeMetadata(obj.metadata);

    return {
        request_id: obj.request_id,
        outcome_type: obj.outcome_type,
        outcome_status: obj.outcome_status,
        quality_score: qualityScore,
        source: obj.source as ValidatedOutcome['source'],
        metadata,
        occurred_at: occurredAt,
    };
}

export function rejectClientTenantFields(rawBody: unknown): void {
    if (!rawBody || typeof rawBody !== 'object' || Array.isArray(rawBody)) return;
    const body = rawBody as Record<string, unknown>;
    if ('tenant_id' in body || 'tenantId' in body) {
        throw new OutcomeValidationError(
            'TENANT_FROM_BODY_FORBIDDEN',
            'tenant_id must not be supplied in the request body; it is resolved server-side',
            'tenant_id',
        );
    }
}
