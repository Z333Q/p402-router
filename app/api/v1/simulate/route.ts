/**
 * POST /api/v1/simulate — Dry-run plan generation
 * =================================================
 * Returns the DAG execution plan for a given task without running it.
 * Useful for previewing what steps would execute and estimating cost.
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireTenantAccess } from '@/lib/auth';
import { ExecuteInputSchema } from '@/lib/contracts/request';
import { generatePlan } from '@/lib/execution/planner';
import { validateDag } from '@/lib/execution/dag-validator';
import { resolveMode } from '@/lib/execution/mode-gate';
import { parseBudgetCap } from '@/lib/execution/budget-reservation';
import { toApiErrorResponse } from '@/lib/errors';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
    const requestId = crypto.randomUUID();

    try {
        const access = await requireTenantAccess(req);
        if (access.error) {
            return NextResponse.json({ error: access.error }, { status: access.status ?? 401 });
        }

        const body = await req.json().catch(() => null);
        const parse = ExecuteInputSchema.safeParse(body);
        if (!parse.success) {
            return NextResponse.json(
                { error: { code: 'INVALID_INPUT', message: 'Invalid request body', details: parse.error.flatten() } },
                { status: 400 }
            );
        }

        const input = parse.data;
        const tenantId = access.tenantId;

        // Resolve mode — if direct, return a trivial 1-node plan
        const modeResult = resolveMode(input, { threshold: 4 });
        const budgetCap = parseBudgetCap(input.budget);

        const plan = await generatePlan(input, {
            tenantId,
            requestId,
            budgetCap,
        });

        const validation = validateDag(plan);

        return NextResponse.json({
            request_id: requestId,
            mode: modeResult.mode,
            mode_score: modeResult.score,
            plan: {
                id: plan.id,
                goal: plan.goal,
                confidence: plan.confidence,
                planner_version: plan.planner_version,
                node_count: plan.nodes.length,
                nodes: plan.nodes.map((n) => ({
                    id: n.id,
                    type: n.node_type,
                    label: n.label,
                    sequence_index: n.sequence_index,
                    estimated_cost: n.estimated_cost ?? null,
                    estimated_latency_ms: n.estimated_latency_ms ?? null,
                })),
                edges: plan.edges.map((e) => ({
                    from: e.from_node_id,
                    to: e.to_node_id,
                    type: e.edge_type,
                })),
                execution_order: validation.topologicalOrder,
            },
            budget: {
                cap: budgetCap.toFixed(6),
                currency: 'USDC',
            },
        });
    } catch (err) {
        return toApiErrorResponse(err, requestId);
    }
}
