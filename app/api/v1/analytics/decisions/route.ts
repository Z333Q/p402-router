import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/db';
import { requireTenantAccess } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
    const access = await requireTenantAccess(request);
    if (access.error) {
        return NextResponse.json({ error: access.error }, { status: access.status });
    }
    const tenantId = access.tenantId;

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
