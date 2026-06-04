/**
 * Outbox writer for economic_event_write_failures (v2_053).
 *
 * Privacy contract: the outbox payload MUST NEVER contain prompt, response,
 * messages, content, file, document, transcript, chat_history, source code,
 * PHI, PII, secrets, or raw content. The sanitizer in this file is the gate
 * that enforces this. The migration shape test enforces the absence of
 * content-bearing column NAMES; this file enforces the absence of content
 * VALUES inside the payload JSONB.
 *
 * The retry worker (retry-worker.ts) reconstructs an EconomicEventInput from
 * the sanitized payload and replays through writeEconomicEvent — at which
 * point privacy is RE-RESOLVED from the current tenant/scope policy.
 */

import db from '@/lib/db';
import type { EconomicEventInput } from './types';

// ─────────────────────────────────────────────────────────────────────────────
// Allowlisted keys for outbox.payload.
//
// The sanitizer copies ONLY these from the input. Anything else (including
// any future field a caller might add) is dropped. This is allowlist by
// design — the privacy bet is too important to enforce via blocklist.
// ─────────────────────────────────────────────────────────────────────────────
const PAYLOAD_ALLOWED_KEYS = [
    // identity
    'request_id', 'source', 'event_time',
    'api_key_id',
    // ownership
    'owner_type', 'owner_id',
    'department_id', 'employee_id', 'customer_id',
    'project_id',  'feature_id', 'workflow_id',
    // taxonomy
    'task_type', 'action_type',
    // routing
    'provider', 'model_requested', 'model_used',
    // usage
    'input_tokens', 'output_tokens', 'total_tokens',
    'cost_usd', 'direct_cost_usd', 'route_savings_usd', 'cache_savings_usd',
    'retry_cost_usd', 'context_waste_usd',
    'latency_ms', 'cache_hit', 'status_code', 'success',
    // economics
    'revenue_usd', 'gross_margin_pct',
    // governance
    'budget_id', 'policy_id', 'mandate_id',
    'governance_decision', 'deny_code',
    // evidence
    'receipt_id', 'evidence_bundle_id',
    // outcome
    'output_status', 'quality_score', 'human_review_status',
    // privacy directives (RE-RESOLVED at replay time — we only carry the
    // caller's original ask, not the resolved posture). The resolver may
    // narrow further at replay; never widen.
    'privacy_mode_override',
] as const;

// Forbidden top-level metadata keys. If a caller stuffed any of these into
// `metadata`, drop them. Note: the writer NEVER reads `_promptForRedaction`
// or `_responseForRedaction` from an outbox row because those keys are not
// in the allowlist.
const FORBIDDEN_METADATA_KEYS = new Set<string>([
    'prompt', 'prompts',
    'response', 'responses', 'completion', 'completions',
    'messages', 'message', 'content', 'text',
    'file', 'files', 'document', 'documents',
    'chat', 'chat_history', 'transcript',
    'pii', 'phi', 'secret', 'secrets', 'source_code',
    // Bare-defense: also drop the writer's content channels in case a
    // caller put them in `metadata` by mistake.
    '_promptForRedaction', '_responseForRedaction',
]);

export interface SanitizedPayload {
    [key: string]: unknown;
    metadata?: Record<string, unknown>;
}

/**
 * Strip everything from `input` except the allowlisted keys. For `metadata`,
 * iterate keys and drop any that match the forbidden set (case-insensitive).
 *
 * This function MUST be pure and deterministic. The unit test
 * `outbox-privacy-contract.test.ts` calls it with sentinel content and
 * scans the output recursively for the sentinel string.
 */
export function sanitizePayload(input: EconomicEventInput & { metadata?: Record<string, unknown> }): SanitizedPayload {
    const out: SanitizedPayload = {};
    for (const key of PAYLOAD_ALLOWED_KEYS) {
        const v = (input as any)[key];
        if (v !== undefined) out[key] = v;
    }
    if (input.metadata && typeof input.metadata === 'object' && !Array.isArray(input.metadata)) {
        const cleanMeta: Record<string, unknown> = {};
        for (const k of Object.keys(input.metadata)) {
            if (FORBIDDEN_METADATA_KEYS.has(k) || FORBIDDEN_METADATA_KEYS.has(k.toLowerCase())) continue;
            cleanMeta[k] = input.metadata[k];
        }
        if (Object.keys(cleanMeta).length > 0) {
            out.metadata = cleanMeta;
        }
    }
    return out;
}

// ─────────────────────────────────────────────────────────────────────────────
// Error classification
// ─────────────────────────────────────────────────────────────────────────────

export type OutboxErrorCode =
    | 'check_violation'
    | 'unique_violation'
    | 'fk_violation'
    | 'not_null_violation'
    | 'db_unavailable'
    | 'timeout'
    | 'unknown';

interface PgErrLike {
    code?: string;
    message?: string;
}

/**
 * Map a Postgres error code (SQLSTATE) to our structured outbox code.
 * Anything we don't recognize lands as 'unknown' — the message_safe field
 * carries the truncated text for the audit panel.
 */
export function classifyError(err: unknown): OutboxErrorCode {
    if (!err || typeof err !== 'object') return 'unknown';
    const e = err as PgErrLike;
    const code = String(e.code ?? '');
    switch (code) {
        case '23514': return 'check_violation';
        case '23505': return 'unique_violation';
        case '23503': return 'fk_violation';
        case '23502': return 'not_null_violation';
        case '57P03': // cannot_connect_now
        case '08000': case '08003': case '08006': // connection_*
            return 'db_unavailable';
        case '57014': return 'timeout';
    }
    // node-pg sometimes surfaces ECONNREFUSED in the `message`
    const msg = String(e.message ?? '');
    if (/ECONNREFUSED|ETIMEDOUT|connection terminated/i.test(msg)) return 'db_unavailable';
    return 'unknown';
}

/**
 * Build a short, redacted message that's safe to put in error_message_safe.
 *
 * Hard rules:
 *  - Truncate to 256 chars.
 *  - Strip any quoted string the PG error might echo (those can contain
 *    bound parameter values, which could be content-bearing for a
 *    misconfigured caller).
 *  - Strip newlines so a single-line table cell is honest.
 */
export function safeErrorMessage(err: unknown): string {
    const msg = err instanceof Error ? err.message
        : typeof err === 'string' ? err
        : 'unknown error';
    return msg
        .replace(/"[^"]*"/g, '"…"')
        .replace(/'[^']*'/g, "'…'")
        .replace(/\s+/g, ' ')
        .trim()
        .slice(0, 256);
}

// ─────────────────────────────────────────────────────────────────────────────
// Outbox writer
// ─────────────────────────────────────────────────────────────────────────────

const RETRY_DELAY_MINUTES = [1, 5, 15, 60, 360, 1440, 4320] as const;  // 1m, 5m, 15m, 1h, 6h, 24h, 72h
export const MAX_RETRY_COUNT = RETRY_DELAY_MINUTES.length;

export function nextRetryAt(retryCount: number, now = new Date()): Date {
    const idx = Math.min(retryCount, RETRY_DELAY_MINUTES.length - 1);
    const delayMinutes = RETRY_DELAY_MINUTES[idx]!;
    return new Date(now.getTime() + delayMinutes * 60 * 1000);
}

export interface RecordFailureArgs {
    tenantId: string;
    source: string;                            // 'chat_completions' | 'meter_only' | 'retry_worker'
    route?: string;                            // HTTP path or internal call site
    input: EconomicEventInput & { metadata?: Record<string, unknown> };
    error: unknown;
}

/**
 * Write a failure row. UPSERTs on (tenant_id, request_id); a repeat failure
 * for the same request increments retry_count and bumps next_retry_at.
 *
 * Throws if the outbox INSERT itself fails — at that point we've exhausted
 * the durable path and the caller logs as a last resort. In practice the
 * outbox table is far more available than ai_economic_events because the
 * INSERT has no CHECK constraints on policy fields.
 */
export async function recordWriteFailure(args: RecordFailureArgs): Promise<{ id: string; retryCount: number }> {
    const { tenantId, source, route, input, error } = args;
    const errorCode = classifyError(error);
    const errorMessageSafe = safeErrorMessage(error);
    const payload = sanitizePayload(input);

    const next = nextRetryAt(0);

    const res = await db.query(
        `INSERT INTO economic_event_write_failures
            (tenant_id, request_id, source, route, error_code, error_message_safe,
             retry_count, status, next_retry_at, payload)
         VALUES ($1, $2, $3, $4, $5, $6, 0, 'pending', $7, $8::jsonb)
         ON CONFLICT (tenant_id, request_id) DO UPDATE SET
            retry_count        = economic_event_write_failures.retry_count + 1,
            error_code         = EXCLUDED.error_code,
            error_message_safe = EXCLUDED.error_message_safe,
            source             = EXCLUDED.source,
            route              = COALESCE(EXCLUDED.route, economic_event_write_failures.route),
            -- Bump next_retry_at using the NEW retry_count value (which is
            -- the prior count + 1 after the UPDATE clause above).
            next_retry_at      = NOW() + (
                CASE LEAST(economic_event_write_failures.retry_count + 1, 6)
                    WHEN 0 THEN INTERVAL '1 minute'
                    WHEN 1 THEN INTERVAL '5 minutes'
                    WHEN 2 THEN INTERVAL '15 minutes'
                    WHEN 3 THEN INTERVAL '1 hour'
                    WHEN 4 THEN INTERVAL '6 hours'
                    WHEN 5 THEN INTERVAL '24 hours'
                    ELSE INTERVAL '72 hours'
                END
            ),
            -- Replace the payload — the most recent attempt's view of the
            -- event is what the retry worker should replay.
            payload            = EXCLUDED.payload,
            status             = CASE
                WHEN economic_event_write_failures.retry_count + 1 >= ${MAX_RETRY_COUNT - 1}
                    THEN 'abandoned'
                ELSE 'pending'
            END,
            updated_at         = NOW()
         RETURNING id, retry_count`,
        [
            tenantId,
            input.request_id,
            source,
            route ?? null,
            errorCode,
            errorMessageSafe,
            next,
            JSON.stringify(payload),
        ],
    );
    const row = res.rows[0] ?? {};
    return { id: String(row.id), retryCount: Number(row.retry_count ?? 0) };
}
