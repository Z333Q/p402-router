/**
 * POST /api/v1/evaluate — Score any response against a task
 * Useful for offline quality checks without running a full execute.
 */

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { requireTenantAccess } from '@/lib/auth';
import { evaluateAndPersist } from '@/lib/evaluation/evaluator';
import { toApiErrorResponse } from '@/lib/errors';

export const dynamic = 'force-dynamic';

const EvaluateSchema = z.object({
    task: z.string().min(1).max(2000),
    response: z.string().min(1).max(50_000),
    context: z.string().max(10_000).optional(),
    pass_threshold: z.number().min(0).max(1).default(0.70),
    request_id: z.string().uuid().optional(),
});

export async function POST(req: NextRequest) {
    const requestId = crypto.randomUUID();
    try {
        const access = await requireTenantAccess(req);
        if (access.error) return NextResponse.json({ error: access.error }, { status: access.status ?? 401 });

        const body = await req.json().catch(() => null);
        const parse = EvaluateSchema.safeParse(body);
        if (!parse.success) {
            return NextResponse.json(
                { error: { code: 'INVALID_INPUT', message: 'Invalid request body', details: parse.error.flatten() } },
                { status: 400 }
            );
        }
        const input = parse.data;

        const result = await evaluateAndPersist(
            {
                task: input.task,
                responseText: input.response,
                contextText: input.context,
                passThreshold: input.pass_threshold,
            },
            {
                tenantId: access.tenantId,
                requestId: input.request_id ?? requestId,
            }
        );

        return NextResponse.json({
            passed: result.passed,
            overall_score: result.overallScore,
            pass_threshold: result.passThreshold,
            scores: result.scores,
            reasoning: result.reasoning ?? null,
            evaluator_model: result.evaluatorModel,
            latency_ms: result.latencyMs,
            request_id: requestId,
        });
    } catch (err) {
        return toApiErrorResponse(err, requestId);
    }
}
