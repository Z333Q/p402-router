import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import db from "@/lib/db";

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
    const session = await getServerSession(authOptions);
    if (!session?.user || !(session.user as any).isAdmin) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    try {
        const url = new URL(req.url);
        const statusStr = url.searchParams.get('status') || 'open';

        // Allowed statuses
        const statuses = statusStr.split(',').filter(s => ['open', 'investigating', 'resolved', 'false_positive'].includes(s));

        if (statuses.length === 0) {
            statuses.push('open');
        }

        const queryCount = statuses.map((_, i) => `$${i + 1}`).join(',');

        const q = `
            SELECT 
                si.id, 
                si.tenant_id, 
                si.severity, 
                si.category, 
                si.description, 
                si.status, 
                si.created_at,
                tr.trust_score,
                t.owner_email
            FROM safety_incidents si
            LEFT JOIN tenant_reputation tr ON si.tenant_id = tr.tenant_id
            LEFT JOIN tenants t ON si.tenant_id = t.id
            WHERE si.status IN (${queryCount})
            ORDER BY 
                CASE si.severity 
                    WHEN 'critical' THEN 1 
                    WHEN 'high' THEN 2 
                    WHEN 'medium' THEN 3 
                    WHEN 'low' THEN 4 
                END,
                si.created_at DESC
            LIMIT 100
        `;

        const { rows } = await db.query(q, statuses);

        return NextResponse.json({ incidents: rows });

    } catch (error: any) {
        console.error("Failed to fetch safety incidents", error);
        return NextResponse.json({ error: "Server Error" }, { status: 500 });
    }
}

export async function POST(req: NextRequest) {
    const session = await getServerSession(authOptions);
    if (!session?.user || !(session.user as any).isAdmin) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    try {
        const { incidentId, action, reason } = await req.json();

        if (!incidentId || !action) {
            return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
        }

        const adminEmail = session.user.email || 'unknown_admin';

        await db.query('BEGIN');

        try {
            // Fetch the incident
            const incRes = await db.query('SELECT tenant_id, status FROM safety_incidents WHERE id = $1', [incidentId]);
            if (incRes.rows.length === 0) {
                await db.query('ROLLBACK');
                return NextResponse.json({ error: "Incident not found" }, { status: 404 });
            }

            const tenantId = incRes.rows[0].tenant_id;

            if (action === 'ban') {
                // Manually ban the tenant
                await db.query(`
                    INSERT INTO tenant_reputation (tenant_id, trust_score, is_banned, banned_reason, updated_at)
                    VALUES ($1, 0, true, $2, NOW())
                    ON CONFLICT (tenant_id) 
                    DO UPDATE SET trust_score = 0, is_banned = true, banned_reason = $2, updated_at = NOW()
                `, [tenantId, `Admin Ban: ${reason || 'Manual review'}`]);

                // Update incident
                await db.query(`
                    UPDATE safety_incidents SET status = 'resolved', resolved_by = $1, resolved_at = NOW() 
                    WHERE id = $2
                `, [adminEmail, incidentId]);

            } else if (action === 'unban' || action === 'false_positive') {
                // Restore tenant access, bump score slightly
                await db.query(`
                    UPDATE tenant_reputation 
                    SET is_banned = false, trust_score = 50, banned_reason = NULL, updated_at = NOW()
                    WHERE tenant_id = $1
                `, [tenantId]);

                // Update incident
                await db.query(`
                    UPDATE safety_incidents SET status = $1, resolved_by = $2, resolved_at = NOW() 
                    WHERE id = $3
                `, [action === 'false_positive' ? 'false_positive' : 'resolved', adminEmail, incidentId]);
            } else if (action === 'investigate') {
                await db.query(`
                    UPDATE safety_incidents SET status = 'investigating', updated_at = NOW() 
                    WHERE id = $1
                `, [incidentId]);
            }

            await db.query('COMMIT');
            return NextResponse.json({ success: true });

        } catch (txErr) {
            await db.query('ROLLBACK');
            throw txErr;
        }

    } catch (error: any) {
        console.error("Failed to update incident action", error);
        return NextResponse.json({ error: "Server Error" }, { status: 500 });
    }
}
