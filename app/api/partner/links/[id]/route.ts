/**
 * PATCH /api/partner/links/[id]  — pause or activate a link
 */

import { NextRequest, NextResponse } from 'next/server';
import { requirePartnerAccess, isAuthError } from '@/lib/partner/auth';
import { setPartnerLinkStatus } from '@/lib/partner/queries';

export async function PATCH(
    req: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    const auth = await requirePartnerAccess(req);
    if (isAuthError(auth)) {
        return NextResponse.json({ error: auth.error }, { status: auth.status });
    }

    const { id } = await params;

    let body: { status: 'active' | 'paused' };
    try {
        body = await req.json() as { status: 'active' | 'paused' };
    } catch {
        return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
    }

    if (body.status !== 'active' && body.status !== 'paused') {
        return NextResponse.json({ error: 'status must be "active" or "paused"' }, { status: 400 });
    }

    const updated = await setPartnerLinkStatus(id, auth.partnerId, body.status);
    if (!updated) {
        return NextResponse.json({ error: 'Link not found or not owned by this partner' }, { status: 404 });
    }

    return NextResponse.json({ success: true, status: body.status });
}
