import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import pool from '@/lib/db';

export async function GET(req: NextRequest) {
    const session = await getServerSession(authOptions);
    const tenantId = (session?.user as any)?.tenantId;

    if (!tenantId) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    try {
        // We aggregate outcomes: plan (402), paid, settled
        // The schema events.outcome stores these.

        const query = `
      SELECT 
        route_id,
        facilitator_id,
        COUNT(*) FILTER (WHERE outcome = 'plan') as plan_count,
        COUNT(*) FILTER (WHERE outcome IN ('paid', 'settled')) as paid_count,
        COUNT(*) FILTER (WHERE outcome = 'settled') as settled_count,
        SUM(CAST(amount AS NUMERIC)) FILTER (WHERE outcome = 'settled') as settled_volume
      FROM events
      WHERE tenant_id = $1
      GROUP BY route_id, facilitator_id
    `;

        const result = await pool.query(query, [tenantId]);

        const stats = result.rows.map(row => ({
            routeId: row.route_id,
            facilitatorId: row.facilitator_id,
            funnel: {
                plans: parseInt(row.plan_count),
                payments: parseInt(row.paid_count),
                settlements: parseInt(row.settled_count)
            },
            conversion: {
                payRate: row.plan_count > 0 ? (row.paid_count / row.plan_count) : 0,
                settleRate: row.paid_count > 0 ? (row.settled_count / row.paid_count) : 0
            },
            volume: parseFloat(row.settled_volume || 0)
        }));

        return NextResponse.json({ stats });
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
