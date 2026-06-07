/**
 * GET /api/v2/outcomes/coverage
 *
 * Slice 3K — Outcome Coverage and Optimize Readiness.
 *
 * Read-only, tenant-scoped readiness layer. Answers "do we have enough
 * outcome data to begin Optimize work?" — NEVER produces recommendations
 * or savings claims. The route exposes coverage math, segment readiness,
 * a missing-outcome leaderboard, and a top-level readiness verdict.
 *
 * Privacy posture: metadata-only. The SELECT projections only ever read
 * payment-grade columns from ai_economic_events and request_outcomes —
 * no prompt, response, messages, completion, body, or fingerprint
 * columns appear anywhere.
 */

import { NextRequest, NextResponse } from 'next/server';

import db from '@/lib/db';
import { requireTenantAccess } from '@/lib/auth';
import { toApiErrorResponse } from '@/lib/errors';

import {
    assessTopLevelReadiness,
    fetchMissingOutcomeLeaderboard,
    fetchProviderModelReadiness,
    fetchSegmentReadiness,
    fetchTotals,
    resolveCoverageThresholds,
    type CoverageFilters,
} from '@/lib/prove/coverage';

export const dynamic = 'force-dynamic';

function readFilters(req: NextRequest): CoverageFilters {
    const sp = new URL(req.url).searchParams;
    const f: CoverageFilters = {};
    for (const k of ['since','until','department_id','workflow_id','customer_id','feature_id','provider','model'] as const) {
        const v = sp.get(k);
        if (v && v.length > 0) (f as Record<string, unknown>)[k] = v;
    }
    return f;
}

export async function GET(req: NextRequest) {
    const requestId = crypto.randomUUID();
    try {
        const access = await requireTenantAccess(req);
        if (access.error) {
            return NextResponse.json({ error: access.error }, { status: access.status ?? 401 });
        }
        const tenantId = access.tenantId;

        const filters = readFilters(req);
        const thresholds = resolveCoverageThresholds();

        const [
            totals,
            byDepartment, byWorkflow, byCustomer, byFeature,
            providerModel,
            missing,
        ] = await Promise.all([
            fetchTotals(db, tenantId, filters, thresholds),
            fetchSegmentReadiness(db, tenantId, filters, 'department', thresholds),
            fetchSegmentReadiness(db, tenantId, filters, 'workflow',   thresholds),
            fetchSegmentReadiness(db, tenantId, filters, 'customer',   thresholds),
            fetchSegmentReadiness(db, tenantId, filters, 'feature',    thresholds),
            fetchProviderModelReadiness(db, tenantId, filters, thresholds),
            fetchMissingOutcomeLeaderboard(db, tenantId, filters),
        ]);

        const verdict = assessTopLevelReadiness(totals, thresholds);

        return NextResponse.json({
            ok: true,
            generated_at: new Date().toISOString(),
            filters_applied: filters,
            thresholds,
            readiness: verdict,
            totals,
            segments: {
                by_department: byDepartment,
                by_workflow:   byWorkflow,
                by_customer:   byCustomer,
                by_feature:    byFeature,
            },
            provider_model_matrix: providerModel,
            missing_outcome_leaderboard: missing,
            disclaimers: {
                readiness_not_recommendation: true,
                no_savings_claim:             true,
                content_displayed:            false,
            },
        }, {
            status: 200,
            headers: { 'X-P402-Request-ID': requestId, 'Cache-Control': 'no-store' },
        });
    } catch (err) {
        return toApiErrorResponse(err, requestId);
    }
}
