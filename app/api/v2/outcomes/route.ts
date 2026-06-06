/**
 * POST /api/v2/outcomes
 *
 * v2_051 — Outcome API. Customers report what happened to a metered AI
 * request so Optimize can compute cost per accepted output, retry waste,
 * quality-adjusted model choice, and other downstream metrics.
 *
 * Body:
 *   {
 *     "request_id": "req_...",            // required
 *     "status":     "accepted" | ...,     // required, see OUTCOME_STATUSES
 *     "quality_score": 0.91,              // optional, [0, 1]
 *     "source": "sdk" | "api" | "mcp" | "cli" | "webhook" | ...,  // optional
 *     "metadata": {...}                   // optional, JSONB
 *   }
 *
 * Idempotent per (tenant_id, request_id): a repeat POST updates the row
 * (e.g. "pending" -> "accepted") and bumps updated_at.
 *
 * Privacy: metadata-only. The endpoint does not accept prompt or response
 * content. If callers put sensitive data in `metadata`, the tenant's
 * privacy mode rules still govern retention.
 */

import { NextRequest, NextResponse } from 'next/server';
import db from '@/lib/db';
import { requireTenantAccess } from '@/lib/auth';
import { ApiError, toApiErrorResponse } from '@/lib/errors';
import {
    STORED_OUTCOME_STATUS_SET,
    STORED_OUTCOME_STATUSES,
    isCanonicalSource,
    scanForForbiddenFields,
} from '@/lib/prove/outcome';

export const dynamic = 'force-dynamic';

// Slice 3J — transitional superset. The DB CHECK installed by v2_054
// physically accepts the V5 §8.3 vocabulary PLUS the v2_051 legacy
// values 'retried' and 'human_reviewed'. Reads in lib/prove/outcome.ts
// normalize the legacy values to the canonical V5 list. Writers may
// emit anything in STORED_OUTCOME_STATUSES; the canonical-status
// promise is held on the read side, not by hard-rejecting legacy SDK
// payloads here. The set is sourced from lib/prove/outcome.ts so a
// future deprecation can ratchet down in one place.
const OUTCOME_STATUSES = STORED_OUTCOME_STATUS_SET;

interface OutcomeBody {
    request_id?: unknown;
    status?: unknown;
    quality_score?: unknown;
    source?: unknown;
    metadata?: unknown;
}

function requireString(v: unknown, max = 256): string | null {
    if (typeof v !== 'string') return null;
    const t = v.trim();
    if (!t || t.length > max) return null;
    return t;
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

        // Slice 3J — payment-grade content-field rejection. The outcomes
        // table is for METADATA only; prompt / response / messages /
        // completion / body / transcript / raw_trace / stored_content
        // must never land in request_outcomes.metadata. Rejecting at the
        // route boundary keeps the DB clean and the privacy contract
        // honest. The scan checks both top-level body keys AND first-
        // level metadata keys (metadata is a flat JSONB bag).
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

        // request_id is required and non-empty.
        const outcomeRequestId = requireString(body.request_id, 128);
        if (!outcomeRequestId) {
            throw new ApiError({
                code: 'OUTCOME_REQUEST_ID_REQUIRED',
                status: 400,
                message: 'request_id is required and must be a non-empty string',
                requestId,
            });
        }

        // status must be one of the enum values.
        const status = typeof body.status === 'string' ? body.status : '';
        if (!OUTCOME_STATUSES.has(status)) {
            throw new ApiError({
                code: 'INVALID_OUTCOME_STATUS',
                status: 400,
                message: `status must be one of: ${[...OUTCOME_STATUSES].join(', ')}`,
                requestId,
                details: { status, allowed: [...OUTCOME_STATUSES] },
            });
        }

        // quality_score: optional, [0, 1]; reject non-finite or out-of-range.
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

        const source = requireString(body.source, 64);
        // Slice 3J — source tagging. Canonical sources pass through; any
        // other free-text source value is preserved (backward compat per
        // Decision 4) and tagged via metadata.legacy_source so a future
        // strict path can find and migrate them. Existing SDK paths keep
        // working.
        const rawMetadata = (body.metadata && typeof body.metadata === 'object' && !Array.isArray(body.metadata))
            ? body.metadata as Record<string, unknown>
            : {};
        const metadata: Record<string, unknown> = { ...rawMetadata };
        if (source && !isCanonicalSource(source) && metadata.legacy_source === undefined) {
            metadata.legacy_source = source;
        }

        // UPSERT on (tenant_id, request_id). Returns the id + recorded_at the
        // caller can use to correlate.
        const res = await db.query(
            `INSERT INTO request_outcomes (tenant_id, request_id, status, quality_score, source, metadata)
             VALUES ($1, $2, $3, $4, $5, $6)
             ON CONFLICT (tenant_id, request_id) DO UPDATE
                SET status = EXCLUDED.status,
                    quality_score = EXCLUDED.quality_score,
                    source = COALESCE(EXCLUDED.source, request_outcomes.source),
                    metadata = EXCLUDED.metadata,
                    updated_at = NOW()
             RETURNING id, created_at, updated_at`,
            [tenantId, outcomeRequestId, status, qualityScore, source, metadata],
        );
        const row = res.rows[0] ?? {};

        return NextResponse.json({
            ok: true,
            outcome_id: row.id,
            request_id: outcomeRequestId,
            status,
            quality_score: qualityScore,
            recorded_at: row.updated_at ?? row.created_at,
        }, { status: 200, headers: { 'X-P402-Request-ID': requestId } });
    } catch (err) {
        return toApiErrorResponse(err, requestId);
    }
}
