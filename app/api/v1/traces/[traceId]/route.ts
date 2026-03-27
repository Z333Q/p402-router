/**
 * GET /api/v1/traces/:traceId — Full trace detail
 * Returns trace header, all nodes, cost summary, and execution metadata.
 * Used by the dashboard Trace page.
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireTenantAccess } from '@/lib/auth';
import { getTrace } from '@/lib/execution/trace';
import { toApiErrorResponse } from '@/lib/errors';

export const dynamic = 'force-dynamic';

export async function GET(
    req: NextRequest,
    { params }: { params: Promise<{ traceId: string }> }
) {
    const requestId = crypto.randomUUID();
    try {
        const access = await requireTenantAccess(req);
        if (access.error) return NextResponse.json({ error: access.error }, { status: access.status ?? 401 });

        const { traceId } = await params;
        if (!traceId || !/^[0-9a-f-]{36}$/.test(traceId)) {
            return NextResponse.json(
                { error: { code: 'INVALID_INPUT', message: 'Invalid trace ID' } },
                { status: 400 }
            );
        }

        const trace = await getTrace(traceId, access.tenantId);
        if (!trace) {
            return NextResponse.json(
                { error: { code: 'RECEIPT_NOT_FOUND', message: 'Trace not found' } },
                { status: 404 }
            );
        }

        return NextResponse.json({ trace });
    } catch (err) {
        return toApiErrorResponse(err, requestId);
    }
}
