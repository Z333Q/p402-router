/**
 * GET /api/v1/savings — Aggregated savings analytics
 *
 * Compares actual_cost vs baseline_cost across execute_requests.
 * Returns totals, time series (bucketed by day), and per-mode breakdown.
 *
 * Query params:
 *   period   — "7d" | "30d" | "90d" (default: "30d")
 *   since    — ISO date override (overrides period)
 *   until    — ISO date override
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireTenantAccess } from '@/lib/auth';
import { toApiErrorResponse } from '@/lib/errors';
import db from '@/lib/db';

export const dynamic = 'force-dynamic';

const PERIOD_DAYS: Record<string, number> = { '7d': 7, '30d': 30, '90d': 90 };

export async function GET(req: NextRequest) {
    const requestId = crypto.randomUUID();
    try {
        const access = await requireTenantAccess(req);
        if (access.error) return NextResponse.json({ error: access.error }, { status: access.status ?? 401 });

        const { searchParams } = new URL(req.url);
        const period = searchParams.get('period') ?? '30d';
        const days = PERIOD_DAYS[period] ?? 30;

        const sinceDate = searchParams.get('since')
            ?? new Date(Date.now() - days * 86_400_000).toISOString();
        const untilDate = searchParams.get('until') ?? new Date().toISOString();

        const baseCondition = `
            tenant_id = $1
            AND status = 'completed'
            AND actual_cost IS NOT NULL
            AND baseline_cost IS NOT NULL
            AND created_at BETWEEN $2 AND $3
        `;
        const baseArgs = [access.tenantId, sinceDate, untilDate];

        const [totalsResult, timeSeriesResult, modeResult, providerResult] = await Promise.all([
            // ── Totals ───────────────────────────────────────────────────────────
            db.query(
                `SELECT
                    COUNT(*)                              AS request_count,
                    SUM(actual_cost)                      AS total_actual,
                    SUM(baseline_cost)                    AS total_baseline,
                    SUM(baseline_cost - actual_cost)      AS total_savings,
                    AVG(baseline_cost - actual_cost)      AS avg_savings_per_request,
                    SUM(CASE WHEN actual_cost = 0 THEN 1 ELSE 0 END) AS cached_count
                 FROM execute_requests
                 WHERE ${baseCondition}`,
                baseArgs
            ),
            // ── Daily time series ─────────────────────────────────────────────
            db.query(
                `SELECT
                    DATE_TRUNC('day', created_at)::date   AS day,
                    COUNT(*)                              AS requests,
                    SUM(actual_cost)                      AS actual,
                    SUM(baseline_cost)                    AS baseline,
                    SUM(baseline_cost - actual_cost)      AS savings
                 FROM execute_requests
                 WHERE ${baseCondition}
                 GROUP BY 1
                 ORDER BY 1 ASC`,
                baseArgs
            ),
            // ── By mode ───────────────────────────────────────────────────────
            db.query(
                `SELECT
                    COALESCE(mode_resolved, mode_requested, 'auto') AS mode,
                    COUNT(*)                              AS requests,
                    SUM(actual_cost)                      AS actual,
                    SUM(baseline_cost)                    AS baseline,
                    SUM(baseline_cost - actual_cost)      AS savings
                 FROM execute_requests
                 WHERE ${baseCondition}
                 GROUP BY 1
                 ORDER BY savings DESC NULLS LAST`,
                baseArgs
            ),
            // ── By provider ───────────────────────────────────────────────────
            db.query(
                `SELECT
                    etn.provider_id                       AS provider,
                    COUNT(DISTINCT r.id)                  AS requests,
                    SUM(r.actual_cost)                    AS actual
                 FROM execute_requests r
                 JOIN execute_traces t   ON t.request_id = r.id
                 JOIN execute_trace_nodes etn ON etn.trace_id = t.id
                     AND etn.provider_id IS NOT NULL
                     AND etn.node_type = 'model'
                 WHERE r.tenant_id = $1
                   AND r.status = 'completed'
                   AND r.created_at BETWEEN $2 AND $3
                 GROUP BY 1
                 ORDER BY actual DESC NULLS LAST
                 LIMIT 10`,
                baseArgs
            ),
        ]);

        type TotalsRow = {
            request_count: string; total_actual: string | null; total_baseline: string | null;
            total_savings: string | null; avg_savings_per_request: string | null;
            cached_count: string;
        };
        type TimeRow = {
            day: string; requests: string; actual: string | null;
            baseline: string | null; savings: string | null;
        };
        type ModeRow = {
            mode: string; requests: string; actual: string | null;
            baseline: string | null; savings: string | null;
        };
        type ProviderRow = {
            provider: string; requests: string; actual: string | null;
        };

        const t = (totalsResult.rows as TotalsRow[])[0];
        const totalBaseline = parseFloat(t?.total_baseline ?? '0');
        const totalActual   = parseFloat(t?.total_actual ?? '0');
        const totalSavings  = parseFloat(t?.total_savings ?? '0');
        const savingsPct    = totalBaseline > 0 ? (totalSavings / totalBaseline) * 100 : 0;

        return NextResponse.json({
            period,
            since: sinceDate,
            until: untilDate,
            totals: {
                request_count: parseInt(t?.request_count ?? '0', 10),
                total_actual_usd: totalActual,
                total_baseline_usd: totalBaseline,
                total_savings_usd: Math.max(0, totalSavings),
                savings_pct: Math.max(0, savingsPct),
                avg_savings_per_request: parseFloat(t?.avg_savings_per_request ?? '0'),
                cached_count: parseInt(t?.cached_count ?? '0', 10),
            },
            time_series: (timeSeriesResult.rows as TimeRow[]).map((r) => ({
                day: r.day,
                requests: parseInt(r.requests, 10),
                actual_usd: parseFloat(r.actual ?? '0'),
                baseline_usd: parseFloat(r.baseline ?? '0'),
                savings_usd: Math.max(0, parseFloat(r.savings ?? '0')),
            })),
            by_mode: (modeResult.rows as ModeRow[]).map((r) => ({
                mode: r.mode,
                requests: parseInt(r.requests, 10),
                actual_usd: parseFloat(r.actual ?? '0'),
                baseline_usd: parseFloat(r.baseline ?? '0'),
                savings_usd: Math.max(0, parseFloat(r.savings ?? '0')),
            })),
            by_provider: (providerResult.rows as ProviderRow[]).map((r) => ({
                provider: r.provider,
                requests: parseInt(r.requests, 10),
                actual_usd: parseFloat(r.actual ?? '0'),
            })),
        });
    } catch (err) {
        return toApiErrorResponse(err, requestId);
    }
}
