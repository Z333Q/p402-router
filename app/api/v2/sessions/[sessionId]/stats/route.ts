import { NextRequest, NextResponse } from 'next/server';
import { getSessionAnalytics } from '@/lib/db/queries';
import { z } from 'zod';

const ParamsSchema = z.object({
  sessionId: z.string().min(1)
});

export async function GET(
  req: NextRequest,
  { params }: { params: { sessionId: string } }
) {
  try {
    const { sessionId } = ParamsSchema.parse(params);

    // Get real-time session analytics from database
    const analytics = await getSessionAnalytics(sessionId);

    // Calculate savings estimate (mock for now, would need baseline costs)
    const estimatedDirectCost = analytics.totalCost * 1.3; // Assume 30% markup without P402
    const saved = estimatedDirectCost - analytics.totalCost;

    // Mock balance for demo (in real app, this would come from user's wallet/account)
    const mockBalance = 10.0; // $10 remaining balance

    const response = {
      balance: mockBalance,
      spent: analytics.totalCost,
      saved: Math.max(saved, 0),
      requestCount: analytics.requestCount,
      avgLatency: analytics.avgLatency,
      costHistory: analytics.costHistory.map((entry) => ({
        timestamp: entry.timestamp,
        cost: parseFloat(entry.cost.toString())
      })),
      lastUpdated: new Date().toISOString()
    };

    return NextResponse.json(response);

  } catch (error: any) {
    console.error('Session stats error:', error);

    if (error.name === 'ZodError') {
      return NextResponse.json(
        { error: 'Invalid session ID format' },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: 'Failed to fetch session statistics' },
      { status: 500 }
    );
  }
}