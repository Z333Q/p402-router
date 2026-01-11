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
        const query = `
            SELECT 
                f.facilitator_id,
                f.name,
                f.endpoint,
                f.type,
                f.status as config_status,
                fh.status as health_status,
                fh.p95_verify_ms,
                fh.last_checked_at,
                t.name as tenant_name
            FROM facilitators f
            LEFT JOIN facilitator_health fh ON f.facilitator_id = fh.facilitator_id
            LEFT JOIN tenants t ON f.tenant_id = t.id
            ORDER BY fh.status ASC, f.name ASC
        `;
        const result = await pool.query(query);

        return NextResponse.json({ facilitators: result.rows });
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
