/**
 * GET /api/v2/audit/economic-event-coverage
 *
 * Tells a CFO / audit reviewer how complete the economic ledger is.
 * Returns three things for the requested window:
 *
 *   1. coverage = ai_economic_events.count / traffic_events.count
 *      where both are filtered to source='chat_completions' (hosted
 *      routing). 100% means every billed AI request also has a
 *      canonical economic event row.
 *
 *   2. outbox depth (status='pending') + abandoned count. Pending should
 *      drain quickly (the retry worker runs every few minutes); abandoned
 *      is the row count that exhausted retries and needs human review.
 *
 *   3. recent failures (last 50) so the audit UI can list error codes and
 *      retry counts. error_message_safe is short and content-free by
 *      construction.
 *
 * Read-only. Tenant-scoped. Safe for any session-authenticated tenant
 * member (admin only is overkill for read-only audit data).
 */

import { NextRequest, NextResponse } from 'next/server';
import db from '@/lib/db';
import { requireTenantAccess } from '@/lib/auth';
import { toApiErrorResponse } from '@/lib/errors';

export const dynamic = 'force-dynamic';

interface RecentFailure {
    id: string;
    request_id: string;
    source: string;
    route: string | null;
    error_code: string;
    error_message_safe: string | null;
    retry_count: number;
    status: 'pending' | 'resolved' | 'abandoned';
    created_at: string;
    next_retry_at: string;
}

export interface CoverageResponse {
    period: { since: string; until: string };
    hosted_requests: number;        // traffic_events with /api/v2/chat/completions
    economic_events: number;        // ai_economic_events with source=chat_completions
    coverage_pct: number;           // events / hosted_requests * 100
    outbox: {
        pending: number;
        abandoned: number;
        oldest_pending_age_seconds: number | null;
    };
    recent_failures: RecentFailure[];
}

export async function GET(req: NextRequest) {
    const requestId = crypto.randomUUID();
    try {
        const access = await requireTenantAccess(req);
        if (access.error) {
            return NextResponse.json({ error: access.error }, { status: access.status ?? 401 });
        }
        const tenantId = access.tenantId;

        const { searchParams } = new URL(req.url);
        const sinceParam = searchParams.get('since');
        const untilParam = searchParams.get('until');
        const until = untilParam ? new Date(untilParam) : new Date();
        const since = sinceParam
            ? new Date(sinceParam)
            : new Date(until.getTime() - 24 * 60 * 60 * 1000);  // default last 24h

        // 1. hosted_requests — count traffic_events for the chat-completions path.
        //    traffic_events is the production write site for hosted routing.
        const hostedRes = await db.query(
            `SELECT COUNT(*)::int AS count
               FROM traffic_events
               WHERE tenant_id = $1
                 AND path = '/api/v2/chat/completions'
                 AND created_at >= $2 AND created_at <= $3`,
            [tenantId, since, until],
        );
        const hostedRequests = Number(hostedRes.rows[0]?.count ?? 0);

        // 2. economic_events for the same window + source. Fail-soft when
        //    ai_economic_events is missing (pre-v2_052 tenants).
        let economicEvents = 0;
        try {
            const eeRes = await db.query(
                `SELECT COUNT(*)::int AS count
                   FROM ai_economic_events
                   WHERE tenant_id = $1
                     AND source = 'chat_completions'
                     AND event_time >= $2 AND event_time <= $3`,
                [tenantId, since, until],
            );
            economicEvents = Number(eeRes.rows[0]?.count ?? 0);
        } catch {
            // table absent; coverage stays 0
        }

        const coveragePct = hostedRequests > 0
            ? Number(((economicEvents / hostedRequests) * 100).toFixed(2))
            : (economicEvents > 0 ? 100 : 0);

        // 3. outbox depth + oldest pending age. Fail-soft (table may be
        //    absent on tenants pre-v2_053).
        let pending = 0, abandoned = 0, oldestPendingAgeSeconds: number | null = null;
        let recentFailures: RecentFailure[] = [];
        try {
            const depthRes = await db.query(
                `SELECT
                    COUNT(*) FILTER (WHERE status = 'pending')::int   AS pending,
                    COUNT(*) FILTER (WHERE status = 'abandoned')::int AS abandoned,
                    EXTRACT(EPOCH FROM (NOW() - MIN(created_at) FILTER (WHERE status = 'pending')))::int AS oldest_pending_age_seconds
                   FROM economic_event_write_failures
                   WHERE tenant_id = $1`,
                [tenantId],
            );
            const row = depthRes.rows[0] ?? {};
            pending   = Number(row.pending ?? 0);
            abandoned = Number(row.abandoned ?? 0);
            oldestPendingAgeSeconds = row.oldest_pending_age_seconds == null
                ? null : Number(row.oldest_pending_age_seconds);

            const failuresRes = await db.query(
                `SELECT id, request_id, source, route, error_code,
                        error_message_safe, retry_count, status,
                        created_at, next_retry_at
                   FROM economic_event_write_failures
                   WHERE tenant_id = $1
                   ORDER BY created_at DESC
                   LIMIT 50`,
                [tenantId],
            );
            recentFailures = failuresRes.rows.map((r) => ({
                id: String(r.id),
                request_id: String(r.request_id),
                source: String(r.source),
                route: r.route ?? null,
                error_code: String(r.error_code),
                error_message_safe: r.error_message_safe ?? null,
                retry_count: Number(r.retry_count),
                status: r.status as RecentFailure['status'],
                created_at: r.created_at instanceof Date ? r.created_at.toISOString() : String(r.created_at),
                next_retry_at: r.next_retry_at instanceof Date ? r.next_retry_at.toISOString() : String(r.next_retry_at),
            }));
        } catch {
            // outbox table absent — pending/abandoned stay 0, recent_failures stays []
        }

        const body: CoverageResponse = {
            period: { since: since.toISOString(), until: until.toISOString() },
            hosted_requests: hostedRequests,
            economic_events: economicEvents,
            coverage_pct: coveragePct,
            outbox: {
                pending,
                abandoned,
                oldest_pending_age_seconds: oldestPendingAgeSeconds,
            },
            recent_failures: recentFailures,
        };

        return NextResponse.json(body, {
            headers: { 'X-P402-Request-ID': requestId },
        });
    } catch (err) {
        return toApiErrorResponse(err, requestId);
    }
}
