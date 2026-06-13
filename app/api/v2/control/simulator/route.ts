/**
 * POST /api/v2/control/simulator
 *
 * Slice 3B — Pure policy simulator. Read-only. Never mutates a policy, never
 * creates an economic event, never wires into provider routing.
 *
 * Tenant scoping is enforced for the api_key and mandate hydration steps —
 * the underlying AP2PolicyEngine.verifyMandate() is NOT tenant-scoped, so
 * this route does its own `WHERE id = $1 AND tenant_id = $2` lookup before
 * trusting the row. This rule is pinned by a route test.
 *
 * Privacy posture: metadata only.
 */

import { NextRequest, NextResponse } from 'next/server';

import db from '@/lib/db';
import { requireTenantAccess } from '@/lib/auth';
import { ApiError, toApiErrorResponse } from '@/lib/errors';

import { evaluate } from '@/lib/control/simulator';
import type {
    SimulatorEvaluationContext,
    SimulatorInput,
    SimulatorKeyContext,
    SimulatorMandateContext,
    SimulatorTenantDefaultContext,
} from '@/lib/control/types';
import { getTenantControlSettings } from '@/lib/control/configuration';
import {
    getMonthToDateSpend as getSharedSpend,
    primaryBuckets,
} from '@/lib/spend/month-to-date';

export const dynamic = 'force-dynamic';

interface RawBody {
    [k: string]: unknown;
}

function pickStr(b: RawBody, k: string): string | undefined {
    const v = b[k];
    return typeof v === 'string' && v.length > 0 ? v : undefined;
}

function pickNum(b: RawBody, k: string): number | undefined {
    const v = b[k];
    if (typeof v === 'number' && Number.isFinite(v)) return v;
    if (typeof v === 'string' && v.length > 0 && !Number.isNaN(Number(v))) return Number(v);
    return undefined;
}

function pickBool(b: RawBody, k: string): boolean | undefined {
    const v = b[k];
    return typeof v === 'boolean' ? v : undefined;
}

function parseInput(raw: unknown, requestId: string): SimulatorInput {
    if (typeof raw !== 'object' || raw === null || Array.isArray(raw)) {
        throw new ApiError({
            code: 'INVALID_INPUT',
            status: 400,
            message: 'Body must be a JSON object',
            requestId,
        });
    }
    const b = raw as RawBody;
    const cost = pickNum(b, 'estimated_cost_usd');
    if (cost !== undefined && cost < 0) {
        throw new ApiError({
            code: 'INVALID_INPUT',
            status: 400,
            message: 'estimated_cost_usd must be non-negative',
            requestId,
        });
    }
    const marginFloor = pickNum(b, 'margin_floor_pct');
    if (marginFloor !== undefined && (marginFloor < 0 || marginFloor > 100)) {
        throw new ApiError({
            code: 'INVALID_INPUT',
            status: 400,
            message: 'margin_floor_pct must be in [0, 100]',
            requestId,
        });
    }
    const input: SimulatorInput = {
        model_requested: pickStr(b, 'model_requested'),
        task_type: pickStr(b, 'task_type'),
        estimated_cost_usd: cost,
        margin_floor_pct: marginFloor,
        revenue_usd: pickNum(b, 'revenue_usd'),
        human_review_required: pickBool(b, 'human_review_required'),
        department_id: pickStr(b, 'department_id'),
        employee_id: pickStr(b, 'employee_id'),
        workflow_id: pickStr(b, 'workflow_id'),
        customer_id: pickStr(b, 'customer_id'),
        feature_id: pickStr(b, 'feature_id'),
        provider: pickStr(b, 'provider'),
        api_key_id: pickStr(b, 'api_key_id'),
        mandate_id: pickStr(b, 'mandate_id'),
        category: pickStr(b, 'category'),
    };
    return input;
}

/**
 * Tenant-scoped lookup of the API key + joined budget caps. Mirrors the
 * runtime resolver but only reads what the simulator needs.
 */
async function loadKeyContext(
    tenantId: string,
    apiKeyId: string,
    now: Date,
): Promise<SimulatorKeyContext | undefined> {
    const res = await db.query(
        `SELECT
             k.id::text                                  AS api_key_id,
             COALESCE(k.allowed_models, '[]'::jsonb)     AS allowed_models,
             COALESCE(k.allowed_task_types, '[]'::jsonb) AS allowed_task_types,
             k.max_cost_per_request_usd::float           AS max_cost_per_request_usd,
             k.monthly_budget_usd::float                 AS monthly_budget_usd,
             k.employee_id::text                         AS employee_id,
             k.department_id::text                       AS department_id,
             e.monthly_budget_usd::float                 AS employee_monthly_budget_usd,
             d.budget_usd::float                         AS department_budget_usd
         FROM api_keys k
         LEFT JOIN employees   e ON e.tenant_id   = k.tenant_id AND e.id = k.employee_id
         LEFT JOIN departments d ON d.tenant_id   = k.tenant_id AND d.id = k.department_id
         WHERE k.tenant_id = $1
           AND k.id = $2
           AND k.status = 'active'
         LIMIT 1`,
        [tenantId, apiKeyId],
    );
    const row = res.rows[0];
    if (!row) return undefined;

    // Slice 3C: delegate MTD spend to the shared service. Simulator is a
    // visibility surface — read the V5 primary (ai_economic_events).
    const r = row as Record<string, unknown>;
    const employeeId = r.employee_id == null ? null : String(r.employee_id);
    const departmentId = r.department_id == null ? null : String(r.department_id);
    const spendResult = await getSharedSpend(
        db,
        { tenantId, apiKeyId, employeeId, departmentId },
        { now, source: 'ai_economic_events' },
    );
    const spend = primaryBuckets(spendResult);

    const allowedModels = Array.isArray(row.allowed_models) ? (row.allowed_models as string[]) : [];
    const allowedTaskTypes = Array.isArray(row.allowed_task_types) ? (row.allowed_task_types as string[]) : [];

    return {
        apiKeyId: String(row.api_key_id),
        allowedModels,
        allowedTaskTypes,
        maxCostPerRequestUsd: row.max_cost_per_request_usd == null ? null : Number(row.max_cost_per_request_usd),
        monthlyBudgetUsd: row.monthly_budget_usd == null ? null : Number(row.monthly_budget_usd),
        employeeMonthlyBudgetUsd: row.employee_monthly_budget_usd == null ? null : Number(row.employee_monthly_budget_usd),
        departmentMonthlyBudgetUsd: row.department_budget_usd == null ? null : Number(row.department_budget_usd),
        mtdSpend: {
            keySpendUsd: spend.keySpendUsd,
            employeeSpendUsd: spend.employeeSpendUsd,
            departmentSpendUsd: spend.departmentSpendUsd,
        },
    };
}

/**
 * Slice 3W — tenant-default rung loader.
 *
 * Reads tenant_control_settings via the canonical helper (see
 * lib/control/configuration.ts). When the tenant has no saved row the
 * helper returns the system default; the simulator treats that as "no
 * tenant rung configured" and skips the rung's checks.
 *
 * Tenant-wide MTD spend is queried directly here. The shared spend helper
 * does not expose a tenant-only aggregate; rather than widen that helper
 * (out of 3W scope), we colocate the small SUM(cost_usd) query here.
 *
 * Failure-mode: on any read error, we log via toApiErrorResponse and let
 * the route return its standard error. We do NOT silently fall through
 * to "no tenant rung" — a DB error should surface, not silently widen.
 */
async function loadTenantDefaultsContext(
    tenantId: string,
    now: Date,
): Promise<SimulatorTenantDefaultContext | undefined> {
    const settings = await getTenantControlSettings(tenantId);
    const hasAnyConfig =
        settings.monthly_budget_usd         !== null ||
        settings.max_cost_per_request_usd   !== null ||
        settings.human_review_threshold_usd !== null ||
        settings.allowed_models.length      > 0      ||
        settings.allowed_task_types.length  > 0;
    if (!hasAnyConfig) return undefined;

    // Tenant-wide MTD aggregate. Only needed when a tenant monthly budget
    // is configured; otherwise we skip the query.
    let mtdTenantSpendUsd = 0;
    if (settings.monthly_budget_usd !== null) {
        const monthStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
        const r = await db.query(
            `SELECT COALESCE(SUM(cost_usd), 0)::float AS tenant_spend
               FROM ai_economic_events
              WHERE tenant_id = $1
                AND (status_code IS NULL OR status_code = 200)
                AND event_time >= $2`,
            [tenantId, monthStart],
        );
        const row = r.rows[0] as { tenant_spend?: number } | undefined;
        mtdTenantSpendUsd = Number(row?.tenant_spend ?? 0);
    }

    return {
        monthlyBudgetUsd:        settings.monthly_budget_usd,
        maxCostPerRequestUsd:    settings.max_cost_per_request_usd,
        humanReviewThresholdUsd: settings.human_review_threshold_usd,
        allowedModels:           settings.allowed_models,
        allowedTaskTypes:        settings.allowed_task_types,
        mtdTenantSpendUsd,
    };
}

/**
 * Tenant-scoped mandate lookup. AP2PolicyEngine.verifyMandate() is NOT
 * tenant-scoped, so we do the scoping here before constructing the ctx.
 */
async function loadMandateContext(
    tenantId: string,
    mandateId: string,
): Promise<SimulatorMandateContext | undefined> {
    const res = await db.query(
        `SELECT id, status, constraints, amount_spent_usd
         FROM ap2_mandates
         WHERE id = $1 AND tenant_id = $2
         LIMIT 1`,
        [mandateId, tenantId],
    );
    const row = res.rows[0];
    if (!row) return undefined;

    const constraints = (row.constraints ?? {}) as Record<string, unknown>;
    const allowed = Array.isArray(constraints.allowed_categories)
        ? (constraints.allowed_categories as string[])
        : undefined;
    return {
        mandateId: String(row.id),
        status: String(row.status ?? 'unknown'),
        validUntil: typeof constraints.valid_until === 'string' ? constraints.valid_until : undefined,
        maxAmountUsd: Number(constraints.max_amount_usd ?? 0),
        amountSpentUsd: Number(row.amount_spent_usd ?? 0),
        allowedCategories: allowed,
    };
}

export async function POST(req: NextRequest) {
    const requestId = crypto.randomUUID();
    try {
        const access = await requireTenantAccess(req);
        if (access.error) {
            return NextResponse.json({ error: access.error }, { status: access.status ?? 401 });
        }
        const tenantId = access.tenantId;

        let raw: unknown;
        try {
            raw = await req.json();
        } catch {
            throw new ApiError({
                code: 'INVALID_INPUT',
                status: 400,
                message: 'Body is not valid JSON',
                requestId,
            });
        }
        const input = parseInput(raw, requestId);

        const now = new Date();
        // Two-tier loading: the api_key + mandate hydration may issue
        // multiple sequential queries each; load them in parallel for
        // latency. The tenant-default rung is loaded after so that the
        // observed db.query ordering remains stable for existing tests
        // (api_keys → spend → mandate? → tcs → tenant_spend?).
        const [key, mandate] = await Promise.all([
            input.api_key_id ? loadKeyContext(tenantId, input.api_key_id, now) : Promise.resolve(undefined),
            input.mandate_id ? loadMandateContext(tenantId, input.mandate_id) : Promise.resolve(undefined),
        ]);
        const tenantDefault = await loadTenantDefaultsContext(tenantId, now);

        const ctx: SimulatorEvaluationContext = { tenantId, key, mandate, tenantDefault };
        const decision = evaluate(input, ctx);

        return NextResponse.json(
            {
                input,
                decision,
                privacy_note: 'Simulator reads metadata only. No prompt or response content is used.',
            },
            { headers: { 'X-P402-Request-ID': requestId } },
        );
    } catch (err) {
        return toApiErrorResponse(err, requestId);
    }
}
