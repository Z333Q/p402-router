/**
 * GET /api/admin/analytics?days=30
 * Time-series data for the analytics page.
 * Returns daily aggregations: volume, requests, cache hits, latency percentiles.
 */
import { NextRequest, NextResponse } from 'next/server';
import { requireAdminAccess, AdminAuthError } from '@/lib/admin/auth';
import db from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
    try {
        await requireAdminAccess('analytics.read');
    } catch (e) {
        if (e instanceof AdminAuthError) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        throw e;
    }

    const days = Math.min(parseInt(req.nextUrl.searchParams.get('days') ?? '30'), 90);

    const [volume, traffic, providers] = await Promise.all([
        // Daily USDC settlement volume
        db.query(`
            SELECT
                DATE_TRUNC('day', created_at) AS date,
                COUNT(*) AS payment_count,
                COALESCE(SUM(CAST(amount_usdc AS NUMERIC)), 0) AS usdc_volume,
                COUNT(*) FILTER (WHERE status = 'settled') AS settled_count
            FROM x402_payments
            WHERE created_at >= NOW() - ($1 || ' days')::INTERVAL
            GROUP BY 1 ORDER BY 1
        `, [days]),

        // Daily routing traffic
        db.query(`
            SELECT
                DATE_TRUNC('day', created_at) AS date,
                COUNT(*) AS requests,
                COUNT(*) FILTER (WHERE cache_hit = TRUE) AS cache_hits,
                ROUND(PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY latency_ms)::NUMERIC, 0) AS p50_ms,
                ROUND(PERCENTILE_CONT(0.95) WITHIN GROUP (ORDER BY latency_ms)::NUMERIC, 0) AS p95_ms,
                (SELECT COUNT(DISTINCT tenant_id)
                    FROM traffic_events te2
                    WHERE DATE_TRUNC('day', te2.created_at) = DATE_TRUNC('day', te.created_at)
                ) AS active_tenants
            FROM traffic_events te
            WHERE created_at >= NOW() - ($1 || ' days')::INTERVAL
            GROUP BY 1 ORDER BY 1
        `, [days]),

        // Provider distribution (last N days)
        db.query(`
            SELECT
                provider,
                COUNT(*) AS requests,
                ROUND(100.0 * COUNT(*) / NULLIF(SUM(COUNT(*)) OVER (), 0), 1) AS pct
            FROM traffic_events
            WHERE created_at >= NOW() - ($1 || ' days')::INTERVAL
              AND provider IS NOT NULL
            GROUP BY provider
            ORDER BY requests DESC
            LIMIT 10
        `, [days]),
    ]);

    // Merge volume + traffic by date into one array
    const dateMap: Record<string, Record<string, unknown>> = {};
    for (const row of volume.rows) {
        const d = row.date?.toISOString?.() ?? String(row.date);
        dateMap[d] = {
            date: d,
            usdcVolume:   parseFloat(row.usdc_volume),
            paymentCount: parseInt(row.payment_count),
            settledCount: parseInt(row.settled_count),
        };
    }
    for (const row of traffic.rows) {
        const d = row.date?.toISOString?.() ?? String(row.date);
        if (!dateMap[d]) dateMap[d] = { date: d };
        dateMap[d] = {
            ...dateMap[d],
            requests:      parseInt(row.requests),
            cacheHits:     parseInt(row.cache_hits),
            cacheHitPct:   row.requests > 0 ? Math.round((parseInt(row.cache_hits) / parseInt(row.requests)) * 1000) / 10 : 0,
            p50Ms:         parseInt(row.p50_ms ?? '0'),
            p95Ms:         parseInt(row.p95_ms ?? '0'),
            activeTenants: parseInt(row.active_tenants ?? '0'),
        };
    }

    return NextResponse.json({
        days,
        timeSeries: Object.values(dateMap).sort((a, b) =>
            String(a.date) < String(b.date) ? -1 : 1
        ),
        providers: providers.rows.map(r => ({
            provider: r.provider,
            requests: parseInt(r.requests),
            pct:      parseFloat(r.pct),
        })),
    });
}
