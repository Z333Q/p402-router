import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { getAuditSummaryForScope } from '@/lib/services/audit-service';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const tenantId = (session.user as any).tenantId as string;
    if (!tenantId) {
        return NextResponse.json({ error: 'No tenant context' }, { status: 401 });
    }

    const url = new URL(req.url);
    const scopeType = url.searchParams.get('scope_type') || 'tenant';
    const scopeId = url.searchParams.get('scope_id') || tenantId;

    try {
        const data = await getAuditSummaryForScope(tenantId, scopeType as any, scopeId);
        if (!data) {
            return NextResponse.json({ error: 'No audit data found' }, { status: 404 });
        }
        return NextResponse.json(data);
    } catch (error: any) {
        console.error('[API] Audit summary fetch failed:', error);
        return NextResponse.json({ error: 'Server Error' }, { status: 500 });
    }
}
