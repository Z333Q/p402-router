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
import { requireTenantAccess } from '@/lib/auth';
import { toApiErrorResponse } from '@/lib/errors';
import { checkAgentkitAccess } from '@/lib/identity/agentkit';

// =============================================================================
// LIST MANDATES
// =============================================================================

export async function GET(req: NextRequest) {
    const access = await requireTenantAccess(req);
    if (access.error) {
        return NextResponse.json({ error: access.error }, { status: access.status });
    }
    const tenantId = access.tenantId;

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

    } catch (error: unknown) {
        console.error('[Governance] List mandates error:', error);
        return toApiErrorResponse(error, crypto.randomUUID());
    }
}

// =============================================================================
// CREATE MANDATE
// =============================================================================

export async function POST(req: NextRequest) {
    const access = await requireTenantAccess(req);
    if (access.error) {
        return NextResponse.json({ error: access.error }, { status: access.status });
    }
    const tenantId = access.tenantId;

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

        // Optionally verify grantor World ID (non-blocking — mandate proceeds either way)
        let humanIdHash: string | null = null;
        if (process.env.AGENTKIT_ENABLED === 'true') {
            const agentkit = await checkAgentkitAccess(req, '/api/v2/governance/mandates').catch(() => null);
            if (agentkit?.humanId) {
                humanIdHash = agentkit.humanId;
            }
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
                human_id_hash,
                created_at,
                updated_at
            ) VALUES ($1, $2, $3, $4, $5, $6, 0, 'active', $7, $8, $9, NOW(), NOW())
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
            public_key || null,
            humanIdHash
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
            human_verified: humanIdHash !== null,
            created_at: row.created_at
        }, { status: 201 });

    } catch (error: unknown) {
        console.error('[Governance] Create mandate error:', error);
        return toApiErrorResponse(error, crypto.randomUUID());
    }
}
