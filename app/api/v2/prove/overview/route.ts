/**
 * GET /api/v2/prove/overview
 *
 * Slice 3G — Prove dashboard aggregation surface. One round trip, full
 * KPI strip + breakdowns + denied analysis + privacy/evidence panels +
 * current-vs-previous spend comparison. Tenant-scoped, read-only,
 * metadata-only.
 */

import { NextRequest, NextResponse } from 'next/server';

import db from '@/lib/db';
import { requireTenantAccess } from '@/lib/auth';
import { toApiErrorResponse } from '@/lib/errors';

import {
    fetchTotals,
    fetchSpendInWindow,
    fetchBreakdown,
    fetchDeniedByCode,
    fetchTopDenyRules,
    fetchDenialOverTime,
    fetchPrivacyDistribution,
    fetchEvidenceCoverageByDim,
    fetchEvidenceCoverageOverall,
} from '@/lib/prove/aggregations';
import type { ProveOverviewResponse } from '@/lib/prove/types';

export const dynamic = 'force-dynamic';

const DEFAULT_WINDOW_DAYS = 30;

function parseWindow(req: NextRequest): { since: Date; until: Date; prevSince: Date; prevUntil: Date } {
    const { searchParams } = new URL(req.url);
    const now = new Date();
    const untilParam = searchParams.get('until');
    const sinceParam = searchParams.get('since');
    const until = untilParam ? new Date(untilParam) : now;
    const since = sinceParam ? new Date(sinceParam) : new Date(until.getTime() - DEFAULT_WINDOW_DAYS * 86_400_000);
    const span  = Math.max(1, until.getTime() - since.getTime());
    const prevUntil = since;
    const prevSince = new Date(since.getTime() - span);
    return { since, until, prevSince, prevUntil };
}

export async function GET(req: NextRequest) {
    const requestId = crypto.randomUUID();
    try {
        const access = await requireTenantAccess(req);
        if (access.error) {
            return NextResponse.json({ error: access.error }, { status: access.status ?? 401 });
        }
        const tenantId = access.tenantId;

        const w = parseWindow(req);
        const win = { since: w.since, until: w.until };
        const prevWin = { since: w.prevSince, until: w.prevUntil };

        const [
            totals,
            currentSpend, previousSpend,
            byDepartment, byEmployee, byApiKey, byWorkflow, byCustomer,
            byFeature, byProvider, byModel, byGovernance,
            deniedByCode, deniedByDepartment, deniedByApiKey, deniedByModel,
            denialOverTime, topDenyRules,
            privacyDistribution,
            evidenceOverall, evidenceByDept, evidenceByWorkflow, evidenceByProvider,
        ] = await Promise.all([
            fetchTotals(db, tenantId, win),
            fetchSpendInWindow(db, tenantId, win),
            fetchSpendInWindow(db, tenantId, prevWin),
            fetchBreakdown(db, tenantId, win, 'department_id'),
            fetchBreakdown(db, tenantId, win, 'employee_id'),
            fetchBreakdown(db, tenantId, win, 'api_key_id'),
            fetchBreakdown(db, tenantId, win, 'workflow_id'),
            fetchBreakdown(db, tenantId, win, 'customer_id'),
            fetchBreakdown(db, tenantId, win, 'feature_id'),
            fetchBreakdown(db, tenantId, win, 'provider'),
            fetchBreakdown(db, tenantId, win, 'model_used'),
            fetchBreakdown(db, tenantId, win, 'governance_decision'),
            fetchDeniedByCode(db, tenantId, win),
            // Denied breakdowns reuse the generic breakdown — the dashboard
            // filters down to denied=count > 0 segments client-side.
            fetchBreakdown(db, tenantId, win, 'department_id'),
            fetchBreakdown(db, tenantId, win, 'api_key_id'),
            fetchBreakdown(db, tenantId, win, 'model_used'),
            fetchDenialOverTime(db, tenantId, win),
            fetchTopDenyRules(db, tenantId, win),
            fetchPrivacyDistribution(db, tenantId, win),
            fetchEvidenceCoverageOverall(db, tenantId, win),
            fetchEvidenceCoverageByDim(db, tenantId, win, 'department_id'),
            fetchEvidenceCoverageByDim(db, tenantId, win, 'workflow_id'),
            fetchEvidenceCoverageByDim(db, tenantId, win, 'provider'),
        ]);

        const delta_pct = previousSpend > 0
            ? ((currentSpend - previousSpend) / previousSpend) * 100
            : null;

        const body: ProveOverviewResponse = {
            ok: true,
            generated_at: new Date().toISOString(),
            window: { since: w.since.toISOString(), until: w.until.toISOString() },
            previous_window: { since: w.prevSince.toISOString(), until: w.prevUntil.toISOString() },
            totals,
            spend_period_comparison: {
                current_usd: currentSpend,
                previous_usd: previousSpend,
                delta_pct,
            },
            breakdowns: {
                by_department: byDepartment,
                by_employee:   byEmployee,
                by_api_key:    byApiKey,
                by_workflow:   byWorkflow,
                by_customer:   byCustomer,
                by_feature:    byFeature,
                by_provider:   byProvider,
                by_model:      byModel,
                by_governance: byGovernance,
            },
            denied: {
                by_code:       deniedByCode,
                by_department: deniedByDepartment.filter((r) => r.denied_count > 0),
                by_api_key:    deniedByApiKey.filter((r) => r.denied_count > 0),
                by_model:      deniedByModel.filter((r) => r.denied_count > 0),
                over_time:     denialOverTime,
                top_deny_rules: topDenyRules,
            },
            privacy: { distribution: privacyDistribution },
            evidence: {
                coverage_overall:       evidenceOverall,
                coverage_by_department: evidenceByDept,
                coverage_by_workflow:   evidenceByWorkflow,
                coverage_by_provider:   evidenceByProvider,
            },
        };

        return NextResponse.json(body, {
            status: 200,
            headers: { 'X-P402-Request-ID': requestId, 'Cache-Control': 'no-store' },
        });
    } catch (err) {
        return toApiErrorResponse(err, requestId);
    }
}
