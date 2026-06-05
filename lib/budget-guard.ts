// Budget Guard — pre/post-routing enforcement for Budget-Owned API Keys.
//
// Phase C of P402 Meter repositioning ("Control" layer). Throws ApiError with
// one of the 6 Phase-C error codes declared in lib/errors.ts. Never falls
// back: an unenforceable check (DB failure) propagates the original error so
// callers can decide between fail-closed (production) and fail-open (test).
//
// Two enforcement phases:
//   enforcePreRouting(ctx, request)  — allow-lists + MTD spend caps
//   enforcePostRouting(ctx, request) — single-request cost ceiling
//
// MTD ("month-to-date") = since the first instant of the current calendar
// month in UTC. Spend is delegated to lib/spend/month-to-date.ts.
//
// Slice 3C: source defaults to 'reconciled' (env BUDGET_GUARD_SPEND_SOURCE).
// In reconciled mode the cap check uses the LEGACY (traffic_events) buckets
// to avoid weakening enforcement before V5 economic-event write coverage is
// proven. The Control dashboard + simulator consume the primary
// (ai_economic_events) view. Flip gate lives in Slice 3D.

import db from '@/lib/db';
import { ApiError } from '@/lib/errors';
import {
    enforcementBuckets,
    getMonthToDateSpend as getSpend,
    type SpendBuckets,
    type SpendSource,
} from '@/lib/spend/month-to-date';
import type { ApiKeyContext } from '@/lib/types/api-key';

export interface PreRoutingRequest {
    /** OpenAI-compatible model id from the request body. */
    model?: string;
    /** Caller-tagged task type (e.g. 'inference', 'embedding'). */
    taskType?: string;
    /** Override "now" — exclusively for tests. */
    now?: Date;
}

export interface PostRoutingRequest {
    /** Estimated dollar cost the router computed for the chosen provider. */
    estimatedCostUsd: number;
}

/**
 * MTD spend buckets for the cap check. Delegates to the shared service.
 * In `'reconciled'` mode returns the LEGACY (traffic_events) buckets — the
 * Slice 3C enforcement invariant.
 */
export async function getMonthToDateSpend(
    ctx: ApiKeyContext,
    now: Date = new Date(),
    source?: SpendSource,
): Promise<SpendBuckets> {
    const result = await getSpend(
        db,
        {
            tenantId: ctx.tenantId,
            apiKeyId: ctx.apiKeyId,
            employeeId: ctx.employeeId,
            departmentId: ctx.departmentId,
        },
        { now, source },
    );
    return enforcementBuckets(result);
}

export async function enforcePreRouting(
    ctx: ApiKeyContext,
    req: PreRoutingRequest,
): Promise<void> {
    // 1. Model allow-list. Empty list means "all allowed" — the migration
    // defaults the column to [], so existing keys keep open access.
    if (req.model && ctx.allowedModels.length > 0 && !ctx.allowedModels.includes(req.model)) {
        throw new ApiError({
            code: 'MODEL_NOT_ALLOWED',
            status: 403,
            message: `Model '${req.model}' is not allowed for this API key`,
            requestId: '',
            details: { model: req.model, allowed: ctx.allowedModels },
        });
    }

    // 2. Task-type allow-list.
    if (
        req.taskType &&
        ctx.allowedTaskTypes.length > 0 &&
        !ctx.allowedTaskTypes.includes(req.taskType)
    ) {
        throw new ApiError({
            code: 'TASK_TYPE_NOT_ALLOWED',
            status: 403,
            message: `Task type '${req.taskType}' is not allowed for this API key`,
            requestId: '',
            details: { taskType: req.taskType, allowed: ctx.allowedTaskTypes },
        });
    }

    // 3. MTD spend caps. Skip the query entirely when no cap exists at any
    // level — the dominant case for legacy tenant-owned keys.
    const keyCap   = ctx.monthlyBudgetUsd;
    const empCap   = ctx.employeeMonthlyBudgetUsd;
    const deptCap  = ctx.departmentMonthlyBudgetUsd;
    if (keyCap === null && empCap === null && deptCap === null) return;

    const spend = await getMonthToDateSpend(ctx, req.now);

    if (keyCap !== null && spend.keySpendUsd >= keyCap) {
        throw new ApiError({
            code: 'API_KEY_BUDGET_EXCEEDED',
            status: 402,
            message: `API key monthly budget exhausted ($${spend.keySpendUsd.toFixed(2)} / $${keyCap.toFixed(2)})`,
            requestId: '',
            details: { spend: spend.keySpendUsd, cap: keyCap },
        });
    }
    if (empCap !== null && spend.employeeSpendUsd >= empCap) {
        throw new ApiError({
            code: 'EMPLOYEE_BUDGET_EXCEEDED',
            status: 402,
            message: `Employee monthly budget exhausted ($${spend.employeeSpendUsd.toFixed(2)} / $${empCap.toFixed(2)})`,
            requestId: '',
            details: { spend: spend.employeeSpendUsd, cap: empCap },
        });
    }
    if (deptCap !== null && spend.departmentSpendUsd >= deptCap) {
        throw new ApiError({
            code: 'DEPARTMENT_BUDGET_EXCEEDED',
            status: 402,
            message: `Department monthly budget exhausted ($${spend.departmentSpendUsd.toFixed(2)} / $${deptCap.toFixed(2)})`,
            requestId: '',
            details: { spend: spend.departmentSpendUsd, cap: deptCap },
        });
    }
}

export function enforcePostRouting(
    ctx: ApiKeyContext,
    req: PostRoutingRequest,
): void {
    const cap = ctx.maxCostPerRequestUsd;
    if (cap === null) return;
    if (req.estimatedCostUsd > cap) {
        throw new ApiError({
            code: 'MAX_COST_PER_REQUEST_EXCEEDED',
            status: 402,
            message: `Request cost $${req.estimatedCostUsd.toFixed(4)} exceeds per-request cap $${cap.toFixed(4)}`,
            requestId: '',
            details: { estimated: req.estimatedCostUsd, cap },
        });
    }
}
