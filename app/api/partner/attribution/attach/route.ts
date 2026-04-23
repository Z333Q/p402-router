/**
 * POST /api/partner/attribution/attach
 * =====================================
 * Called client-side immediately after a new user completes sign-up.
 * Reads the p402_ref cookie from the request (HttpOnly — JS can't read it,
 * but it IS sent with same-origin fetch requests automatically).
 *
 * This endpoint is idempotent: calling it twice for the same tenant is safe.
 *
 * The response always succeeds from the caller's perspective — attribution
 * is a background concern and must never block the signup UX.
 *
 * Security:
 *   - Requires valid NextAuth session (tenant must exist)
 *   - Self-referral is blocked in attachAttribution()
 *   - Expired or missing cookies return success:false (not an error)
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { attachAttribution, REF_COOKIE, clearRefCookieHeader } from '@/lib/partner/attribution';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
        return NextResponse.json({ success: false, reason: 'unauthenticated' }, { status: 401 });
    }

    const tenantId = (session.user as { tenantId?: string }).tenantId;
    if (!tenantId) {
        return NextResponse.json({ success: false, reason: 'no_tenant' }, { status: 400 });
    }

    const refCookie = req.cookies.get(REF_COOKIE)?.value;

    const result = await attachAttribution(tenantId, refCookie);

    const response = NextResponse.json({ success: result.success, reason: result.reason });

    // Clear the ref cookie after a successful attach (one attribution per signup)
    if (result.success) {
        response.headers.set('Set-Cookie', clearRefCookieHeader());
    }

    return response;
}
