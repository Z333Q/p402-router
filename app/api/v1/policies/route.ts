import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/db'
import { requireTenantAccess } from '@/lib/auth'

export async function GET(req: NextRequest) {
    const access = await requireTenantAccess(req)
    if (access.error) {
        return NextResponse.json({ policies: [] })
    }
    const tenantId = access.tenantId

    try {
        const result = await pool.query('SELECT * FROM policies WHERE tenant_id = $1 ORDER BY updated_at DESC', [tenantId])
        const policies = result.rows.map(row => ({
            policyId: row.policy_id,
            name: row.name,
            rules: row.rules,
            updatedAt: row.updated_at,
            schemaVersion: row.version
        }))
        return NextResponse.json({ policies })
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 })
    }
}

export async function POST(req: NextRequest) {
    const access = await requireTenantAccess(req)
    if (access.error) {
        return NextResponse.json({ error: access.error }, { status: access.status })
    }
    const tenantId = access.tenantId

    try {
        const body = await req.json()
        const { policy } = body

        // Upsert logic scoped to tenant
        const query = `
        INSERT INTO policies (policy_id, tenant_id, name, rules, version, updated_at)
        VALUES ($1, $5, $2, $3, $4, NOW())
        ON CONFLICT (policy_id) 
        DO UPDATE SET name = $2, rules = $3, updated_at = NOW()
        WHERE policies.tenant_id = $5 
        RETURNING *
    `
        // Ensure we don't overwrite someone else's policy by adding WHERE clause in update
        // Note: ON CONFLICT target needs to matches unique constraint.
        // If policy_id is unique globally (it is), we are good.
        // We add the WHERE check implicitly by ensuring the initial insert includes tenant_id

        const result = await pool.query(query, [
            policy.policyId,
            policy.name,
            JSON.stringify(policy.rules),
            policy.schemaVersion,
            tenantId
        ])

        return NextResponse.json({ policy: result.rows[0] })
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 })
    }
}
