/**
 * GET /api/admin/revenue/funnel-visibility
 *
 * Phase 1A read-only signup→first-event funnel rollup. Existing tables only.
 * Steps that cannot be tracked are reported as "not_tracked_yet" with a
 * missingSchema list for follow-up.
 */

import { NextResponse } from 'next/server';
import { requireAdminAccess, AdminAuthError } from '@/lib/admin/auth';
import { getFunnelVisibility } from '@/lib/admin/revenue';

export const dynamic = 'force-dynamic';

export async function GET() {
    try {
        await requireAdminAccess('analytics.read');
    } catch (e) {
        if (e instanceof AdminAuthError) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        throw e;
    }
    try {
        const visibility = await getFunnelVisibility();
        return NextResponse.json(visibility);
    } catch (err) {
        console.error('admin revenue funnel-visibility route error', err);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
