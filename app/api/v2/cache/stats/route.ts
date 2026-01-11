/**
 * P402 V2 Cache Stats Endpoint
 * =============================
 * Get semantic cache statistics.
 * 
 * GET /api/v2/cache/stats
 */

import { NextRequest, NextResponse } from 'next/server';
import { getSemanticCache } from '@/lib/cache';

export async function GET(req: NextRequest) {
    const tenantId = req.headers.get('x-p402-tenant') || 'default';

    try {
        const cache = getSemanticCache({ namespace: tenantId });
        const stats = await cache.getStats();

        // Calculate hit rate estimate
        const hitRate = stats.totalEntries > 0 && stats.totalHits > 0
            ? Math.min((stats.totalHits / (stats.totalEntries * 5)) * 100, 100)
            : 0;

        // Estimate savings (rough: $0.001 per cache hit)
        const estimatedSavings = stats.totalHits * 0.001;

        return NextResponse.json({
            ...stats,
            hitRate,
            estimatedSavings,
            namespace: tenantId
        });
    } catch (error: any) {
        console.error('[Cache/Stats] Error:', error);

        // Return empty stats if cache unavailable
        return NextResponse.json({
            totalEntries: 0,
            totalHits: 0,
            avgHitsPerEntry: 0,
            oldestEntry: null,
            namespaces: [],
            hitRate: 0,
            estimatedSavings: 0,
            namespace: tenantId
        });
    }
}
