/**
 * GET /api/v2/accountability/health
 *
 * Slice 3M — Accountability Health Center.
 *
 * Single executive readiness surface. Read-only, tenant-scoped,
 * metadata-only. Composes Slice 3D / 3F / 3K assessments with a small
 * number of Slice 3M-local aggregations into one envelope with eight
 * health dimensions, a weighted overall score (blocked dimensions are
 * NEVER averaged away), and a ranked, non-recommendation cleanup list.
 *
 * Disclaimers explicit on every response:
 *   readiness_not_recommendation, no_savings_claim, content_displayed: false,
 *   runtime_flip_unchanged, optimize_recommendations_blocked.
 */

import { NextRequest, NextResponse } from 'next/server';

import db from '@/lib/db';
import { requireTenantAccess } from '@/lib/auth';
import { toApiErrorResponse } from '@/lib/errors';

import { loadAccountabilityDimensions } from '@/lib/accountability/loader';
import { buildCleanupPriorities, composeOverall } from '@/lib/accountability/score';
import type { AccountabilityResponse } from '@/lib/accountability/types';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
    const requestId = crypto.randomUUID();
    try {
        const access = await requireTenantAccess(req);
        if (access.error) {
            return NextResponse.json({ error: access.error }, { status: access.status ?? 401 });
        }
        const tenantId = access.tenantId;

        const sp = new URL(req.url).searchParams;
        const sinceArg = sp.get('since');
        const untilArg = sp.get('until');
        const opts: { since?: Date; until?: Date } = {};
        if (sinceArg) {
            const d = new Date(sinceArg);
            if (!Number.isNaN(d.getTime())) opts.since = d;
        }
        if (untilArg) {
            const d = new Date(untilArg);
            if (!Number.isNaN(d.getTime())) opts.until = d;
        }

        const { dimensions, period } = await loadAccountabilityDimensions(db, tenantId, opts);
        const overall = composeOverall(dimensions);
        const cleanup_priorities = buildCleanupPriorities(dimensions);

        const body: AccountabilityResponse = {
            ok: true,
            generated_at: new Date().toISOString(),
            period,
            overall,
            dimensions,
            cleanup_priorities,
            disclaimers: {
                readiness_not_recommendation:     true,
                no_savings_claim:                 true,
                content_displayed:                false,
                runtime_flip_unchanged:           true,
                optimize_recommendations_blocked: true,
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
