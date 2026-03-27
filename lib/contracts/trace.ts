/**
 * Trace and TraceNode Contracts
 * Every execution produces a trace. Every node appends to the trace. (ADR-004)
 */

import { z } from 'zod';

export const TraceNodeStatusSchema = z.enum(['pending', 'running', 'completed', 'failed', 'skipped']);
export type TraceNodeStatus = z.infer<typeof TraceNodeStatusSchema>;

export const TraceNodeSchema = z.object({
    id: z.string().uuid(),
    trace_id: z.string().uuid(),
    node_id: z.string().uuid().nullable().optional(),
    node_type: z.enum(['model', 'tool', 'retrieval', 'verify', 'settle', 'cache']),
    status: TraceNodeStatusSchema.default('pending'),
    route_decision_id: z.string().uuid().nullable().optional(),
    policy_decision_id: z.string().uuid().nullable().optional(),
    payment_event_id: z.string().uuid().nullable().optional(),
    tool_execution_id: z.string().uuid().nullable().optional(),
    provider_response_hash: z.string().nullable().optional(),
    provider_id: z.string().nullable().optional(),
    model_id: z.string().nullable().optional(),
    verification_result: z.record(z.string(), z.unknown()).nullish(),
    cost: z.number().min(0).nullable().optional(),
    latency_ms: z.number().int().min(0).nullable().optional(),
    started_at: z.string().datetime().nullable().optional(),
    completed_at: z.string().datetime().nullable().optional(),
    error: z.string().nullable().optional(),
    // Enrichment fields (joined at read time — not stored on the node row)
    label: z.string().optional(),
    tool_execution: z.object({
        tool_name: z.string(),
        args: z.record(z.string(), z.unknown()),
        output: z.unknown(),
        latency_ms: z.number().nullable(),
        error: z.string().nullable(),
    }).optional(),
    evaluation: z.object({
        overall_score: z.number(),
        passed: z.boolean(),
        scores: z.record(z.string(), z.number()),
        pass_threshold: z.number(),
        evaluator_model: z.string(),
    }).optional(),
});
export type TraceNode = z.infer<typeof TraceNodeSchema>;

export const TraceSummarySchema = z.object({
    total_cost: z.number().min(0),
    total_latency_ms: z.number().int().min(0),
    node_count: z.number().int().min(0),
    mode_resolved: z.enum(['direct', 'planned']),
    cached: z.boolean(),
    provider: z.string().optional(),
    model: z.string().optional(),
    success_rate: z.number().min(0).max(1).optional(),
});

export const TraceSchema = z.object({
    id: z.string().uuid(),
    tenant_id: z.string().uuid(),
    request_id: z.string().uuid(),
    plan_id: z.string().uuid().nullable().optional(),
    status: z.enum(['running', 'completed', 'failed', 'partial']).default('running'),
    summary: TraceSummarySchema.partial().default({}),
    nodes: z.array(TraceNodeSchema).default([]),
    created_at: z.string().datetime().optional(),
    completed_at: z.string().datetime().nullable().optional(),
    // Joined from execute_requests
    task: z.string().optional(),
    actual_cost: z.number().optional(),
    baseline_cost: z.number().optional(),
    // Joined from router_decisions
    routing_decision: z.object({
        selected_provider_id: z.string(),
        reason: z.string(),
        requested_mode: z.string(),
        alternatives: z.array(z.object({
            provider: z.string(),
            score: z.number(),
            reason: z.string(),
        })),
    }).optional(),
});
export type Trace = z.infer<typeof TraceSchema>;
