/**
 * GET  /api/v2/privacy/scope-overrides
 * POST /api/v2/privacy/scope-overrides
 *
 * GET: list all scope overrides for the tenant. Readable by any session-
 *      authed tenant member (UI needs to see them to render).
 *
 * POST: admin-only upsert. Writing a scope override that widens privacy
 *       mode requires requireTenantAdminAccess — this is the "authorized
 *       admin save" gate the V5 widening rule depends on. Every write
 *       records actor in metadata.last_modified_by_email/at for audit.
 */

import { NextRequest, NextResponse } from 'next/server';
import db from '@/lib/db';
import { requireTenantAccess, requireTenantAdminAccess } from '@/lib/auth';
import { ApiError, toApiErrorResponse } from '@/lib/errors';
import { PRIVACY_MODES, SCOPES, type PrivacyMode, type Scope } from '@/lib/economic-events/types';

export const dynamic = 'force-dynamic';

// ─────────────────────────────────────────────────────────────────────────────
// GET — list. Tenant-scoped.
// ─────────────────────────────────────────────────────────────────────────────
export async function GET(req: NextRequest) {
    const requestId = crypto.randomUUID();
    try {
        const access = await requireTenantAccess(req);
        if (access.error) {
            return NextResponse.json({ error: access.error }, { status: access.status ?? 401 });
        }
        const tenantId = access.tenantId;

        const r = await db.query(
            `SELECT id, scope, scope_id, privacy_mode,
                    store_prompts, store_responses, retention_days,
                    metadata, created_at, updated_at
               FROM privacy_scope_overrides
               WHERE tenant_id = $1
               ORDER BY scope, scope_id`,
            [tenantId],
        );
        return NextResponse.json({
            ok: true,
            count: r.rows.length,
            overrides: r.rows,
        }, { headers: { 'X-P402-Request-ID': requestId } });
    } catch (err) {
        return toApiErrorResponse(err, requestId);
    }
}

// ─────────────────────────────────────────────────────────────────────────────
// POST — admin-only upsert. UNIQUE(tenant_id, scope, scope_id) so this is
// idempotent per (scope, scope_id). The migration UNIQUE is what allows
// ON CONFLICT DO UPDATE here.
// ─────────────────────────────────────────────────────────────────────────────
interface OverrideBody {
    scope?: unknown;
    scope_id?: unknown;
    privacy_mode?: unknown;
    store_prompts?: unknown;     // optional — null means inherit tenant default
    store_responses?: unknown;
    retention_days?: unknown;
}

function strOrNull(v: unknown, max = 128): string | null {
    if (typeof v !== 'string') return null;
    const t = v.trim();
    if (!t || t.length > max) return null;
    return t;
}

export async function POST(req: NextRequest) {
    const requestId = crypto.randomUUID();
    try {
        const access = await requireTenantAdminAccess(req);
        if ('error' in access) {
            return NextResponse.json({ error: access.error }, { status: access.status });
        }
        const { tenantId, actorEmail } = access;

        let body: OverrideBody;
        try { body = await req.json() as OverrideBody; }
        catch {
            throw new ApiError({
                code: 'INVALID_INPUT', status: 400,
                message: 'Body must be valid JSON',
                requestId,
            });
        }

        const scope = strOrNull(body.scope, 32);
        if (!scope || !SCOPES.has(scope as Scope)) {
            throw new ApiError({
                code: 'INVALID_INPUT', status: 400,
                message: `scope must be one of: ${[...SCOPES].join(', ')}`,
                requestId,
            });
        }

        const scopeId = strOrNull(body.scope_id);
        if (!scopeId) {
            throw new ApiError({
                code: 'INVALID_INPUT', status: 400,
                message: 'scope_id is required (non-empty string)',
                requestId,
            });
        }

        const mode = strOrNull(body.privacy_mode, 32);
        if (!mode || !PRIVACY_MODES.has(mode as PrivacyMode)) {
            throw new ApiError({
                code: 'INVALID_INPUT', status: 400,
                message: `privacy_mode must be one of: ${[...PRIVACY_MODES].join(', ')}`,
                requestId,
            });
        }

        // Optional flags — pass NULL through so the per-row CHECK applies.
        // store_prompts/store_responses NULL means "inherit tenant default".
        const storePrompts =   typeof body.store_prompts   === 'boolean' ? body.store_prompts   : null;
        const storeResponses = typeof body.store_responses === 'boolean' ? body.store_responses : null;

        let retentionDays: number | null = null;
        if (body.retention_days !== undefined && body.retention_days !== null) {
            const n = Number(body.retention_days);
            if (!Number.isFinite(n) || n < 1 || n > 3650) {
                throw new ApiError({
                    code: 'INVALID_INPUT', status: 400,
                    message: 'retention_days must be an integer between 1 and 3650',
                    requestId,
                });
            }
            retentionDays = Math.floor(n);
        }

        const auditMeta = {
            last_modified_by_email: actorEmail,
            last_modified_at: new Date().toISOString(),
            // Widening flag is recorded for the audit log. Resolution happens
            // at write time in the dashboard or via a separate diff endpoint.
            widening_save: true,
        };

        const r = await db.query(
            `INSERT INTO privacy_scope_overrides (
                tenant_id, scope, scope_id, privacy_mode,
                store_prompts, store_responses, retention_days, metadata
             ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
             ON CONFLICT (tenant_id, scope, scope_id) DO UPDATE SET
                privacy_mode    = EXCLUDED.privacy_mode,
                store_prompts   = EXCLUDED.store_prompts,
                store_responses = EXCLUDED.store_responses,
                retention_days  = EXCLUDED.retention_days,
                metadata        = COALESCE(privacy_scope_overrides.metadata, '{}'::jsonb) || EXCLUDED.metadata,
                updated_at = NOW()
             RETURNING *`,
            [tenantId, scope, scopeId, mode, storePrompts, storeResponses, retentionDays, auditMeta],
        );
        return NextResponse.json({
            ok: true,
            override: r.rows[0],
        }, { headers: { 'X-P402-Request-ID': requestId } });
    } catch (err) {
        return toApiErrorResponse(err, requestId);
    }
}
