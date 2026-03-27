/**
 * GET /api/v1/requests — List execute requests with filters and pagination
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireTenantAccess } from '@/lib/auth';
import { toApiErrorResponse } from '@/lib/errors';
import db from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
    const requestId = crypto.randomUUID();
    try {
        const access = await requireTenantAccess(req);
        if (access.error) return NextResponse.json({ error: access.error }, { status: access.status ?? 401 });

        const { searchParams } = new URL(req.url);
        const status = searchParams.get('status') ?? undefined;
        const mode = searchParams.get('mode') ?? undefined;
        const limit = Math.min(100, Math.max(1, parseInt(searchParams.get('limit') ?? '20', 10)));
        const offset = Math.max(0, parseInt(searchParams.get('offset') ?? '0', 10));
        const since = searchParams.get('since') ?? undefined;
        const until = searchParams.get('until') ?? undefined;

        const conditions: string[] = ['r.tenant_id = $1'];
        const values: unknown[] = [access.tenantId];
        let idx = 2;

        if (status) { conditions.push(`r.status = $${idx++}`); values.push(status); }
        if (mode)   { conditions.push(`r.mode_resolved = $${idx++}`); values.push(mode); }
        if (since)  { conditions.push(`r.created_at >= $${idx++}`); values.push(since); }
        if (until)  { conditions.push(`r.created_at <= $${idx++}`); values.push(until); }

        const where = conditions.join(' AND ');

        const [dataResult, countResult] = await Promise.all([
            db.query(
                `SELECT
                    r.id, r.task, r.status, r.mode_requested, r.mode_resolved,
                    r.budget_cap, r.actual_cost, r.baseline_cost,
                    r.created_at, r.completed_at,
                    t.id AS trace_id
                 FROM execute_requests r
                 LEFT JOIN execute_traces t ON t.request_id = r.id
                 WHERE ${where}
                 ORDER BY r.created_at DESC
                 LIMIT $${idx} OFFSET $${idx + 1}`,
                [...values, limit, offset]
            ),
            db.query(
                `SELECT COUNT(*) AS total FROM execute_requests r WHERE ${where}`,
                values
            ),
        ]);

        type RequestRow = {
            id: string; task: string; status: string;
            mode_requested: string | null; mode_resolved: string | null;
            budget_cap: string | null; actual_cost: string | null; baseline_cost: string | null;
            created_at: string; completed_at: string | null; trace_id: string | null;
        };

        const requests = (dataResult.rows as RequestRow[]).map((r) => ({
            id: r.id,
            task: r.task.length > 120 ? r.task.slice(0, 120) + '…' : r.task,
            status: r.status,
            mode_requested: r.mode_requested,
            mode_resolved: r.mode_resolved,
            budget_cap: r.budget_cap ? parseFloat(r.budget_cap) : null,
            actual_cost: r.actual_cost ? parseFloat(r.actual_cost) : null,
            baseline_cost: r.baseline_cost ? parseFloat(r.baseline_cost) : null,
            savings: (r.baseline_cost && r.actual_cost)
                ? Math.max(0, parseFloat(r.baseline_cost) - parseFloat(r.actual_cost))
                : null,
            created_at: r.created_at,
            completed_at: r.completed_at,
            trace_id: r.trace_id,
        }));

        const total = parseInt((countResult.rows as Array<{ total: string }>)[0]?.total ?? '0', 10);

        return NextResponse.json({ requests, total, limit, offset });
    } catch (err) {
        return toApiErrorResponse(err, requestId);
    }
}
