/**
 * P402 V2 Governance Mandates Endpoint
 * =====================================
 * CRUD operations for AP2 payment mandates.
 * 
 * GET /api/v2/governance/mandates - List mandates
 * POST /api/v2/governance/mandates - Create mandate
 */

import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/db';

// =============================================================================
// LIST MANDATES
// =============================================================================

export async function GET(req: NextRequest) {
    let tenantId = req.headers.get('x-p402-tenant');
    if (!tenantId || tenantId === 'default') {
        const tRes = await pool.query('SELECT id FROM tenants LIMIT 1');
        tenantId = tRes.rows[0]?.id || '00000000-0000-0000-0000-000000000001';
    }

    const searchParams = req.nextUrl.searchParams;
    const status = searchParams.get('status') || 'active';

    try {
        const query = `
            SELECT 
                id,
                type,
                user_did,
                agent_did,
                constraints,
                amount_spent_usd,
                status,
                created_at,
                updated_at
            FROM ap2_mandates
            WHERE tenant_id = $1 AND status = $2
            ORDER BY created_at DESC
            LIMIT 100
        `;

        const result = await pool.query(query, [tenantId, status]);

        return NextResponse.json({
            object: 'list',
            data: result.rows.map(row => ({
                id: row.id,
                type: row.type,
                user_did: row.user_did,
                agent_did: row.agent_did,
                constraints: row.constraints,
                amount_spent_usd: parseFloat(row.amount_spent_usd),
                status: row.status,
                created_at: row.created_at,
                updated_at: row.updated_at
            }))
        });

    } catch (error: any) {
        console.error('[Governance] List mandates error:', error);
        return NextResponse.json({
            error: { type: 'internal_error', message: error.message }
        }, { status: 500 });
    }
}

// =============================================================================
// CREATE MANDATE
// =============================================================================

export async function POST(req: NextRequest) {
    let tenantId = req.headers.get('x-p402-tenant');
    if (!tenantId || tenantId === 'default') {
        const tRes = await pool.query('SELECT id FROM tenants LIMIT 1');
        tenantId = tRes.rows[0]?.id || '00000000-0000-0000-0000-000000000001';
    }

    try {
        const body = await req.json();
        const {
            type = 'payment',
            user_did,
            agent_did,
            constraints,
            signature,
            public_key
        } = body;

        if (!user_did || !agent_did) {
            return NextResponse.json({
                error: {
                    type: 'invalid_request',
                    code: 'MISSING_DIDS',
                    message: 'user_did and agent_did are required'
                }
            }, { status: 400 });
        }

        if (!constraints) {
            return NextResponse.json({
                error: {
                    type: 'invalid_request',
                    code: 'MISSING_CONSTRAINTS',
                    message: 'Mandate constraints are required'
                }
            }, { status: 400 });
        }

        const mandateId = `mnd_${crypto.randomUUID().replace(/-/g, '').slice(0, 20)}`;

        const insertQuery = `
            INSERT INTO ap2_mandates (
                id,
                tenant_id,
                type,
                user_did,
                agent_did,
                constraints,
                amount_spent_usd,
                status,
                signature,
                public_key,
                created_at,
                updated_at
            ) VALUES ($1, $2, $3, $4, $5, $6, 0, 'active', $7, $8, NOW(), NOW())
            RETURNING *
        `;

        const result = await pool.query(insertQuery, [
            mandateId,
            tenantId,
            type,
            user_did,
            agent_did,
            JSON.stringify(constraints),
            signature || null,
            public_key || null
        ]);

        const row = result.rows[0];

        return NextResponse.json({
            object: 'mandate',
            id: row.id,
            type: row.type,
            user_did: row.user_did,
            agent_did: row.agent_did,
            constraints: row.constraints,
            status: row.status,
            created_at: row.created_at
        }, { status: 201 });

    } catch (error: any) {
        console.error('[Governance] Create mandate error:', error);
        return NextResponse.json({
            error: { type: 'internal_error', message: error.message }
        }, { status: 500 });
    }
}
