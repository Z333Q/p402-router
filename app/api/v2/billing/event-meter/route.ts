/**
 * Phase 1A: GET /api/v2/billing/event-meter
 *
 * Read-only meter snapshot for the dashboard usage meter. Does NOT enforce
 * limits, does NOT charge overages, does NOT call Stripe.
 *
 * Returns the per-tenant V5-plan-ladder event meter for the current month.
 */

import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { getEventMeterSnapshot } from '@/lib/billing/event-meter';

export const dynamic = 'force-dynamic';

export async function GET() {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }
        const tenantId = (session.user as { tenantId?: string }).tenantId;
        if (!tenantId) {
            return NextResponse.json({ error: 'Tenant not resolved' }, { status: 403 });
        }
        const snapshot = await getEventMeterSnapshot(tenantId);
        return NextResponse.json(snapshot);
    } catch (err) {
        console.error('event-meter route error', err);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
