/**
 * DAG Validator — Phase 2
 * ========================
 * Validates bounded execution DAGs before running.
 * Rules: max 5 nodes, no cycles, no dangling edges. (ADR-003)
 */

import type { Plan } from '@/lib/contracts/plan';
import { MAX_PLAN_NODES } from '@/lib/contracts/plan';

export interface DagValidationResult {
    valid: boolean;
    errors: string[];
    /** Node IDs in safe execution order (empty when invalid). */
    topologicalOrder: string[];
}

export function validateDag(plan: Plan): DagValidationResult {
    const errors: string[] = [];

    if (plan.nodes.length === 0) {
        return { valid: false, errors: ['Plan has no nodes'], topologicalOrder: [] };
    }

    if (plan.nodes.length > MAX_PLAN_NODES) {
        errors.push(`Plan has ${plan.nodes.length} nodes; maximum is ${MAX_PLAN_NODES}`);
    }

    const nodeIds = new Set(plan.nodes.map((n) => n.id));
    const adj = new Map<string, string[]>();
    const inDegree = new Map<string, number>();

    for (const node of plan.nodes) {
        adj.set(node.id, []);
        inDegree.set(node.id, 0);
    }

    for (const edge of plan.edges) {
        if (!nodeIds.has(edge.from_node_id)) {
            errors.push(`Edge references unknown source node: ${edge.from_node_id}`);
            continue;
        }
        if (!nodeIds.has(edge.to_node_id)) {
            errors.push(`Edge references unknown target node: ${edge.to_node_id}`);
            continue;
        }
        if (edge.from_node_id === edge.to_node_id) {
            errors.push(`Self-loop detected on node: ${edge.from_node_id}`);
            continue;
        }
        adj.get(edge.from_node_id)!.push(edge.to_node_id);
        inDegree.set(edge.to_node_id, (inDegree.get(edge.to_node_id) ?? 0) + 1);
    }

    if (errors.length > 0) {
        return { valid: false, errors, topologicalOrder: [] };
    }

    // Kahn's algorithm: topological sort + cycle detection
    const queue: string[] = [];
    for (const [id, deg] of inDegree) {
        if (deg === 0) queue.push(id);
    }

    const order: string[] = [];
    while (queue.length > 0) {
        const nodeId = queue.shift()!;
        order.push(nodeId);
        for (const neighbor of adj.get(nodeId) ?? []) {
            const newDeg = (inDegree.get(neighbor) ?? 0) - 1;
            inDegree.set(neighbor, newDeg);
            if (newDeg === 0) queue.push(neighbor);
        }
    }

    if (order.length !== plan.nodes.length) {
        return {
            valid: false,
            errors: ['Plan contains a cycle — execution DAG must be acyclic'],
            topologicalOrder: [],
        };
    }

    return { valid: true, errors: [], topologicalOrder: order };
}
