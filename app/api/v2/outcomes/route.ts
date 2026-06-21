/**
 * POST /api/v2/outcomes
 *
 * Tenant-scoped outcome ingestion. Customers report what happened to a metered
 * AI request so Optimize can compute cost per accepted output, retry waste,
 * quality-adjusted model choice, and other downstream metrics.
 *
 * Slice 3AU-2: this route now delegates persistence to the
 * lib/outcomes/recordOutcome foundation shipped in 3AU. The legacy request
 * body shape and response shape are preserved byte-for-byte for existing
 * callers; the response additively carries outcome_type, reported_by,
 * occurred_at, economic_event_id, and orphan fields per the 3AU-2 plan.
 *
 * Body:
 *   {
 *     "request_id": "req_...",            // required
 *     "status":     "accepted" | ...,     // required, see STORED_OUTCOME_STATUSES
 *     "quality_score": 0.91,              // optional, [0, 1]
 *     "source": "sdk" | "api" | "mcp" | "cli" | "webhook" | ...,  // optional
 *     "metadata": {...},                  // optional, JSONB; content fields rejected
 *     "outcome_type": "request_completion"| "caller_action" | "human_review"
 *                  | "instrumentation",   // optional, defaults to request_completion
 *     "occurred_at": "2026-06-21T12:00Z"  // optional ISO timestamp
 *   }
 *
 * Idempotent per (tenant_id, request_id): a repeat POST updates the row and
 * bumps updated_at.
 *
 * Privacy: metadata-only. Prompt, response, messages, raw_trace, stored_content,
 * completion_text, request_body, response_body, and similar synonyms are
 * rejected at two layers — the route boundary via scanForForbiddenFields, and
 * the foundation's sanitizeMetadata via the layered forbidden-key set.
 */

import { NextRequest, NextResponse } from 'next/server';
import db from '@/lib/db';
import { requireTenantAccess } from '@/lib/auth';
import { ApiError, toApiErrorResponse } from '@/lib/errors';
import {
    STORED_OUTCOME_STATUS_SET,
    isCanonicalSource,
    scanForForbiddenFields,
} from '@/lib/prove/outcome';
import { recordOutcome } from '@/lib/outcomes/service';
import { OutcomeValidationError, rejectClientTenantFields } from '@/lib/outcomes/validation';
import type { OutcomeType } from '@/lib/outcomes/types';

export const dynamic = 'force-dynamic';

const DEFAULT_OUTCOME_TYPE: OutcomeType = 'request_completion';
const OUTCOME_TYPE_VALUES: readonly OutcomeType[] = [
    'request_completion',
    'caller_action',
    'human_review',
    'instrumentation',
];

interface OutcomeBody {
    request_id?: unknown;
    status?: unknown;
    quality_score?: unknown;
    source?: unknown;
    metadata?: unknown;
    outcome_type?: unknown;
    occurred_at?: unknown;
}

function requireString(v: unknown, max = 256): string | null {
    if (typeof v !== 'string') return null;
    const t = v.trim();
    if (!t || t.length > max) return null;
    return t;
}

function deriveReportedBy(req: NextRequest): string {
    const header = req.headers.get('x-p402-reported-by');
    if (header) {
        const trimmed = header.trim().slice(0, 128);
        if (trimmed.length > 0) return trimmed;
    }
    return 'tenant-api';
}

export async function POST(req: NextRequest) {
    const requestId = crypto.randomUUID();
    try {
        const access = await requireTenantAccess(req);
        if (access.error) {
            return NextResponse.json({ error: access.error }, { status: access.status ?? 401 });
        }
        const tenantId = access.tenantId;

        let body: OutcomeBody;
        try {
            body = (await req.json()) as OutcomeBody;
        } catch {
            throw new ApiError({
                code: 'INVALID_INPUT',
                status: 400,
                message: 'Body must be valid JSON',
                requestId,
            });
        }

        // Defense in depth: callers may not pass tenant_id in the body.
        try {
            rejectClientTenantFields(body);
        } catch (e) {
            if (e instanceof OutcomeValidationError) {
                throw new ApiError({
                    code: 'INVALID_INPUT',
                    status: 400,
                    message: e.message,
                    requestId,
                    details: { field: e.field ?? 'tenant_id' },
                });
            }
            throw e;
        }

        // Slice 3J — payment-grade content-field rejection at the route
        // boundary (unchanged from pre-3AU-2). The foundation's
        // sanitizeMetadata is a second layer below this.
        const scan = scanForForbiddenFields(body as Record<string, unknown>);
        if (scan.found) {
            throw new ApiError({
                code: 'INVALID_INPUT',
                status: 400,
                message: 'outcome body must not include prompt or response content fields',
                requestId,
                details: { forbidden_field: scan.field },
            });
        }

        // Required: request_id.
        const outcomeRequestId = requireString(body.request_id, 128);
        if (!outcomeRequestId) {
            throw new ApiError({
                code: 'OUTCOME_REQUEST_ID_REQUIRED',
                status: 400,
                message: 'request_id is required and must be a non-empty string',
                requestId,
            });
        }

        // Required: status — accept the transitional DB superset (V5 §8.3 +
        // legacy v2_051 values still allowed by the DB CHECK).
        const status = typeof body.status === 'string' ? body.status : '';
        if (!STORED_OUTCOME_STATUS_SET.has(status)) {
            throw new ApiError({
                code: 'INVALID_OUTCOME_STATUS',
                status: 400,
                message: `status must be one of: ${[...STORED_OUTCOME_STATUS_SET].join(', ')}`,
                requestId,
                details: { status, allowed: [...STORED_OUTCOME_STATUS_SET] },
            });
        }

        // Optional: quality_score, [0, 1].
        let qualityScore: number | null = null;
        if (body.quality_score !== undefined && body.quality_score !== null) {
            const n = Number(body.quality_score);
            if (!Number.isFinite(n) || n < 0 || n > 1) {
                throw new ApiError({
                    code: 'INVALID_QUALITY_SCORE',
                    status: 400,
                    message: 'quality_score must be a number between 0 and 1 inclusive',
                    requestId,
                    details: { received: body.quality_score },
                });
            }
            qualityScore = n;
        }

        // Optional: outcome_type. Default to request_completion when absent.
        let outcomeType: OutcomeType = DEFAULT_OUTCOME_TYPE;
        if (body.outcome_type !== undefined && body.outcome_type !== null) {
            if (typeof body.outcome_type !== 'string' || !(OUTCOME_TYPE_VALUES as readonly string[]).includes(body.outcome_type)) {
                throw new ApiError({
                    code: 'INVALID_OUTCOME_TYPE',
                    status: 400,
                    message: `outcome_type must be one of: ${OUTCOME_TYPE_VALUES.join(', ')}`,
                    requestId,
                    details: { received: body.outcome_type, allowed: OUTCOME_TYPE_VALUES },
                });
            }
            outcomeType = body.outcome_type as OutcomeType;
        }

        // Optional: occurred_at. Accept only strict ISO 8601 / RFC 3339
        // datetimes with a date AND a time AND a UTC offset. Examples:
        //   2026-06-21T10:00:00Z
        //   2026-06-21T10:00:00.000Z
        //   2026-06-21T10:00:00+04:00
        // Examples explicitly rejected: 'tomorrow', '06/21/2026', '2026-06-21',
        // '10:00'.
        let occurredAt: string | null = null;
        if (body.occurred_at !== undefined && body.occurred_at !== null) {
            const v = body.occurred_at;
            const ISO_DATETIME_RE = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{1,9})?(?:Z|[+-]\d{2}:\d{2})$/;
            if (typeof v !== 'string' || !ISO_DATETIME_RE.test(v) || Number.isNaN(Date.parse(v))) {
                throw new ApiError({
                    code: 'INVALID_OCCURRED_AT',
                    status: 400,
                    message: 'occurred_at must be a full ISO 8601 datetime with timezone offset (e.g. 2026-06-21T10:00:00Z)',
                    requestId,
                    details: { received: body.occurred_at },
                });
            }
            occurredAt = new Date(v).toISOString();
        }

        // Source canonicalization (preserves slice 3J behavior). Non-canonical
        // source strings are preserved in metadata.legacy_source so callers
        // are never silently coerced.
        const rawMetadata = (body.metadata && typeof body.metadata === 'object' && !Array.isArray(body.metadata))
            ? body.metadata as Record<string, unknown>
            : {};
        const sourceRaw = requireString(body.source, 64);
        const metadata: Record<string, unknown> = { ...rawMetadata };
        if (sourceRaw && !isCanonicalSource(sourceRaw) && metadata.legacy_source === undefined) {
            metadata.legacy_source = sourceRaw;
        }

        const reportedBy = deriveReportedBy(req);

        // Foundation call. Three legacy-compatibility flags:
        //   allowOrphan=true                — outcomes accepted before metered
        //                                     event row lands.
        //   allowUnknownMetadataKeys=true   — preserve slice 3J's free-form
        //                                     metadata passthrough.
        //   allowFreeformSource=true        — caller's source string persists
        //                                     as-is (or null if absent /
        //                                     non-string). Non-canonical
        //                                     sources are also tagged in
        //                                     metadata.legacy_source above.
        const result = await recordOutcome(
            {
                request_id: outcomeRequestId,
                outcome_type: outcomeType,
                outcome_status: status as never,
                quality_score: qualityScore,
                source: sourceRaw as never,
                metadata,
                occurred_at: occurredAt,
            },
            { tenant_id: tenantId, reported_by: reportedBy },
            { db, allowOrphan: true, allowUnknownMetadataKeys: true, allowFreeformSource: true },
        );

        const o = result.outcome;
        return NextResponse.json({
            ok: true,
            outcome_id: o.id,
            request_id: o.request_id,
            status: o.outcome_status,
            quality_score: o.quality_score,
            recorded_at: o.updated_at,
            outcome_type: o.outcome_type,
            reported_by: o.reported_by,
            occurred_at: o.occurred_at,
            economic_event_id: result.economic_event_id,
            orphan: result.orphan,
        }, { status: 200, headers: { 'X-P402-Request-ID': requestId } });
    } catch (err) {
        if (err instanceof OutcomeValidationError) {
            const apiErr = new ApiError({
                code: 'INVALID_INPUT',
                status: 400,
                message: err.message,
                requestId,
                details: err.field !== undefined ? { field: err.field } : undefined,
            });
            return toApiErrorResponse(apiErr, requestId);
        }
        return toApiErrorResponse(err, requestId);
    }
}
