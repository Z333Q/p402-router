/**
 * GET /api/v2/outcomes/setup
 *
 * Slice 3L — Outcome Capture Activation Kit.
 *
 * Read-only. Composes the Slice 3K readiness summary with the static
 * activation content from lib/prove/outcome-setup.ts. Never writes
 * outcomes; never produces recommendations.
 *
 * The response is shaped so the /dashboard/prove/outcomes/setup page can
 * render every section in one render pass, and so a future docs site
 * can pull the same payload without screen-scraping the dashboard.
 */

import { NextRequest, NextResponse } from 'next/server';

import db from '@/lib/db';
import { requireTenantAccess } from '@/lib/auth';
import { toApiErrorResponse } from '@/lib/errors';

import {
    fetchMissingOutcomeLeaderboard,
    fetchTotals,
    resolveCoverageThresholds,
    assessTopLevelReadiness,
    type CoverageFilters,
} from '@/lib/prove/coverage';

import {
    ALLOWED_METADATA_EXAMPLES,
    COMMON_VALIDATION_ERRORS,
    EXAMPLES,
    INTEGRATION_CHECKLIST,
    SETUP_DISCLAIMER_COPY,
    SETUP_INTRO_COPY,
    buildSetupApiInfo,
} from '@/lib/prove/outcome-setup';

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

        // Just two DB calls — totals and the missing-outcome leaderboard.
        // The full readiness page (Slice 3K) is at /dashboard/prove/outcomes;
        // setup is intentionally lighter so the page paints fast.
        const [totals, missingSegments] = await Promise.all([
            fetchTotals(db, tenantId, filters, thresholds),
            fetchMissingOutcomeLeaderboard(db, tenantId, filters, 10),
        ]);

        const readiness = assessTopLevelReadiness(totals, thresholds);

        return NextResponse.json({
            ok: true,
            generated_at: new Date().toISOString(),
            filters_applied: filters,
            intro_copy: SETUP_INTRO_COPY,
            disclaimer_copy: SETUP_DISCLAIMER_COPY,
            readiness_summary: {
                status: readiness.status,
                reason: readiness.reason,
                explainer: readiness.explainer,
                coverage_pct: totals.coverage_pct,
                events_with_outcome: totals.events_with_outcome,
                total_events: totals.total_events,
                accepted_count: totals.status.accepted,
                window_days: totals.window_days,
                cost_per_accepted_output_usd: totals.cost_per_accepted_output_usd,
                cost_per_accepted_insufficient_data: totals.cost_per_accepted_insufficient_data,
            },
            thresholds,
            top_missing_segments: missingSegments,
            integration_checklist: INTEGRATION_CHECKLIST,
            examples: EXAMPLES,
            allowed_metadata_examples: ALLOWED_METADATA_EXAMPLES,
            common_validation_errors: COMMON_VALIDATION_ERRORS,
            api: buildSetupApiInfo(),
            disclaimers: {
                readiness_not_recommendation: true,
                no_savings_claim:             true,
                content_displayed:            false,
                writes_from_this_endpoint:    false,
            },
        }, {
            status: 200,
            headers: { 'X-P402-Request-ID': requestId, 'Cache-Control': 'no-store' },
        });
    } catch (err) {
        return toApiErrorResponse(err, requestId);
    }
}
