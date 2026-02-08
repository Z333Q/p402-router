import { NextRequest, NextResponse } from 'next/server';
import { ReplayProtection } from '@/lib/replay-protection';

export const runtime = 'nodejs';
export const maxDuration = 60; // 1 minute max

export async function POST(request: NextRequest) {
    // Verify cron secret
    const authHeader = request.headers.get('authorization');
    const expectedSecret = `Bearer ${process.env.CRON_SECRET}`;

    // Strict timing check isn't needed here, just simple secret match
    if (authHeader !== expectedSecret) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    try {
        const deletedCount = await ReplayProtection.cleanup(30); // Keep 30 days

        return NextResponse.json({
            success: true,
            deletedCount,
            message: `Cleaned up ${deletedCount} transaction records older than 30 days`,
            timestamp: new Date().toISOString()
        });
    } catch (error: any) {
        console.error('[Cron] Replay cleanup failed:', error);
        return NextResponse.json({
            success: false,
            error: error.message
        }, { status: 500 });
    }
}
