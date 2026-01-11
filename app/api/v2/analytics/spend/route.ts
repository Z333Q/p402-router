/**
 * P402 V2 Analytics Spend Endpoint
 * =================================
 * Track and analyze AI API spending.
 * 
 * GET /api/v2/analytics/spend - Get spend summary
 * GET /api/v2/analytics/spend?period=7d - Last 7 days
 * GET /api/v2/analytics/spend?group_by=provider - Group by provider
 */

import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/db';

export async function GET(req: NextRequest) {
    const searchParams = req.nextUrl.searchParams;
    const tenantId = searchParams.get('tenant_id') || req.headers.get('x-p402-tenant') || 'default';
    const period = searchParams.get('period') || '30d';
    const groupBy = searchParams.get('group_by') || 'day';

    try {
        // Parse period
        const periodDays = parsePeriod(period);
        const startDate = new Date();
        startDate.setDate(startDate.getDate() - periodDays);

        // Query router_decisions for spend data
        const spendQuery = `
            SELECT 
                DATE_TRUNC($1, created_at) as period,
                selected_provider_id as provider,
                task,
                COUNT(*) as request_count,
                SUM(cost_usd) as total_cost_usd,
                AVG(cost_usd) as avg_cost_usd,
                SUM(CASE WHEN success THEN 1 ELSE 0 END) as success_count,
                AVG(CASE WHEN success THEN 1.0 ELSE 0.0 END) as success_rate
            FROM router_decisions
            WHERE tenant_id = $2
            AND created_at >= $3
            GROUP BY DATE_TRUNC($1, created_at), selected_provider_id, task
            ORDER BY period DESC
        `;

        const result = await pool.query(spendQuery, [groupBy, tenantId, startDate]);

        // Aggregate totals
        const totals = {
            total_requests: 0,
            total_cost_usd: 0,
            avg_cost_per_request: 0,
            success_rate: 0,
            by_provider: {} as Record<string, { requests: number; cost_usd: number }>,
            by_task: {} as Record<string, { requests: number; cost_usd: number }>
        };

        for (const row of result.rows) {
            totals.total_requests += parseInt(row.request_count);
            totals.total_cost_usd += parseFloat(row.total_cost_usd || 0);

            // Aggregate by provider
            const provider = row.provider || 'unknown';
            if (!totals.by_provider[provider]) {
                totals.by_provider[provider] = { requests: 0, cost_usd: 0 };
            }
            const pData = totals.by_provider[provider]!;
            pData.requests += parseInt(row.request_count);
            pData.cost_usd += parseFloat(row.total_cost_usd || 0);

            // Aggregate by task
            const task = row.task || 'default';
            if (!totals.by_task[task]) {
                totals.by_task[task] = { requests: 0, cost_usd: 0 };
            }
            const tData = totals.by_task[task]!;
            tData.requests += parseInt(row.request_count);
            tData.cost_usd += parseFloat(row.total_cost_usd || 0);
        }

        if (totals.total_requests > 0) {
            totals.avg_cost_per_request = totals.total_cost_usd / totals.total_requests;
        }

        // Format time series data
        const timeSeries = result.rows.map(row => ({
            period: row.period,
            provider: row.provider,
            task: row.task,
            requests: parseInt(row.request_count),
            cost_usd: parseFloat(row.total_cost_usd || 0),
            avg_cost_usd: parseFloat(row.avg_cost_usd || 0),
            success_rate: parseFloat(row.success_rate || 0)
        }));

        return NextResponse.json({
            object: 'spend_analytics',
            tenant_id: tenantId,
            period: {
                days: periodDays,
                start: startDate.toISOString(),
                end: new Date().toISOString()
            },
            summary: {
                total_requests: totals.total_requests,
                total_cost_usd: Math.round(totals.total_cost_usd * 1000000) / 1000000,
                avg_cost_per_request: Math.round(totals.avg_cost_per_request * 1000000) / 1000000,
                projected_monthly_cost: Math.round((totals.total_cost_usd / periodDays) * 30 * 100) / 100
            },
            by_provider: Object.entries(totals.by_provider).map(([provider, data]) => ({
                provider,
                requests: data.requests,
                cost_usd: Math.round(data.cost_usd * 1000000) / 1000000,
                percentage: totals.total_cost_usd > 0
                    ? Math.round((data.cost_usd / totals.total_cost_usd) * 100)
                    : 0
            })).sort((a, b) => b.cost_usd - a.cost_usd),
            by_task: Object.entries(totals.by_task).map(([task, data]) => ({
                task,
                requests: data.requests,
                cost_usd: Math.round(data.cost_usd * 1000000) / 1000000,
                percentage: totals.total_cost_usd > 0
                    ? Math.round((data.cost_usd / totals.total_cost_usd) * 100)
                    : 0
            })).sort((a, b) => b.cost_usd - a.cost_usd),
            time_series: timeSeries
        });

    } catch (error: any) {
        console.error('[Analytics/Spend] Error:', error);

        // Return empty analytics if no data
        return NextResponse.json({
            object: 'spend_analytics',
            tenant_id: tenantId,
            period: {
                days: parsePeriod(period),
                start: new Date().toISOString(),
                end: new Date().toISOString()
            },
            summary: {
                total_requests: 0,
                total_cost_usd: 0,
                avg_cost_per_request: 0,
                projected_monthly_cost: 0
            },
            by_provider: [],
            by_task: [],
            time_series: [],
            meta: {
                message: 'No spend data available yet. Start making API calls to see analytics.'
            }
        });
    }
}

function parsePeriod(period: string): number {
    const match = period.match(/^(\d+)(d|w|m)$/);
    if (!match) return 30;

    const value = parseInt(match[1]!);
    const unit = match[2]!;

    switch (unit) {
        case 'd': return value;
        case 'w': return value * 7;
        case 'm': return value * 30;
        default: return 30;
    }
}
