/**
 * P402 V2 Cache Clear Endpoint
 * =============================
 * Clear semantic cache entries.
 * 
 * POST /api/v2/cache/clear
 */

import { NextRequest, NextResponse } from 'next/server';
import { getSemanticCache } from '@/lib/cache';

export async function POST(req: NextRequest) {
    const tenantId = req.headers.get('x-p402-tenant') || 'default';

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
    } catch (error: any) {
        console.error('[Cache/Clear] Error:', error);

        return NextResponse.json({
            success: false,
            error: error.message
        }, { status: 500 });
    }
}
