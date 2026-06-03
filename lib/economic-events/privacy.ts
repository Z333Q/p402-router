// Resolves the effective privacy posture for a (tenant, scope) pair.
//
// Resolution order (V5 §27):
//   1. scope override row in privacy_scope_overrides
//   2. tenant default row in tenant_privacy_settings
//   3. system default: metadata_only, no prompt/response storage, 30d retention
//
// The resolver also produces retention_expires_at relative to "now" so the
// writer can stamp it onto ai_economic_events without recomputing.

import { createHmac } from 'crypto';
import db from '@/lib/db';
import type { EffectivePrivacy, PrivacyMode, Scope } from './types';
import { PRIVACY_MODES } from './types';

const SYSTEM_DEFAULT: EffectivePrivacy = {
    privacyMode: 'metadata_only',
    storePrompts: false,
    storeResponses: false,
    requireRedaction: true,
    retentionDays: 30,
    source: 'system_default',
};

interface ResolveOpts {
    /** Optional scope to honor (e.g. department / api_key) — first match wins. */
    scope?: { type: Scope; id: string }[];
    /** Force a stricter mode than what the DB resolves to. */
    override?: PrivacyMode;
}

export async function resolveTenantPrivacy(
    tenantId: string,
    opts: ResolveOpts = {},
): Promise<EffectivePrivacy> {
    // 1. Try scope overrides first (in caller-supplied order — most specific first).
    if (opts.scope && opts.scope.length > 0) {
        try {
            // Build a VALUES list bound positionally; one row per scope candidate.
            // The row returned is the override that matches; if multiple match,
            // the caller decided which order to try.
            for (const s of opts.scope) {
                const r = await db.query(
                    `SELECT privacy_mode, store_prompts, store_responses, retention_days, scope, scope_id
                       FROM privacy_scope_overrides
                       WHERE tenant_id = $1 AND scope = $2 AND scope_id = $3
                       LIMIT 1`,
                    [tenantId, s.type, s.id],
                );
                const row = r.rows[0];
                if (row) {
                    return applyOverride({
                        privacyMode: row.privacy_mode as PrivacyMode,
                        storePrompts: row.store_prompts ?? SYSTEM_DEFAULT.storePrompts,
                        storeResponses: row.store_responses ?? SYSTEM_DEFAULT.storeResponses,
                        requireRedaction: true,  // scope overrides do not relax redaction
                        retentionDays: row.retention_days ?? SYSTEM_DEFAULT.retentionDays,
                        source: 'scope_override',
                        sourceScope: row.scope as Scope,
                        sourceScopeId: row.scope_id as string,
                    }, opts.override);
                }
            }
        } catch {
            // Table not present yet (Slice 2B not applied) — fall through.
        }
    }

    // 2. Tenant default
    try {
        const r = await db.query(
            `SELECT default_privacy_mode, store_prompts, store_responses,
                    require_redaction, retention_days
               FROM tenant_privacy_settings
               WHERE tenant_id = $1
               LIMIT 1`,
            [tenantId],
        );
        const row = r.rows[0];
        if (row) {
            return applyOverride({
                privacyMode: row.default_privacy_mode as PrivacyMode,
                storePrompts: row.store_prompts as boolean,
                storeResponses: row.store_responses as boolean,
                requireRedaction: row.require_redaction as boolean,
                retentionDays: row.retention_days as number,
                source: 'tenant_default',
            }, opts.override);
        }
    } catch {
        // Table not present yet — fall through.
    }

    // 3. System default
    return applyOverride(SYSTEM_DEFAULT, opts.override);
}

/**
 * If the caller passes an override mode, narrow the effective posture to be
 * AT LEAST as strict. We only ever ratchet privacy tighter, never looser —
 * a caller cannot widen tenant policy via this entry point.
 */
function applyOverride(base: EffectivePrivacy, override?: PrivacyMode): EffectivePrivacy {
    if (!override || !PRIVACY_MODES.has(override)) return base;
    if (RANK[override] >= RANK[base.privacyMode]) return base;
    return {
        ...base,
        privacyMode: override,
        // Ratcheting tighter implies prompts and responses must not be stored.
        storePrompts: override === 'full_trace' ? base.storePrompts : false,
        storeResponses: override === 'full_trace' ? base.storeResponses : false,
    };
}

// Lower number == tighter privacy. Used by applyOverride.
const RANK: Record<PrivacyMode, number> = {
    metadata_only:   0,
    fingerprint_only: 1,
    redacted_trace:  2,
    private_gateway: 3,
    full_trace:      4,
};

/**
 * Compute a content fingerprint with HMAC + tenant secret. NEVER plain
 * SHA-256 of content — that would let an attacker pre-image-check known
 * strings. The "tenant secret" is derived from the tenant_id itself today;
 * a future iteration should use a real per-tenant KMS key.
 */
export function fingerprintContent(tenantId: string, content: string): string {
    return createHmac('sha256', `p402:${tenantId}`)
        .update(content)
        .digest('hex');
}

/** Convert an effective privacy posture to a retention_expires_at timestamp. */
export function retentionExpiry(retentionDays: number, now = new Date()): Date {
    const d = new Date(now);
    d.setUTCDate(d.getUTCDate() + retentionDays);
    return d;
}
