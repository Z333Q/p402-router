/**
 * Planner — Phase 2
 * ==================
 * Generates a bounded DAG execution plan using Gemini Flash.
 * Persists the plan + nodes + edges to execute_plans.
 *
 * Falls back to a static 2-node plan (retrieval → model) when
 * GOOGLE_API_KEY is unavailable or the model returns unparseable JSON.
 */

import { GoogleGenerativeAI } from '@google/generative-ai';
import db from '@/lib/db';
import type { ExecuteInput } from '@/lib/contracts/request';
import type { Plan, PlanNode, PlanEdge } from '@/lib/contracts/plan';
import { MAX_PLAN_NODES } from '@/lib/contracts/plan';
import { validateDag } from './dag-validator';
import { listAvailableTools } from '@/lib/tools/registry';
import { ApiError } from '@/lib/errors';

const PLANNER_MODEL = 'gemini-3-flash-preview';
const PLANNER_VERSION = 'v1.0-flash';

export interface PlannerContext {
    tenantId: string;
    requestId: string;
    budgetCap?: number;
}

// ── Public API ────────────────────────────────────────────────────────────────

/**
 * Generate a DAG plan for the given execute input.
 * Uses Gemini Flash to decide which nodes to run.
 * Falls back to static [retrieval → model] plan on any error.
 */
export async function generatePlan(
    input: ExecuteInput,
    ctx: PlannerContext
): Promise<Plan> {
    const apiKey = process.env.GOOGLE_API_KEY;

    if (apiKey) {
        try {
            return await generatePlanWithGemini(input, ctx, apiKey);
        } catch {
            // Fallback — don't surface planner errors to the caller
        }
    }

    return buildStaticPlan(input, ctx);
}

// ── Gemini-powered planner ────────────────────────────────────────────────────

async function generatePlanWithGemini(
    input: ExecuteInput,
    ctx: PlannerContext,
    apiKey: string
): Promise<Plan> {
    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({
        model: PLANNER_MODEL,
        generationConfig: { temperature: 0.1, maxOutputTokens: 1024 },
    });

    // Load available tools so the planner can reference them
    const tools = await listAvailableTools(ctx.tenantId).catch(() => []);
    const result = await model.generateContent(buildPrompt(input, tools));
    const text = result.response.text();
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch?.[0]) throw new Error('No JSON in planner response');

    const parsed = JSON.parse(jsonMatch[0]) as {
        goal?: string;
        confidence?: number;
        nodes?: Array<{ type?: string; label?: string }>;
        edges?: Array<{ from?: number; to?: number }>;
    };

    return assemblePlan(parsed, input, ctx);
}

function buildPrompt(
    input: ExecuteInput,
    tools: Array<{ name: string; description: string }> = []
): string {
    const taskPreview = input.task.slice(0, 1000);
    const hasInputData = input.input_data && Object.keys(input.input_data).length > 0;

    const toolList = tools.length > 0
        ? tools.map((t) => `  - "${t.name}": ${t.description}`).join('\n')
        : '  (none registered)';

    return `You are an AI execution planner. Analyze the task and return a JSON execution plan.

TASK: ${taskPreview}
${hasInputData ? `INPUT DATA: ${JSON.stringify(input.input_data).slice(0, 500)}` : ''}
${input.constraints ? `CONSTRAINTS: ${JSON.stringify(input.constraints)}` : ''}

AVAILABLE NODE TYPES:
- "retrieval": search the tenant knowledge base for relevant context
- "model": call an LLM to generate or process content
- "tool": call an external tool (see available tools below)
- "verify": validate output quality (only if explicitly required)
- "settle": handle payment settlement (only if explicitly required)

AVAILABLE TOOLS:
${toolList}

Rules:
- Maximum ${MAX_PLAN_NODES} nodes total
- Most tasks need only 1 node (just "model")
- Use "tool" nodes only if the task requires live data or external actions
- Add "retrieval" before "model" only if knowledge base context would help
- For tool nodes, include "tool_name" matching one of the available tools above
- edges[].from and edges[].to are zero-based indices into nodes[]

Return ONLY valid JSON, no markdown, no explanation:
{
  "goal": "brief one-line description",
  "confidence": 0.9,
  "nodes": [
    { "type": "model", "label": "Generate response" }
  ],
  "edges": []
}`;
}

// ── Plan assembly ─────────────────────────────────────────────────────────────

function assemblePlan(
    parsed: {
        goal?: string;
        confidence?: number;
        nodes?: Array<{ type?: string; label?: string; tool_name?: string }>;
        edges?: Array<{ from?: number; to?: number }>;
    },
    input: ExecuteInput,
    ctx: PlannerContext
): Plan {
    const planId = crypto.randomUUID();
    const rawNodes = (parsed.nodes ?? [{ type: 'model', label: 'Generate response' }]).slice(0, MAX_PLAN_NODES);

    const nodeIds: string[] = rawNodes.map(() => crypto.randomUUID());

    const planNodes: PlanNode[] = rawNodes.map((n, i) => {
        const policyRequirements: Record<string, unknown> = {};
        if (normalizeNodeType(n.type) === 'tool' && n.tool_name) {
            policyRequirements.tool_name = n.tool_name;
        }
        return {
            id: nodeIds[i]!,
            plan_id: planId,
            node_type: normalizeNodeType(n.type),
            label: (n.label ?? `Step ${i + 1}`).slice(0, 255),
            sequence_index: i,
            input_refs: i > 0 ? [nodeIds[i - 1]!] : [],
            policy_requirements: policyRequirements,
            retry_policy: { max_retries: 1, backoff_ms: 1_000 },
            verification_rule: {},
        };
    });

    // Build edges from parsed, or auto-chain sequentially if none provided
    const rawEdges = parsed.edges ?? [];
    let planEdges: PlanEdge[];

    if (rawEdges.length > 0) {
        planEdges = rawEdges
            .filter((e) =>
                typeof e.from === 'number' &&
                typeof e.to === 'number' &&
                e.from >= 0 && e.from < rawNodes.length &&
                e.to >= 0 && e.to < rawNodes.length &&
                e.from !== e.to
            )
            .map((e) => ({
                id: crypto.randomUUID(),
                plan_id: planId,
                from_node_id: nodeIds[e.from!]!,
                to_node_id: nodeIds[e.to!]!,
                edge_type: 'depends_on' as const,
                condition_json: {},
            }));
    } else {
        planEdges = buildSequentialEdges(planId, nodeIds);
    }

    const plan: Plan = {
        id: planId,
        tenant_id: ctx.tenantId,
        request_id: ctx.requestId,
        goal: (parsed.goal ?? input.task).slice(0, 500),
        status: 'pending',
        budget_cap: ctx.budgetCap,
        confidence: parsed.confidence,
        max_nodes: MAX_PLAN_NODES,
        planner_version: PLANNER_VERSION,
        nodes: planNodes,
        edges: planEdges,
    };

    const validation = validateDag(plan);
    if (!validation.valid) {
        throw new ApiError({
            code: 'NO_VALID_PLAN',
            status: 422,
            message: `Planner produced invalid DAG: ${validation.errors.join('; ')}`,
            requestId: ctx.requestId,
        });
    }

    return plan;
}

// ── Static fallback plan ──────────────────────────────────────────────────────

function buildStaticPlan(input: ExecuteInput, ctx: PlannerContext): Plan {
    // Static 2-node plan: retrieval → model (same as Phase 1 behavior)
    const planId = crypto.randomUUID();
    const retrievalId = crypto.randomUUID();
    const modelId = crypto.randomUUID();

    return {
        id: planId,
        tenant_id: ctx.tenantId,
        request_id: ctx.requestId,
        goal: input.task.slice(0, 500),
        status: 'pending',
        budget_cap: ctx.budgetCap,
        confidence: 0.8,
        max_nodes: MAX_PLAN_NODES,
        planner_version: 'v1.0-static',
        nodes: [
            {
                id: retrievalId,
                plan_id: planId,
                node_type: 'retrieval',
                label: 'Fetch relevant context',
                sequence_index: 0,
                input_refs: [],
                policy_requirements: {},
                retry_policy: { max_retries: 1, backoff_ms: 1_000 },
                verification_rule: {},
            },
            {
                id: modelId,
                plan_id: planId,
                node_type: 'model',
                label: 'Generate grounded response',
                sequence_index: 1,
                input_refs: [retrievalId],
                policy_requirements: {},
                retry_policy: { max_retries: 1, backoff_ms: 1_000 },
                verification_rule: {},
            },
        ],
        edges: [
            {
                id: crypto.randomUUID(),
                plan_id: planId,
                from_node_id: retrievalId,
                to_node_id: modelId,
                edge_type: 'depends_on',
                condition_json: {},
            },
        ],
    };
}

// ── DB persistence ────────────────────────────────────────────────────────────

export async function persistPlan(plan: Plan): Promise<void> {
    await db.query(
        `INSERT INTO execute_plans
            (id, tenant_id, request_id, goal, status, budget_cap, confidence,
             max_nodes, planner_version, plan_json)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)
         ON CONFLICT (id) DO NOTHING`,
        [
            plan.id, plan.tenant_id, plan.request_id, plan.goal,
            plan.status, plan.budget_cap ?? null, plan.confidence ?? null,
            plan.max_nodes, plan.planner_version, JSON.stringify(plan),
        ]
    );

    for (const node of plan.nodes) {
        await db.query(
            `INSERT INTO execute_plan_nodes
                (id, plan_id, tenant_id, node_type, label, sequence_index,
                 input_refs, policy_requirements, retry_policy, verification_rule)
             VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)
             ON CONFLICT (id) DO NOTHING`,
            [
                node.id, plan.id, plan.tenant_id, node.node_type, node.label,
                node.sequence_index, JSON.stringify(node.input_refs),
                JSON.stringify(node.policy_requirements), JSON.stringify(node.retry_policy),
                JSON.stringify(node.verification_rule),
            ]
        );
    }

    for (const edge of plan.edges) {
        await db.query(
            `INSERT INTO execute_plan_edges
                (id, plan_id, from_node_id, to_node_id, edge_type, condition_json)
             VALUES ($1,$2,$3,$4,$5,$6)
             ON CONFLICT (id) DO NOTHING`,
            [edge.id, plan.id, edge.from_node_id, edge.to_node_id, edge.edge_type, JSON.stringify(edge.condition_json)]
        );
    }
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function normalizeNodeType(t: unknown): PlanNode['node_type'] {
    const valid: PlanNode['node_type'][] = ['model', 'tool', 'retrieval', 'verify', 'settle'];
    const lower = String(t ?? 'model').toLowerCase() as PlanNode['node_type'];
    return valid.includes(lower) ? lower : 'model';
}

function buildSequentialEdges(planId: string, nodeIds: string[]): PlanEdge[] {
    return nodeIds.slice(0, -1).map((fromId, i) => ({
        id: crypto.randomUUID(),
        plan_id: planId,
        from_node_id: fromId,
        to_node_id: nodeIds[i + 1]!,
        edge_type: 'depends_on' as const,
        condition_json: {},
    }));
}
