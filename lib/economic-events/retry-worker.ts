/**
 * Retry worker for the v2_053 economic_event_write_failures outbox.
 *
 * Replays a single pending row through writeEconomicEvent. Privacy is
 * RE-RESOLVED at replay time — the original attempt may have happened
 * under a different tenant_privacy_settings / privacy_scope_overrides
 * state, but the row that ultimately lands in ai_economic_events MUST
 * respect the CURRENT policy. This is the V5 widening rule from the
 * replay side: an admin who tightens privacy after a failure was logged
 * but before retry should see the tightened posture on the replayed row.
 *
 * The worker never logs payload contents to console. If the replay fails
 * again, the outbox row is bumped to the next retry slot (or 'abandoned'
 * at MAX_RETRY_COUNT). The original attempt's content (prompt/response)
 * was never persisted to the outbox, so there is nothing for the worker
 * to leak.
 */

import db from '@/lib/db';
import { writeEconomicEvent, EconomicEventDeferredError } from './writer';
import {
    classifyError,
    safeErrorMessage,
    MAX_RETRY_COUNT,
} from './outbox';
import type { EconomicEventInput, PrivacyMode } from './types';
import { PRIVACY_MODES } from './types';

export interface PendingOutboxRow {
    id: string;
    tenant_id: string;
    request_id: string;
    source: string;
    route: string | null;
    error_code: string;
    error_message_safe: string | null;
    retry_count: number;
    next_retry_at: string;
    payload: Record<string, unknown> | string;
}

export interface ReplayResult {
    id: string;
    request_id: string;
    outcome: 'resolved' | 'retried' | 'abandoned';
    /** Structured code from the latest attempt (if any). */
    last_error_code: string | null;
}

/**
 * Reconstruct an EconomicEventInput from the sanitized outbox payload.
 *
 * The payload was produced by sanitizePayload() at recordWriteFailure time,
 * so we know it contains only allowlisted keys. We still defensively widen
 * unknown fields to undefined here.
 *
 * Privacy: this function NEVER reads `_promptForRedaction` or
 * `_responseForRedaction` from the payload — those keys are forbidden in
 * the outbox by construction. The retry MUST NOT attempt to re-fingerprint
 * content that was never persisted; metadata-only replay is the contract.
 */
export function inputFromPayload(
    payload: Record<string, unknown>,
): EconomicEventInput {
    const get = <T,>(key: string): T | undefined =>
        payload[key] !== undefined ? (payload[key] as T) : undefined;

    const override = get<string>('privacy_mode_override');
    const safeOverride = override && PRIVACY_MODES.has(override as PrivacyMode)
        ? (override as PrivacyMode)
        : undefined;

    return {
        request_id: String(payload.request_id ?? ''),
        source:     get<string>('source'),
        api_key_id: get<string | null>('api_key_id') ?? null,

        owner_type: get<any>('owner_type') ?? null,
        owner_id:        get<string | null>('owner_id')       ?? null,
        department_id:   get<string | null>('department_id')  ?? null,
        employee_id:     get<string | null>('employee_id')    ?? null,
        customer_id:     get<string | null>('customer_id')    ?? null,
        project_id:      get<string | null>('project_id')     ?? null,
        feature_id:      get<string | null>('feature_id')     ?? null,
        workflow_id:     get<string | null>('workflow_id')    ?? null,

        task_type:   get<string | null>('task_type')   ?? null,
        action_type: get<string | null>('action_type') ?? null,

        provider:        get<string | null>('provider')        ?? null,
        model_requested: get<string | null>('model_requested') ?? null,
        model_used:      get<string | null>('model_used')      ?? null,

        input_tokens:      Number(get<number>('input_tokens')  ?? 0),
        output_tokens:     Number(get<number>('output_tokens') ?? 0),
        total_tokens:      get<number>('total_tokens'),
        cost_usd:          Number(get<number>('cost_usd')          ?? 0),
        direct_cost_usd:   Number(get<number>('direct_cost_usd')   ?? 0),
        route_savings_usd: Number(get<number>('route_savings_usd') ?? 0),
        cache_savings_usd: Number(get<number>('cache_savings_usd') ?? 0),
        retry_cost_usd:    Number(get<number>('retry_cost_usd')    ?? 0),
        context_waste_usd: Number(get<number>('context_waste_usd') ?? 0),
        latency_ms:    (get<number | null>('latency_ms')   ?? null),
        cache_hit:     !!(get<boolean>('cache_hit') ?? false),
        status_code:   (get<number | null>('status_code')  ?? null),
        success:       (get<boolean | null>('success')     ?? null),

        revenue_usd:      (get<number | null>('revenue_usd')      ?? null),
        gross_margin_pct: (get<number | null>('gross_margin_pct') ?? null),

        budget_id:           get<string | null>('budget_id')           ?? null,
        policy_id:           get<string | null>('policy_id')           ?? null,
        mandate_id:          get<string | null>('mandate_id')          ?? null,
        governance_decision: get<any>('governance_decision')           ?? null,
        deny_code:           get<string | null>('deny_code')           ?? null,

        receipt_id:         get<string | null>('receipt_id')         ?? null,
        evidence_bundle_id: get<string | null>('evidence_bundle_id') ?? null,

        output_status:       get<any>('output_status')                  ?? null,
        quality_score:       get<number | null>('quality_score')        ?? null,
        human_review_status: get<any>('human_review_status')            ?? null,

        privacy_mode_override: safeOverride,

        metadata: (payload.metadata && typeof payload.metadata === 'object')
            ? (payload.metadata as Record<string, unknown>)
            : undefined,
    };
}

const RETRY_DELAY_MINUTES = [1, 5, 15, 60, 360, 1440, 4320];

function nextDelayMinutes(retryCount: number): number {
    const idx = Math.min(retryCount, RETRY_DELAY_MINUTES.length - 1);
    return RETRY_DELAY_MINUTES[idx]!;
}

/**
 * Replay a single pending outbox row. The privacy posture is re-resolved
 * inside writeEconomicEvent — this function does NOT cache or override it.
 */
export async function replayOutboxRow(row: PendingOutboxRow): Promise<ReplayResult> {
    const payload: Record<string, unknown> = typeof row.payload === 'string'
        ? safeJsonParse(row.payload)
        : (row.payload ?? {});

    const input = inputFromPayload(payload);
    // Defensive: even if a bad row somehow has _promptForRedaction in
    // payload, the inputFromPayload allowlist drops it. Re-assert here so
    // a future refactor cannot regress the contract.
    delete (input as any)._promptForRedaction;
    delete (input as any)._responseForRedaction;
    // Preserve the originating route so a re-failure on replay does not
    // overwrite "where did this event come from" with the cron path.
    // recordWriteFailure UPSERTs route via COALESCE — first non-null wins,
    // but for completeness we forward it explicitly here. If the original
    // row predates route capture (route IS NULL), fall back to the cron
    // path so the audit panel still has a usable value.
    input._route = row.route ?? '/api/internal/cron/economic-events/retry';

    try {
        const result = await writeEconomicEvent(row.tenant_id, input);
        // Success — mark resolved.
        await db.query(
            `UPDATE economic_event_write_failures
                SET status = 'resolved',
                    updated_at = NOW()
              WHERE id = $1`,
            [row.id],
        );
        return {
            id: row.id,
            request_id: row.request_id,
            outcome: 'resolved',
            last_error_code: null,
        };
    } catch (e) {
        // EconomicEventDeferredError means the replay ALSO failed and the
        // writer already bumped the outbox row via recordWriteFailure
        // (which UPSERTs and increments retry_count). We don't need to
        // touch the row here.
        if ((e as any)?.name === 'EconomicEventDeferredError') {
            // Read back the updated row to report the outcome.
            const r = await db.query(
                `SELECT retry_count, status, error_code
                   FROM economic_event_write_failures
                   WHERE id = $1`,
                [row.id],
            );
            const updated = r.rows[0] ?? {};
            const outcome: ReplayResult['outcome'] =
                String(updated.status) === 'abandoned' ? 'abandoned' : 'retried';
            return {
                id: row.id,
                request_id: row.request_id,
                outcome,
                last_error_code: String(updated.error_code ?? 'unknown'),
            };
        }

        // Unexpected error path — bump the row directly so the replay is
        // not lost. This branch is rare because writer.ts catches its own
        // PG failures and routes them through recordWriteFailure.
        const errCode = classifyError(e);
        const errMsg  = safeErrorMessage(e);
        const newCount = row.retry_count + 1;
        const status   = newCount >= MAX_RETRY_COUNT - 1 ? 'abandoned' : 'pending';
        const delay    = nextDelayMinutes(newCount);
        await db.query(
            `UPDATE economic_event_write_failures
                SET retry_count        = $2,
                    status             = $3,
                    error_code         = $4,
                    error_message_safe = $5,
                    next_retry_at      = NOW() + ($6::int * INTERVAL '1 minute'),
                    updated_at         = NOW()
              WHERE id = $1`,
            [row.id, newCount, status, errCode, errMsg, delay],
        );
        return {
            id: row.id,
            request_id: row.request_id,
            outcome: status === 'abandoned' ? 'abandoned' : 'retried',
            last_error_code: errCode,
        };
    }
}

function safeJsonParse(s: string): Record<string, unknown> {
    try {
        const v = JSON.parse(s);
        return v && typeof v === 'object' && !Array.isArray(v) ? v : {};
    } catch {
        return {};
    }
}

// Re-export the deferred-error class so callers can identify it without
// importing from writer.ts directly.
export { EconomicEventDeferredError };
