/**
 * lib/partner/attribution.ts
 * ===========================
 * Cookie-based partner attribution logic.
 *
 * Cookie: p402_ref  (HttpOnly, Secure, SameSite=Lax, 90-day TTL)
 * Cookie: p402_sid  (NOT HttpOnly — client-readable anonymous session ID)
 *
 * Flow:
 *   1. Visitor hits /r/{code} → click recorded → p402_ref set
 *   2. Visitor signs up → POST /api/partner/attribution/attach reads cookie
 *      → creates partner_attributions row → cookie cleared
 *
 * Attribution precedence (enforced at attach time):
 *   deal_registration > registered_lead > cookie_last_touch
 *
 * Self-referral: blocked if attributed_tenant === partner.primary_tenant_id
 * Window: 90 days from first click (configurable via PARTNER_ATTRIBUTION_DAYS)
 */

import { createHash, randomBytes } from 'crypto';
import db from '@/lib/db';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

export const REF_COOKIE   = 'p402_ref';
export const SID_COOKIE   = 'p402_sid';
export const WINDOW_DAYS  = parseInt(process.env.PARTNER_ATTRIBUTION_DAYS ?? '90', 10);
export const WINDOW_MS    = WINDOW_DAYS * 24 * 60 * 60 * 1000;

// Common bot UA substrings — expand as needed
const BOT_PATTERNS = [
    'bot', 'crawl', 'spider', 'slurp', 'facebookexternalhit',
    'twitterbot', 'linkedinbot', 'whatsapp', 'googlebot',
    'bingbot', 'yandex', 'baidu', 'duckduckbot', 'semrush',
    'ahrefs', 'mj12bot', 'dotbot', 'pingdom', 'uptimerobot',
];

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface RefCookiePayload {
    pid: string;  // partner_id
    lid: string;  // partner_link_id
    code: string;
    ts: number;   // first click unix ms
    lts: number;  // last click unix ms
    sub?: string; // subid
}

export interface ClickContext {
    linkId: string;
    partnerId: string;
    ip: string | null;
    userAgent: string | null;
    referrer: string | null;
    landingPath: string;
    subid: string | null;
    anonymousSessionId: string;
    isFirstTouch: boolean;
}

// ---------------------------------------------------------------------------
// Cookie helpers
// ---------------------------------------------------------------------------

/**
 * Encode the ref cookie payload as base64url JSON.
 * Not encrypted — attribution metadata is not sensitive.
 */
export function encodeRefCookie(payload: RefCookiePayload): string {
    return Buffer.from(JSON.stringify(payload)).toString('base64url');
}

/**
 * Decode and validate the ref cookie. Returns null if malformed or expired.
 */
export function decodeRefCookie(raw: string): RefCookiePayload | null {
    try {
        const json = Buffer.from(raw, 'base64url').toString('utf-8');
        const p = JSON.parse(json) as RefCookiePayload;
        if (!p.pid || !p.lid || !p.ts) return null;
        // Reject if outside attribution window
        if (Date.now() - p.ts > WINDOW_MS) return null;
        return p;
    } catch {
        return null;
    }
}

/**
 * Build the Set-Cookie header value for p402_ref.
 */
export function buildRefCookieHeader(payload: RefCookiePayload): string {
    const value   = encodeRefCookie(payload);
    const maxAge  = Math.floor(WINDOW_MS / 1000);
    const secure  = process.env.NODE_ENV === 'production' ? '; Secure' : '';
    return `${REF_COOKIE}=${value}; Path=/; Max-Age=${maxAge}; HttpOnly; SameSite=Lax${secure}`;
}

/**
 * Build a Set-Cookie header that clears the ref cookie.
 */
export function clearRefCookieHeader(): string {
    return `${REF_COOKIE}=; Path=/; Max-Age=0; HttpOnly; SameSite=Lax`;
}

/**
 * Build the Set-Cookie header for the anonymous session ID (NOT HttpOnly).
 */
export function buildSidCookieHeader(sid: string): string {
    const maxAge = Math.floor(WINDOW_MS / 1000);
    const secure = process.env.NODE_ENV === 'production' ? '; Secure' : '';
    return `${SID_COOKIE}=${sid}; Path=/; Max-Age=${maxAge}; SameSite=Lax${secure}`;
}

/**
 * Generate a new anonymous session ID.
 */
export function generateAnonymousSessionId(): string {
    return randomBytes(16).toString('hex');
}

// ---------------------------------------------------------------------------
// Privacy helpers
// ---------------------------------------------------------------------------

export function hashValue(value: string): string {
    return createHash('sha256').update(value).digest('hex');
}

export function isBot(userAgent: string | null): boolean {
    if (!userAgent) return false;
    const ua = userAgent.toLowerCase();
    return BOT_PATTERNS.some(p => ua.includes(p));
}

export function extractReferrerDomain(referrer: string | null): string | null {
    if (!referrer) return null;
    try {
        return new URL(referrer).hostname;
    } catch {
        return null;
    }
}

// ---------------------------------------------------------------------------
// Click recording
// ---------------------------------------------------------------------------

export async function recordClick(ctx: ClickContext): Promise<void> {
    await db.query(
        `INSERT INTO partner_link_clicks
            (partner_link_id, partner_id, landing_path, referrer_domain,
             ip_hash, user_agent_hash, subid, anonymous_session_id, first_touch)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)`,
        [
            ctx.linkId,
            ctx.partnerId,
            ctx.landingPath,
            ctx.referrer ? extractReferrerDomain(ctx.referrer) : null,
            ctx.ip ? hashValue(ctx.ip) : null,
            ctx.userAgent ? hashValue(ctx.userAgent) : null,
            ctx.subid,
            ctx.anonymousSessionId,
            ctx.isFirstTouch,
        ]
    );
}

/**
 * Check if this anonymous session already clicked this link recently.
 * Prevents duplicate click inflation from page refreshes.
 */
export async function hasRecentClick(
    anonymousSessionId: string,
    linkId: string,
    withinMinutes = 60
): Promise<boolean> {
    const res = await db.query(
        `SELECT 1 FROM partner_link_clicks
         WHERE anonymous_session_id = $1
           AND partner_link_id = $2
           AND clicked_at > NOW() - INTERVAL '${withinMinutes} minutes'
         LIMIT 1`,
        [anonymousSessionId, linkId]
    );
    return (res.rows.length ?? 0) > 0;
}

// ---------------------------------------------------------------------------
// Attribution attachment
// ---------------------------------------------------------------------------

interface AttachResult {
    success: boolean;
    reason: 'attached' | 'already_attributed' | 'self_referral' | 'expired' | 'invalid_cookie' | 'no_cookie' | 'error';
    attributionId?: string;
}

/**
 * Attach a cookie-based attribution to a newly-signed-up tenant.
 * Idempotent: calling twice for the same tenant returns 'already_attributed'.
 */
export async function attachAttribution(
    tenantId: string,
    refCookieRaw: string | undefined
): Promise<AttachResult> {
    if (!refCookieRaw) return { success: false, reason: 'no_cookie' };

    const payload = decodeRefCookie(refCookieRaw);
    if (!payload) return { success: false, reason: 'expired' };

    try {
        // Check for existing active attribution for this tenant
        const existing = await db.query(
            `SELECT id FROM partner_attributions
             WHERE attributed_tenant_id = $1 AND status = 'active'
             LIMIT 1`,
            [tenantId]
        );
        if ((existing.rows.length ?? 0) > 0) {
            return { success: false, reason: 'already_attributed' };
        }

        // Self-referral check: block if attributed tenant is the partner's own tenant
        const partnerCheck = await db.query(
            `SELECT primary_tenant_id FROM partners WHERE id = $1 LIMIT 1`,
            [payload.pid]
        );
        const partnerRow = partnerCheck.rows[0] as { primary_tenant_id: string } | undefined;
        if (partnerRow?.primary_tenant_id === tenantId) {
            return { success: false, reason: 'self_referral' };
        }

        // Create attribution
        const windowExpires = new Date(payload.ts + WINDOW_MS);
        const res = await db.query(
            `INSERT INTO partner_attributions
                (partner_id, attributed_tenant_id, partner_link_id,
                 attribution_type, first_click_at, last_click_at,
                 attributed_at, window_expires_at, status)
             VALUES ($1,$2,$3,'cookie_last_touch',$4,$5,NOW(),$6,'active')
             RETURNING id`,
            [
                payload.pid,
                tenantId,
                payload.lid,
                new Date(payload.ts),
                new Date(payload.lts ?? payload.ts),
                windowExpires,
            ]
        );

        const row = res.rows[0] as { id: string } | undefined;
        return { success: true, reason: 'attached', attributionId: row?.id };
    } catch (err) {
        console.error('[attribution] attachAttribution error:', err);
        return { success: false, reason: 'error' };
    }
}
