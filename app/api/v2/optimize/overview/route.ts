/**
 * GET /api/v2/optimize/overview
 *
 * Read-only Optimize-layer overview for the visible Optimize product surface
 * (Slice 1 of the Optimize roadmap). Backed entirely by existing data sources
 * — does NOT depend on optimization_recommendations, optimization_baselines,
 * action_catalog, or ai_economic_events. Those land in later slices.
 *
 * Returns:
 *   - estimated_monthly_cost_usd:  MTD spend projected to month end
 *   - actual_mtd_cost_usd:         month-to-date spend
 *   - existing_savings_usd:        last-30-day routing savings from execute_requests
 *                                  (baseline list price minus what we actually billed)
 *   - request_count_30d:           last-30-day request volume
 *   - by_provider:                 last-30-day spend grouped by provider
 *   - by_task:                     last-30-day spend grouped by task type
 *   - top_expensive_tasks:         top 5 tasks by cost, with avg cost-per-request
 *   - open_recommendations:        always 0 today; recommendation engine ships in
 *                                  Slice 4 (writes to optimization_recommendations)
 *   - recommendations_state:       'coming_soon' until that table exists; 'live' after
 *
 * Data-source notes:
 *   - traffic_events uses `created_at`
 *   - router_decisions uses `timestamp` (NOT `created_at`) — see schema.sql
 *   - execute_requests uses `created_at` (used by /api/v1/savings)
 *
 * Privacy: this endpoint reads metadata only (no prompt/response content).
 */

import { NextRequest, NextResponse } from 'next/server';
import db from '@/lib/db';
import { requireTenantAccess } from '@/lib/auth';
import { toApiErrorResponse } from '@/lib/errors';

export const dynamic = 'force-dynamic';

interface ProviderSpend {
    provider: string;
    request_count: number;
    total_cost_usd: number;
    avg_cost_usd: number;
}

interface TaskSpend {
    task: string;
    request_count: number;
    total_cost_usd: number;
    avg_cost_usd: number;
}

export interface OptimizeOverviewResponse {
    period_days: number;
    actual_mtd_cost_usd: number;
    estimated_monthly_cost_usd: number;
    existing_savings_usd: number;
    existing_savings_pct: number;
    request_count_30d: number;
    by_provider: ProviderSpend[];
    by_task: TaskSpend[];
    top_expensive_tasks: TaskSpend[];
    // v2_051 — surfaces only when outcome data exists; null until then.
    accepted_output_count_30d: number | null;
    cost_per_accepted_output_usd: number | null;
    open_recommendations: number;
    recommendations_state: 'coming_soon' | 'live';
    coming_soon_label: string;
    privacy_note: string;
}

function startOfMonthUtc(now: Date): Date {
    return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
}

function daysInMonth(now: Date): number {
    return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 0)).getUTCDate();
}

function dayOfMonth(now: Date): number {
    return now.getUTCDate();
}

export async function GET(req: NextRequest) {
    const requestId = crypto.randomUUID();
    try {
        const access = await requireTenantAccess(req);
        if (access.error) {
            return NextResponse.json({ error: access.error }, { status: access.status ?? 401 });
        }
        const tenantId = access.tenantId;

        const now = new Date();
        const monthStart = startOfMonthUtc(now);
        const periodStart = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

        // --- MTD actual spend from traffic_events (the metering source of truth) ----
        const mtdRes = await db.query(
            `SELECT
                COALESCE(SUM(cost_usd), 0)::float AS mtd_cost,
                COUNT(*)::int                     AS mtd_requests
             FROM traffic_events
             WHERE tenant_id = $1
               AND status_code = 200
               AND created_at >= $2`,
            [tenantId, monthStart],
        );
        const mtdRow = mtdRes.rows[0] ?? { mtd_cost: 0, mtd_requests: 0 };
        const actualMtdCostUsd = Number(mtdRow.mtd_cost);

        // Linear projection to end of month. Day-1 returns the day's cost as the
        // forecast (no over/under-projection from a single-hour datapoint).
        const today = dayOfMonth(now);
        const totalDays = daysInMonth(now);
        const projected = today > 0
            ? (actualMtdCostUsd / today) * totalDays
            : actualMtdCostUsd;

        // --- last-30-day breakdowns from traffic_events ----------------------------
        const breakdownRes = await db.query(
            `SELECT
                COALESCE(NULLIF(provider, ''), 'unknown') AS provider,
                COUNT(*)::int                              AS request_count,
                COALESCE(SUM(cost_usd), 0)::float          AS total_cost_usd,
                COALESCE(AVG(cost_usd), 0)::float          AS avg_cost_usd
             FROM traffic_events
             WHERE tenant_id = $1
               AND status_code = 200
               AND created_at >= $2
             GROUP BY 1
             ORDER BY total_cost_usd DESC`,
            [tenantId, periodStart],
        );
        const byProvider: ProviderSpend[] = breakdownRes.rows.map((r) => ({
            provider:        String(r.provider),
            request_count:   Number(r.request_count),
            total_cost_usd:  Number(r.total_cost_usd),
            avg_cost_usd:    Number(r.avg_cost_usd),
        }));

        const total30dCost = byProvider.reduce((sum, r) => sum + r.total_cost_usd, 0);
        const requestCount30d = byProvider.reduce((sum, r) => sum + r.request_count, 0);

        // --- by task / action_type --------------------------------------------------
        // v2_051 added action_type; prefer it when populated and fall back to
        // event_type for legacy rows. The COALESCE order means a single row
        // can answer with whichever bucket fits.
        const taskRes = await db.query(
            `SELECT
                COALESCE(NULLIF(action_type, ''), NULLIF(event_type, ''), 'unknown') AS task,
                COUNT(*)::int                                                          AS request_count,
                COALESCE(SUM(cost_usd), 0)::float                                      AS total_cost_usd,
                COALESCE(AVG(cost_usd), 0)::float                                      AS avg_cost_usd
             FROM traffic_events
             WHERE tenant_id = $1
               AND status_code = 200
               AND created_at >= $2
             GROUP BY 1
             ORDER BY total_cost_usd DESC`,
            [tenantId, periodStart],
        );
        const byTask: TaskSpend[] = taskRes.rows.map((r) => ({
            task:           String(r.task),
            request_count:  Number(r.request_count),
            total_cost_usd: Number(r.total_cost_usd),
            avg_cost_usd:   Number(r.avg_cost_usd),
        }));

        // --- v2_051 — cost per accepted output --------------------------------------
        // Optimize's core efficiency metric. Only meaningful when request_outcomes
        // has data; we fail-soft when the table is missing (Slice 2A not yet
        // applied) or when no outcomes have been recorded yet.
        let acceptedOutputCount: number | null = null;
        let costPerAcceptedOutputUsd: number | null = null;
        try {
            const outcomesRes = await db.query(
                `SELECT
                    COUNT(*) FILTER (WHERE o.status = 'accepted')::int AS accepted_count,
                    COALESCE(SUM(t.cost_usd) FILTER (WHERE o.status = 'accepted'), 0)::float AS accepted_cost
                 FROM request_outcomes o
                 JOIN traffic_events t
                   ON t.tenant_id = o.tenant_id
                  AND t.request_id = o.request_id
                 WHERE o.tenant_id = $1
                   AND o.created_at >= $2`,
                [tenantId, periodStart],
            );
            const o = outcomesRes.rows[0] ?? { accepted_count: 0, accepted_cost: 0 };
            const acceptedCount = Number(o.accepted_count);
            const acceptedCost  = Number(o.accepted_cost);
            if (acceptedCount > 0) {
                acceptedOutputCount = acceptedCount;
                costPerAcceptedOutputUsd = Number((acceptedCost / acceptedCount).toFixed(6));
            }
        } catch {
            // request_outcomes table may not exist yet — fail-soft.
        }

        // --- routing savings: actual_cost vs baseline_cost from execute_requests ----
        // execute_requests is what /api/v1/savings already aggregates. Fail-soft
        // because some tenants may not have any execute_requests rows.
        let existingSavingsUsd = 0;
        let existingSavingsPct = 0;
        try {
            const savRes = await db.query(
                `SELECT
                    COALESCE(SUM(baseline_cost_usd), 0)::float AS baseline,
                    COALESCE(SUM(actual_cost_usd), 0)::float   AS actual
                 FROM execute_requests
                 WHERE tenant_id = $1
                   AND created_at BETWEEN $2 AND $3`,
                [tenantId, periodStart, now],
            );
            const savRow = savRes.rows[0] ?? { baseline: 0, actual: 0 };
            const baseline = Number(savRow.baseline);
            const actual   = Number(savRow.actual);
            existingSavingsUsd = Math.max(0, baseline - actual);
            existingSavingsPct = baseline > 0 ? (existingSavingsUsd / baseline) * 100 : 0;
        } catch {
            // execute_requests may not exist in some tenants; treat as zero savings.
        }

        const body: OptimizeOverviewResponse = {
            period_days: 30,
            actual_mtd_cost_usd: Number(actualMtdCostUsd.toFixed(6)),
            estimated_monthly_cost_usd: Number(projected.toFixed(6)),
            existing_savings_usd: Number(existingSavingsUsd.toFixed(6)),
            existing_savings_pct: Number(existingSavingsPct.toFixed(2)),
            request_count_30d: requestCount30d || Number(mtdRow.mtd_requests),
            by_provider: byProvider,
            by_task: byTask,
            top_expensive_tasks: byTask.slice(0, 5),
            accepted_output_count_30d: acceptedOutputCount,
            cost_per_accepted_output_usd: costPerAcceptedOutputUsd,
            // Recommendation engine ships in Slice 4 (writes to
            // optimization_recommendations, which lands in Slice 3). Until then,
            // the queue is intentionally empty so users see an honest
            // "coming next" surface, not fake recommendations.
            open_recommendations: 0,
            recommendations_state: 'coming_soon',
            coming_soon_label: 'Coming next: action-level optimization',
            // Privacy framing per V5 §10 + privacy-modes-core memory. Optimize
            // depth follows the tenant's privacy mode.
            privacy_note: 'P402 meters economics, not content. Optimization depth follows your privacy mode.',
        };

        return NextResponse.json(body, {
            headers: { 'X-P402-Request-ID': requestId },
        });
    } catch (err) {
        return toApiErrorResponse(err, requestId);
    }
}
