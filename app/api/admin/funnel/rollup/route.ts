/**
 * 3AZ-3 — admin funnel rollup.
 *
 * GET /api/admin/funnel/rollup?days=30
 *
 * Returns a stage-by-stage rollup of the V5 onboarding funnel events
 * captured by lib/analytics/funnel.ts (3AZ-2-A). The endpoint is
 * read-only and admin-gated via the standard `analytics.read`
 * permission used by /api/admin/analytics.
 *
 * Response shape:
 *   {
 *     window_days: 30,
 *     since: '2026-05-23T00:00:00.000Z',
 *     stages: [
 *       { stage: 'S0', event: 'funnel.login_view',         total: 142, uniques: 87,  from_prev_pct: null  },
 *       { stage: 'S1', event: 'funnel.signin_started',     total: 96,  uniques: 64,  from_prev_pct: 73.6  },
 *       ...
 *     ],
 *     errors: { total: 3 }
 *   }
 *
 * `total` is raw event count. `uniques` is COUNT(DISTINCT
 * COALESCE(tenant_id::text, anonymous_id, session_id)) — the best
 * approximation of unique users available without a server-side
 * identity stitch. `from_prev_pct` is the transition rate from the
 * prior stage's unique count.
 *
 * Privacy: nothing in the response carries a tenant id, email,
 * anonymous id, session id, or any per-row payload. Aggregations
 * only.
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireAdminAccess, AdminAuthError } from '@/lib/admin/auth';
import db from '@/lib/db';

export const dynamic = 'force-dynamic';

const STAGES = [
    { stage: 'S0', event: 'funnel.login_view' },
    { stage: 'S1', event: 'funnel.signin_started' },
    { stage: 'S2', event: 'funnel.signin_success' },
    { stage: 'S3', event: 'funnel.onboarding_view' },
    { stage: 'S5', event: 'funnel.api_key_issued' },
    { stage: 'S6', event: 'funnel.onboarding_completed' },
    { stage: 'S7', event: 'funnel.dashboard_view' },
    { stage: 'S8', event: 'funnel.dashboard_meaningful' },
] as const;

const STAGE_EVENT_NAMES = STAGES.map((s) => s.event);

type RollupRow = { event_name: string; total: string; uniques: string };

const NO_CACHE_HEADERS: Record<string, string> = {
    'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
    Pragma: 'no-cache',
    Expires: '0',
};

function clampDays(raw: string | null): number {
    const n = parseInt(raw ?? '30', 10);
    if (Number.isNaN(n) || n <= 0) return 30;
    return Math.min(n, 90);
}

function round1(n: number): number {
    return Math.round(n * 10) / 10;
}

export async function GET(req: NextRequest) {
    try {
        await requireAdminAccess('analytics.read');
    } catch (e) {
        if (e instanceof AdminAuthError) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401, headers: NO_CACHE_HEADERS });
        }
        throw e;
    }

    const days = clampDays(req.nextUrl.searchParams.get('days'));
    const sinceMs = Date.now() - days * 24 * 60 * 60 * 1000;
    const since = new Date(sinceMs).toISOString();

    try {
        const { rows } = (await db.query(
            `SELECT event_name,
                    COUNT(*)                                                                    AS total,
                    COUNT(DISTINCT COALESCE(tenant_id::text, anonymous_id, session_id))         AS uniques
             FROM funnel_events
             WHERE event_name = ANY($1::text[])
               AND occurred_at >= $2
             GROUP BY event_name`,
            [STAGE_EVENT_NAMES, since]
        )) as { rows: RollupRow[] };

        const byEvent = new Map<string, { total: number; uniques: number }>();
        for (const row of rows) {
            byEvent.set(row.event_name, {
                total: parseInt(row.total, 10) || 0,
                uniques: parseInt(row.uniques, 10) || 0,
            });
        }

        const stages = STAGES.map((s, idx) => {
            const counts = byEvent.get(s.event) ?? { total: 0, uniques: 0 };
            let from_prev_pct: number | null = null;
            if (idx > 0) {
                const prev = byEvent.get(STAGES[idx - 1]!.event) ?? { total: 0, uniques: 0 };
                if (prev.uniques > 0) {
                    from_prev_pct = round1((counts.uniques / prev.uniques) * 100);
                }
            }
            return {
                stage: s.stage,
                event: s.event,
                total: counts.total,
                uniques: counts.uniques,
                from_prev_pct,
            };
        });

        // Surface error volume separately so it doesn't pollute the
        // sequential conversion math.
        const errorsResult = (await db.query(
            `SELECT COUNT(*) AS total
             FROM funnel_events
             WHERE event_name = 'funnel.error'
               AND occurred_at >= $1`,
            [since]
        )) as { rows: Array<{ total: string }> };
        const errors = {
            total: parseInt(errorsResult.rows[0]?.total ?? '0', 10) || 0,
        };

        return NextResponse.json(
            { window_days: days, since, stages, errors },
            { headers: NO_CACHE_HEADERS }
        );
    } catch (err) {
        // Fail open with empty stages so the admin UI never breaks on a
        // transient DB hiccup. The error is logged for ops.
        console.warn('[admin.funnel.rollup] query failed:', err instanceof Error ? err.message : String(err));
        return NextResponse.json(
            {
                window_days: days,
                since,
                stages: STAGES.map((s, idx) => ({
                    stage: s.stage,
                    event: s.event,
                    total: 0,
                    uniques: 0,
                    from_prev_pct: idx === 0 ? null : 0,
                })),
                errors: { total: 0 },
                degraded: true,
            },
            { headers: NO_CACHE_HEADERS }
        );
    }
}
