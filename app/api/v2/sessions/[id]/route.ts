/**
 * P402 V2 Individual Session Endpoint
 * ====================================
 * Get or end a specific session.
 */

import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/db';

export async function GET(
    req: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    const { id: sessionId } = await params;
    const tenantId = req.headers.get('x-p402-tenant') || 'default';

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
            WHERE session_id = $1
            AND tenant_id = $2
        `;

        const result = await pool.query(query, [sessionId, tenantId]);

        if (result.rows.length === 0) {
            return NextResponse.json({
                error: {
                    type: 'not_found',
                    message: 'Session not found'
                }
            }, { status: 404 });
        }

        const row = result.rows[0];

        // Check if session is expired
        const now = new Date();
        const expiresAt = new Date(row.expires_at);
        const isExpired = expiresAt < now && row.status === 'active';

        if (isExpired) {
            // Auto-expire the session
            await pool.query(
                `UPDATE agent_sessions SET status = 'expired' WHERE session_id = $1`,
                [sessionId]
            );
            row.status = 'expired';
        }

        return NextResponse.json({
            object: 'session',
            id: row.session_id,
            tenant_id: row.tenant_id,
            agent_identifier: row.agent_identifier,
            budget: {
                total_usd: parseFloat(row.budget_total),
                used_usd: parseFloat(row.budget_used),
                remaining_usd: Math.max(0, parseFloat(row.budget_remaining)),
                utilization_percent: row.budget_total > 0
                    ? Math.round((parseFloat(row.budget_used) / parseFloat(row.budget_total)) * 100)
                    : 0
            },
            policy: row.policy_snapshot,
            status: row.status,
            created_at: row.created_at,
            expires_at: row.expires_at,
            ended_at: row.ended_at,
            // Include usage summary
            meta: {
                is_active: row.status === 'active',
                is_expired: row.status === 'expired' || isExpired,
                time_remaining_seconds: row.status === 'active'
                    ? Math.max(0, Math.floor((expiresAt.getTime() - now.getTime()) / 1000))
                    : 0
            }
        });

    } catch (error: any) {
        console.error('[Session] Get error:', error);
        return NextResponse.json({
            error: {
                type: 'internal_error',
                message: error.message
            }
        }, { status: 500 });
    }
}

export async function DELETE(
    req: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    const { id: sessionId } = await params;
    const tenantId = req.headers.get('x-p402-tenant') || 'default';

    try {
        // End the session
        const updateQuery = `
            UPDATE agent_sessions
            SET status = 'ended', ended_at = NOW()
            WHERE session_id = $1
            AND tenant_id = $2
            AND status = 'active'
            RETURNING *
        `;

        const result = await pool.query(updateQuery, [sessionId, tenantId]);

        if (result.rows.length === 0) {
            // Check if session exists but is already ended
            const checkQuery = `SELECT status FROM agent_sessions WHERE session_id = $1`;
            const checkResult = await pool.query(checkQuery, [sessionId]);

            if (checkResult.rows.length === 0) {
                return NextResponse.json({
                    error: {
                        type: 'not_found',
                        message: 'Session not found'
                    }
                }, { status: 404 });
            }

            return NextResponse.json({
                error: {
                    type: 'invalid_request',
                    message: `Session is already ${checkResult.rows[0].status}`
                }
            }, { status: 400 });
        }

        const row = result.rows[0];

        return NextResponse.json({
            object: 'session',
            id: row.session_id,
            status: 'ended',
            ended_at: row.ended_at,
            final_budget: {
                total_usd: parseFloat(row.budget_total),
                used_usd: parseFloat(row.budget_used),
                unused_usd: parseFloat(row.budget_total) - parseFloat(row.budget_used)
            }
        });

    } catch (error: any) {
        console.error('[Session] Delete error:', error);
        return NextResponse.json({
            error: {
                type: 'internal_error',
                message: error.message
            }
        }, { status: 500 });
    }
}

export async function PATCH(
    req: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    const { id: sessionId } = await params;
    const tenantId = req.headers.get('x-p402-tenant') || 'default';

    try {
        const body = await req.json();
        const { add_budget_usd, extend_hours, policy } = body;

        // Build update query dynamically
        const updates: string[] = [];
        const values: any[] = [sessionId, tenantId];
        let paramIndex = 3;

        if (add_budget_usd !== undefined && add_budget_usd > 0) {
            updates.push(`budget_total = budget_total + $${paramIndex}`);
            values.push(add_budget_usd);
            paramIndex++;
        }

        if (extend_hours !== undefined && extend_hours > 0) {
            updates.push(`expires_at = expires_at + INTERVAL '${Math.floor(extend_hours)} hours'`);
        }

        if (policy !== undefined) {
            updates.push(`policy_snapshot = $${paramIndex}`);
            values.push(JSON.stringify(policy));
            paramIndex++;
        }

        if (updates.length === 0) {
            return NextResponse.json({
                error: {
                    type: 'invalid_request',
                    message: 'No updates provided'
                }
            }, { status: 400 });
        }

        const updateQuery = `
            UPDATE agent_sessions
            SET ${updates.join(', ')}
            WHERE session_id = $1
            AND tenant_id = $2
            AND status = 'active'
            RETURNING 
                session_id,
                budget_total,
                budget_used,
                budget_total - budget_used as budget_remaining,
                policy_snapshot,
                expires_at
        `;

        const result = await pool.query(updateQuery, values);

        if (result.rows.length === 0) {
            return NextResponse.json({
                error: {
                    type: 'not_found',
                    message: 'Active session not found'
                }
            }, { status: 404 });
        }

        const row = result.rows[0];

        return NextResponse.json({
            object: 'session',
            id: row.session_id,
            budget: {
                total_usd: parseFloat(row.budget_total),
                used_usd: parseFloat(row.budget_used),
                remaining_usd: parseFloat(row.budget_remaining)
            },
            policy: row.policy_snapshot,
            expires_at: row.expires_at,
            updated: true
        });

    } catch (error: any) {
        console.error('[Session] Patch error:', error);
        return NextResponse.json({
            error: {
                type: 'internal_error',
                message: error.message
            }
        }, { status: 500 });
    }
}
