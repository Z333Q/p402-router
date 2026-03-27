/**
 * Plan and Node Contracts
 * Zod schemas for execution DAGs.
 * Max 5 nodes per plan (ADR-003).
 */

import { z } from 'zod';

export const MAX_PLAN_NODES = 5;

export const NodeTypeSchema = z.enum(['model', 'tool', 'retrieval', 'verify', 'settle']);
export type NodeType = z.infer<typeof NodeTypeSchema>;

export const EdgeTypeSchema = z.enum(['depends_on', 'fallback', 'conditional']);
export type EdgeType = z.infer<typeof EdgeTypeSchema>;

export const RetryPolicySchema = z.object({
    max_retries: z.number().int().min(0).max(3).default(1),
    backoff_ms: z.number().int().min(0).max(30_000).default(1_000),
});

export const PlanNodeSchema = z.object({
    id: z.string().uuid(),
    plan_id: z.string().uuid(),
    node_type: NodeTypeSchema,
    label: z.string().min(1).max(255),
    sequence_index: z.number().int().min(0),
    input_refs: z.array(z.string()).default([]),
    provider_or_tool_id: z.string().uuid().nullish(),
    estimated_cost: z.number().min(0).nullish(),
    estimated_latency_ms: z.number().int().min(0).nullish(),
    policy_requirements: z.record(z.string(), z.unknown()).default({}),
    retry_policy: RetryPolicySchema.default({ max_retries: 1, backoff_ms: 1_000 }),
    verification_rule: z.record(z.string(), z.unknown()).default({}),
    // Runtime state (not persisted in plan_nodes, tracked in trace_nodes)
    status: z.enum(['pending', 'running', 'completed', 'failed', 'skipped']).optional(),
    result: z.unknown().optional(),
    actual_cost: z.number().optional(),
    actual_latency_ms: z.number().optional(),
});
export type PlanNode = z.infer<typeof PlanNodeSchema>;

export const PlanEdgeSchema = z.object({
    id: z.string().uuid(),
    plan_id: z.string().uuid(),
    from_node_id: z.string().uuid(),
    to_node_id: z.string().uuid(),
    edge_type: EdgeTypeSchema.default('depends_on'),
    condition_json: z.record(z.string(), z.unknown()).default({}),
});
export type PlanEdge = z.infer<typeof PlanEdgeSchema>;

export const PlanSchema = z.object({
    id: z.string().uuid(),
    tenant_id: z.string().uuid(),
    request_id: z.string().uuid(),
    session_id: z.string().uuid().nullish(),
    goal: z.string().min(1).max(10_000),
    status: z.enum(['pending', 'running', 'completed', 'failed', 'cancelled']).default('pending'),
    budget_cap: z.number().min(0).nullish(),
    confidence: z.number().min(0).max(1).nullish(),
    max_nodes: z.number().int().min(1).max(MAX_PLAN_NODES).default(MAX_PLAN_NODES),
    planner_version: z.string().default('v0.1'),
    nodes: z.array(PlanNodeSchema).max(MAX_PLAN_NODES),
    edges: z.array(PlanEdgeSchema),
    created_at: z.string().datetime().optional(),
});
export type Plan = z.infer<typeof PlanSchema>;

// Synthetic single-node plan used by the direct execution path
export function createSyntheticDirectPlan(
    planId: string,
    requestId: string,
    tenantId: string,
    goal: string
): Plan {
    const nodeId = crypto.randomUUID();
    return {
        id: planId,
        tenant_id: tenantId,
        request_id: requestId,
        goal,
        status: 'pending',
        max_nodes: 1,
        planner_version: 'v0.1-direct',
        nodes: [{
            id: nodeId,
            plan_id: planId,
            node_type: 'model',
            label: 'Direct model inference',
            sequence_index: 0,
            input_refs: [],
            policy_requirements: {},
            retry_policy: { max_retries: 1, backoff_ms: 1_000 },
            verification_rule: {},
        }],
        edges: [],
    };
}
