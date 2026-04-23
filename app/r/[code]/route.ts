/**
 * GET /r/[code]
 * =============
 * Partner referral link click handler.
 *
 * Responsibilities:
 *   1. Resolve partner link by code
 *   2. Bot detection — bots don't count, still redirect
 *   3. Dedup — same anonymous session clicking same link within 60 min → skip insert
 *   4. Record click (privacy-safe: hashed IP + UA)
 *   5. Set p402_ref cookie (HttpOnly, 90-day TTL)
 *   6. Set p402_sid cookie if not present (anonymous session ID, NOT HttpOnly)
 *   7. Build destination URL with UTM params appended
 *   8. 302 redirect — never cache this route
 *
 * Edge cases:
 *   - Unknown code → 302 to /
 *   - Paused link → still redirect, no click recorded
 *   - Expired attribution window → still redirect, no click recorded
 */

import { NextRequest, NextResponse } from 'next/server';
import {
    isBot,
    buildRefCookieHeader,
    buildSidCookieHeader,
    clearRefCookieHeader,
    generateAnonymousSessionId,
    recordClick,
    hasRecentClick,
    decodeRefCookie,
    encodeRefCookie,
    REF_COOKIE,
    SID_COOKIE,
    WINDOW_MS,
} from '@/lib/partner/attribution';
import { getPartnerLinkByCode } from '@/lib/partner/queries';

export const dynamic = 'force-dynamic';

export async function GET(
    req: NextRequest,
    { params }: { params: Promise<{ code: string }> }
) {
    const { code } = await params;
    const ua         = req.headers.get('user-agent');
    const ip         = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim()
                    ?? req.headers.get('x-real-ip')
                    ?? null;
    const referrer   = req.headers.get('referer');
    const { searchParams } = req.nextUrl;
    const subid      = searchParams.get('sub');

    // Resolve link
    let link: Awaited<ReturnType<typeof getPartnerLinkByCode>>;
    try {
        link = await getPartnerLinkByCode(code);
    } catch {
        // DB unavailable — degrade gracefully, redirect home
        return redirect('/');
    }

    if (!link) return redirect('/');

    // Determine destination — build with UTMs
    const destination = buildDestinationUrl(link.destination_path, {
        utm_source:   link.utm_source,
        utm_medium:   link.utm_medium,
        utm_campaign: link.utm_campaign,
    });

    // Paused or expired link — redirect without recording
    if (link.status !== 'active') {
        return redirect(destination);
    }

    // Bot detection — redirect without recording
    if (ua && isBot(ua)) {
        return redirect(destination);
    }

    // Anonymous session ID — read existing or generate new
    const existingSid  = req.cookies.get(SID_COOKIE)?.value;
    const sid          = existingSid ?? generateAnonymousSessionId();
    const isFirstTouch = !req.cookies.get(REF_COOKIE)?.value;

    // Dedup — same session + same link within 60 min → skip insert
    let shouldRecord = true;
    try {
        if (!isFirstTouch) {
            const isDuplicate = await hasRecentClick(sid, link.id, 60);
            if (isDuplicate) shouldRecord = false;
        }
    } catch {
        // Non-blocking — if check fails, still record
    }

    // Record the click (non-blocking — don't await on failure)
    if (shouldRecord) {
        recordClick({
            linkId:             link.id,
            partnerId:          link.partner_id,
            ip,
            userAgent:          ua,
            referrer,
            landingPath:        req.nextUrl.pathname + (subid ? `?sub=${subid}` : ''),
            subid:              subid ?? link.default_subid,
            anonymousSessionId: sid,
            isFirstTouch,
        }).catch(err => console.error('[r/click] record error:', err));
    }

    // Build updated ref cookie payload
    const existingRef = req.cookies.get(REF_COOKIE)?.value;
    const existingPayload = existingRef ? decodeRefCookie(existingRef) : null;
    const now = Date.now();

    const refPayload = {
        pid:  link.partner_id,
        lid:  link.id,
        code,
        ts:   existingPayload?.pid === link.partner_id ? (existingPayload?.ts ?? now) : now, // preserve first-touch ts if same partner
        lts:  now,
        sub:  subid ?? link.default_subid ?? undefined,
    };

    // Build response with cookies set, then redirect
    const headers = new Headers();
    headers.set('Location', destination);
    headers.set('Cache-Control', 'no-store, no-cache, must-revalidate');

    // p402_ref — HttpOnly attribution cookie
    headers.append('Set-Cookie', buildRefCookieHeader(refPayload));

    // p402_sid — non-HttpOnly anonymous session (only set if new)
    if (!existingSid) {
        headers.append('Set-Cookie', buildSidCookieHeader(sid));
    }

    return new NextResponse(null, { status: 302, headers });
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function redirect(path: string): NextResponse {
    const base = process.env.NEXTAUTH_URL ?? 'https://p402.io';
    const url  = path.startsWith('http') ? path : `${base}${path}`;
    return NextResponse.redirect(url, { status: 302 });
}

/**
 * Build the destination URL with UTM params injected.
 * Preserves any existing query params on the destination path.
 */
function buildDestinationUrl(
    destinationPath: string,
    utms: { utm_source?: string | null; utm_medium?: string | null; utm_campaign?: string | null }
): string {
    const base = process.env.NEXTAUTH_URL ?? 'https://p402.io';
    const url  = new URL(destinationPath.startsWith('http') ? destinationPath : `${base}${destinationPath}`);

    if (utms.utm_source)   url.searchParams.set('utm_source',   utms.utm_source);
    if (utms.utm_medium)   url.searchParams.set('utm_medium',   utms.utm_medium);
    if (utms.utm_campaign) url.searchParams.set('utm_campaign', utms.utm_campaign);

    return url.toString();
}
