import { NextResponse } from 'next/server';
import db from '@/lib/db';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const facilitatorId = searchParams.get('facilitatorId');
  const limit = Math.min(parseInt(searchParams.get('limit') || '50', 10), 100);

  try {
    let query = `
      SELECT id, settlement_event_id, facilitator_id, agent_id, tx_hash,
             value, tag1, tag2, status, created_at, submitted_at
      FROM erc8004_feedback
    `;
    const params: (string | number)[] = [];

    if (facilitatorId) {
      query += ' WHERE facilitator_id = $1';
      params.push(facilitatorId);
    }

    query += ` ORDER BY created_at DESC LIMIT $${params.length + 1}`;
    params.push(limit);

    const res = await db.query(query, params);

    return NextResponse.json({
      feedback: res.rows,
      count: res.rows.length,
    });
  } catch (err) {
    console.error('[ERC8004] Feedback list failed:', err);
    return NextResponse.json(
      { error: 'Failed to fetch feedback data' },
      { status: 500 }
    );
  }
}
