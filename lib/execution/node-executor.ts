/**
 * Node Executor — Phase 2
 * ========================
 * Executes a single plan node based on its type.
 *
 * Implemented: retrieval, model
 * Stubbed (Phase 3): tool, verify, settle
 */

import { getProviderRegistry, type CompletionRequest, type RoutingOptions } from '@/lib/ai-providers';
import { searchKnowledge, logRetrievalQuery } from '@/lib/retrieval/search';
import { generateEmbedding } from '@/lib/retrieval/embed';
import { packContext } from '@/lib/retrieval/context-packer';
import { callTool } from '@/lib/tools/executor';
import { evaluateAndPersist } from '@/lib/evaluation/evaluator';
import type { PlanNode } from '@/lib/contracts/plan';
import type { ExecuteInput } from '@/lib/contracts/request';
import { ApiError } from '@/lib/errors';

// ── Types ─────────────────────────────────────────────────────────────────────

export interface NodeResult {
    nodeId: string;
    status: 'completed' | 'failed';
    costUsd: number;
    latencyMs: number;
    // Type-specific outputs
    text?: string;       // model nodes
    context?: string;    // retrieval nodes
    cached?: boolean;
    providerId?: string;
    modelId?: string;
    error?: string;
}

export interface NodeExecutionContext {
    tenantId: string;
    requestId: string;
    input: ExecuteInput;
    /** Results from nodes that have already completed (keyed by node ID). */
    priorResults: Map<string, NodeResult>;
}

// ── Dispatcher ────────────────────────────────────────────────────────────────

export async function executeNode(
    node: PlanNode,
    ctx: NodeExecutionContext
): Promise<NodeResult> {
    const start = Date.now();

    switch (node.node_type) {
        case 'retrieval':
            return executeRetrievalNode(node, ctx, start);
        case 'model':
            return executeModelNode(node, ctx, start);
        case 'tool':
            return executeToolNode(node, ctx, start);
        case 'verify':
            return executeVerifyNode(node, ctx, start);
        case 'settle':
            // Phase 5 implementation
            return {
                nodeId: node.id,
                status: 'completed',
                costUsd: 0,
                latencyMs: Date.now() - start,
            };
        default: {
            const exhaustive: never = node.node_type;
            throw new ApiError({
                code: 'EXECUTION_FAILED',
                status: 500,
                message: `Unknown node type: ${exhaustive}`,
                requestId: ctx.requestId,
            });
        }
    }
}

// ── Retrieval node ────────────────────────────────────────────────────────────

async function executeRetrievalNode(
    node: PlanNode,
    ctx: NodeExecutionContext,
    start: number
): Promise<NodeResult> {
    const { tenantId, requestId, input } = ctx;
    const query = input.task;

    const results = await searchKnowledge(query, tenantId, {
        topK: 5,
        minScore: 0.60,
    });

    const latencyMs = Date.now() - start;
    let context: string | undefined;

    if (results.length > 0) {
        const packed = packContext(results, { tokenBudget: 3000 });
        context = packed.text;

        // Log retrieval query async — non-blocking
        generateEmbedding(query)
            .then((emb) =>
                logRetrievalQuery(tenantId, query, emb.embedding, results, {
                    requestId,
                    topK: 5,
                    tokenBudget: 3000,
                    latencyMs,
                })
            )
            .catch(() => null);
    }

    return {
        nodeId: node.id,
        status: 'completed',
        costUsd: 0,
        latencyMs,
        context,
    };
}

// ── Model node ────────────────────────────────────────────────────────────────

async function executeModelNode(
    node: PlanNode,
    ctx: NodeExecutionContext,
    start: number
): Promise<NodeResult> {
    const { input, priorResults } = ctx;

    // Gather context from the nearest upstream retrieval node
    let retrievedContext: string | undefined;
    for (const result of priorResults.values()) {
        if (result.context) {
            retrievedContext = result.context;
            break;
        }
    }

    const completionReq = buildCompletionRequest(input, retrievedContext);
    const routingOpts = buildRoutingOptions(input);
    const registry = getProviderRegistry();
    const response = await registry.complete(completionReq, routingOpts);

    const latencyMs = Date.now() - start;
    const costUsd = response.p402?.costUsd ?? 0;
    const cached = response.p402?.cached ?? false;
    const rawText = response.choices[0]?.message?.content ?? '';
    const text = typeof rawText === 'string' ? rawText : JSON.stringify(rawText);

    return {
        nodeId: node.id,
        status: 'completed',
        costUsd,
        latencyMs,
        text,
        cached,
        providerId: response.p402?.providerId,
        modelId: response.p402?.modelId,
    };
}

// ── Verify node ───────────────────────────────────────────────────────────────

async function executeVerifyNode(
    node: PlanNode,
    ctx: NodeExecutionContext,
    start: number
): Promise<NodeResult> {
    const { tenantId, requestId } = ctx;

    // Find the most recent model output from prior results
    let responseText = '';
    let contextText: string | undefined;
    for (const result of priorResults(ctx)) {
        if (result.text !== undefined) responseText = result.text;
        if (result.context !== undefined) contextText = result.context;
    }

    if (!responseText) {
        // Nothing to verify — pass through
        return { nodeId: node.id, status: 'completed', costUsd: 0, latencyMs: Date.now() - start };
    }

    // Read optional pass threshold from policy_requirements
    const threshold = Number(
        (node.policy_requirements as Record<string, unknown>).pass_threshold ?? 0.70
    );

    const evaluation = await evaluateAndPersist(
        { task: ctx.input.task, responseText, contextText, passThreshold: threshold },
        { tenantId, requestId }
    );

    return {
        nodeId: node.id,
        status: evaluation.passed ? 'completed' : 'failed',
        costUsd: 0,
        latencyMs: Date.now() - start,
        // Forward the original text even if it failed — orchestrator decides what to do
        text: responseText,
        error: evaluation.passed
            ? undefined
            : `Evaluation failed: overall score ${evaluation.overallScore.toFixed(2)} < threshold ${threshold}`,
    };
}

// ── Tool node ─────────────────────────────────────────────────────────────────

async function executeToolNode(
    node: PlanNode,
    ctx: NodeExecutionContext,
    start: number
): Promise<NodeResult> {
    const { tenantId, requestId } = ctx;

    // Tool name is stored in policy_requirements by the planner
    const toolName = String(
        (node.policy_requirements as Record<string, unknown>).tool_name ?? 'web_search'
    );

    // Build args: merge policy_requirements.tool_args with task as default query
    const configuredArgs = (node.policy_requirements as Record<string, unknown>).tool_args;
    const args: Record<string, unknown> =
        configuredArgs && typeof configuredArgs === 'object'
            ? { query: ctx.input.task, ...configuredArgs as Record<string, unknown> }
            : { query: ctx.input.task };

    const result = await callTool(toolName, args, { tenantId, requestId });

    return {
        nodeId: node.id,
        status: result.success ? 'completed' : 'failed',
        costUsd: 0,
        latencyMs: result.latencyMs,
        // Tool text output flows forward as context for downstream model nodes
        context: result.text || undefined,
        error: result.error,
    };
}

// ── Helpers ───────────────────────────────────────────────────────────────────

/** Returns prior results in insertion order (Map preserves insertion order). */
function priorResults(ctx: NodeExecutionContext): NodeResult[] {
    return Array.from(ctx.priorResults.values());
}

function buildCompletionRequest(
    input: ExecuteInput,
    context?: string
): CompletionRequest {
    let messages = input.input_data?.messages ?? [
        { role: 'user' as const, content: input.task },
    ];

    if (context) {
        messages = [
            {
                role: 'system' as const,
                content: `Use the following context to answer the user's request:\n\n${context}`,
            },
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
