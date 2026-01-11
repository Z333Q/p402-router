import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import pool from '@/lib/db';

async function isAdmin(req: NextRequest) {
    const session = await getServerSession(authOptions);
    return (session?.user as any)?.isAdmin === true;
}

export async function GET(req: NextRequest) {
    if (!await isAdmin(req)) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    try {
        const statsQuery = `
            SELECT 
                (SELECT COUNT(*) FROM tenants) as total_tenants,
                (SELECT COUNT(*) FROM events) as total_events,
                (SELECT COUNT(*) FROM events WHERE outcome = 'settled') as settled_events,
                (SELECT SUM(CAST(amount AS NUMERIC)) FROM events WHERE outcome = 'settled') as total_volume_usd,
                (SELECT COUNT(*) FROM facilitators) as total_facilitators
        `;

        const statsRes = await pool.query(statsQuery);
        const stats = statsRes.rows[0];

        // Recent platform activity
        const recentEventsQuery = `
            SELECT e.*, t.name as tenant_name
            FROM events e
            LEFT JOIN tenants t ON e.tenant_id = t.id
            ORDER BY e.created_at DESC
            LIMIT 10
        `;
        const recentRes = await pool.query(recentEventsQuery);

        return NextResponse.json({
            summary: {
                totalTenants: parseInt(stats.total_tenants),
                totalEvents: parseInt(stats.total_events),
                settledEvents: parseInt(stats.settled_events),
                totalVolumeUsd: parseFloat(stats.total_volume_usd || 0),
                totalFacilitators: parseInt(stats.total_facilitators),
                successRate: stats.total_events > 0 ? (stats.settled_events / stats.total_events) : 0
            },
            recentEvents: recentRes.rows
        });
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
