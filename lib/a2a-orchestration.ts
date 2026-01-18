import { v4 as uuidv4 } from 'uuid';
import pool from './db';
import {
    AgentCard,
    A2ATask,
    A2AMessage,
    TaskState
} from './a2a-types';

/**
 * Fetch and validate an agent card from a remote URL
 */
export async function fetchAgentCard(url: string): Promise<AgentCard | null> {
    try {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 10000);

        const response = await fetch(url, {
            headers: {
                'Accept': 'application/json',
                'User-Agent': 'P402-A2A-Discovery/1.0'
            },
            signal: controller.signal
        });

        clearTimeout(timeout);

        if (!response.ok) {
            console.error(`[Agent Discovery] Failed to fetch ${url}: ${response.status}`);
            return null;
        }

        const card = await response.json() as AgentCard;

        // Validate required fields
        if (!card.name || !card.url || !card.protocolVersion) {
            console.error(`[Agent Discovery] Invalid agent card from ${url}`);
            return null;
        }

        return card;
    } catch (error: any) {
        console.error(`[Agent Discovery] Error fetching ${url}:`, error.message);
        return null;
    }
}

/**
 * Extract capabilities and skills from agent card
 */
export function extractCapabilities(card: AgentCard): { capabilities: string[]; skills: string[] } {
    const capabilities = new Set<string>();
    const skills = new Set<string>();

    // Extract from skills
    for (const skill of card.skills || []) {
        skills.add(skill.id);
        for (const tag of skill.tags || []) {
            capabilities.add(tag);
        }
    }

    // Extract from extensions
    for (const ext of card.extensions || []) {
        if (ext.uri.includes('x402')) {
            capabilities.add('payment');
        }
        if (ext.uri.includes('cost-routing')) {
            capabilities.add('ai-routing');
        }
        if (ext.uri.includes('ap2')) {
            capabilities.add('mandate');
        }
    }

    // Extract from capabilities object
    if (card.capabilities) {
        if (card.capabilities.streaming) capabilities.add('streaming');
        if (card.capabilities.pushNotifications) capabilities.add('push');
    }

    return {
        capabilities: Array.from(capabilities),
        skills: Array.from(skills)
    };
}

/**
 * Find agents matching required capabilities
 */
export async function findMatchingAgents(
    tenantId: string,
    requiredCapabilities: string[],
    limit: number = 10
): Promise<any[]> {
    // Query agents with matching capabilities
    const result = await pool.query(`
        SELECT 
            id, name, capabilities, skills, trust_score,
            pricing, status, last_seen_at
        FROM a2a_remote_agents
        WHERE tenant_id = $1
          AND status = 'active'
          AND capabilities && $2::text[]
        ORDER BY trust_score DESC
        LIMIT $3
    `, [tenantId, requiredCapabilities, limit]);

    // Score and rank matches
    const matches = result.rows.map(row => {
        const agentCaps = row.capabilities || [];
        const matchedCaps = requiredCapabilities.filter(c => agentCaps.includes(c));
        const matchScore = matchedCaps.length / requiredCapabilities.length;

        return {
            agentId: row.id,
            agentName: row.name,
            matchScore,
            capabilities: matchedCaps,
            estimatedCost: row.pricing?.perRequest,
            latencyEstimate: undefined
        };
    });

    // Sort by match score
    matches.sort((a: any, b: any) => b.matchScore - a.matchScore);

    return matches;
}

/**
 * Delegate a task to a remote agent
 */
export async function delegateTask(
    tenantId: string,
    agentId: string,
    message: A2AMessage,
    config: any = {}
): Promise<any> {
    const startTime = Date.now();
    const taskId = `del_${uuidv4()}`;

    // Get agent details
    const agentResult = await pool.query(`
        SELECT * FROM a2a_remote_agents WHERE id = $1 AND tenant_id = $2
    `, [agentId, tenantId]);

    if (agentResult.rows.length === 0) {
        throw new Error(`Agent ${agentId} not found`);
    }

    const agent = agentResult.rows[0];
    const card = agent.agent_card as AgentCard;

    // Get A2A endpoint
    const a2aEndpoint = card?.endpoints?.a2a?.jsonrpc || `${card?.url}/api/a2a`;

    try {
        // Create delegation record
        await pool.query(`
            INSERT INTO a2a_delegations (
                id, tenant_id, target_agent_id, task_id,
                input_message, status, created_at
            ) VALUES ($1, $2, $3, $4, $5, 'pending', NOW())
        `, [taskId, tenantId, agentId, taskId, JSON.stringify(message)]);

        // Send A2A request to remote agent
        const controller = new AbortController();
        const timeout = setTimeout(
            () => controller.abort(),
            config.timeoutMs || 60000
        );

        const response = await fetch(a2aEndpoint, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'User-Agent': 'P402-A2A-Delegator/1.0'
            },
            body: JSON.stringify({
                jsonrpc: '2.0',
                method: 'message/send',
                params: {
                    message,
                    configuration: {
                        maxCost: config.maxCostUsd
                    }
                },
                id: taskId
            }),
            signal: controller.signal
        });

        clearTimeout(timeout);

        const result = await response.json();
        const latencyMs = Date.now() - startTime;

        if (result.error) {
            // Update delegation record with error
            await pool.query(`
                UPDATE a2a_delegations
                SET status = 'failed', error_message = $2, 
                    latency_ms = $3, completed_at = NOW()
                WHERE id = $1
            `, [taskId, result.error.message, latencyMs]);

            return {
                taskId,
                delegatedTo: agent.name,
                status: 'failed',
                costUsd: 0,
                latencyMs
            };
        }

        // Extract response
        const remoteTask = result.result?.task as A2ATask;
        const costUsd = remoteTask?.metadata?.cost_usd || 0;

        // Update delegation record
        await pool.query(`
            UPDATE a2a_delegations
            SET status = $2, output_message = $3, 
                cost_usd = $4, latency_ms = $5, completed_at = NOW()
            WHERE id = $1
        `, [
            taskId,
            remoteTask?.status?.state || 'completed',
            JSON.stringify(remoteTask?.status?.message),
            costUsd,
            latencyMs
        ]);

        // Update agent stats
        await pool.query(`
            UPDATE a2a_remote_agents
            SET last_seen_at = NOW(),
                total_delegations = total_delegations + 1,
                total_cost_usd = total_cost_usd + $2
            WHERE id = $1
        `, [agentId, costUsd]);

        return {
            taskId,
            delegatedTo: agent.name,
            status: remoteTask?.status?.state || 'completed',
            response: remoteTask?.status?.message,
            costUsd,
            latencyMs
        };

    } catch (error: any) {
        const latencyMs = Date.now() - startTime;

        // Update delegation record
        await pool.query(`
            UPDATE a2a_delegations
            SET status = 'failed', error_message = $2, 
                latency_ms = $3, completed_at = NOW()
            WHERE id = $1
        `, [taskId, error.message, latencyMs]);

        // Mark agent as potentially unreachable
        await pool.query(`
            UPDATE a2a_remote_agents
            SET consecutive_failures = consecutive_failures + 1,
                status = CASE 
                    WHEN consecutive_failures >= 5 THEN 'unreachable'
                    ELSE status
                END
            WHERE id = $1
        `, [agentId]);

        throw error;
    }
}
