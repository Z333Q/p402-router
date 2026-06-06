/**
 * GET /api/v2/prove/economic-events/[request_id]
 *
 * Slice 3H — Event detail drill-down. Tenant-scoped, read-only,
 * metadata-only. Returns the canonical row for one request_id plus
 * the related-events panel and a plain-English explanation.
 *
 * 404 cases:
 *   - request_id not present for this tenant
 *   - row exists for a DIFFERENT tenant (cross-tenant lookup denied)
 *
 * NO prompt, response, messages, completion, request_body, response_body,
 * or fingerprint columns are selected. The projection is pinned by
 * lib/prove/event-detail.ts and tested at the SQL-string level.
 */

import { NextRequest, NextResponse } from 'next/server';

import db from '@/lib/db';
import { requireTenantAccess } from '@/lib/auth';
import { toApiErrorResponse } from '@/lib/errors';

import {
    buildAttributionView,
    loadEventByRequestId,
    loadRelatedEvents,
    type EventDetailResponse,
} from '@/lib/prove/event-detail';
import { explainEvent } from '@/lib/prove/explain';

export const dynamic = 'force-dynamic';

interface RouteContext {
    params: Promise<{ request_id: string }>;
}

export async function GET(req: NextRequest, ctx: RouteContext) {
    const requestId = crypto.randomUUID();
    try {
        const access = await requireTenantAccess(req);
        if (access.error) {
            return NextResponse.json({ error: access.error }, { status: access.status ?? 401 });
        }
        const tenantId = access.tenantId;

        const { request_id } = await ctx.params;
        if (!request_id || request_id.length > 256) {
            return NextResponse.json(
                { error: { code: 'INVALID_INPUT', message: 'request_id missing or too long' } },
                { status: 400 },
            );
        }

        const event = await loadEventByRequestId(db, tenantId, request_id);
        if (!event) {
            return NextResponse.json(
                { error: { code: 'NOT_FOUND', message: 'event not found for this tenant' } },
                { status: 404, headers: { 'X-P402-Request-ID': requestId } },
            );
        }

        const [attribution, related, explanation] = await Promise.all([
            Promise.resolve(buildAttributionView(event)),
            loadRelatedEvents(db, tenantId, event, 10),
            Promise.resolve(explainEvent(event)),
        ]);

        const cost_usd = Number(event.cost_usd ?? 0);
        const direct_cost_usd = Number(event.direct_cost_usd ?? 0);
        const avg_cost_per_1k_tokens = event.total_tokens > 0
            ? (cost_usd / event.total_tokens) * 1000
            : null;

        const body: EventDetailResponse = {
            ok: true,
            event,
            attribution,
            governance: {
                decision:        event.governance_decision,
                deny_code:       event.deny_code,
                deny_rule:       event.metadata_deny_rule,
                decision_source: event.metadata_decision_source,
                budget_id:       event.budget_id,
                policy_id:       event.policy_id,
                mandate_id:      event.mandate_id,
                status_code:     event.status_code,
                success:         event.success,
                provider_call_blocked: event.governance_decision === 'denied',
            },
            privacy: {
                privacy_mode:        event.privacy_mode,
                prompt_stored:       event.prompt_stored,
                response_stored:     event.response_stored,
                redaction_applied:   event.redaction_applied,
                retention_expires_at: event.retention_expires_at,
                content_displayed:   false,
            },
            evidence: {
                evidence_bundle_id: event.evidence_bundle_id,
                present: event.evidence_bundle_id != null,
                bundle_url: event.evidence_bundle_id
                    ? `/api/v1/analytics/evidence-bundle/${encodeURIComponent(event.evidence_bundle_id)}`
                    : null,
            },
            cost: {
                cost_usd,
                direct_cost_usd,
                input_tokens:  event.input_tokens,
                output_tokens: event.output_tokens,
                total_tokens:  event.total_tokens,
                avg_cost_per_1k_tokens,
                zero_cost_denied: event.governance_decision === 'denied' && cost_usd === 0,
            },
            related_events: related,
            explanation,
        };

        return NextResponse.json(body, {
            status: 200,
            headers: { 'X-P402-Request-ID': requestId, 'Cache-Control': 'no-store' },
        });
    } catch (err) {
        return toApiErrorResponse(err, requestId);
    }
}
