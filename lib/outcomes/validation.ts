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

function isValidStrictSource(value: unknown): boolean {
    return typeof value === 'string' && (OUTCOME_SOURCES as readonly string[]).includes(value);
}

function isValidFreeformSource(value: unknown): value is string {
    return typeof value === 'string' && value.length > 0 && value.length <= 64;
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
 * Strips forbidden keys, validates allow-listed keys with type-specific
 * sanitization, and bounds total JSON size. Throws OutcomeValidationError if
 * any forbidden key was present (defense in depth — the caller should treat
 * the call as invalid input).
 *
 * Options:
 *   allowUnknownKeys (default false) — when true, keys outside
 *   ALLOWED_METADATA_KEYS are passed through unchanged (still subject to the
 *   forbidden-key reject and the byte-size ceiling). Used by the legacy
 *   /api/v2/outcomes route to preserve the slice 3J free-form passthrough.
 *   When false, unknown keys are silently dropped (3AT §5 strict allow-list).
 */
export function sanitizeMetadata(
    raw: unknown,
    options: { allowUnknownKeys?: boolean } = {},
): Record<string, unknown> {
    if (raw == null) return {};
    if (typeof raw !== 'object' || Array.isArray(raw)) {
        throw new OutcomeValidationError('METADATA_INVALID', 'metadata must be an object', 'metadata');
    }
    const allowUnknown = options.allowUnknownKeys ?? false;

    const forbiddenFound: string[] = [];
    const out: Record<string, unknown> = {};

    for (const [key, value] of Object.entries(raw as Record<string, unknown>)) {
        if (isForbidden(key)) {
            forbiddenFound.push(key);
            continue;
        }
        if (!isAllowedKey(key)) {
            if (allowUnknown) out[key] = value;
            continue;
        }

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
    source: string | null;
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

export function validateOutcome(
    input: unknown,
    options: { allowUnknownMetadataKeys?: boolean; allowFreeformSource?: boolean } = {},
): ValidatedOutcome {
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
    let validatedSource: string | null;
    if (options.allowFreeformSource) {
        // Legacy /api/v2/outcomes contract: any valid string source is kept,
        // null/non-string sources are persisted as null. The route is
        // responsible for adding metadata.legacy_source for non-canonical
        // values (this validator preserves the caller's string as-is).
        if (obj.source == null) {
            validatedSource = null;
        } else if (isValidFreeformSource(obj.source)) {
            validatedSource = obj.source;
        } else {
            // Non-string or out-of-range string: persist null and continue
            // (mirrors slice 3J's silent clamp behavior).
            validatedSource = null;
        }
    } else {
        if (!isValidStrictSource(obj.source)) {
            throw new OutcomeValidationError('SOURCE_INVALID', `source must be one of ${OUTCOME_SOURCES.join(', ')}`, 'source');
        }
        validatedSource = obj.source as string;
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

    const metadata = sanitizeMetadata(obj.metadata, { allowUnknownKeys: options.allowUnknownMetadataKeys });

    return {
        request_id: obj.request_id,
        outcome_type: obj.outcome_type,
        outcome_status: obj.outcome_status,
        quality_score: qualityScore,
        source: validatedSource,
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
