/**
 * GET /api/v2/control/overview
 *
 * Slice 3B — Control Foundation. Read-only governance surface over
 * ai_economic_events + api_keys + departments + employees + ap2_mandates.
 *
 * Privacy posture: metadata only. No prompt or response content is read.
 *
 * One endpoint, one round-trip, eleven panels (budget burn at 4 levels,
 * allowlist for models + task types, max cost per request, policy-denied
 * spend, human review queue, control coverage).
 *
 * Default window: last 30 days. Always materializes a real period — never
 * empty strings — pinned by route test.
 */

import { NextRequest, NextResponse } from 'next/server';

import db from '@/lib/db';
import { requireTenantAccess } from '@/lib/auth';
import { toApiErrorResponse } from '@/lib/errors';

import {
    fetchAllowlistPanel,
    fetchApiKeyBudgetBurn,
    fetchControlCoverage,
    fetchDepartmentBudgetBurn,
    fetchEmployeeBudgetBurn,
    fetchHumanReviewSummary,
    fetchMaxCostPerRequest,
    fetchPolicyDeniedSpend,
    fetchWorkflowBudgetBurn,
} from '@/lib/control/aggregations';
import type {
    ControlFilters,
    ControlOverviewResponse,
} from '@/lib/control/types';

export const dynamic = 'force-dynamic';

const DEFAULT_WINDOW_DAYS = 30;

function parseFilters(req: NextRequest): { filters: ControlFilters; since: string; until: string } {
    const u = req.nextUrl.searchParams;
    const now = new Date();
    const sinceParam = u.get('since');
    const untilParam = u.get('until');

    const since = sinceParam && !Number.isNaN(Date.parse(sinceParam))
        ? new Date(sinceParam).toISOString()
        : new Date(now.getTime() - DEFAULT_WINDOW_DAYS * 24 * 60 * 60 * 1000).toISOString();
    const until = untilParam && !Number.isNaN(Date.parse(untilParam))
        ? new Date(untilParam).toISOString()
        : now.toISOString();

    const pick = (k: string): string | undefined => {
        const v = u.get(k);
        return v && v.length > 0 ? v : undefined;
    };

    const filters: ControlFilters = { since, until };
    const department = pick('department_id'); if (department) filters.department_id = department;
    const employee = pick('employee_id'); if (employee) filters.employee_id = employee;
    const workflow = pick('workflow_id'); if (workflow) filters.workflow_id = workflow;
    const customer = pick('customer_id'); if (customer) filters.customer_id = customer;
    const feature = pick('feature_id'); if (feature) filters.feature_id = feature;
    const provider = pick('provider'); if (provider) filters.provider = provider;
    const modelUsed = pick('model_used'); if (modelUsed) filters.model_used = modelUsed;
    return { filters, since, until };
}

function windowDays(since: string, until: string): number {
    const ms = Date.parse(until) - Date.parse(since);
    if (!Number.isFinite(ms) || ms <= 0) return DEFAULT_WINDOW_DAYS;
    return Math.max(1, Math.round(ms / (24 * 60 * 60 * 1000)));
}

export async function GET(req: NextRequest) {
    const requestId = crypto.randomUUID();
    try {
        const access = await requireTenantAccess(req);
        if (access.error) {
            return NextResponse.json({ error: access.error }, { status: access.status ?? 401 });
        }
        const tenantId = access.tenantId;
        const { filters, since, until } = parseFilters(req);
        const now = new Date();

        const [
            apiKeyBurn,
            departmentBurn,
            employeeBurn,
            workflowBurn,
            allowlist,
            maxCost,
            deniedSpend,
            humanReview,
            coverage,
        ] = await Promise.all([
            fetchApiKeyBudgetBurn(db, tenantId, filters, now),
            fetchDepartmentBudgetBurn(db, tenantId, filters, now),
            fetchEmployeeBudgetBurn(db, tenantId, filters, now),
            fetchWorkflowBudgetBurn(db, tenantId, filters, now),
            fetchAllowlistPanel(db, tenantId, filters),
            fetchMaxCostPerRequest(db, tenantId, filters),
            fetchPolicyDeniedSpend(db, tenantId, filters),
            fetchHumanReviewSummary(db, tenantId, filters),
            fetchControlCoverage(db, tenantId, filters),
        ]);

        const body: ControlOverviewResponse = {
            period: { since, until, window_days: windowDays(since, until) },
            filters_applied: filters,
            budget_burn: {
                api_keys: apiKeyBurn,
                departments: departmentBurn,
                employees: employeeBurn,
                workflows: workflowBurn,
            },
            allowlist,
            max_cost_per_request: maxCost,
            policy_denied_spend: deniedSpend,
            human_review: humanReview,
            control_coverage: coverage,
            privacy_note: 'Control reads metadata fields only. No prompt or response content is used.',
        };

        return NextResponse.json(body, {
            headers: { 'X-P402-Request-ID': requestId },
        });
    } catch (err) {
        return toApiErrorResponse(err, requestId);
    }
}
