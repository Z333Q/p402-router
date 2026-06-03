/**
 * GET / PUT /api/v2/privacy/settings
 *
 * Read or update the tenant-level privacy default. PUT is gated by
 * requireTenantAdminAccess — only the authenticated tenant owner (or a
 * global P402 admin) can change privacy defaults. Every write records the
 * actor in metadata for audit.
 *
 * Defaults are privacy-first (metadata_only, no prompt/response storage,
 * 30-day retention). UPSERT-style: GET returns the system default when no
 * row exists yet; PUT creates the row if missing.
 */

import { NextRequest, NextResponse } from 'next/server';
import db from '@/lib/db';
import { requireTenantAccess, requireTenantAdminAccess } from '@/lib/auth';
import { ApiError, toApiErrorResponse } from '@/lib/errors';
import { PRIVACY_MODES, type PrivacyMode } from '@/lib/economic-events/types';

export const dynamic = 'force-dynamic';

const SYSTEM_DEFAULT_SETTINGS = {
    default_privacy_mode: 'metadata_only' as PrivacyMode,
    store_prompts: false,
    store_responses: false,
    allow_fingerprints: true,
    allow_redacted_traces: false,
    retention_days: 30,
    require_redaction: true,
    customer_managed_key: false,
    source: 'system_default' as const,
};

// ─────────────────────────────────────────────────────────────────────────────
// GET — readable to any authenticated tenant member. Returns the system
// default when no tenant row exists yet (lets the UI render the form with
// sane initial values before the first save).
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
            `SELECT default_privacy_mode, store_prompts, store_responses,
                    allow_fingerprints, allow_redacted_traces, retention_days,
                    require_redaction, customer_managed_key, metadata,
                    created_at, updated_at
               FROM tenant_privacy_settings WHERE tenant_id = $1 LIMIT 1`,
            [tenantId],
        );
        const row = r.rows[0];
        if (!row) {
            return NextResponse.json({
                ok: true,
                settings: SYSTEM_DEFAULT_SETTINGS,
            }, { headers: { 'X-P402-Request-ID': requestId } });
        }
        return NextResponse.json({
            ok: true,
            settings: { ...row, source: 'tenant_default' },
        }, { headers: { 'X-P402-Request-ID': requestId } });
    } catch (err) {
        return toApiErrorResponse(err, requestId);
    }
}

// ─────────────────────────────────────────────────────────────────────────────
// PUT — admin-only. Upserts the tenant default. Validates every field;
// records actor in metadata.last_modified_by_email/at.
// ─────────────────────────────────────────────────────────────────────────────
interface SettingsBody {
    default_privacy_mode?: unknown;
    store_prompts?: unknown;
    store_responses?: unknown;
    allow_fingerprints?: unknown;
    allow_redacted_traces?: unknown;
    retention_days?: unknown;
    require_redaction?: unknown;
    customer_managed_key?: unknown;
}

function asBool(v: unknown, fallback: boolean): boolean {
    return typeof v === 'boolean' ? v : fallback;
}

function asInt(v: unknown, fallback: number, min: number, max: number): number {
    const n = Number(v);
    if (!Number.isFinite(n)) return fallback;
    const i = Math.floor(n);
    return Math.max(min, Math.min(max, i));
}

function asMode(v: unknown, fallback: PrivacyMode): PrivacyMode {
    if (typeof v !== 'string') return fallback;
    return PRIVACY_MODES.has(v as PrivacyMode) ? (v as PrivacyMode) : fallback;
}

export async function PUT(req: NextRequest) {
    const requestId = crypto.randomUUID();
    try {
        const access = await requireTenantAdminAccess(req);
        if ('error' in access) {
            return NextResponse.json({ error: access.error }, { status: access.status });
        }
        const { tenantId, actorEmail } = access;

        let body: SettingsBody;
        try { body = await req.json() as SettingsBody; }
        catch {
            throw new ApiError({
                code: 'INVALID_INPUT',
                status: 400,
                message: 'Body must be valid JSON',
                requestId,
            });
        }

        // Hard-fail on bad mode rather than silently coerce — admins should
        // know if their value didn't take.
        if (body.default_privacy_mode !== undefined &&
            (typeof body.default_privacy_mode !== 'string' ||
             !PRIVACY_MODES.has(body.default_privacy_mode as PrivacyMode))) {
            throw new ApiError({
                code: 'INVALID_INPUT',
                status: 400,
                message: `default_privacy_mode must be one of: ${[...PRIVACY_MODES].join(', ')}`,
                requestId,
            });
        }

        const settings = {
            default_privacy_mode:  asMode(body.default_privacy_mode, 'metadata_only'),
            store_prompts:         asBool(body.store_prompts, false),
            store_responses:       asBool(body.store_responses, false),
            allow_fingerprints:    asBool(body.allow_fingerprints, true),
            allow_redacted_traces: asBool(body.allow_redacted_traces, false),
            retention_days:        asInt(body.retention_days, 30, 1, 3650),
            require_redaction:     asBool(body.require_redaction, true),
            customer_managed_key:  asBool(body.customer_managed_key, false),
        };

        const auditMeta = {
            last_modified_by_email: actorEmail,
            last_modified_at: new Date().toISOString(),
        };

        const r = await db.query(
            `INSERT INTO tenant_privacy_settings (
                tenant_id, default_privacy_mode, store_prompts, store_responses,
                allow_fingerprints, allow_redacted_traces, retention_days,
                require_redaction, customer_managed_key, metadata
             ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
             ON CONFLICT (tenant_id) DO UPDATE SET
                default_privacy_mode  = EXCLUDED.default_privacy_mode,
                store_prompts         = EXCLUDED.store_prompts,
                store_responses       = EXCLUDED.store_responses,
                allow_fingerprints    = EXCLUDED.allow_fingerprints,
                allow_redacted_traces = EXCLUDED.allow_redacted_traces,
                retention_days        = EXCLUDED.retention_days,
                require_redaction     = EXCLUDED.require_redaction,
                customer_managed_key  = EXCLUDED.customer_managed_key,
                metadata              = COALESCE(tenant_privacy_settings.metadata, '{}'::jsonb) || EXCLUDED.metadata,
                updated_at = NOW()
             RETURNING *`,
            [
                tenantId,
                settings.default_privacy_mode,
                settings.store_prompts,
                settings.store_responses,
                settings.allow_fingerprints,
                settings.allow_redacted_traces,
                settings.retention_days,
                settings.require_redaction,
                settings.customer_managed_key,
                auditMeta,
            ],
        );
        return NextResponse.json({
            ok: true,
            settings: { ...r.rows[0], source: 'tenant_default' },
        }, { headers: { 'X-P402-Request-ID': requestId } });
    } catch (err) {
        return toApiErrorResponse(err, requestId);
    }
}
