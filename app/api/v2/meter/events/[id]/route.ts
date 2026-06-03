/**
 * GET /api/v2/meter/events/[id]
 *
 * Returns the full ai_economic_events row for the given id, scoped to the
 * authenticated tenant. 404 on miss (no tenant-cross leak).
 *
 * The response includes every privacy field so the event-detail UI can
 * surface what was stored, what was fingerprinted, and when retention
 * expires.
 */

import { NextRequest, NextResponse } from 'next/server';
import db from '@/lib/db';
import { requireTenantAccess } from '@/lib/auth';
import { toApiErrorResponse, ApiError } from '@/lib/errors';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
    const requestId = crypto.randomUUID();
    try {
        const access = await requireTenantAccess(req);
        if (access.error) {
            return NextResponse.json({ error: access.error }, { status: access.status ?? 401 });
        }
        const tenantId = access.tenantId;
        const { id } = await ctx.params;

        if (!id || typeof id !== 'string' || id.length > 64) {
            throw new ApiError({
                code: 'INVALID_INPUT',
                status: 400,
                message: 'id must be a UUID',
                requestId,
            });
        }

        const res = await db.query(
            `SELECT * FROM ai_economic_events WHERE id = $1 AND tenant_id = $2 LIMIT 1`,
            [id, tenantId],
        );
        const row = res.rows[0];
        if (!row) {
            return NextResponse.json({
                error: { code: 'NOT_FOUND', message: 'Economic event not found' },
            }, { status: 404, headers: { 'X-P402-Request-ID': requestId } });
        }

        return NextResponse.json({
            ok: true,
            event: row,
        }, { headers: { 'X-P402-Request-ID': requestId } });
    } catch (err) {
        return toApiErrorResponse(err, requestId);
    }
}
