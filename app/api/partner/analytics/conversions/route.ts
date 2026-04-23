/**
 * GET /api/partner/analytics/conversions
 * ========================================
 * Returns attribution records for the authenticated partner.
 * Privacy: attributed_tenant_id is masked — only metadata shown.
 */

import { NextRequest, NextResponse } from 'next/server';
import { requirePartnerAccess, isAuthError } from '@/lib/partner/auth';
import db from '@/lib/db';

export async function GET(req: NextRequest) {
    const auth = await requirePartnerAccess(req);
    if (isAuthError(auth)) {
        return NextResponse.json({ error: auth.error }, { status: auth.status });
    }

    const res = await db.query(
        `SELECT
            pa.id,
            pa.attribution_type,
            pa.first_click_at,
            pa.last_click_at,
            pa.attributed_at,
            pa.window_expires_at,
            pa.status,
            pl.code  AS link_code,
            pl.label AS link_label
         FROM partner_attributions pa
         LEFT JOIN partner_links pl ON pl.id = pa.partner_link_id
         WHERE pa.partner_id = $1
         ORDER BY pa.attributed_at DESC
         LIMIT 200`,
        [auth.partnerId]
    );

    // Never expose attributed_tenant_id to partner — only internal staff sees that
    const conversions = res.rows.map((r: Record<string, unknown>) => ({
        id:               r['id'],
        attribution_type: r['attribution_type'],
        first_click_at:   r['first_click_at'],
        last_click_at:    r['last_click_at'],
        attributed_at:    r['attributed_at'],
        window_expires_at: r['window_expires_at'],
        status:           r['status'],
        link_code:        r['link_code'],
        link_label:       r['link_label'],
    }));

    return NextResponse.json({ conversions });
}
