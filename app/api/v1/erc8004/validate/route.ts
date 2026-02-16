import { NextResponse } from 'next/server';
import db from '@/lib/db';

/**
 * POST /api/v1/erc8004/validate
 *
 * External validators submit validation responses for P402-initiated requests.
 * This endpoint updates the local validation record.
 */
export async function POST(request: Request) {
  if (process.env.ERC8004_ENABLE_VALIDATION !== 'true') {
    return NextResponse.json(
      { error: 'Validation registry not enabled' },
      { status: 403 }
    );
  }

  try {
    const body = await request.json();
    const { requestHash, response, responseUri, tag } = body;

    if (!requestHash || typeof response !== 'boolean') {
      return NextResponse.json(
        { error: 'requestHash and response (boolean) are required' },
        { status: 400 }
      );
    }

    // Update the local validation record
    const result = await db.query(
      `UPDATE erc8004_validations
       SET response = $1,
           response_uri = $2,
           tag = $3,
           status = CASE WHEN $1 THEN 'validated' ELSE 'rejected' END,
           responded_at = NOW()
       WHERE request_hash = $4
       RETURNING id, status`,
      [response, responseUri || null, tag || null, requestHash]
    );

    if (result.rows.length === 0) {
      return NextResponse.json(
        { error: 'Validation request not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      requestHash,
      status: result.rows[0]?.status,
    });
  } catch (err) {
    console.error('[ERC8004] Validation response failed:', err);
    return NextResponse.json(
      { error: 'Failed to process validation response' },
      { status: 500 }
    );
  }
}

/**
 * GET /api/v1/erc8004/validate?requestHash=0x...
 *
 * Check the status of a validation request.
 */
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const requestHash = searchParams.get('requestHash');

  if (!requestHash) {
    return NextResponse.json(
      { error: 'requestHash query parameter is required' },
      { status: 400 }
    );
  }

  try {
    const result = await db.query(
      `SELECT request_hash, agent_id, validator_address, response, status,
              created_at, responded_at
       FROM erc8004_validations
       WHERE request_hash = $1`,
      [requestHash]
    );

    if (result.rows.length === 0) {
      return NextResponse.json(
        { error: 'Validation request not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({ validation: result.rows[0] });
  } catch (err) {
    console.error('[ERC8004] Validation status check failed:', err);
    return NextResponse.json(
      { error: 'Failed to check validation status' },
      { status: 500 }
    );
  }
}
