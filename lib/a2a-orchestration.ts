import { v4 as uuidv4 } from 'uuid';
import pool from './db';
import {
    AgentCard,
    A2ATask,
    A2AMessage,
    TaskState,
    X402PaymentRequired,
    X402_EXTENSION_URI,
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

// ── x402 Auto-Pay for A2A ──────────────────────────────────────────────────────

export interface AutoPayConfig {
    /** Maximum USD amount this call is allowed to pay autonomously. */
    maxAutoPayUsd: number;
    /** Session ID to charge against (budget tracking). */
    sessionId?: string;
    /** Tenant ID for audit logging. */
    tenantId: string;
}

export interface DelegateWithAutoPayResult {
    taskId: string;
    delegatedTo: string;
    status: string;
    response?: A2AMessage;
    costUsd: number;
    paymentCostUsd: number;
    latencyMs: number;
    autoPaySettled: boolean;
}

/**
 * delegateWithAutoPay
 * ===================
 * Wraps delegateTask() with x402 payment-required auto-settlement.
 *
 * If the remote agent returns a `payment-required` message (x402 extension),
 * this function:
 *   1. Validates the requested amount is within the caller's maxAutoPayUsd cap
 *   2. POSTs to the internal /api/v1/facilitator/settle endpoint using the
 *      EIP-3009 `exact` scheme (CDP Server Wallet signs the authorization)
 *   3. Submits a `payment-submitted` A2A message back to the agent
 *   4. Polls the agent once more for the final `payment-completed` response
 *
 * Non-fatal: if auto-pay fails, the function returns status='payment-required'
 * so the caller can handle it out-of-band.
 */
export async function delegateWithAutoPay(
    tenantId: string,
    agentId: string,
    message: A2AMessage,
    autoPay: AutoPayConfig,
    config: Record<string, unknown> = {}
): Promise<DelegateWithAutoPayResult> {
    // First delegation attempt
    const first = await delegateTask(tenantId, agentId, message, config);

    if (!isPaymentRequired(first.response)) {
        return {
            ...first,
            paymentCostUsd: 0,
            autoPaySettled: false,
        };
    }

    // --- Payment required ---
    const paymentRequired = extractPaymentRequired(first.response);
    if (!paymentRequired) {
        return {
            ...first,
            status: 'payment-required',
            paymentCostUsd: 0,
            autoPaySettled: false,
        };
    }

    // Validate the first scheme for an exact (EIP-3009) payment
    const scheme = paymentRequired.schemes[0];
    if (!scheme) {
        return { ...first, status: 'payment-required', paymentCostUsd: 0, autoPaySettled: false };
    }

    // scheme.amount is in token atomic units; USDC has 6 decimals
    const amountUsd = Number(scheme.amount) / 1e6;
    if (amountUsd > autoPay.maxAutoPayUsd) {
        console.warn(
            `[A2A AutoPay] Payment of $${amountUsd} exceeds maxAutoPayUsd $${autoPay.maxAutoPayUsd} — skipping.`
        );
        return { ...first, status: 'payment-required', paymentCostUsd: 0, autoPaySettled: false };
    }

    // Request an EIP-3009 authorization from the session's CDP wallet via the
    // internal auto-pay endpoint, which has access to CDP signing.
    const baseUrl = process.env.NEXTAUTH_URL ?? 'http://localhost:3000';
    let paymentTxHash: string | undefined;
    let paymentReceiptId: string | undefined;

    try {
        const nowSec = Math.floor(Date.now() / 1000);
        const autoPayRes = await fetch(`${baseUrl}/api/v1/router/auto-pay`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'x-cron-secret': process.env.CRON_SECRET ?? '',
            },
            body: JSON.stringify({
                session_id: autoPay.sessionId,
                tenant_id: autoPay.tenantId,
                payment_required: {
                    payment_id: paymentRequired.payment_id,
                    recipient: scheme.recipient,
                    amount: scheme.amount,
                    asset: scheme.asset,
                    network: scheme.network,
                    nonce: scheme.nonce ?? `0x${uuidv4().replace(/-/g, '').padEnd(64, '0')}`,
                    valid_after: String(nowSec - 10),
                    valid_before: scheme.valid_until ?? String(nowSec + 300),
                    resource: `a2a://agents/${agentId}`,
                    description: paymentRequired.service_description,
                },
            }),
        });

        if (autoPayRes.ok) {
            const autoPayData = await autoPayRes.json() as { tx_hash?: string; receipt_id?: string };
            paymentTxHash = autoPayData.tx_hash;
            paymentReceiptId = autoPayData.receipt_id;
        } else {
            const errBody = await autoPayRes.text();
            console.error(`[A2A AutoPay] Auto-pay settle failed (${autoPayRes.status}): ${errBody}`);
            return { ...first, status: 'payment-required', paymentCostUsd: 0, autoPaySettled: false };
        }
    } catch (err) {
        console.error('[A2A AutoPay] Auto-pay call threw:', err);
        return { ...first, status: 'payment-required', paymentCostUsd: 0, autoPaySettled: false };
    }

    // Submit payment-submitted message back to the agent
    const paymentSubmittedMessage: A2AMessage = {
        role: 'agent',
        parts: [
            {
                type: 'data',
                data: {
                    extension_uri: X402_EXTENSION_URI,
                    content: {
                        type: 'payment-submitted',
                        data: {
                            payment_id: paymentRequired.payment_id,
                            scheme: 'exact',
                            tx_hash: paymentTxHash,
                            receipt_id: paymentReceiptId,
                        },
                    },
                },
            },
        ],
    };

    // Second delegation with payment proof
    let second: Awaited<ReturnType<typeof delegateTask>>;
    try {
        second = await delegateTask(tenantId, agentId, paymentSubmittedMessage, config);
    } catch (err) {
        // Payment was settled; task just didn't complete cleanly
        return {
            taskId: first.taskId,
            delegatedTo: first.delegatedTo,
            status: 'payment-settled',
            paymentCostUsd: amountUsd,
            costUsd: first.costUsd + amountUsd,
            latencyMs: first.latencyMs,
            autoPaySettled: true,
        };
    }

    // Audit log payment into traffic_events
    pool.query(
        `INSERT INTO traffic_events (tenant_id, event_type, metadata, created_at)
         VALUES ($1, 'a2a_auto_pay', $2::jsonb, NOW())`,
        [
            tenantId,
            JSON.stringify({
                agent_id: agentId,
                payment_id: paymentRequired.payment_id,
                amount_usd: amountUsd,
                tx_hash: paymentTxHash,
                session_id: autoPay.sessionId,
            }),
        ]
    ).catch(e => console.error('[A2A AutoPay] Audit log failed:', e));

    return {
        ...second,
        paymentCostUsd: amountUsd,
        costUsd: second.costUsd + amountUsd,
        autoPaySettled: true,
    };
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function isPaymentRequired(response: A2AMessage | undefined): boolean {
    if (!response) return false;
    for (const part of response.parts) {
        if (
            part.type === 'data' &&
            part.data?.extension_uri === X402_EXTENSION_URI &&
            part.data?.content?.type === 'payment-required'
        ) {
            return true;
        }
    }
    return false;
}

function extractPaymentRequired(response: A2AMessage | undefined): X402PaymentRequired | null {
    if (!response) return null;
    for (const part of response.parts) {
        if (
            part.type === 'data' &&
            part.data?.extension_uri === X402_EXTENSION_URI &&
            part.data?.content?.type === 'payment-required'
        ) {
            return part.data.content.data as X402PaymentRequired;
        }
    }
    return null;
}
