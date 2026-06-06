/**
 * Slice 3J — Outcome capture foundation.
 *
 * Single source of truth for outcome semantics:
 *
 *   - V5 §8.3 canonical statuses (what Optimize and Prove read).
 *   - The transitional DB-level CHECK superset that v2_054 installs
 *     (the table physically accepts the V5 list PLUS the legacy values
 *     `retried` and `human_reviewed`).
 *   - Legacy normalization: rows written as `retried` / `human_reviewed`
 *     are folded into the V5 vocabulary on read; the legacy value is
 *     preserved as `legacy_status` so downstream readers can audit.
 *   - The content-bearing field allow-list-reject used by the writer.
 *   - The canonical source enum; existing free-text source values stay
 *     accepted but are tagged in metadata.
 *
 * This file is read by:
 *   - app/api/v2/outcomes/route.ts (writer)
 *   - app/api/v2/prove/outcomes/[request_id]/route.ts (Prove GET)
 *   - lib/prove/event-detail.ts (join into event detail response)
 *
 * NO content fields (prompt, response, messages, completion, body, etc.)
 * are ever referenced here.
 */

// ─────────────────────────────────────────────────────────────────────────
// V5 canonical vocabulary
// ─────────────────────────────────────────────────────────────────────────

/** V5 §8.3 outcome statuses — the surface Prove and Optimize will read. */
export const CANONICAL_OUTCOME_STATUSES = [
    'accepted',
    'rejected',
    'revised',
    'escalated',
    'failed',
    'pending_review',
    'unknown',
] as const;
export type CanonicalOutcomeStatus = (typeof CANONICAL_OUTCOME_STATUSES)[number];

/** Legacy values still allowed by the DB CHECK after v2_054 ships. */
export const LEGACY_OUTCOME_STATUSES = ['retried', 'human_reviewed'] as const;
export type LegacyOutcomeStatus = (typeof LEGACY_OUTCOME_STATUSES)[number];

/** Transitional superset the DB physically accepts. */
export const STORED_OUTCOME_STATUSES = [
    ...CANONICAL_OUTCOME_STATUSES,
    ...LEGACY_OUTCOME_STATUSES,
] as const;
export type StoredOutcomeStatus = (typeof STORED_OUTCOME_STATUSES)[number];

export const STORED_OUTCOME_STATUS_SET: ReadonlySet<string> = new Set(STORED_OUTCOME_STATUSES);
export const CANONICAL_OUTCOME_STATUS_SET: ReadonlySet<string> = new Set(CANONICAL_OUTCOME_STATUSES);

// ─────────────────────────────────────────────────────────────────────────
// Source vocabulary
// ─────────────────────────────────────────────────────────────────────────

/**
 * Canonical source enum the brief specifies. We do NOT hard-reject other
 * source strings from the existing /api/v2/outcomes endpoint (Decision 4
 * — backward compatibility). The route tags non-canonical sources via
 * metadata.legacy_source so a future deprecation can act on the data.
 */
export const CANONICAL_OUTCOME_SOURCES = [
    'user_feedback',
    'application_callback',
    'human_review',
    'evaluator',
    'sdk',
    'import',
] as const;
export type CanonicalOutcomeSource = (typeof CANONICAL_OUTCOME_SOURCES)[number];

export const CANONICAL_SOURCE_SET: ReadonlySet<string> = new Set(CANONICAL_OUTCOME_SOURCES);

export function isCanonicalSource(value: string): value is CanonicalOutcomeSource {
    return CANONICAL_SOURCE_SET.has(value);
}

// ─────────────────────────────────────────────────────────────────────────
// Content-bearing field rejection
// ─────────────────────────────────────────────────────────────────────────

/**
 * Top-level body keys AND metadata keys that the writer MUST NOT accept.
 * Surfaced as a const so route tests can prove every name listed here
 * survives a regression that "simplifies" the allow-list.
 */
export const FORBIDDEN_CONTENT_FIELDS = [
    'prompt', 'prompts',
    'response', 'responses',
    'messages',
    'completion',
    'content',
    'text',
    'file', 'files',
    'document', 'documents',
    'chat', 'chat_history',
    'transcript',
    'request_body', 'response_body',
    'raw_trace',
    'stored_content',
] as const;
export const FORBIDDEN_CONTENT_FIELD_SET: ReadonlySet<string> = new Set(FORBIDDEN_CONTENT_FIELDS);

export interface ForbiddenScan {
    found: boolean;
    /** First forbidden key path encountered. Used for the 400 error detail. */
    field?: string;
}

/**
 * Walk a payload looking for forbidden content keys at the top level
 * AND inside an optional `metadata` object. Does NOT recurse arbitrarily
 * deep — outcomes are flat envelopes and metadata is a one-level JSONB
 * bag. Recursing further would invite DoS from hostile nested payloads.
 */
export function scanForForbiddenFields(body: Record<string, unknown> | null | undefined): ForbiddenScan {
    if (!body || typeof body !== 'object') return { found: false };
    for (const key of Object.keys(body)) {
        if (FORBIDDEN_CONTENT_FIELD_SET.has(key)) return { found: true, field: key };
    }
    const meta = body.metadata;
    if (meta && typeof meta === 'object' && !Array.isArray(meta)) {
        for (const key of Object.keys(meta as Record<string, unknown>)) {
            if (FORBIDDEN_CONTENT_FIELD_SET.has(key)) return { found: true, field: `metadata.${key}` };
        }
    }
    return { found: false };
}

// ─────────────────────────────────────────────────────────────────────────
// Normalization for reads
// ─────────────────────────────────────────────────────────────────────────

/**
 * What the canonical reader returns.
 *   - status: the V5 canonical value
 *   - legacy_status: present iff the stored value was rewritten
 *
 * Mapping:
 *   retried        -> revised   (legacy_status: 'retried')
 *   human_reviewed -> accepted  (legacy_status: 'human_reviewed')
 *   everything else passes through verbatim
 */
export interface NormalizedStatus {
    status: CanonicalOutcomeStatus;
    legacy_status: LegacyOutcomeStatus | null;
}

export function normalizeStoredStatus(stored: string): NormalizedStatus {
    switch (stored) {
        case 'retried':
            return { status: 'revised', legacy_status: 'retried' };
        case 'human_reviewed':
            return { status: 'accepted', legacy_status: 'human_reviewed' };
        case 'accepted': case 'rejected': case 'revised':
        case 'escalated': case 'failed':
        case 'pending_review': case 'unknown':
            return { status: stored as CanonicalOutcomeStatus, legacy_status: null };
        default:
            // The DB CHECK constraint blocks anything else — defensive fall-through.
            return { status: 'unknown', legacy_status: null };
    }
}

// ─────────────────────────────────────────────────────────────────────────
// Read view
// ─────────────────────────────────────────────────────────────────────────

/**
 * Shape exposed by GET /api/v2/prove/outcomes/[request_id] and by the
 * `outcome` slot on the event-detail response. Reader is responsible for
 * calling normalizeStoredStatus before constructing this.
 */
export interface OutcomeView {
    request_id: string;
    /** V5 canonical status — what Prove + Optimize compare on. */
    status: CanonicalOutcomeStatus;
    /** Original stored value when the writer used a legacy enum. */
    legacy_status: LegacyOutcomeStatus | null;
    quality_score: number | null;
    source: string | null;
    /** True iff the source string was in CANONICAL_OUTCOME_SOURCES. */
    source_is_canonical: boolean;
    /** Metadata as stored. The writer already rejected content fields. */
    metadata: Record<string, unknown>;
    created_at: string;
    updated_at: string;
}

// ─────────────────────────────────────────────────────────────────────────
// UI tone map for the Outcome card
// ─────────────────────────────────────────────────────────────────────────

import type { SemanticDescriptor } from '@/app/dashboard/_components/semantic';

/**
 * Tone descriptor for a canonical (or null) outcome status. Mirrors the
 * Slice 3G semantic system; the page wraps this in SemanticBadge.
 */
export function getOutcomeTone(status: CanonicalOutcomeStatus | null): SemanticDescriptor {
    switch (status) {
        case 'accepted':        return { tone: 'green', label: 'accepted',        glyph: '✓' };
        case 'rejected':        return { tone: 'red',   label: 'rejected',        glyph: '✕' };
        case 'revised':         return { tone: 'amber', label: 'revised',         glyph: '~' };
        case 'failed':          return { tone: 'red',   label: 'failed',          glyph: '✕' };
        case 'escalated':       return { tone: 'amber', label: 'escalated',       glyph: '!' };
        case 'pending_review':  return { tone: 'amber', label: 'pending review',  glyph: '?' };
        case 'unknown':         return { tone: 'gray',  label: 'unknown',         glyph: '·' };
        case null:              return { tone: 'gray',  label: 'no outcome recorded', glyph: '·' };
    }
}
