/**
 * DELETE /api/v2/privacy/scope-overrides/[id]
 *
 * Admin-only. Removes a scope override and falls back to tenant default
 * for that (scope, scope_id) pair. The row is hard-deleted; metadata.last_
 * modified_by/at on adjacent rows still tracks who has been managing
 * privacy for audit purposes.
 */

import { NextRequest, NextResponse } from 'next/server';
import db from '@/lib/db';
import { requireTenantAdminAccess } from '@/lib/auth';
import { toApiErrorResponse, ApiError } from '@/lib/errors';

export const dynamic = 'force-dynamic';

export async function DELETE(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
    const requestId = crypto.randomUUID();
    try {
        const access = await requireTenantAdminAccess(req);
        if ('error' in access) {
            return NextResponse.json({ error: access.error }, { status: access.status });
        }
        const { tenantId } = access;
        const { id } = await ctx.params;

        if (!id || typeof id !== 'string' || id.length > 64) {
            throw new ApiError({
                code: 'INVALID_INPUT', status: 400,
                message: 'id must be a UUID',
                requestId,
            });
        }

        const r = await db.query(
            `DELETE FROM privacy_scope_overrides WHERE id = $1 AND tenant_id = $2 RETURNING id`,
            [id, tenantId],
        );
        if (r.rows.length === 0) {
            return NextResponse.json({
                error: { code: 'NOT_FOUND', message: 'Scope override not found' },
            }, { status: 404, headers: { 'X-P402-Request-ID': requestId } });
        }

        return NextResponse.json({ ok: true, deleted_id: id }, {
            headers: { 'X-P402-Request-ID': requestId },
        });
    } catch (err) {
        return toApiErrorResponse(err, requestId);
    }
}
