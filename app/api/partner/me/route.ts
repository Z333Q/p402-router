/**
 * GET /api/partner/me
 * ====================
 * Returns the authenticated user's partner profile + overview stats.
 * Used by the partner overview page for initial data load.
 */

import { NextRequest, NextResponse } from 'next/server';
import { requirePartnerAccess, isAuthError } from '@/lib/partner/auth';
import { getPartnerById, getPartnerOverviewStats } from '@/lib/partner/queries';

export async function GET(req: NextRequest) {
    const auth = await requirePartnerAccess(req);
    if (isAuthError(auth)) {
        return NextResponse.json({ error: auth.error }, { status: auth.status });
    }

    const [partner, stats] = await Promise.all([
        getPartnerById(auth.partnerId),
        getPartnerOverviewStats(auth.partnerId),
    ]);

    if (!partner) {
        return NextResponse.json({ error: 'Partner record not found' }, { status: 404 });
    }

    return NextResponse.json({
        partner: {
            id:            partner.id,
            type:          partner.type,
            status:        partner.status,
            display_name:  partner.display_name,
            referral_code: partner.referral_code,
            website_url:   partner.website_url,
            created_at:    partner.created_at,
        },
        role:        auth.partnerRole,
        permissions: auth.permissions,
        group_ids:   auth.partnerGroupIds,
        stats,
    });
}

/**
 * PATCH /api/partner/me
 * Update own partner profile (display_name, website_url).
 */
export async function PATCH(req: NextRequest) {
    const auth = await requirePartnerAccess(req);
    if (isAuthError(auth)) {
        return NextResponse.json({ error: auth.error }, { status: auth.status });
    }

    let body: { display_name?: string; website_url?: string };
    try {
        body = await req.json() as { display_name?: string; website_url?: string };
    } catch {
        return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
    }

    const { db } = await import('@/lib/db').then(m => ({ db: m.default }));

    const updates: string[] = [];
    const values: unknown[] = [];
    let idx = 1;

    if (body.display_name?.trim()) {
        updates.push(`display_name = $${idx++}`);
        values.push(body.display_name.trim());
    }
    if (body.website_url !== undefined) {
        updates.push(`website_url = $${idx++}`);
        values.push(body.website_url?.trim() || null);
    }

    if (updates.length === 0) {
        return NextResponse.json({ error: 'No valid fields to update' }, { status: 400 });
    }

    updates.push(`updated_at = NOW()`);
    values.push(auth.partnerId);

    await db.query(
        `UPDATE partners SET ${updates.join(', ')} WHERE id = $${idx}`,
        values
    );

    return NextResponse.json({ success: true });
}
