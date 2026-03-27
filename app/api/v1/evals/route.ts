/**
 * GET /api/v1/evals — List evaluation history with pass/fail filter
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
        const passed = searchParams.get('passed');   // 'true' | 'false' | null (all)
        const limit  = Math.min(100, Math.max(1, parseInt(searchParams.get('limit') ?? '20', 10)));
        const offset = Math.max(0, parseInt(searchParams.get('offset') ?? '0', 10));
        const since  = searchParams.get('since') ?? undefined;
        const until  = searchParams.get('until') ?? undefined;

        const conditions: string[] = ['e.tenant_id = $1'];
        const values: unknown[] = [access.tenantId];
        let idx = 2;

        if (passed === 'true')  { conditions.push(`e.passed = true`); }
        if (passed === 'false') { conditions.push(`e.passed = false`); }
        if (since) { conditions.push(`e.created_at >= $${idx++}`); values.push(since); }
        if (until) { conditions.push(`e.created_at <= $${idx++}`); values.push(until); }

        const where = conditions.join(' AND ');

        const [dataResult, countResult, statsResult] = await Promise.all([
            db.query(
                `SELECT
                    e.id, e.request_id, e.trace_node_id,
                    e.task, e.overall_score, e.passed, e.pass_threshold,
                    e.scores, e.evaluator_model, e.latency_ms, e.created_at
                 FROM execute_evaluations e
                 WHERE ${where}
                 ORDER BY e.created_at DESC
                 LIMIT $${idx} OFFSET $${idx + 1}`,
                [...values, limit, offset]
            ),
            db.query(
                `SELECT COUNT(*) AS total FROM execute_evaluations e WHERE ${where}`,
                values
            ),
            db.query(
                `SELECT
                    COUNT(*) AS total,
                    COUNT(*) FILTER (WHERE e.passed = true)  AS passed_count,
                    COUNT(*) FILTER (WHERE e.passed = false) AS failed_count,
                    AVG(e.overall_score) AS avg_score
                 FROM execute_evaluations e
                 WHERE e.tenant_id = $1`,
                [access.tenantId]
            ),
        ]);

        type EvalRow = {
            id: string; request_id: string; trace_node_id: string | null;
            task: string; overall_score: number; passed: boolean;
            pass_threshold: number; scores: unknown; evaluator_model: string;
            latency_ms: number | null; created_at: string;
        };
        type StatsRow = {
            total: string; passed_count: string; failed_count: string; avg_score: string | null;
        };

        const evals = (dataResult.rows as EvalRow[]).map((e) => ({
            id: e.id,
            request_id: e.request_id,
            trace_node_id: e.trace_node_id,
            task: e.task.length > 120 ? e.task.slice(0, 120) + '…' : e.task,
            overall_score: e.overall_score,
            passed: e.passed,
            pass_threshold: e.pass_threshold,
            scores: e.scores,
            evaluator_model: e.evaluator_model,
            latency_ms: e.latency_ms,
            created_at: e.created_at,
        }));

        const stats = (statsResult.rows as StatsRow[])[0];
        const total = parseInt((countResult.rows as Array<{ total: string }>)[0]?.total ?? '0', 10);

        return NextResponse.json({
            evals,
            total,
            limit,
            offset,
            aggregate: {
                total_evals: parseInt(stats?.total ?? '0', 10),
                passed: parseInt(stats?.passed_count ?? '0', 10),
                failed: parseInt(stats?.failed_count ?? '0', 10),
                pass_rate: stats?.total && parseInt(stats.total, 10) > 0
                    ? parseInt(stats.passed_count, 10) / parseInt(stats.total, 10)
                    : null,
                avg_score: stats?.avg_score ? parseFloat(stats.avg_score) : null,
            },
        });
    } catch (err) {
        return toApiErrorResponse(err, requestId);
    }
}
