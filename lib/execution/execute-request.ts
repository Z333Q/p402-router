/**
 * Execute Request — Phase 2 Orchestrator
 * ========================================
 * The canonical internal entry point for all /v1/execute requests.
 * All intelligence services are called from here. (ADR-001)
 *
 * Phase 0: direct path reuses V2 engine.
 * Phase 2: planned path generates a Gemini DAG plan + executes nodes in topological order.
 */

import { getProviderRegistry, type CompletionRequest, type RoutingOptions } from '@/lib/ai-providers';
import { spendCredits } from '@/lib/services/credits-service';
import { generatePlan, persistPlan } from './planner';
import { validateDag } from './dag-validator';
import { executeNode } from './node-executor';
import db from '@/lib/db';
import type { ExecuteInput, ExecuteResult } from '@/lib/contracts/request';
import { createSyntheticDirectPlan } from '@/lib/contracts/plan';
import { resolveMode } from './mode-gate';
import {
    reserveBudget,
    consumeBudgetReservation,
    releaseBudgetReservation,
    parseBudgetCap,
} from './budget-reservation';
import {
    createTrace,
    appendTraceNode,
    updateTraceNode,
    finalizeTrace,
} from './trace';
import { retrieveMemories, extractAndStoreMemories } from '@/lib/memory';
import { ApiError } from '@/lib/errors';

// ── Types ─────────────────────────────────────────────────────────────────────

export interface ExecuteContext {
    tenantId: string;
    requestId: string;
    /** Optional mode gate threshold override (from tenant_settings) */
    modeThreshold?: number;
    /** Human ID for credit tracking (World AgentKit) */
    humanId?: string | null;
    /** Session ID for scoped short-term memory */
    sessionId?: string | null;
}

// ── Main Orchestrator ─────────────────────────────────────────────────────────

export async function executeRequest(
    input: ExecuteInput,
    ctx: ExecuteContext
): Promise<ExecuteResult> {
    const { tenantId, requestId } = ctx;
    const startMs = Date.now();

    // 1. Persist the request row
    await createRequestRow(requestId, tenantId, input);

    // 2. Resolve mode (heuristic gate or explicit override)
    const modeResult = resolveMode(input, { threshold: ctx.modeThreshold });

    // 3. Reserve budget
    const budgetCap = parseBudgetCap(input.budget);
    // For direct mode: estimate ~$0.05 reservation; planned: ~$0.50
    const reservationAmount = modeResult.mode === 'direct' ? Math.min(0.05, budgetCap) : Math.min(0.50, budgetCap);
    const reservation = await reserveBudget(tenantId, requestId, reservationAmount, budgetCap);

    // 4. Create trace
    const planId = crypto.randomUUID(); // synthetic plan ID for now
    const traceId = await createTrace(requestId, tenantId, planId);

    try {
        let result: ExecuteResult;

        if (modeResult.mode === 'direct') {
            result = await executeDirect(input, ctx, traceId, planId, startMs);
        } else {
            // Phase 1: retrieval-grounded planned path
            // Phase 2 will add full DAG planner + multi-node execution
            result = await executePlanned(input, ctx, traceId, planId, startMs);
        }

        // Consume reservation with actual cost
        const actualCost = parseFloat(result.cost.actual);
        await consumeBudgetReservation(reservation.id, actualCost, tenantId);

        // Finalize request row
        await finalizeRequestRow(requestId, 'completed', result);

        return result;
    } catch (err) {
        // Release budget reservation on failure
        await releaseBudgetReservation(reservation.id, tenantId).catch(() => null);

        // Finalize trace as failed
        await finalizeTrace(traceId, 'failed', {
            total_cost: 0,
            total_latency_ms: Date.now() - startMs,
            node_count: 0,
            mode_resolved: modeResult.mode,
            cached: false,
        }).catch(() => null);

        // Finalize request row as failed
        await failRequestRow(requestId, err).catch(() => null);

        throw err;
    }
}

// ── Direct Path ───────────────────────────────────────────────────────────────

async function executeDirect(
    input: ExecuteInput,
    ctx: ExecuteContext,
    traceId: string,
    planId: string,
    startMs: number
): Promise<ExecuteResult> {
    const { tenantId, requestId, humanId } = ctx;

    // Create a synthetic single-node plan (no DB write needed for Phase 0)
    const plan = createSyntheticDirectPlan(planId, requestId, tenantId, input.task);
    const node = plan.nodes[0];
    if (!node) {
        throw new ApiError({ code: 'EXECUTION_FAILED', status: 500, message: 'Synthetic plan has no nodes', requestId });
    }

    // Append trace node for this model call
    const traceNodeId = await appendTraceNode(traceId, {
        node_id: node.id,
        node_type: 'model',
        status: 'running',
        started_at: new Date().toISOString(),
    });

    const nodeStart = Date.now();

    try {
        // Build completion request from execute input
        const completionReq = buildCompletionRequest(input, undefined);
        const routingOpts = buildRoutingOptions(input);

        // Reuse the V2 provider registry (same engine as /api/v2/chat/completions)
        const registry = getProviderRegistry();

        // Check semantic cache first
        let cached = false;
        let response;
        try {
            response = await registry.complete(completionReq, routingOpts);
            cached = response.p402?.cached ?? false;
        } catch (err) {
            // Update trace node as failed
            await updateTraceNode(traceNodeId, {
                status: 'failed',
                latency_ms: Date.now() - nodeStart,
                completed_at: new Date().toISOString(),
                error: err instanceof Error ? err.message : String(err),
            });
            throw err;
        }

        const nodeLatency = Date.now() - nodeStart;
        const totalLatency = Date.now() - startMs;
        const costUsd = response.p402?.costUsd ?? 0;

        // Update trace node as completed
        await updateTraceNode(traceNodeId, {
            status: 'completed',
            cost: costUsd,
            latency_ms: nodeLatency,
            completed_at: new Date().toISOString(),
            provider_response_hash: response.id ? hashString(response.id) : undefined,
            provider_id: response.p402?.providerId,
            model_id: response.p402?.modelId,
        });

        // Finalize trace
        await finalizeTrace(traceId, 'completed', {
            total_cost: costUsd,
            total_latency_ms: totalLatency,
            node_count: 1,
            mode_resolved: 'direct',
            cached,
            provider: response.p402?.providerId,
            model: response.p402?.modelId,
        });

        // Deduct credits (non-blocking, same as V2 endpoint)
        if (costUsd > 0 && (humanId || tenantId)) {
            spendCredits(humanId ?? null, tenantId, costUsd, requestId).catch(() => null);
        }

        // Extract text from response
        const text = response.choices[0]?.message?.content ?? '';

        return {
            request_id: requestId,
            status: 'completed',
            result: { text: typeof text === 'string' ? text : JSON.stringify(text) },
            cost: {
                actual: costUsd.toFixed(6),
                currency: 'USDC',
                savings: Math.max(0, (response.p402 as any)?.savings ?? 0).toFixed(6),
            },
            trace_id: traceId,
            execution: {
                mode_resolved: 'direct',
                nodes: 1,
                cached,
                provider: response.p402?.providerId,
                model: response.p402?.modelId,
                latency_ms: totalLatency,
            },
        };
    } catch (err) {
        // Ensure trace node is marked failed even if updateTraceNode above threw
        await updateTraceNode(traceNodeId, {
            status: 'failed',
            latency_ms: Date.now() - nodeStart,
            completed_at: new Date().toISOString(),
        }).catch(() => null);
        throw err;
    }
}

// ── Planned Path — Phase 2 ────────────────────────────────────────────────────
// Gemini-planned DAG execution. Generates a bounded plan (max 5 nodes),
// validates the DAG, then executes each node in topological order.
// Falls back to a static 2-node plan when GOOGLE_API_KEY is unavailable.

async function executePlanned(
    input: ExecuteInput,
    ctx: ExecuteContext,
    traceId: string,
    _planId: string,  // replaced by planner-generated plan.id
    startMs: number
): Promise<ExecuteResult> {
    const { tenantId, requestId, humanId } = ctx;
    const sessionId = ctx.sessionId ?? undefined;
    const budgetCap = parseBudgetCap(input.budget);

    // ── Step 1: Retrieve relevant memories (non-blocking) ─────────────────────
    const memories = await retrieveMemories(input.task, tenantId, {
        topK: 3,
        minScore: 0.55,
        sessionId,
    }).catch(() => []);

    // ── Step 2: Generate plan ─────────────────────────────────────────────────
    const plan = await generatePlan(input, { tenantId, requestId, budgetCap });

    // Persist plan to DB (non-blocking on failure — trace still proceeds)
    persistPlan(plan).catch(() => null);

    // Determine execution order
    const { topologicalOrder } = validateDag(plan);

    // ── Step 3: Seed priorResults with memory context so model nodes see it ───
    const priorResults = new Map<string, import('./node-executor').NodeResult>();

    if (memories.length > 0) {
        const memoryText = memories
            .map((m) => `[${m.memoryType}] ${m.content}`)
            .join('\n');
        priorResults.set('__memory__', {
            nodeId: '__memory__',
            status: 'completed',
            costUsd: 0,
            latencyMs: 0,
            context: `Relevant memories from past interactions:\n${memoryText}`,
        });
    }
    let totalCost = 0;
    let finalText = '';
    let lastCached = false;
    let lastProvider: string | undefined;
    let lastModel: string | undefined;
    let executedNodes = 0;

    for (const nodeId of topologicalOrder) {
        const node = plan.nodes.find((n) => n.id === nodeId);
        if (!node) continue;

        const traceNodeId = await appendTraceNode(traceId, {
            node_id: node.id,
            node_type: node.node_type,
            status: 'running',
            started_at: new Date().toISOString(),
        });

        const nodeStart = Date.now();

        try {
            const result = await executeNode(node, {
                tenantId,
                requestId,
                input,
                priorResults,
            });

            priorResults.set(node.id, result);
            totalCost += result.costUsd;
            executedNodes++;

            if (result.text !== undefined) {
                finalText = result.text;
                lastCached = result.cached ?? false;
                lastProvider = result.providerId;
                lastModel = result.modelId;
            }

            await updateTraceNode(traceNodeId, {
                status: 'completed',
                cost: result.costUsd,
                latency_ms: result.latencyMs,
                completed_at: new Date().toISOString(),
                provider_id: result.providerId,
                model_id: result.modelId,
            });
        } catch (err) {
            await updateTraceNode(traceNodeId, {
                status: 'failed',
                latency_ms: Date.now() - nodeStart,
                completed_at: new Date().toISOString(),
                error: err instanceof Error ? err.message : String(err),
            }).catch(() => null);
            throw err;
        }
    }

    const totalLatency = Date.now() - startMs;

    await finalizeTrace(traceId, 'completed', {
        total_cost: totalCost,
        total_latency_ms: totalLatency,
        node_count: executedNodes,
        mode_resolved: 'planned',
        cached: lastCached,
        provider: lastProvider,
        model: lastModel,
    });

    if (totalCost > 0 && (humanId || tenantId)) {
        spendCredits(humanId ?? null, tenantId, totalCost, requestId).catch(() => null);
    }

    // Fire-and-forget memory extraction — never blocks the response
    if (finalText) {
        extractAndStoreMemories(input.task, finalText, tenantId, requestId, sessionId).catch(() => null);
    }

    return {
        request_id: requestId,
        status: 'completed',
        result: { text: finalText },
        cost: {
            actual: totalCost.toFixed(6),
            currency: 'USDC',
            savings: '0.000000',
        },
        trace_id: traceId,
        execution: {
            mode_resolved: 'planned',
            nodes: executedNodes,
            cached: lastCached,
            provider: lastProvider,
            model: lastModel,
            latency_ms: totalLatency,
        },
    };
}

// ── Request Row ───────────────────────────────────────────────────────────────

async function createRequestRow(requestId: string, tenantId: string, input: ExecuteInput): Promise<void> {
    // Estimate baseline cost: task tokens × claude-sonnet-4-6 reference rate ($0.003/1K input tokens)
    const estimatedTokens = Math.max(100, Math.floor(input.task.length / 4));
    const baselineCost = estimatedTokens * 0.000003;

    await db.query(
        `INSERT INTO execute_requests (
            id, tenant_id, task, input_payload, constraints,
            mode_requested, status, budget_cap, baseline_cost
         ) VALUES ($1, $2, $3, $4, $5, $6, 'pending', $7, $8)`,
        [
            requestId,
            tenantId,
            input.task,
            JSON.stringify(input.input_data ?? {}),
            JSON.stringify(input.constraints ?? {}),
            input.mode ?? 'auto',
            input.budget ? parseFloat(input.budget.cap) : null,
            baselineCost,
        ]
    );
}

async function finalizeRequestRow(requestId: string, status: string, result: ExecuteResult): Promise<void> {
    await db.query(
        `UPDATE execute_requests
         SET status = $1, result_payload = $2, actual_cost = $3,
             mode_resolved = $4, completed_at = NOW()
         WHERE id = $5`,
        [
            status,
            JSON.stringify(result.result ?? {}),
            parseFloat(result.cost.actual),
            result.execution.mode_resolved,
            requestId,
        ]
    );
}

async function failRequestRow(requestId: string, err: unknown): Promise<void> {
    const message = err instanceof Error ? err.message : 'Unknown error';
    await db.query(
        `UPDATE execute_requests
         SET status = 'failed', error_payload = $1, completed_at = NOW()
         WHERE id = $2`,
        [JSON.stringify({ message }), requestId]
    );
}

// ── Helpers ───────────────────────────────────────────────────────────────────

// Used only by executeDirect — planned path uses node-executor's equivalents
function buildCompletionRequest(input: ExecuteInput, retrievedContext?: string): CompletionRequest {
    let messages = input.input_data?.messages ?? [{ role: 'user' as const, content: input.task }];
    if (retrievedContext) {
        messages = [
            { role: 'system' as const, content: `Use the following context to answer the user's request:\n\n${retrievedContext}` },
            ...messages,
        ];
    }
    return { messages, stream: false };
}

function buildRoutingOptions(input: ExecuteInput): RoutingOptions {
    const c = input.constraints;
    return {
        mode: c?.routing_mode ?? 'balanced',
        preferProviders: c?.prefer_providers,
        excludeProviders: c?.exclude_providers,
        maxCostPerRequest: input.budget ? parseFloat(input.budget.cap) : undefined,
        failover: { enabled: true, maxRetries: 2 },
    };
}

function hashString(s: string): string {
    // Simple deterministic hash for provider_response_hash (not cryptographic)
    let h = 0;
    for (let i = 0; i < s.length; i++) {
        h = Math.imul(31, h) + s.charCodeAt(i) | 0;
    }
    return h.toString(16);
}
