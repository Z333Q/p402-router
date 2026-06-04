/**
 * POST /api/internal/cron/economic-events/retry
 *
 * Drains pending rows from economic_event_write_failures. Each row is
 * replayed through writeEconomicEvent, which re-resolves the tenant +
 * scope privacy posture at replay time.
 *
 * Authentication: Bearer ${CRON_SECRET}. This is an internal endpoint.
 *
 * Returns counts so the scheduler (Vercel cron, GitHub Action, etc.) can
 * alert on abnormal abandon rates.
 */

import { NextRequest, NextResponse } from 'next/server';
import db from '@/lib/db';
import { replayOutboxRow, type PendingOutboxRow, type ReplayResult } from '@/lib/economic-events/retry-worker';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

interface CronResult {
    ok: true;
    attempted: number;
    resolved: number;
    retried: number;
    abandoned: number;
    errors: number;        // rows whose replay threw an unexpected error
    duration_ms: number;
}

export async function POST(req: NextRequest) {
    const start = Date.now();

    const authHeader = req.headers.get('authorization');
    if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Configurable batch size; default 100. Cap at 500 so a single tick
    // can't monopolize the DB connection pool.
    const url = new URL(req.url);
    const requestedBatch = Number(url.searchParams.get('batch') ?? '100');
    const batchSize = Math.min(500, Math.max(1, Number.isFinite(requestedBatch) ? Math.floor(requestedBatch) : 100));

    let resolved = 0, retried = 0, abandoned = 0, errors = 0;
    let attempted = 0;

    try {
        const r = await db.query(
            `SELECT id, tenant_id, request_id, source, route,
                    error_code, error_message_safe, retry_count,
                    next_retry_at, payload
               FROM economic_event_write_failures
               WHERE status = 'pending'
                 AND next_retry_at <= NOW()
               ORDER BY next_retry_at ASC
               LIMIT $1
               FOR UPDATE SKIP LOCKED`,
            [batchSize],
        );

        const rows = r.rows as PendingOutboxRow[];
        attempted = rows.length;

        // Sequential replay — one bad row should not break the batch.
        // Each replay's outcome is recorded; sequential keeps the DB
        // connection footprint predictable.
        for (const row of rows) {
            let outcome: ReplayResult['outcome'] | 'error';
            try {
                const res = await replayOutboxRow(row);
                outcome = res.outcome;
            } catch (e) {
                console.error('[economic-events:retry] unexpected error for row', row.id, e instanceof Error ? e.message : e);
                errors += 1;
                outcome = 'error';
            }
            if (outcome === 'resolved')  resolved  += 1;
            else if (outcome === 'retried')   retried   += 1;
            else if (outcome === 'abandoned') abandoned += 1;
        }
    } catch (e) {
        console.error('[economic-events:retry] batch query failed:', e instanceof Error ? e.message : e);
        return NextResponse.json({
            error: 'batch_query_failed',
            message: e instanceof Error ? e.message : 'unknown',
        }, { status: 500 });
    }

    const body: CronResult = {
        ok: true,
        attempted, resolved, retried, abandoned, errors,
        duration_ms: Date.now() - start,
    };
    return NextResponse.json(body);
}
