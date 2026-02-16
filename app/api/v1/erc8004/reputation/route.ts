import { NextResponse } from 'next/server';
import db from '@/lib/db';

export async function GET() {
  try {
    const res = await db.query(`
      SELECT facilitator_id, name, erc8004_agent_id, erc8004_verified,
             erc8004_reputation_cached, erc8004_reputation_fetched_at
      FROM facilitators
      WHERE erc8004_agent_id IS NOT NULL
      ORDER BY erc8004_reputation_cached DESC NULLS LAST
    `);

    return NextResponse.json({
      facilitators: res.rows.map((row) => ({
        facilitatorId: row.facilitator_id,
        name: row.name,
        agentId: row.erc8004_agent_id,
        verified: row.erc8004_verified === true,
        reputationScore: row.erc8004_reputation_cached !== null
          ? parseFloat(row.erc8004_reputation_cached)
          : null,
        lastFetched: row.erc8004_reputation_fetched_at,
      })),
    });
  } catch (err) {
    console.error('[ERC8004] Reputation list failed:', err);
    return NextResponse.json(
      { error: 'Failed to fetch reputation data' },
      { status: 500 }
    );
  }
}
