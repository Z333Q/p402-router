/**
 * P402 A2A Individual Agent & Delegation
 * =======================================
 * Manage individual remote agents and delegate tasks.
 * 
 * GET /api/a2a/agents/:agentId - Get agent details
 * DELETE /api/a2a/agents/:agentId - Remove agent
 * POST /api/a2a/agents/:agentId/delegate - Delegate task to agent
 * POST /api/a2a/agents/:agentId/refresh - Refresh agent card
 */

import { NextRequest, NextResponse } from 'next/server';
import { v4 as uuidv4 } from 'uuid';
import pool from '@/lib/db';
import { fetchAgentCard, extractCapabilities, delegateTask } from '@/lib/a2a-orchestration';

// =============================================================================
// GET AGENT DETAILS
// =============================================================================

export async function GET(
    req: NextRequest,
    { params }: { params: Promise<{ agentId: string }> }
) {
    const { agentId } = await params;
    const tenantId = req.headers.get('x-p402-tenant') || 'default';

    try {
        const result = await pool.query(`
            SELECT * FROM a2a_remote_agents 
            WHERE id = $1 AND tenant_id = $2
        `, [agentId, tenantId]);

        if (result.rows.length === 0) {
            return NextResponse.json({
                error: { type: 'not_found', message: `Agent ${agentId} not found` }
            }, { status: 404 });
        }

        const row = result.rows[0];

        // Get recent delegations
        const delegationsResult = await pool.query(`
            SELECT id, task_id, status, cost_usd, latency_ms, created_at
            FROM a2a_delegations
            WHERE target_agent_id = $1
            ORDER BY created_at DESC
            LIMIT 10
        `, [agentId]);

        const agent = {
            object: 'remote_agent',
            id: row.id,
            name: row.name,
            description: row.description,
            agent_card_url: row.agent_card_url,
            agent_card: row.agent_card,
            capabilities: row.capabilities,
            skills: row.skills,
            trust_score: row.trust_score,
            status: row.status,
            pricing: row.pricing,
            stats: {
                total_delegations: row.total_delegations || 0,
                total_cost_usd: parseFloat(row.total_cost_usd) || 0,
                consecutive_failures: row.consecutive_failures || 0,
                avg_latency_ms: row.avg_latency_ms || 0
            },
            recent_delegations: delegationsResult.rows.map(d => ({
                id: d.id,
                task_id: d.task_id,
                status: d.status,
                cost_usd: parseFloat(d.cost_usd) || 0,
                latency_ms: d.latency_ms,
                created_at: d.created_at?.toISOString()
            })),
            last_seen_at: row.last_seen_at?.toISOString(),
            created_at: row.created_at?.toISOString()
        };

        return NextResponse.json(agent);

    } catch (error: any) {
        console.error('[Agent] Get error:', error);
        return NextResponse.json({
            error: { type: 'internal_error', message: error.message }
        }, { status: 500 });
    }
}

// =============================================================================
// DELETE AGENT
// =============================================================================

export async function DELETE(
    req: NextRequest,
    { params }: { params: Promise<{ agentId: string }> }
) {
    const { agentId } = await params;
    const tenantId = req.headers.get('x-p402-tenant') || 'default';

    try {
        const result = await pool.query(`
            DELETE FROM a2a_remote_agents 
            WHERE id = $1 AND tenant_id = $2
            RETURNING id, name
        `, [agentId, tenantId]);

        if (result.rows.length === 0) {
            return NextResponse.json({
                error: { type: 'not_found', message: `Agent ${agentId} not found` }
            }, { status: 404 });
        }

        return NextResponse.json({
            object: 'remote_agent',
            id: agentId,
            deleted: true,
            name: result.rows[0].name
        });

    } catch (error: any) {
        console.error('[Agent] Delete error:', error);
        return NextResponse.json({
            error: { type: 'internal_error', message: error.message }
        }, { status: 500 });
    }
}

// =============================================================================
// DELEGATE TASK TO AGENT
// =============================================================================

export async function POST(
    req: NextRequest,
    { params }: { params: Promise<{ agentId: string }> }
) {
    const { agentId } = await params;
    const tenantId = req.headers.get('x-p402-tenant') || 'default';
    const searchParams = req.nextUrl.searchParams;
    const action = searchParams.get('action');

    try {
        // Handle refresh action
        if (action === 'refresh') {
            return await handleRefresh(agentId, tenantId);
        }

        // Default: delegate task
        return await handleDelegate(req, agentId, tenantId);

    } catch (error: any) {
        console.error('[Agent] Action error:', error);
        return NextResponse.json({
            error: { type: 'internal_error', message: error.message }
        }, { status: 500 });
    }
}

async function handleRefresh(agentId: string, tenantId: string): Promise<NextResponse> {
    // Get agent
    const agentResult = await pool.query(`
        SELECT agent_card_url FROM a2a_remote_agents 
        WHERE id = $1 AND tenant_id = $2
    `, [agentId, tenantId]);

    if (agentResult.rows.length === 0) {
        return NextResponse.json({
            error: { type: 'not_found', message: `Agent ${agentId} not found` }
        }, { status: 404 });
    }

    const { agent_card_url } = agentResult.rows[0];

    // Fetch fresh agent card
    const card = await fetchAgentCard(agent_card_url);
    if (!card) {
        // Mark as unreachable
        await pool.query(`
            UPDATE a2a_remote_agents 
            SET status = 'unreachable', consecutive_failures = consecutive_failures + 1
            WHERE id = $1
        `, [agentId]);

        return NextResponse.json({
            error: {
                type: 'agent_unreachable',
                message: 'Could not fetch agent card'
            }
        }, { status: 502 });
    }

    // Update agent record
    const { capabilities, skills } = extractCapabilities(card);

    await pool.query(`
        UPDATE a2a_remote_agents
        SET agent_card = $2,
            capabilities = $3,
            skills = $4,
            status = 'active',
            consecutive_failures = 0,
            last_seen_at = NOW()
        WHERE id = $1
    `, [agentId, JSON.stringify(card), capabilities, skills]);

    return NextResponse.json({
        object: 'remote_agent',
        id: agentId,
        refreshed: true,
        capabilities,
        skills,
        status: 'active'
    });
}

async function handleDelegate(
    req: NextRequest,
    agentId: string,
    tenantId: string
): Promise<NextResponse> {
    const body = await req.json();
    const { message, configuration } = body;

    if (!message || !message.parts) {
        return NextResponse.json({
            error: {
                type: 'invalid_request',
                message: 'Message with parts is required'
            }
        }, { status: 400 });
    }

    try {
        const result = await delegateTask(tenantId, agentId, message, configuration);

        return NextResponse.json({
            object: 'delegation',
            ...result
        });

    } catch (error: any) {
        return NextResponse.json({
            error: {
                type: 'delegation_failed',
                message: error.message
            }
        }, { status: 502 });
    }
}

// =============================================================================
// OPTIONS (CORS)
// =============================================================================

export async function OPTIONS() {
    return new Response(null, {
        status: 204,
        headers: {
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': 'GET, POST, DELETE, OPTIONS',
            'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-P402-Tenant',
            'Access-Control-Max-Age': '86400'
        }
    });
}
