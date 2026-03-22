/**
 * POST /api/internal/cron/reputation/weekly-epoch
 *
 * Weekly cron job: snapshot all agent_reputation scores into reputation_epochs
 * for trend analysis. Designed to run once per week (Monday).
 *
 * Protected by CRON_SECRET header.
 */

import { NextRequest, NextResponse } from 'next/server';
import { snapshotWeeklyEpoch } from '@/lib/identity/reputation';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
    const secret = req.headers.get('x-cron-secret');
    if (!secret || secret !== process.env.CRON_SECRET) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (process.env.AGENTKIT_ENABLED !== 'true') {
        return NextResponse.json({ skipped: true, reason: 'AGENTKIT_ENABLED not enabled' });
    }

    try {
        await snapshotWeeklyEpoch();

        return NextResponse.json({
            success: true,
            timestamp: new Date().toISOString(),
        });
    } catch (err) {
        console.error('[Reputation] Weekly epoch cron failed:', err);
        return NextResponse.json(
            { error: 'Weekly epoch snapshot failed', details: (err as Error).message },
            { status: 500 }
        );
    }
}
