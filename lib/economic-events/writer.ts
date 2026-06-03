// writeEconomicEvent — writes one row to ai_economic_events.
//
// Hard rules:
//   - privacy_mode is resolved from tenant_privacy_settings + scope overrides.
//   - In `metadata_only` mode the writer NEVER persists prompt/response
//     content. The _promptForRedaction / _responseForRedaction inputs are
//     dropped on the floor.
//   - In `fingerprint_only` mode the writer hashes content with HMAC + the
//     tenant secret (never plain SHA-256).
//   - In `redacted_trace` mode the writer expects the caller to have already
//     run PII/PHI/secret redaction. It stamps redaction_applied=true. The
//     writer does NOT run redaction itself; redaction is policy-bearing and
//     belongs in the caller or a dedicated `lib/economic-events/redact.ts`.
//   - In `full_trace` mode (tenant opt-in only) the writer persists prompt
//     and response content. Even here, retention_expires_at is respected.
//   - retention_expires_at is stamped from the resolved retention_days.
//
// The writer is non-blocking by convention: callers should fire and not
// await unless they need the returned row id.

import db from '@/lib/db';
import {
    resolveTenantPrivacy,
    fingerprintContent,
    retentionExpiry,
} from './privacy';
import type {
    EconomicEventInput,
    EconomicEventRow,
    EffectivePrivacy,
    Scope,
} from './types';

export interface WriteResult {
    id: string;
    request_id: string;
    privacy: EffectivePrivacy;
    prompt_stored: boolean;
    response_stored: boolean;
    redaction_applied: boolean;
    retention_expires_at: Date;
}

function decideStorage(
    effective: EffectivePrivacy,
    input: EconomicEventInput,
): { promptStored: boolean; responseStored: boolean; redactionApplied: boolean } {
    switch (effective.privacyMode) {
        case 'metadata_only':
        case 'fingerprint_only':
        case 'private_gateway':
            return { promptStored: false, responseStored: false, redactionApplied: false };
        case 'redacted_trace':
            // Caller is expected to have applied redaction. Mark it as such.
            // If no content was provided, no storage happens.
            return {
                promptStored: !!input._promptForRedaction && effective.storePrompts,
                responseStored: !!input._responseForRedaction && effective.storeResponses,
                redactionApplied: !!(input._promptForRedaction || input._responseForRedaction),
            };
        case 'full_trace':
            return {
                promptStored: !!input._promptForRedaction && effective.storePrompts,
                responseStored: !!input._responseForRedaction && effective.storeResponses,
                redactionApplied: false,
            };
    }
}

function maybeFingerprint(
    tenantId: string,
    effective: EffectivePrivacy,
    content: string | undefined,
): string | null {
    if (!content) return null;
    if (effective.privacyMode === 'fingerprint_only') {
        return fingerprintContent(tenantId, content);
    }
    return null;
}

export async function writeEconomicEvent(
    tenantId: string,
    input: EconomicEventInput,
): Promise<WriteResult> {
    // 1. Resolve effective privacy posture using scope candidates from input.
    const scope: { type: Scope; id: string }[] = [];
    // Most-specific-first ordering.
    if (input.api_key_id)    scope.push({ type: 'api_key',    id: input.api_key_id });
    if (input.employee_id)   scope.push({ type: 'employee',   id: input.employee_id });
    if (input.department_id) scope.push({ type: 'department', id: input.department_id });
    if (input.customer_id)   scope.push({ type: 'customer',   id: input.customer_id });
    if (input.workflow_id)   scope.push({ type: 'workflow',   id: input.workflow_id });
    if (input.feature_id)    scope.push({ type: 'feature',    id: input.feature_id });
    if (input.project_id)    scope.push({ type: 'project',    id: input.project_id });

    const privacy = await resolveTenantPrivacy(tenantId, {
        scope,
        override: input.privacy_mode_override,
    });

    const storage = decideStorage(privacy, input);
    const promptFingerprint   = maybeFingerprint(tenantId, privacy, input._promptForRedaction);
    const responseFingerprint = maybeFingerprint(tenantId, privacy, input._responseForRedaction);
    const expiresAt = retentionExpiry(privacy.retentionDays);

    // total_tokens default = input + output if caller didn't supply it.
    const inputTokens  = input.input_tokens  ?? 0;
    const outputTokens = input.output_tokens ?? 0;
    const totalTokens  = input.total_tokens  ?? (inputTokens + outputTokens);

    const res = await db.query(
        `INSERT INTO ai_economic_events (
            request_id, tenant_id, api_key_id, source, event_time,
            owner_type, owner_id, department_id, employee_id, customer_id,
            project_id, feature_id, workflow_id,
            task_type, action_type,
            provider, model_requested, model_used,
            input_tokens, output_tokens, total_tokens,
            cost_usd, direct_cost_usd, route_savings_usd, cache_savings_usd,
            retry_cost_usd, context_waste_usd,
            latency_ms, cache_hit, status_code, success,
            revenue_usd, gross_margin_pct,
            budget_id, policy_id, mandate_id, governance_decision, deny_code,
            receipt_id, evidence_bundle_id,
            output_status, quality_score, human_review_status,
            privacy_mode, prompt_stored, response_stored,
            prompt_fingerprint, response_fingerprint,
            redaction_applied, retention_expires_at,
            metadata
         ) VALUES (
            $1,$2,$3,$4,$5,
            $6,$7,$8,$9,$10,
            $11,$12,$13,
            $14,$15,
            $16,$17,$18,
            $19,$20,$21,
            $22,$23,$24,$25,
            $26,$27,
            $28,$29,$30,$31,
            $32,$33,
            $34,$35,$36,$37,$38,
            $39,$40,
            $41,$42,$43,
            $44,$45,$46,
            $47,$48,
            $49,$50,
            $51
         )
         ON CONFLICT (tenant_id, request_id) DO UPDATE SET
            -- partial-write contract: an UPSERT may merge later fields
            -- (e.g. outcome status, evidence bundle id) without losing
            -- previously-recorded ones.
            cost_usd        = EXCLUDED.cost_usd,
            total_tokens    = EXCLUDED.total_tokens,
            governance_decision = COALESCE(EXCLUDED.governance_decision, ai_economic_events.governance_decision),
            output_status   = COALESCE(EXCLUDED.output_status, ai_economic_events.output_status),
            quality_score   = COALESCE(EXCLUDED.quality_score, ai_economic_events.quality_score),
            evidence_bundle_id = COALESCE(EXCLUDED.evidence_bundle_id, ai_economic_events.evidence_bundle_id),
            receipt_id      = COALESCE(EXCLUDED.receipt_id, ai_economic_events.receipt_id),
            updated_at      = NOW()
         RETURNING id`,
        [
            input.request_id,
            tenantId,
            input.api_key_id ?? null,
            input.source ?? 'unknown',
            input.event_time ?? new Date(),

            input.owner_type ?? null,
            input.owner_id ?? null,
            input.department_id ?? null,
            input.employee_id ?? null,
            input.customer_id ?? null,

            input.project_id ?? null,
            input.feature_id ?? null,
            input.workflow_id ?? null,

            input.task_type ?? null,
            input.action_type ?? null,

            input.provider ?? null,
            input.model_requested ?? null,
            input.model_used ?? null,

            inputTokens,
            outputTokens,
            totalTokens,

            input.cost_usd ?? 0,
            input.direct_cost_usd ?? 0,
            input.route_savings_usd ?? 0,
            input.cache_savings_usd ?? 0,

            input.retry_cost_usd ?? 0,
            input.context_waste_usd ?? 0,

            input.latency_ms ?? null,
            input.cache_hit ?? false,
            input.status_code ?? null,
            input.success ?? null,

            input.revenue_usd ?? null,
            input.gross_margin_pct ?? null,

            input.budget_id ?? null,
            input.policy_id ?? null,
            input.mandate_id ?? null,
            input.governance_decision ?? null,
            input.deny_code ?? null,

            input.receipt_id ?? null,
            input.evidence_bundle_id ?? null,

            input.output_status ?? null,
            input.quality_score ?? null,
            input.human_review_status ?? null,

            privacy.privacyMode,
            storage.promptStored,
            storage.responseStored,

            promptFingerprint,
            responseFingerprint,

            storage.redactionApplied,
            expiresAt,

            input.metadata ?? {},
        ],
    );

    return {
        id: res.rows[0].id,
        request_id: input.request_id,
        privacy,
        prompt_stored: storage.promptStored,
        response_stored: storage.responseStored,
        redaction_applied: storage.redactionApplied,
        retention_expires_at: expiresAt,
    };
}

/** Re-export the row shape for read paths. */
export type { EconomicEventRow } from './types';
