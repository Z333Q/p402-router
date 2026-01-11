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
        const limit = parseInt(searchParams.get('limit') || '10');

        const res = await pool.query(`
            SELECT 
                id, request_id, task, requested_mode, 
                selected_provider_id, selected_model, 
                success, cost_usd, timestamp
            FROM router_decisions
            WHERE tenant_id = $2
            ORDER BY timestamp DESC
            LIMIT $1
        `, [limit, tenantId]);

        return NextResponse.json({ decisions: res.rows });
    } catch (e: any) {
        return NextResponse.json({ error: e.message }, { status: 500 });
    }
}
