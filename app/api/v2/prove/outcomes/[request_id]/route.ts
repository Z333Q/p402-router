/**
 * GET /api/v2/prove/outcomes/[request_id]
 *
 * Slice 3J — Prove read side for request_outcomes. Tenant-scoped, exact
 * lookup, returns a normalized OutcomeView. Legacy stored statuses
 * (`retried`, `human_reviewed`) are folded into the V5 canonical
 * vocabulary on the way out and the original value is surfaced as
 * `legacy_status` so auditors can see the rewrite.
 *
 *   - 404 when no row exists for (tenant_id, request_id).
 *   - Never selects content-bearing columns; request_outcomes does not
 *     have any.
 *   - No DB writes.
 */

import { NextRequest, NextResponse } from 'next/server';

import db from '@/lib/db';
import { requireTenantAccess } from '@/lib/auth';
import { toApiErrorResponse } from '@/lib/errors';

import {
    isCanonicalSource,
    normalizeStoredStatus,
    type OutcomeView,
} from '@/lib/prove/outcome';

export const dynamic = 'force-dynamic';

interface RouteContext {
    params: Promise<{ request_id: string }>;
}

export async function GET(req: NextRequest, ctx: RouteContext) {
    const reqId = crypto.randomUUID();
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

        const { rows } = await db.query(
            `SELECT request_id, status, quality_score, source, metadata, created_at, updated_at
               FROM request_outcomes
              WHERE tenant_id = $1 AND request_id = $2
              LIMIT 1`,
            [tenantId, request_id],
        );
        if (rows.length === 0) {
            return NextResponse.json(
                { error: { code: 'NOT_FOUND', message: 'outcome not found for this tenant' } },
                { status: 404, headers: { 'X-P402-Request-ID': reqId } },
            );
        }
        const r = rows[0]!;
        const stored = String(r.status ?? 'unknown');
        const { status, legacy_status } = normalizeStoredStatus(stored);
        const source = r.source == null ? null : String(r.source);
        const view: OutcomeView = {
            request_id: String(r.request_id ?? request_id),
            status,
            legacy_status,
            quality_score: r.quality_score == null ? null : Number(r.quality_score),
            source,
            source_is_canonical: source != null && isCanonicalSource(source),
            metadata: (r.metadata && typeof r.metadata === 'object') ? r.metadata as Record<string, unknown> : {},
            created_at: r.created_at instanceof Date ? r.created_at.toISOString() : String(r.created_at),
            updated_at: r.updated_at instanceof Date ? r.updated_at.toISOString() : String(r.updated_at),
        };

        return NextResponse.json(
            { ok: true, outcome: view },
            { status: 200, headers: { 'X-P402-Request-ID': reqId, 'Cache-Control': 'no-store' } },
        );
    } catch (err) {
        return toApiErrorResponse(err, reqId);
    }
}
