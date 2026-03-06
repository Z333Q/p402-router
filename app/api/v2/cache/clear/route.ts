/**
 * P402 V2 Cache Clear Endpoint
 * =============================
 * Clear semantic cache entries.
 * 
 * POST /api/v2/cache/clear
 */

import { NextRequest, NextResponse } from 'next/server';
import { getSemanticCache } from '@/lib/cache';
import { requireTenantAccess } from '@/lib/auth';
import { toApiErrorResponse } from '@/lib/errors';

export async function POST(req: NextRequest) {
    const access = await requireTenantAccess(req);
    if (access.error) {
        return NextResponse.json({ error: access.error }, { status: access.status });
    }
    const tenantId = access.tenantId;

    try {
        const body = await req.json().catch(() => ({}));
        const { pattern } = body;

        const cache = getSemanticCache({ namespace: tenantId });
        const deletedCount = await cache.invalidate(pattern);

        return NextResponse.json({
            success: true,
            deleted: deletedCount,
            namespace: tenantId,
            pattern: pattern || null
        });
    } catch (error: unknown) {
        console.error('[Cache/Clear] Error:', error);
        return toApiErrorResponse(error, crypto.randomUUID());
    }
}
