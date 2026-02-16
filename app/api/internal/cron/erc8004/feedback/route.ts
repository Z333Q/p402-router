import { NextResponse } from 'next/server';
import { processPendingFeedback } from '@/lib/erc8004/feedback-service';

export async function GET() {
  if (process.env.ERC8004_ENABLE_REPUTATION !== 'true') {
    return NextResponse.json({ skipped: true, reason: 'ERC8004_ENABLE_REPUTATION not enabled' });
  }

  try {
    const result = await processPendingFeedback();

    return NextResponse.json({
      success: true,
      submitted: result.submitted,
      failed: result.failed,
      timestamp: new Date().toISOString(),
    });
  } catch (err) {
    console.error('[ERC8004] Feedback cron failed:', err);
    return NextResponse.json(
      { error: 'Feedback processing failed' },
      { status: 500 }
    );
  }
}
