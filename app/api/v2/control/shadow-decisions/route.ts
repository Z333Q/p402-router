/**
 * GET /api/v2/control/shadow-decisions
 *
 * Slice 3AA-Impl. Read-only summary of the tenant's persisted shadow
 * decisions over a window. Returns migration_pending=true when the
 * underlying table is missing, so the dashboard renders cleanly before
 * the migration is applied.
 *
 * Privacy posture: metadata only. No prompt/response/messages content
 * is read or returned. Tenant scoping is enforced at the data-access
 * layer (WHERE tenant_id = $1) and at the route handler via
 * requireTenantAccess.
 */

import { NextRequest, NextResponse } from 'next/server';
import { randomUUID } from 'node:crypto';

import { requireTenantAccess } from '@/lib/auth';
import { toApiErrorResponse } from '@/lib/errors';

import { getShadowDecisionsSummary } from '@/lib/control/shadow-decisions';

export const dynamic = 'force-dynamic';

function parseDate(v: string | null): Date | undefined {
    if (!v) return undefined;
    const t = Date.parse(v);
    return Number.isNaN(t) ? undefined : new Date(t);
}

export async function GET(req: NextRequest) {
    const access = await requireTenantAccess(req);
    if ('error' in access) {
        return NextResponse.json({ error: access.error }, { status: access.status });
    }

    try {
        const since = parseDate(req.nextUrl.searchParams.get('since'));
        const until = parseDate(req.nextUrl.searchParams.get('until'));
        const summary = await getShadowDecisionsSummary(access.tenantId, since, until);
        return NextResponse.json(summary);
    } catch (e) {
        return toApiErrorResponse(e, req.headers.get('x-request-id') ?? randomUUID());
    }
}
