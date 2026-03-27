/**
 * Trace Operations — Phase 0
 * ==========================
 * Create, append, and finalize execution traces.
 * Every request produces a trace. Every node appends to the trace. (ADR-004)
 */

import db from '@/lib/db';
import type { Trace, TraceNode, TraceNodeStatus } from '@/lib/contracts/trace';

// ── Create ────────────────────────────────────────────────────────────────────

export async function createTrace(
    requestId: string,
    tenantId: string,
    planId?: string
): Promise<string> {
    const traceId = crypto.randomUUID();
    await db.query(
        `INSERT INTO execute_traces (id, tenant_id, request_id, plan_id, status, summary)
         VALUES ($1, $2, $3, $4, 'running', '{}')`,
        [traceId, tenantId, requestId, planId ?? null]
    );
    return traceId;
}

// ── Append Node ───────────────────────────────────────────────────────────────

export async function appendTraceNode(
    traceId: string,
    node: Omit<TraceNode, 'id' | 'trace_id'>
): Promise<string> {
    const nodeId = crypto.randomUUID();
    await db.query(
        `INSERT INTO execute_trace_nodes (
            id, trace_id, node_id, node_type, status,
            route_decision_id, policy_decision_id, payment_event_id,
            tool_execution_id, provider_response_hash, provider_id, model_id,
            verification_result, cost, latency_ms, started_at, completed_at, error
         ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18)`,
        [
            nodeId,
            traceId,
            node.node_id ?? null,
            node.node_type,
            node.status ?? 'pending',
            node.route_decision_id ?? null,
            node.policy_decision_id ?? null,
            node.payment_event_id ?? null,
            node.tool_execution_id ?? null,
            node.provider_response_hash ?? null,
            node.provider_id ?? null,
            node.model_id ?? null,
            node.verification_result ? JSON.stringify(node.verification_result) : null,
            node.cost ?? null,
            node.latency_ms ?? null,
            node.started_at ?? null,
            node.completed_at ?? null,
            node.error ?? null,
        ]
    );
    return nodeId;
}

export async function updateTraceNode(
    nodeId: string,
    updates: Partial<Pick<TraceNode, 'status' | 'cost' | 'latency_ms' | 'completed_at' | 'error' | 'provider_response_hash' | 'payment_event_id' | 'provider_id' | 'model_id'>>
): Promise<void> {
    const sets: string[] = [];
    const values: unknown[] = [];
    let idx = 1;

    if (updates.status !== undefined) { sets.push(`status = $${idx++}`); values.push(updates.status); }
    if (updates.cost !== undefined) { sets.push(`cost = $${idx++}`); values.push(updates.cost); }
    if (updates.latency_ms !== undefined) { sets.push(`latency_ms = $${idx++}`); values.push(updates.latency_ms); }
    if (updates.completed_at !== undefined) { sets.push(`completed_at = $${idx++}`); values.push(updates.completed_at); }
    if (updates.error !== undefined) { sets.push(`error = $${idx++}`); values.push(updates.error); }
    if (updates.provider_response_hash !== undefined) { sets.push(`provider_response_hash = $${idx++}`); values.push(updates.provider_response_hash); }
    if (updates.payment_event_id !== undefined) { sets.push(`payment_event_id = $${idx++}`); values.push(updates.payment_event_id); }
    if (updates.provider_id !== undefined) { sets.push(`provider_id = $${idx++}`); values.push(updates.provider_id); }
    if (updates.model_id !== undefined) { sets.push(`model_id = $${idx++}`); values.push(updates.model_id); }

    if (sets.length === 0) return;
    values.push(nodeId);
    await db.query(`UPDATE execute_trace_nodes SET ${sets.join(', ')} WHERE id = $${idx}`, values as string[]);
}

// ── Finalize ──────────────────────────────────────────────────────────────────

export interface TraceSummaryInput {
    total_cost: number;
    total_latency_ms: number;
    node_count: number;
    mode_resolved: 'direct' | 'planned';
    cached: boolean;
    provider?: string;
    model?: string;
}

export async function finalizeTrace(
    traceId: string,
    status: 'completed' | 'failed' | 'partial',
    summary: TraceSummaryInput
): Promise<void> {
    await db.query(
        `UPDATE execute_traces
         SET status = $1, summary = $2, completed_at = NOW()
         WHERE id = $3`,
        [status, JSON.stringify(summary), traceId]
    );
}

// ── Read ──────────────────────────────────────────────────────────────────────

export async function getTrace(traceId: string, tenantId: string): Promise<Trace | null> {
    const [traceResult, nodesResult, routingResult] = await Promise.all([
        db.query(
            `SELECT t.*, r.task, r.actual_cost, r.baseline_cost
             FROM execute_traces t
             LEFT JOIN execute_requests r ON r.id = t.request_id
             WHERE t.id = $1 AND t.tenant_id = $2`,
            [traceId, tenantId]
        ),
        db.query(
            `SELECT
                etn.id, etn.trace_id, etn.node_id, etn.node_type, etn.status,
                etn.cost, etn.latency_ms, etn.started_at, etn.completed_at, etn.error,
                etn.provider_id, etn.model_id, etn.provider_response_hash,
                -- Plan node enrichment
                epn.label,
                -- Tool execution enrichment
                te.tool_name, te.input_args AS tool_args,
                te.output AS tool_output, te.latency_ms AS tool_latency_ms,
                te.error_message AS tool_error,
                -- Evaluation enrichment
                ee.overall_score, ee.passed AS eval_passed,
                ee.scores AS eval_scores, ee.pass_threshold, ee.evaluator_model
             FROM execute_trace_nodes etn
             LEFT JOIN execute_plan_nodes epn ON epn.id = etn.node_id
             LEFT JOIN tool_executions   te  ON te.trace_node_id = etn.id
             LEFT JOIN execute_evaluations ee ON ee.trace_node_id = etn.id
             WHERE etn.trace_id = $1
             ORDER BY etn.started_at ASC NULLS LAST`,
            [traceId]
        ),
        db.query(
            `SELECT rd.selected_provider_id, rd.reason, rd.requested_mode, rd.alternatives
             FROM router_decisions rd
             JOIN execute_traces t ON t.request_id = rd.request_id
             WHERE t.id = $1
             ORDER BY rd.created_at DESC
             LIMIT 1`,
            [traceId]
        ),
    ]);

    type TraceRow = {
        id: string; tenant_id: string; request_id: string; plan_id: string | null;
        status: string; summary: unknown; created_at: string; completed_at: string | null;
        task: string | null; actual_cost: string | null; baseline_cost: string | null;
    };
    type RoutingRow = {
        selected_provider_id: string; reason: string; requested_mode: string;
        alternatives: unknown;
    };
    type NodeRow = {
        id: string; trace_id: string; node_id: string | null; node_type: string;
        status: string; cost: string | null; latency_ms: number | null;
        started_at: string | null; completed_at: string | null; error: string | null;
        provider_id: string | null; model_id: string | null;
        provider_response_hash: string | null;
        // Plan node
        label: string | null;
        // Tool execution
        tool_name: string | null; tool_args: unknown; tool_output: unknown;
        tool_latency_ms: number | null; tool_error: string | null;
        // Evaluation
        overall_score: number | null; eval_passed: boolean | null;
        eval_scores: unknown; pass_threshold: number | null; evaluator_model: string | null;
    };

    const traceRow = (traceResult.rows as TraceRow[])[0];
    if (!traceRow) return null;

    const routingRow = (routingResult.rows as RoutingRow[])[0];
    const routingDecision = routingRow ? {
        selected_provider_id: routingRow.selected_provider_id,
        reason: routingRow.reason,
        requested_mode: routingRow.requested_mode,
        alternatives: (typeof routingRow.alternatives === 'string'
            ? JSON.parse(routingRow.alternatives)
            : routingRow.alternatives) as Array<{ provider: string; score: number; reason: string }> ?? [],
    } : undefined;

    return {
        id: traceRow.id,
        tenant_id: traceRow.tenant_id,
        request_id: traceRow.request_id,
        plan_id: traceRow.plan_id ?? undefined,
        status: traceRow.status as Trace['status'],
        summary: typeof traceRow.summary === 'string'
            ? JSON.parse(traceRow.summary) as Trace['summary']
            : traceRow.summary as Trace['summary'],
        nodes: (nodesResult.rows as NodeRow[]).map((n) => ({
            id: n.id,
            trace_id: n.trace_id,
            node_id: n.node_id ?? undefined,
            node_type: n.node_type as TraceNode['node_type'],
            status: n.status as TraceNodeStatus,
            cost: n.cost !== null ? parseFloat(n.cost) : undefined,
            latency_ms: n.latency_ms ?? undefined,
            started_at: n.started_at ?? undefined,
            completed_at: n.completed_at ?? undefined,
            error: n.error ?? undefined,
            provider_id: n.provider_id ?? undefined,
            model_id: n.model_id ?? undefined,
            provider_response_hash: n.provider_response_hash ?? undefined,
            label: n.label ?? undefined,
            tool_execution: n.tool_name ? {
                tool_name: n.tool_name,
                args: (n.tool_args as Record<string, unknown>) ?? {},
                output: n.tool_output,
                latency_ms: n.tool_latency_ms,
                error: n.tool_error,
            } : undefined,
            evaluation: n.overall_score !== null ? {
                overall_score: n.overall_score,
                passed: n.eval_passed ?? false,
                scores: (n.eval_scores as Record<string, number>) ?? {},
                pass_threshold: n.pass_threshold ?? 0.70,
                evaluator_model: n.evaluator_model ?? '',
            } : undefined,
        })),
        created_at: traceRow.created_at,
        completed_at: traceRow.completed_at ?? undefined,
        task: traceRow.task ?? undefined,
        actual_cost: traceRow.actual_cost !== null ? parseFloat(traceRow.actual_cost) : undefined,
        baseline_cost: traceRow.baseline_cost !== null ? parseFloat(traceRow.baseline_cost) : undefined,
        routing_decision: routingDecision,
    };
}
