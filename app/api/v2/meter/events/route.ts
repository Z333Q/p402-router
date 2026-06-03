/**
 * POST /api/v2/meter/events
 *
 * Meter-only endpoint per V5 §27.5 / Path B. Customer apps that call model
 * providers directly (OpenAI, Anthropic, Gemini, etc.) post the economic
 * event back here to participate in Meter / Monitor / Control / Optimize
 * WITHOUT ever exposing prompts or responses to P402.
 *
 * Privacy contract:
 *   - This endpoint REJECTS any prompt / response / content / file / message
 *     field. Sending them returns 400 INVALID_INPUT. There is no path that
 *     persists raw content via this endpoint.
 *   - privacy_mode defaults to the tenant's setting (resolved server-side
 *     via tenant_privacy_settings + privacy_scope_overrides). Callers may
 *     pass `privacy_mode` to ratchet TIGHTER but never looser.
 *   - retention_expires_at is set server-side from tenant retention_days.
 *
 * Idempotent per (tenant_id, request_id) — repeat POSTs UPSERT.
 *
 * GET /api/v2/meter/events — list endpoint defined in this same file.
 * GET /api/v2/meter/events/[id] — detail endpoint in [id]/route.ts.
 */

import { NextRequest, NextResponse } from 'next/server';
import db from '@/lib/db';
import { requireTenantAccess } from '@/lib/auth';
import { ApiError, toApiErrorResponse } from '@/lib/errors';
import { writeEconomicEvent } from '@/lib/economic-events/writer';
import { PRIVACY_MODES, SCOPES, type PrivacyMode, type Scope } from '@/lib/economic-events/types';

export const dynamic = 'force-dynamic';

// Top-level fields that MUST NEVER be persisted by this endpoint. If any
// of them appear in the body, reject the request with INVALID_INPUT.
// (Nested 'metadata' is allowed and stored as JSONB — the tenant's privacy
// policy still governs what they put there.)
const FORBIDDEN_CONTENT_FIELDS = [
    'prompt', 'prompts', 'response', 'responses', 'completion',
    'messages', 'content', 'text', 'file', 'files', 'document', 'documents',
    'chat', 'chat_history', 'transcript',
];

interface MeterEventBody {
    request_id?: unknown;
    source?: unknown;
    privacy_mode?: unknown;

    attribution?: {
        owner_type?: unknown;
        owner_id?: unknown;
        department_id?: unknown;
        employee_id?: unknown;
        customer_id?: unknown;
        project_id?: unknown;
        feature_id?: unknown;
        workflow_id?: unknown;
        api_key_id?: unknown;
        task_type?: unknown;
        action_type?: unknown;
    };

    model?: {
        provider?: unknown;
        model_used?: unknown;
        model_requested?: unknown;
    };

    usage?: {
        input_tokens?: unknown;
        output_tokens?: unknown;
        total_tokens?: unknown;
        cost_usd?: unknown;
        direct_cost_usd?: unknown;
        route_savings_usd?: unknown;
        cache_savings_usd?: unknown;
        retry_cost_usd?: unknown;
        context_waste_usd?: unknown;
        latency_ms?: unknown;
        cache_hit?: unknown;
    };

    economics?: {
        revenue_usd?: unknown;
        gross_margin_pct?: unknown;
    };

    governance?: {
        budget_id?: unknown;
        policy_id?: unknown;
        mandate_id?: unknown;
        decision?: unknown;
        deny_code?: unknown;
    };

    evidence?: {
        receipt_id?: unknown;
        evidence_bundle_id?: unknown;
    };

    outcome?: {
        status?: unknown;
        quality_score?: unknown;
        human_review_status?: unknown;
    };

    metadata?: unknown;
}

function strOrNull(v: unknown, max = 256): string | null {
    if (typeof v !== 'string') return null;
    const t = v.trim();
    if (!t || t.length > max) return null;
    return t;
}

function intOrZero(v: unknown): number {
    const n = Number(v);
    return Number.isFinite(n) && n >= 0 ? Math.floor(n) : 0;
}

function numOrZero(v: unknown): number {
    const n = Number(v);
    return Number.isFinite(n) ? n : 0;
}

function numOrNull(v: unknown): number | null {
    if (v === undefined || v === null || v === '') return null;
    const n = Number(v);
    return Number.isFinite(n) ? n : null;
}

function boolDefault(v: unknown, def = false): boolean {
    return typeof v === 'boolean' ? v : def;
}

function rejectContentFields(body: Record<string, unknown>): string | null {
    for (const f of FORBIDDEN_CONTENT_FIELDS) {
        if (Object.prototype.hasOwnProperty.call(body, f)) {
            return f;
        }
    }
    return null;
}

export async function POST(req: NextRequest) {
    const requestId = crypto.randomUUID();
    try {
        const access = await requireTenantAccess(req);
        if (access.error) {
            return NextResponse.json({ error: access.error }, { status: access.status ?? 401 });
        }
        const tenantId = access.tenantId;

        let body: MeterEventBody;
        try {
            body = (await req.json()) as MeterEventBody;
        } catch {
            throw new ApiError({
                code: 'INVALID_INPUT',
                status: 400,
                message: 'Body must be valid JSON',
                requestId,
            });
        }

        // Privacy contract: reject any content-bearing fields at the top level.
        const offender = rejectContentFields(body as Record<string, unknown>);
        if (offender) {
            throw new ApiError({
                code: 'INVALID_INPUT',
                status: 400,
                message: `Meter-only endpoint rejects content fields. Remove "${offender}" — P402 meters economics, not content.`,
                requestId,
                details: { rejected_field: offender, forbidden_fields: FORBIDDEN_CONTENT_FIELDS },
            });
        }

        // request_id is required.
        const eventRequestId = strOrNull(body.request_id, 128);
        if (!eventRequestId) {
            throw new ApiError({
                code: 'INVALID_INPUT',
                status: 400,
                message: 'request_id is required and must be a non-empty string',
                requestId,
            });
        }

        // Validate optional privacy_mode (callers can only ratchet tighter,
        // enforced by resolveTenantPrivacy — but we reject garbage values
        // up front).
        let privacyModeOverride: PrivacyMode | undefined;
        if (body.privacy_mode !== undefined && body.privacy_mode !== null) {
            const pm = strOrNull(body.privacy_mode, 32);
            if (!pm || !PRIVACY_MODES.has(pm as PrivacyMode)) {
                throw new ApiError({
                    code: 'INVALID_INPUT',
                    status: 400,
                    message: `privacy_mode must be one of: ${[...PRIVACY_MODES].join(', ')}`,
                    requestId,
                    details: { received: body.privacy_mode },
                });
            }
            privacyModeOverride = pm as PrivacyMode;
        }

        // Owner type, if present, must match the scope enum.
        const att = body.attribution ?? {};
        let ownerType: Scope | null = null;
        if (att.owner_type !== undefined && att.owner_type !== null) {
            const ot = strOrNull(att.owner_type, 32);
            if (!ot || !SCOPES.has(ot as Scope)) {
                throw new ApiError({
                    code: 'INVALID_INPUT',
                    status: 400,
                    message: `attribution.owner_type must be one of: ${[...SCOPES].join(', ')}`,
                    requestId,
                });
            }
            ownerType = ot as Scope;
        }

        const usage = body.usage ?? {};
        const model = body.model ?? {};
        const economics = body.economics ?? {};
        const governance = body.governance ?? {};
        const evidence = body.evidence ?? {};
        const outcome = body.outcome ?? {};

        // Quality score bounds (rejected if present and out of range).
        if (outcome.quality_score !== undefined && outcome.quality_score !== null) {
            const qs = Number(outcome.quality_score);
            if (!Number.isFinite(qs) || qs < 0 || qs > 1) {
                throw new ApiError({
                    code: 'INVALID_QUALITY_SCORE',
                    status: 400,
                    message: 'outcome.quality_score must be a number between 0 and 1 inclusive',
                    requestId,
                    details: { received: outcome.quality_score },
                });
            }
        }

        const result = await writeEconomicEvent(tenantId, {
            request_id: eventRequestId,
            source: strOrNull(body.source, 64) ?? 'meter_only',
            api_key_id:    strOrNull(att.api_key_id),
            owner_type:    ownerType,
            owner_id:      strOrNull(att.owner_id),
            department_id: strOrNull(att.department_id),
            employee_id:   strOrNull(att.employee_id),
            customer_id:   strOrNull(att.customer_id),
            project_id:    strOrNull(att.project_id),
            feature_id:    strOrNull(att.feature_id),
            workflow_id:   strOrNull(att.workflow_id),
            task_type:     strOrNull(att.task_type, 128),
            action_type:   strOrNull(att.action_type, 128),

            provider:        strOrNull(model.provider, 64),
            model_requested: strOrNull(model.model_requested, 128),
            model_used:      strOrNull(model.model_used, 128),

            input_tokens:      intOrZero(usage.input_tokens),
            output_tokens:     intOrZero(usage.output_tokens),
            total_tokens:      usage.total_tokens !== undefined ? intOrZero(usage.total_tokens) : undefined,
            cost_usd:          numOrZero(usage.cost_usd),
            direct_cost_usd:   numOrZero(usage.direct_cost_usd),
            route_savings_usd: numOrZero(usage.route_savings_usd),
            cache_savings_usd: numOrZero(usage.cache_savings_usd),
            retry_cost_usd:    numOrZero(usage.retry_cost_usd),
            context_waste_usd: numOrZero(usage.context_waste_usd),
            latency_ms:        numOrNull(usage.latency_ms),
            cache_hit:         boolDefault(usage.cache_hit, false),

            revenue_usd:      numOrNull(economics.revenue_usd),
            gross_margin_pct: numOrNull(economics.gross_margin_pct),

            budget_id:   strOrNull(governance.budget_id),
            policy_id:   strOrNull(governance.policy_id),
            mandate_id:  strOrNull(governance.mandate_id),
            governance_decision: strOrNull(governance.decision, 32) as any,  // CHECK at DB level
            deny_code:   strOrNull(governance.deny_code, 64),

            receipt_id:         strOrNull(evidence.receipt_id),
            evidence_bundle_id: strOrNull(evidence.evidence_bundle_id),

            output_status:       strOrNull(outcome.status, 32) as any,
            quality_score:       numOrNull(outcome.quality_score),
            human_review_status: strOrNull(outcome.human_review_status, 32) as any,

            privacy_mode_override: privacyModeOverride,

            metadata: (body.metadata && typeof body.metadata === 'object' && !Array.isArray(body.metadata))
                ? body.metadata as Record<string, unknown>
                : {},
        });

        return NextResponse.json({
            ok: true,
            event_id: result.id,
            request_id: result.request_id,
            privacy: {
                mode: result.privacy.privacyMode,
                source: result.privacy.source,
                prompt_stored: result.prompt_stored,
                response_stored: result.response_stored,
                redaction_applied: result.redaction_applied,
                retention_expires_at: result.retention_expires_at.toISOString(),
            },
        }, { status: 200, headers: { 'X-P402-Request-ID': requestId } });
    } catch (err) {
        return toApiErrorResponse(err, requestId);
    }
}

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/v2/meter/events  — list endpoint
//   ?limit=50 (max 200) &since=ISO &until=ISO
//   tenant-scoped, ordered by event_time DESC
// ─────────────────────────────────────────────────────────────────────────────

export async function GET(req: NextRequest) {
    const requestId = crypto.randomUUID();
    try {
        const access = await requireTenantAccess(req);
        if (access.error) {
            return NextResponse.json({ error: access.error }, { status: access.status ?? 401 });
        }
        const tenantId = access.tenantId;

        const { searchParams } = new URL(req.url);
        const limit = Math.min(200, Math.max(1, Number(searchParams.get('limit') ?? '50') || 50));
        const since = searchParams.get('since');
        const until = searchParams.get('until');

        const where: string[] = ['tenant_id = $1'];
        const params: unknown[] = [tenantId];
        if (since) {
            params.push(new Date(since));
            where.push(`event_time >= $${params.length}`);
        }
        if (until) {
            params.push(new Date(until));
            where.push(`event_time <= $${params.length}`);
        }
        params.push(limit);

        const res = await db.query(
            `SELECT id, request_id, event_time, source,
                    owner_type, owner_id, department_id, employee_id, customer_id,
                    project_id, feature_id, workflow_id,
                    task_type, action_type,
                    provider, model_used,
                    input_tokens, output_tokens, total_tokens, cost_usd,
                    latency_ms, cache_hit, status_code, success,
                    governance_decision, output_status,
                    privacy_mode, prompt_stored, response_stored, redaction_applied,
                    retention_expires_at,
                    evidence_bundle_id, receipt_id
               FROM ai_economic_events
               WHERE ${where.join(' AND ')}
               ORDER BY event_time DESC
               LIMIT $${params.length}`,
            params,
        );

        return NextResponse.json({
            ok: true,
            count: res.rows.length,
            events: res.rows,
        }, { headers: { 'X-P402-Request-ID': requestId } });
    } catch (err) {
        return toApiErrorResponse(err, requestId);
    }
}
