/**
 * POST /api/v1/execute
 * ====================
 * Primary execute endpoint — the simple entry point into the intelligence layer.
 * Accepts a task with optional budget, mode, and constraints.
 * Automatically routes to direct (fast) or planned (intelligent) execution.
 *
 * See: Section 3.1 of Intelligence Layer plan, ADR-009.
 *
 * Request body:
 *   { task, input_data?, budget?, mode?, constraints?, session_id?, idempotency_key? }
 *
 * Response:
 *   { request_id, status, result, cost, trace_id, execution }
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireTenantAccess } from '@/lib/auth';
import { ExecuteInputSchema } from '@/lib/contracts/request';
import { executeRequest } from '@/lib/execution/execute-request';
import { checkIdempotency, storeIdempotencyResult } from '@/lib/execution/idempotency';
import { toApiErrorResponse, ApiError } from '@/lib/errors';
import { BillingGuard, BillingGuardError } from '@/lib/providers/openrouter/billing-guard';
import {
    checkAgentkitAccess,
    buildAgentkitChallengeExtension,
} from '@/lib/identity/agentkit';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
    const requestId = crypto.randomUUID();

    try {
        // ── Auth ────────────────────────────────────────────────────────────────
        const access = await requireTenantAccess(req);
        if (access.error) {
            return NextResponse.json({ error: access.error }, { status: access.status ?? 401 });
        }
        const tenantId = access.tenantId;

        // ── Parse and validate ─────────────────────────────────────────────────
        let body: unknown;
        try {
            body = await req.json();
        } catch {
            return NextResponse.json({
                error: {
                    type: 'validation_error',
                    code: 'INVALID_INPUT',
                    message: 'Request body must be valid JSON',
                    request_id: requestId,
                }
            }, { status: 400 });
        }

        const parseResult = ExecuteInputSchema.safeParse(body);
        if (!parseResult.success) {
            return NextResponse.json({
                error: {
                    type: 'validation_error',
                    code: 'INVALID_INPUT',
                    message: 'Invalid request body',
                    request_id: requestId,
                    details: parseResult.error.flatten(),
                }
            }, { status: 400 });
        }
        const input = parseResult.data;

        // ── Idempotency check ──────────────────────────────────────────────────
        const idempotencyKey = input.idempotency_key
            ?? req.headers.get('idempotency-key')
            ?? null;

        if (idempotencyKey) {
            const cached = await checkIdempotency(idempotencyKey, tenantId);
            if (cached) {
                return NextResponse.json(cached, {
                    headers: {
                        'X-P402-Request-ID': cached.request_id,
                        'X-P402-Idempotency-Replayed': 'true',
                    }
                });
            }
        }

        // ── World AgentKit check ───────────────────────────────────────────────
        const agentkit = await checkAgentkitAccess(req, '/api/v1/execute');

        // ── Billing Guard ──────────────────────────────────────────────────────
        if (!agentkit.grantAccess) {
            const billingCtx = { userId: tenantId, tenantId, humanVerified: agentkit.humanVerified };
            const guard = new BillingGuard();
            await guard.checkRateLimit(billingCtx);
            await guard.checkDailySpend(billingCtx);
            await guard.checkConcurrentReservations(billingCtx);
        }

        // ── Execute ────────────────────────────────────────────────────────────
        const result = await executeRequest(input, {
            tenantId,
            requestId,
            humanId: agentkit.humanId ?? null,
        });

        // Store idempotency result (non-blocking)
        if (idempotencyKey) {
            storeIdempotencyResult(idempotencyKey, tenantId, requestId, result).catch(() => null);
        }

        return NextResponse.json(result, {
            headers: {
                'X-P402-Request-ID': requestId,
                'X-P402-Trace-ID': result.trace_id,
                'X-P402-Mode': result.execution.mode_resolved,
                'X-P402-Cost-USD': result.cost.actual,
                'X-P402-Cached': result.execution.cached ? 'true' : 'false',
            }
        });

    } catch (err) {
        // Billing guard blocked
        if (err instanceof BillingGuardError) {
            const agentkitExt = buildAgentkitChallengeExtension();
            return NextResponse.json({
                error: {
                    type: 'billing_error',
                    code: err.code,
                    message: err.message,
                    request_id: requestId,
                    ...(err.retryAfterMs && { retry_after_ms: err.retryAfterMs }),
                },
                ...(agentkitExt && { agentkit_challenge: agentkitExt }),
            }, {
                status: 429,
                headers: err.retryAfterMs
                    ? { 'Retry-After': String(Math.ceil(err.retryAfterMs / 1000)) }
                    : {},
            });
        }

        // Budget error
        if (err instanceof ApiError && err.code === 'BUDGET_INSUFFICIENT') {
            return NextResponse.json({
                error: {
                    type: 'budget_error',
                    code: err.code,
                    message: err.message,
                    request_id: requestId,
                }
            }, { status: 402 });
        }

        // Idempotency conflict
        if (err instanceof ApiError && err.code === 'IDEMPOTENCY_CONFLICT') {
            return NextResponse.json({
                error: {
                    type: 'execution_error',
                    code: err.code,
                    message: err.message,
                    request_id: requestId,
                }
            }, { status: 409 });
        }

        return toApiErrorResponse(err, requestId);
    }
}
