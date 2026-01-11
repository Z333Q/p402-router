/**
 * P402 V2 Sessions Endpoint
 * =========================
 * Manage agent sessions with budgets and policies.
 * 
 * POST /api/v2/sessions - Create a new session
 * GET /api/v2/sessions/:id - Get session details
 * DELETE /api/v2/sessions/:id - End a session
 * 
 * V2 Spec: Section 4.5 (Session Keys)
 */

import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/db';

// =============================================================================
// LIST / CREATE SESSIONS
// =============================================================================

export async function GET(req: NextRequest) {
    const tenantId = req.headers.get('x-p402-tenant') || 'default';
    const searchParams = req.nextUrl.searchParams;
    const status = searchParams.get('status') || 'active';

    try {
        const query = `
            SELECT 
                session_id,
                tenant_id,
                agent_identifier,
                budget_total,
                budget_used,
                budget_total - budget_used as budget_remaining,
                policy_snapshot,
                status,
                created_at,
                expires_at,
                ended_at
            FROM agent_sessions
            WHERE tenant_id = $1
            AND status = $2
            ORDER BY created_at DESC
            LIMIT 100
        `;

        const result = await pool.query(query, [tenantId, status]);

        return NextResponse.json({
            object: 'list',
            data: result.rows.map(row => ({
                id: row.session_id,
                tenant_id: row.tenant_id,
                agent_identifier: row.agent_identifier,
                budget: {
                    total_usd: parseFloat(row.budget_total),
                    used_usd: parseFloat(row.budget_used),
                    remaining_usd: parseFloat(row.budget_remaining)
                },
                policy: row.policy_snapshot,
                status: row.status,
                created_at: row.created_at,
                expires_at: row.expires_at,
                ended_at: row.ended_at
            }))
        });

    } catch (error: any) {
        console.error('[Sessions] List error:', error);
        return NextResponse.json({
            object: 'list',
            data: []
        });
    }
}

export async function POST(req: NextRequest) {
    const tenantId = req.headers.get('x-p402-tenant') || 'default';

    try {
        const body = await req.json();
        const {
            agent_identifier,
            budget_usd = 10.0,
            expires_in_hours = 24,
            policy = {}
        } = body;

        // Validate budget
        if (budget_usd <= 0 || budget_usd > 10000) {
            return NextResponse.json({
                error: {
                    type: 'invalid_request',
                    message: 'Budget must be between $0.01 and $10,000'
                }
            }, { status: 400 });
        }

        // Generate session ID
        const sessionId = `sess_${crypto.randomUUID().replace(/-/g, '').slice(0, 24)}`;

        // Calculate expiration
        const expiresAt = new Date();
        expiresAt.setHours(expiresAt.getHours() + expires_in_hours);

        // Create session
        const insertQuery = `
            INSERT INTO agent_sessions (
                session_id,
                tenant_id,
                agent_identifier,
                budget_total,
                budget_used,
                policy_snapshot,
                status,
                created_at,
                expires_at
            ) VALUES ($1, $2, $3, $4, 0, $5, 'active', NOW(), $6)
            RETURNING *
        `;

        const result = await pool.query(insertQuery, [
            sessionId,
            tenantId,
            agent_identifier || null,
            budget_usd,
            JSON.stringify(policy),
            expiresAt
        ]);

        const row = result.rows[0];

        return NextResponse.json({
            object: 'session',
            id: row.session_id,
            tenant_id: row.tenant_id,
            agent_identifier: row.agent_identifier,
            budget: {
                total_usd: parseFloat(row.budget_total),
                used_usd: 0,
                remaining_usd: parseFloat(row.budget_total)
            },
            policy: row.policy_snapshot,
            status: row.status,
            created_at: row.created_at,
            expires_at: row.expires_at,
            // Include session key for API authentication
            session_key: sessionId
        }, { status: 201 });

    } catch (error: any) {
        console.error('[Sessions] Create error:', error);
        return NextResponse.json({
            error: {
                type: 'internal_error',
                message: error.message || 'Failed to create session'
            }
        }, { status: 500 });
    }
}
