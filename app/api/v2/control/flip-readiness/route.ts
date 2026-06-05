/**
 * GET /api/v2/control/flip-readiness
 *
 * Slice 3D — Runtime flip readiness.
 *
 * Tells operators whether budget enforcement can safely switch from the
 * legacy traffic_events source to the canonical ai_economic_events ledger
 * without weakening spend controls. This route is read-only and tenant-
 * scoped.
 *
 * Payment-protocol-grade gate:
 *   - Fail-closed on loader errors and missing measurement data.
 *   - No env-only truth for denied-event write path — multi-signal check.
 *   - Per-scope worst-bucket delta evaluation (no averaging).
 *   - ready_to_flip requires the previous full UTC calendar month to pass.
 *
 * This endpoint NEVER mutates runtime enforcement. It only reports
 * readiness. The flip itself is a future operator action gated by the
 * Slice 3E denied-event implementation.
 */

import { NextRequest, NextResponse } from 'next/server';

import db from '@/lib/db';
import { requireTenantAccess } from '@/lib/auth';
import { toApiErrorResponse } from '@/lib/errors';

import { assess } from '@/lib/flip-readiness/assess';
import { loadAssessmentInput } from '@/lib/flip-readiness/loader';
import { resolveThresholds } from '@/lib/flip-readiness/thresholds';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
    const requestId = crypto.randomUUID();
    try {
        const access = await requireTenantAccess(req);
        if (access.error) {
            return NextResponse.json({ error: access.error }, { status: access.status ?? 401 });
        }
        const tenantId = access.tenantId;
        const now = new Date();
        const input = await loadAssessmentInput(db, tenantId, { now });
        const thresholds = resolveThresholds();
        const assessment = assess(input, thresholds);
        return NextResponse.json(assessment, { status: 200 });
    } catch (e) {
        return toApiErrorResponse(e, requestId);
    }
}
