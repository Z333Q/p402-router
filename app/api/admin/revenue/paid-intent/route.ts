/**
 * GET /api/admin/revenue/paid-intent
 *
 * Phase 1A read-only paid-intent queue: leads whose resolved_intent maps to a
 * paid plan or paid bridge offer. Excludes free-only / unknown intents.
 */

import { NextResponse } from 'next/server';
import { requireAdminAccess, AdminAuthError } from '@/lib/admin/auth';
import { listPaidIntentQueue } from '@/lib/admin/revenue';

export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
    try {
        await requireAdminAccess('analytics.read');
    } catch (e) {
        if (e instanceof AdminAuthError) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        throw e;
    }
    const url = new URL(req.url);
    const limit = Number.parseInt(url.searchParams.get('limit') ?? '100', 10);
    try {
        const leads = await listPaidIntentQueue(Number.isFinite(limit) ? limit : 100);
        return NextResponse.json({ leads });
    } catch (err) {
        console.error('admin revenue paid-intent route error', err);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
