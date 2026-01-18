/**
 * P402 A2A Multi-Agent Orchestration
 * ====================================
 * Phase 5: Agent-to-Agent communication and task delegation.
 */

import { NextRequest, NextResponse } from 'next/server';
import { v4 as uuidv4 } from 'uuid';
import pool from '@/lib/db';
import {
    AgentCard,
    A2ATask,
    A2AMessage,
    TaskState
} from '@/lib/a2a-types';
import {
    fetchAgentCard,
    extractCapabilities
} from '@/lib/a2a-orchestration';

// =============================================================================
// TYPES
// =============================================================================

export interface RemoteAgent {
    id: string;
    tenantId: string;
    name: string;
    description: string;
    agentCardUrl: string;
    agentCard?: AgentCard;
    capabilities: string[];
    skills: string[];
    trustScore: number;
    status: 'active' | 'inactive' | 'unreachable';
    pricing?: {
        perRequest?: number;
        perToken?: number;
        currency: string;
    };
    lastSeen: string;
    createdAt: string;
}

export interface DelegationRequest {
    message: A2AMessage;
    targetAgentId?: string;
    targetCapabilities?: string[];
    configuration?: {
        maxCostUsd?: number;
        timeoutMs?: number;
        cascadeContext?: boolean;
    };
}

export interface DelegationResult {
    taskId: string;
    delegatedTo: string;
    status: TaskState;
    response?: A2AMessage;
    costUsd: number;
    latencyMs: number;
}

export interface AgentMatchResult {
    agentId: string;
    agentName: string;
    matchScore: number;
    capabilities: string[];
    estimatedCost?: number;
    latencyEstimate?: number;
}

// =============================================================================
// API ROUTES - AGENTS
// =============================================================================

export async function GET(req: NextRequest) {
    const tenantId = req.headers.get('x-p402-tenant') || 'default';
    const searchParams = req.nextUrl.searchParams;

    const capability = searchParams.get('capability');
    const status = searchParams.get('status');
    const limit = Math.min(parseInt(searchParams.get('limit') || '50'), 100);

    try {
        let query = `SELECT * FROM a2a_remote_agents WHERE tenant_id = $1`;
        const values: any[] = [tenantId];
        let paramIndex = 2;

        if (capability) {
            query += ` AND $${paramIndex++} = ANY(capabilities)`;
            values.push(capability);
        }

        if (status) {
            query += ` AND status = $${paramIndex++}`;
            values.push(status);
        }

        query += ` ORDER BY trust_score DESC LIMIT $${paramIndex}`;
        values.push(limit);

        const result = await pool.query(query, values);

        const agents = result.rows.map(row => ({
            id: row.id,
            name: row.name,
            description: row.description,
            agent_card_url: row.agent_card_url,
            capabilities: row.capabilities,
            skills: row.skills,
            trust_score: row.trust_score,
            status: row.status,
            pricing: row.pricing,
            stats: {
                total_delegations: row.total_delegations || 0,
                total_cost_usd: parseFloat(row.total_cost_usd) || 0,
                consecutive_failures: row.consecutive_failures || 0
            },
            last_seen_at: row.last_seen_at?.toISOString(),
            created_at: row.created_at?.toISOString()
        }));

        return NextResponse.json({
            object: 'list',
            data: agents
        });

    } catch (error: any) {
        console.error('[Agents] List error:', error);
        return NextResponse.json({
            error: { type: 'internal_error', message: error.message }
        }, { status: 500 });
    }
}

export async function POST(req: NextRequest) {
    const tenantId = req.headers.get('x-p402-tenant') || 'default';

    try {
        const body = await req.json();
        const { agent_card_url, name, description, pricing } = body;

        if (!agent_card_url) {
            return NextResponse.json({
                error: {
                    type: 'invalid_request',
                    message: 'agent_card_url is required'
                }
            }, { status: 400 });
        }

        // Fetch and validate agent card
        const card = await fetchAgentCard(agent_card_url);
        if (!card) {
            return NextResponse.json({
                error: {
                    type: 'agent_unreachable',
                    message: 'Could not fetch or validate agent card from URL'
                }
            }, { status: 400 });
        }

        // Extract capabilities
        const { capabilities, skills } = extractCapabilities(card);

        // Create agent record
        const agentId = uuidv4();
        const agentName = name || card.name;
        const agentDesc = description || card.description;

        await pool.query(`
            INSERT INTO a2a_remote_agents (
                id, tenant_id, name, description, agent_card_url, agent_card,
                capabilities, skills, trust_score, status, pricing,
                last_seen_at, created_at
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 50, 'active', $9, NOW(), NOW())
        `, [
            agentId,
            tenantId,
            agentName,
            agentDesc,
            agent_card_url,
            JSON.stringify(card),
            capabilities,
            skills,
            pricing ? JSON.stringify(pricing) : null
        ]);

        return NextResponse.json({
            object: 'remote_agent',
            id: agentId,
            name: agentName,
            description: agentDesc,
            agent_card_url,
            capabilities,
            skills,
            trust_score: 50,
            status: 'active',
            created_at: new Date().toISOString()
        }, { status: 201 });

    } catch (error: any) {
        console.error('[Agents] Register error:', error);
        return NextResponse.json({
            error: { type: 'internal_error', message: error.message }
        }, { status: 500 });
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
            'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
            'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-P402-Tenant',
            'Access-Control-Max-Age': '86400'
        }
    });
}
