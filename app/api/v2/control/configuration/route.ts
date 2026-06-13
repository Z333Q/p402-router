/**
 * GET / PATCH /api/v2/control/configuration
 *
 * Slice 3S — Control Configuration Foundation. The first writable
 * Control surface. Reads return the tenant defaults (or the system
 * default when no row exists); writes UPSERT the tenant row and are
 * gated by requireTenantAdminAccess.
 *
 * IMPORTANT: this slice ONLY persists the tenant defaults. It does NOT:
 *   - wire saved values into the runtime budget-guard
 *   - alter the Control simulator
 *   - change Optimize / Settle / Publish / Prove behavior
 *
 * The runtime wire-up and simulator wire-up land in later approved
 * slices. See lib/control/configuration.ts for the canonical types and
 * validator.
 */

import { NextRequest, NextResponse } from 'next/server';

import { requireTenantAccess, requireTenantAdminAccess } from '@/lib/auth';
import { ApiError, toApiErrorResponse } from '@/lib/errors';
import {
    getTenantControlSettings,
    upsertTenantControlSettings,
    validatePatchInput,
} from '@/lib/control/configuration';

export const dynamic = 'force-dynamic';

// ─────────────────────────────────────────────────────────────────────────────
// GET — any authenticated tenant member can read.
// ─────────────────────────────────────────────────────────────────────────────
export async function GET(req: NextRequest) {
    const requestId = crypto.randomUUID();
    try {
        const access = await requireTenantAccess(req);
        if ('error' in access) {
            return NextResponse.json({ error: access.error }, { status: access.status ?? 401 });
        }
        const settings = await getTenantControlSettings(access.tenantId);
        return NextResponse.json(
            { ok: true, settings },
            { headers: { 'X-P402-Request-ID': requestId } },
        );
    } catch (err) {
        return toApiErrorResponse(err, requestId);
    }
}

// ─────────────────────────────────────────────────────────────────────────────
// PATCH — tenant owner or global admin only. UPSERT with COALESCE so
// partial updates preserve untouched fields.
// ─────────────────────────────────────────────────────────────────────────────
export async function PATCH(req: NextRequest) {
    const requestId = crypto.randomUUID();
    try {
        const access = await requireTenantAdminAccess(req);
        if ('error' in access) {
            return NextResponse.json({ error: access.error }, { status: access.status });
        }
        const { tenantId, actorEmail } = access;

        let body: unknown;
        try {
            body = await req.json();
        } catch {
            throw new ApiError({
                code: 'INVALID_INPUT',
                status: 400,
                message: 'Body must be valid JSON.',
                requestId,
            });
        }

        const parsed = validatePatchInput(body);
        if ('code' in parsed) {
            throw new ApiError({
                code: parsed.code,
                status: 400,
                message: parsed.message,
                requestId,
            });
        }

        const settings = await upsertTenantControlSettings({
            tenantId,
            actorEmail,
            patch: parsed,
        });

        return NextResponse.json(
            { ok: true, settings },
            { headers: { 'X-P402-Request-ID': requestId } },
        );
    } catch (err) {
        return toApiErrorResponse(err, requestId);
    }
}
