import { NextResponse, NextRequest } from 'next/server';
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import pool from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
    const session = await getServerSession(authOptions)
    const tenantId = (session?.user as any)?.tenantId

    if (!tenantId) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    try {
        const { searchParams } = new URL(request.url);
        const range = searchParams.get('range') || '30d'; // default 30 days

        // 1. Total Spend (Today vs All Time in range)
        const totalSpendRes = await pool.query(`
            SELECT 
                COALESCE(SUM(cost_usd), 0) as total,
                COALESCE(SUM(CASE WHEN timestamp > NOW() - INTERVAL '24 hours' THEN cost_usd ELSE 0 END), 0) as today
            FROM router_decisions
            WHERE tenant_id = $1 AND timestamp > NOW() - INTERVAL '30 days'
        `, [tenantId]);

        // 2. Spend by Provider
        const providerSpendRes = await pool.query(`
            SELECT 
                selected_provider_id as provider,
                COALESCE(SUM(cost_usd), 0) as amount,
                COUNT(*) as count
            FROM router_decisions
            WHERE tenant_id = $1 AND timestamp > NOW() - INTERVAL '30 days'
            GROUP BY selected_provider_id
            ORDER BY amount DESC
        `, [tenantId]);

        // 3. Daily Velocity (for chart)
        const historyRes = await pool.query(`
            SELECT 
                DATE_TRUNC('day', timestamp) as date,
                COALESCE(SUM(cost_usd), 0) as amount
            FROM router_decisions
            WHERE tenant_id = $1 AND timestamp > NOW() - INTERVAL '30 days'
            GROUP BY DATE_TRUNC('day', timestamp)
            ORDER BY date ASC
        `, [tenantId]);

        const data = {
            summary: {
                total: parseFloat(totalSpendRes.rows[0].total),
                today: parseFloat(totalSpendRes.rows[0].today),
                projected: parseFloat(totalSpendRes.rows[0].total) * 1.2, // Simple projection
            },
            byProvider: providerSpendRes.rows.map(r => ({
                name: r.provider || 'unknown',
                value: parseFloat(r.amount),
                count: parseInt(r.count)
            })),
            history: historyRes.rows.map(r => ({
                date: r.date,
                amount: parseFloat(r.amount)
            }))
        };

        return NextResponse.json(data);
    } catch (e: any) {
        console.error('Analytics API Error:', e);
        return NextResponse.json({ error: e.message }, { status: 500 });
    }
}
