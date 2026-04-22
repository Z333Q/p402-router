import { NextRequest, NextResponse } from 'next/server';
import db from '@/lib/db';
import crypto from 'crypto';

export const dynamic = 'force-dynamic';

// POST /api/meter/sessions
// Create a lightweight governed session for the meter workflow
// Reuses the agent_sessions table pattern from the main P402 stack

export async function POST(req: NextRequest) {
  try {
    const body = await req.json() as {
      budgetCapUsd?: number;
      workOrderId?: string;
      routingMode?: string;
    };

    const sessionId = `meter_${crypto.randomUUID().slice(0, 12)}`;
    const budgetCapUsd = body.budgetCapUsd ?? 0.50;
    const routingMode = body.routingMode ?? 'cost';

    // Try to insert into agent_sessions if table exists, otherwise return a demo session
    try {
      await db.query(
        `INSERT INTO agent_sessions (session_token, status, budget_usd, budget_spent_usd, policies, created_at, expires_at)
         VALUES ($1, 'active', $2, 0, $3, NOW(), NOW() + INTERVAL '1 hour')
         ON CONFLICT DO NOTHING`,
        [
          sessionId,
          budgetCapUsd,
          JSON.stringify({ routing_mode: routingMode, work_order_id: body.workOrderId ?? null }),
        ]
      );
    } catch {
      // Table may not exist in all envs — session still returned for UI use
    }

    return NextResponse.json({
      sessionId,
      budgetCapUsd,
      routingMode,
      status: 'active',
      createdAt: new Date().toISOString(),
    });
  } catch (err: unknown) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'session creation failed' },
      { status: 500 }
    );
  }
}
