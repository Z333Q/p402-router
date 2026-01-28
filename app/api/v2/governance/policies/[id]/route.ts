/**
 * P402 V2 Individual Policy Endpoint
 * ====================================
 * Get, update, or delete a specific policy.
 */

import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/db';

export async function GET(
    req: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    const { id } = await params;
    let tenantId = req.headers.get('x-p402-tenant');
    if (!tenantId || tenantId === 'default') {
        const tRes = await pool.query('SELECT id FROM tenants LIMIT 1');
        tenantId = tRes.rows[0]?.id || '00000000-0000-0000-0000-000000000001';
    }

    try {
        const query = `
            SELECT * FROM policies
            WHERE policy_id = $1 AND tenant_id = $2
        `;

        const result = await pool.query(query, [id, tenantId]);

        if (result.rowCount === 0) {
            return NextResponse.json({
                error: {
                    type: 'not_found',
                    message: `Policy ${id} not found`
                }
            }, { status: 404 });
        }

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
        });

    } catch (error: any) {
        return NextResponse.json({
            error: { type: 'internal_error', message: error.message }
        }, { status: 500 });
    }
}

export async function PATCH(
    req: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    const { id } = await params;
    let tenantId = req.headers.get('x-p402-tenant');
    if (!tenantId || tenantId === 'default') {
        const tRes = await pool.query('SELECT id FROM tenants LIMIT 1');
        tenantId = tRes.rows[0]?.id || '00000000-0000-0000-0000-000000000001';
    }

    try {
        const body = await req.json();
        const { name, rules, status, version } = body;

        const updates: string[] = ['updated_at = NOW()'];
        const values: any[] = [id, tenantId];
        let paramIndex = 3;

        if (name !== undefined) {
            updates.push(`name = $${paramIndex}`);
            values.push(name);
            paramIndex++;
        }

        if (rules !== undefined) {
            updates.push(`rules = $${paramIndex}`);
            values.push(JSON.stringify(rules));
            paramIndex++;
        }

        if (status !== undefined) {
            updates.push(`status = $${paramIndex}`);
            values.push(status);
            paramIndex++;
        }

        if (version !== undefined) {
            updates.push(`version = $${paramIndex}`);
            values.push(version);
            paramIndex++;
        }

        const query = `
            UPDATE policies
            SET ${updates.join(', ')}
            WHERE policy_id = $1 AND tenant_id = $2
            RETURNING *
        `;

        const result = await pool.query(query, values);

        if (result.rowCount === 0) {
            return NextResponse.json({
                error: { type: 'not_found', message: `Policy ${id} not found` }
            }, { status: 404 });
        }

        const row = result.rows[0];

        return NextResponse.json({
            object: 'policy',
            id: row.policy_id,
            name: row.name,
            rules: row.rules,
            status: row.status,
            version: row.version,
            updated: true
        });

    } catch (error: any) {
        return NextResponse.json({
            error: { type: 'internal_error', message: error.message }
        }, { status: 500 });
    }
}

export async function DELETE(
    req: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    const { id } = await params;
    let tenantId = req.headers.get('x-p402-tenant');
    if (!tenantId || tenantId === 'default') {
        const tRes = await pool.query('SELECT id FROM tenants LIMIT 1');
        tenantId = tRes.rows[0]?.id || '00000000-0000-0000-0000-000000000001';
    }

    try {
        const query = `
            UPDATE policies
            SET status = 'revoked', updated_at = NOW()
            WHERE policy_id = $1 AND tenant_id = $2
            RETURNING policy_id, status
        `;

        const result = await pool.query(query, [id, tenantId]);

        if (result.rowCount === 0) {
            return NextResponse.json({
                error: { type: 'not_found', message: `Policy ${id} not found` }
            }, { status: 404 });
        }

        return NextResponse.json({
            object: 'policy',
            id: result.rows[0].policy_id,
            status: 'revoked',
            deleted: true
        });

    } catch (error: any) {
        return NextResponse.json({
            error: { type: 'internal_error', message: error.message }
        }, { status: 500 });
    }
}
