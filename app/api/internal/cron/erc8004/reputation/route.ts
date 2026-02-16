import { NextResponse } from 'next/server';
import { refreshReputationScores } from '@/lib/erc8004/reputation-cache';

export async function GET() {
  if (process.env.ERC8004_ENABLE_REPUTATION !== 'true') {
    return NextResponse.json({ skipped: true, reason: 'ERC8004_ENABLE_REPUTATION not enabled' });
  }

  try {
    const result = await refreshReputationScores();

    return NextResponse.json({
      success: true,
      refreshed: result.refreshed,
      errors: result.errors,
      timestamp: new Date().toISOString(),
    });
  } catch (err) {
    console.error('[ERC8004] Reputation cron failed:', err);
    return NextResponse.json(
      { error: 'Reputation refresh failed' },
      { status: 500 }
    );
  }
}
