/**
 * GET /api/admin/overview
 * Aggregated platform KPIs for the admin command center.
 * All queries run in parallel. Results are suitable for KPI cards + sparklines.
 */
import { NextRequest, NextResponse } from 'next/server';
import { requireAdminAccess } from '@/lib/admin/auth';
import { AdminAuthError } from '@/lib/admin/auth';
import db from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
    try {
        await requireAdminAccess('overview.read');
    } catch (e) {
        if (e instanceof AdminAuthError) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        throw e;
    }

    const [platform, financial, routing, safety, agents, spark] = await Promise.all([
        // Platform growth
        db.query(`
            SELECT
                (SELECT COUNT(*) FROM tenants) AS total,
                (SELECT COUNT(*) FROM tenants WHERE created_at >= NOW() - INTERVAL '7 days') AS new_7d,
                (SELECT COUNT(*) FROM tenants WHERE created_at >= NOW() - INTERVAL '30 days') AS new_30d,
                (SELECT COUNT(*) FROM tenants WHERE created_at >= NOW() - INTERVAL '1 day') AS new_today,
                (SELECT COUNT(DISTINCT tenant_id) FROM traffic_events
                    WHERE created_at >= NOW() - INTERVAL '7 days') AS active_7d,
                (SELECT COUNT(*) FROM tenants
                    WHERE id NOT IN (
                        SELECT DISTINCT tenant_id FROM traffic_events
                        WHERE created_at >= NOW() - INTERVAL '30 days'
                    ) AND created_at < NOW() - INTERVAL '30 days') AS churn_risk
        `),

        // Financial health
        db.query(`
            SELECT
                COALESCE(SUM(CAST(amount_usdc AS NUMERIC)), 0) AS vol_all_time,
                COALESCE(SUM(CASE WHEN created_at >= NOW() - INTERVAL '30 days'
                    THEN CAST(amount_usdc AS NUMERIC) ELSE 0 END), 0) AS vol_30d,
                COALESCE(SUM(CASE WHEN created_at >= NOW() - INTERVAL '7 days'
                    THEN CAST(amount_usdc AS NUMERIC) ELSE 0 END), 0) AS vol_7d,
                COUNT(*) FILTER (WHERE status = 'settled') AS settled_count,
                COUNT(*) AS total_count
            FROM x402_payments
        `),

        // Routing intelligence (last 24h)
        db.query(`
            SELECT
                COUNT(*) AS total_requests,
                COUNT(*) FILTER (WHERE created_at >= NOW() - INTERVAL '1 hour') AS last_1h,
                ROUND(100.0 * COUNT(*) FILTER (WHERE cache_hit = TRUE) / NULLIF(COUNT(*), 0), 1) AS cache_hit_pct,
                ROUND(PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY latency_ms)::NUMERIC, 0) AS p50_ms,
                ROUND(PERCENTILE_CONT(0.95) WITHIN GROUP (ORDER BY latency_ms)::NUMERIC, 0) AS p95_ms,
                ROUND(PERCENTILE_CONT(0.99) WITHIN GROUP (ORDER BY latency_ms)::NUMERIC, 0) AS p99_ms
            FROM traffic_events
            WHERE created_at >= NOW() - INTERVAL '24 hours'
        `),

        // Safety
        db.query(`
            SELECT
                (SELECT COUNT(*) FROM ap2_mandates WHERE status = 'active') AS active_mandates,
                (SELECT COUNT(*) FROM safety_incidents WHERE status IN ('open', 'investigating')) AS open_incidents,
                (SELECT COUNT(*) FROM tenant_reputation WHERE is_banned = TRUE) AS banned_tenants
        `),

        // Agent ecosystem (24h)
        db.query(`
            SELECT
                (SELECT COUNT(*) FROM agent_sessions WHERE status = 'active' AND expires_at > NOW()) AS active_sessions,
                (SELECT COUNT(*) FROM a2a_tasks WHERE created_at >= NOW() - INTERVAL '24 hours') AS a2a_tasks_24h,
                (SELECT COUNT(*) FROM x402_payments WHERE created_at >= NOW() - INTERVAL '24 hours') AS payments_24h,
                (SELECT COALESCE(SUM(CAST(amount_usdc AS NUMERIC)), 0)
                    FROM x402_payments WHERE created_at >= NOW() - INTERVAL '24 hours') AS payment_vol_24h
        `),

        // Sparkline: daily new tenants for last 14 days
        db.query(`
            SELECT
                DATE_TRUNC('day', created_at) AS date,
                COUNT(*) AS value
            FROM tenants
            WHERE created_at >= NOW() - INTERVAL '14 days'
            GROUP BY 1
            ORDER BY 1
        `),
    ]);

    const p = platform.rows[0];
    const f = financial.rows[0];
    const r = routing.rows[0];
    const s = safety.rows[0];
    const a = agents.rows[0];

    const totalTenants = parseInt(p?.total ?? '0');
    const new30d       = parseInt(p?.new_30d ?? '0');
    // growth delta: new tenants this 30d vs prior 30d approximation
    const delta30d = new30d > 0 && totalTenants > new30d
        ? ((new30d / Math.max(totalTenants - new30d, 1)) * 100)
        : 0;

    return NextResponse.json({
        platform: {
            totalTenants,
            new7d:      parseInt(p?.new_7d ?? '0'),
            new30d,
            newToday:   parseInt(p?.new_today ?? '0'),
            active7d:   parseInt(p?.active_7d ?? '0'),
            churnRisk:  parseInt(p?.churn_risk ?? '0'),
            delta30d:   Math.round(delta30d * 10) / 10,
        },
        financial: {
            volAllTime:    parseFloat(f?.vol_all_time ?? '0'),
            vol30d:        parseFloat(f?.vol_30d ?? '0'),
            vol7d:         parseFloat(f?.vol_7d ?? '0'),
            settledCount:  parseInt(f?.settled_count ?? '0'),
            totalCount:    parseInt(f?.total_count ?? '0'),
            successRate:   f?.total_count > 0
                ? Math.round((parseInt(f.settled_count) / parseInt(f.total_count)) * 1000) / 10
                : 0,
        },
        routing: {
            totalRequests24h: parseInt(r?.total_requests ?? '0'),
            requestsLast1h:   parseInt(r?.last_1h ?? '0'),
            cacheHitPct:      parseFloat(r?.cache_hit_pct ?? '0'),
            p50Ms:            parseInt(r?.p50_ms ?? '0'),
            p95Ms:            parseInt(r?.p95_ms ?? '0'),
            p99Ms:            parseInt(r?.p99_ms ?? '0'),
        },
        safety: {
            activeMandates: parseInt(s?.active_mandates ?? '0'),
            openIncidents:  parseInt(s?.open_incidents ?? '0'),
            bannedTenants:  parseInt(s?.banned_tenants ?? '0'),
        },
        agents: {
            activeSessions:  parseInt(a?.active_sessions ?? '0'),
            a2aTasksLast24h: parseInt(a?.a2a_tasks_24h ?? '0'),
            paymentsLast24h: parseInt(a?.payments_24h ?? '0'),
            paymentVol24h:   parseFloat(a?.payment_vol_24h ?? '0'),
        },
        spark: {
            tenantGrowth: spark.rows.map(r => ({
                date:  r.date,
                value: parseInt(r.value),
            })),
        },
    });
}
