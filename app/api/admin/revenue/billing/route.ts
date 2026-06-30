/**
 * GET /api/admin/revenue/billing
 *
 * Phase 1A read-only billing tenant list. No PATCH/POST/DELETE. No Stripe.
 */

import { NextResponse } from 'next/server';
import { requireAdminAccess, AdminAuthError } from '@/lib/admin/auth';
import { listBillingTenants } from '@/lib/admin/revenue';

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
        const tenants = await listBillingTenants(Number.isFinite(limit) ? limit : 100);
        return NextResponse.json({ tenants });
    } catch (err) {
        console.error('admin revenue billing route error', err);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
