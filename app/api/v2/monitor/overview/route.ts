/**
 * GET /api/v2/monitor/overview
 *
 * Slice 3A — Monitor foundation. Read-only aggregation surface for the
 * `/dashboard/monitor` page. Aggregates over `ai_economic_events` (v2_052) and
 * `request_outcomes` (v2_051) only. Privacy posture: metadata only — no prompt
 * or response content is read.
 *
 * One endpoint, one round trip, all panels returned in one response. Internal
 * implementation runs a small number of tenant-scoped queries in parallel.
 *
 * Filters (query string, all optional):
 *   since, until                  ISO timestamps; defaults to last 30 days
 *   department_id, employee_id, workflow_id, customer_id, feature_id
 *   provider, model_used
 */

import { NextRequest, NextResponse } from 'next/server';

import db from '@/lib/db';
import { requireTenantAccess } from '@/lib/auth';
import { toApiErrorResponse } from '@/lib/errors';

import {
    fetchCoverage,
    fetchOutcomePanels,
    fetchPrivacyModeDistribution,
    fetchSpendByGroup,
    fetchSpendByProviderModel,
    fetchTotals,
} from '@/lib/monitor/aggregations';
import type {
    MonitorFilters,
    MonitorOverviewResponse,
} from '@/lib/monitor/types';

export const dynamic = 'force-dynamic';

const DEFAULT_WINDOW_DAYS = 30;

/**
 * Returns `{ filters, since, until }` where `since`/`until` are concrete ISO
 * strings (route-level defaults if the caller omitted them) and `filters`
 * carries those same window bounds plus any whitelisted attribution filters.
 *
 * The dashboard contract is: the API always returns a real period. The
 * aggregation layer accepts windowless filters, but this route never produces
 * them. Pinned by the "defaults to a real period" route test.
 */
function parseFilters(req: NextRequest): { filters: MonitorFilters; since: string; until: string } {
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

    const pick = (key: string): string | undefined => {
        const v = u.get(key);
        return v && v.length > 0 ? v : undefined;
    };

    const filters: MonitorFilters = { since, until };
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

        // Run the panels in parallel — they're independent queries that all
        // share the same tenant + time window. One pool connection per query;
        // Postgres handles the concurrency.
        const [
            totals,
            spendByDepartment,
            spendByEmployee,
            spendByWorkflow,
            spendByCustomer,
            spendByFeature,
            spendByProviderModel,
            coverage,
            privacyModeDistribution,
            outcomePanels,
        ] = await Promise.all([
            fetchTotals(db, tenantId, filters),
            fetchSpendByGroup(db, tenantId, filters, 'department_id'),
            fetchSpendByGroup(db, tenantId, filters, 'employee_id'),
            fetchSpendByGroup(db, tenantId, filters, 'workflow_id'),
            fetchSpendByGroup(db, tenantId, filters, 'customer_id'),
            fetchSpendByGroup(db, tenantId, filters, 'feature_id'),
            fetchSpendByProviderModel(db, tenantId, filters),
            fetchCoverage(db, tenantId, filters),
            fetchPrivacyModeDistribution(db, tenantId, filters),
            fetchOutcomePanels(db, tenantId, filters),
        ]);

        const body: MonitorOverviewResponse = {
            period: {
                since,
                until,
                window_days: windowDays(since, until),
            },
            filters_applied: filters,
            totals,
            spend_by_department: spendByDepartment,
            spend_by_employee: spendByEmployee,
            spend_by_workflow: spendByWorkflow,
            spend_by_customer: spendByCustomer,
            spend_by_feature: spendByFeature,
            spend_by_provider_model: spendByProviderModel,
            cost_per_accepted_output: outcomePanels.costPerAccepted,
            evidence_coverage: coverage.evidence,
            attribution_completeness: coverage.attribution,
            outcome_completeness: outcomePanels.outcomeCompleteness,
            privacy_mode_distribution: privacyModeDistribution,
            privacy_note:
                'Monitor reads metadata fields only. No prompt or response content is used.',
        };

        return NextResponse.json(body, {
            headers: { 'X-P402-Request-ID': requestId },
        });
    } catch (err) {
        return toApiErrorResponse(err, requestId);
    }
}
