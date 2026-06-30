/**
 * GET /api/admin/revenue/access-intent
 *
 * Phase 1A read-only access-intent reporting. Aggregates access_requests by
 * resolved_intent, plan_id, offer_id, plus a recent rows list.
 */

import { NextResponse } from 'next/server';
import { requireAdminAccess, AdminAuthError } from '@/lib/admin/auth';
import { getAccessIntentReport } from '@/lib/admin/revenue';

export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
    try {
        await requireAdminAccess('analytics.read');
    } catch (e) {
        if (e instanceof AdminAuthError) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        throw e;
    }
    const url = new URL(req.url);
    const recentLimit = Number.parseInt(url.searchParams.get('recent') ?? '50', 10);
    try {
        const report = await getAccessIntentReport(Number.isFinite(recentLimit) ? recentLimit : 50);
        return NextResponse.json(report);
    } catch (err) {
        console.error('admin revenue access-intent route error', err);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
