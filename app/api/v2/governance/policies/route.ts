/**
 * P402 V2 Governance Policies Endpoint
 * =====================================
 * CRUD operations for spend policies.
 * 
 * GET /api/v2/governance/policies - List policies
 * POST /api/v2/governance/policies - Create policy
 */

import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/db';
import { requireTenantAccess } from '@/lib/auth';
import { toApiErrorResponse } from '@/lib/errors';

// =============================================================================
// LIST POLICIES
// =============================================================================

export async function GET(req: NextRequest) {
    const access = await requireTenantAccess(req);
    if (access.error) {
        return NextResponse.json({ error: access.error }, { status: access.status });
    }
    const tenantId = access.tenantId;

    try {
        const query = `
            SELECT 
                id,
                policy_id,
                name,
                rules,
                status,
                version,
                created_at,
                updated_at
            FROM policies
            WHERE tenant_id = $1
            ORDER BY created_at DESC
            LIMIT 100
        `;

        const result = await pool.query(query, [tenantId]);

        return NextResponse.json({
            object: 'list',
            data: result.rows.map(row => ({
                id: row.policy_id,
                name: row.name,
                rules: row.rules,
                status: row.status,
                version: row.version,
                created_at: row.created_at,
                updated_at: row.updated_at
            }))
        });

    } catch (error: unknown) {
        console.error('[Governance] List policies error:', error);
        return toApiErrorResponse(error, crypto.randomUUID());
    }
}

// =============================================================================
// CREATE POLICY
// =============================================================================

export async function POST(req: NextRequest) {
    const access = await requireTenantAccess(req);
    if (access.error) {
        return NextResponse.json({ error: access.error }, { status: access.status });
    }
    const tenantId = access.tenantId;

    try {
        const body = await req.json();
        const { name, rules = {}, version = '1.0.0' } = body;

        if (!name) {
            return NextResponse.json({
                error: {
                    type: 'invalid_request',
                    code: 'MISSING_NAME',
                    message: 'Policy name is required'
                }
            }, { status: 400 });
        }

        const policyId = `pol_${crypto.randomUUID().replace(/-/g, '').slice(0, 16)}`;

        const insertQuery = `
            INSERT INTO policies (
                policy_id,
                tenant_id,
                name,
                rules,
                status,
                version,
                created_at,
                updated_at
            ) VALUES ($1, $2, $3, $4, 'active', $5, NOW(), NOW())
            RETURNING *
        `;

        const result = await pool.query(insertQuery, [
            policyId,
            tenantId,
            name,
            JSON.stringify(rules),
            version
        ]);

        const row = result.rows[0];

        return NextResponse.json({
            object: 'policy',
            id: row.policy_id,
            name: row.name,
            rules: row.rules,
            status: row.status,
            version: row.version,
            created_at: row.created_at,
            updated_at: row.updated_at
        }, { status: 201 });

    } catch (error: unknown) {
        console.error('[Governance] Create policy error:', error);
        return toApiErrorResponse(error, crypto.randomUUID());
    }
}
