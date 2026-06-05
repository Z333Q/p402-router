/**
 * Slice 3A — Monitor aggregations tests.
 *
 * Covers:
 *   - tenant scoping in every query (every call passes tenant_id as $1)
 *   - filter pushdown (extra parameters appended)
 *   - null attribution becomes 'Unattributed'
 *   - insufficient outcome data branch (both sub-conditions)
 *   - accepted_count absolute floor
 *   - evidence coverage zero case
 *   - privacy-mode distribution
 *   - success-rate precedence
 */

import { describe, expect, it, vi } from 'vitest';

import {
    buildBaseWhere,
    evaluateCostPerAcceptedOutput,
    fetchCoverage,
    fetchOutcomePanels,
    fetchPrivacyModeDistribution,
    fetchSpendByGroup,
    fetchSpendByProviderModel,
    fetchTotals,
    pickSuccessRate,
} from '@/lib/monitor/aggregations';
import { COST_PER_ACCEPTED_OUTPUT_THRESHOLDS, UNATTRIBUTED } from '@/lib/monitor/types';
import type { MonitorFilters } from '@/lib/monitor/types';

function makePool(rows: Record<string, unknown>[]) {
    const calls: Array<{ sql: string; params: unknown[] }> = [];
    const pool = {
        query: vi.fn(async (sql: string, params: unknown[]) => {
            calls.push({ sql, params });
            return { rows };
        }),
    };
    return { pool, calls };
}

const TENANT = '11111111-1111-1111-1111-111111111111';

const FILTERS: MonitorFilters = {
    since: '2026-05-06T00:00:00.000Z',
    until: '2026-06-05T00:00:00.000Z',
};

const FILTERS_WITH_ATTR: MonitorFilters = {
    ...FILTERS,
    department_id: 'eng',
    employee_id: 'alice',
    provider: 'openrouter',
};

// ---------------------------------------------------------------------------
// Tenant scoping + filter pushdown
// ---------------------------------------------------------------------------

describe('tenant scoping', () => {
    it('passes tenant_id as $1 in every aggregation', async () => {
        const { pool, calls } = makePool([{ key: 'x', request_count: 1, total_cost_usd: 1, avg_cost_usd: 1 }]);
        await fetchSpendByGroup(pool, TENANT, FILTERS, 'department_id');
        await fetchSpendByProviderModel(pool, TENANT, FILTERS);
        await fetchPrivacyModeDistribution(pool, TENANT, FILTERS);
        expect(calls.length).toBe(3);
        for (const call of calls) {
            expect(call.params[0]).toBe(TENANT);
            expect(call.sql).toMatch(/tenant_id\s*=\s*\$1/);
        }
    });
});

// ---------------------------------------------------------------------------
// Dynamic parameter indexing — no hardcoded $2/$3 assumptions
// ---------------------------------------------------------------------------

describe('buildBaseWhere — dynamic parameter indexing', () => {
    it('binds only tenant when since/until are absent', () => {
        const b = buildBaseWhere(TENANT, {});
        expect(b.params).toEqual([TENANT]);
        expect(b.where).toEqual(['tenant_id = $1']);
    });

    it('indexes since at $2 when until is absent', () => {
        const b = buildBaseWhere(TENANT, { since: '2026-05-01T00:00:00.000Z' });
        expect(b.params).toEqual([TENANT, '2026-05-01T00:00:00.000Z']);
        expect(b.where).toEqual(['tenant_id = $1', 'event_time >= $2']);
    });

    it('indexes until at $2 when since is absent', () => {
        const b = buildBaseWhere(TENANT, { until: '2026-06-01T00:00:00.000Z' });
        expect(b.params).toEqual([TENANT, '2026-06-01T00:00:00.000Z']);
        expect(b.where).toEqual(['tenant_id = $1', 'event_time <= $2']);
    });

    it('appends extra filters after since-only at $3+', () => {
        const b = buildBaseWhere(TENANT, {
            since: '2026-05-01T00:00:00.000Z',
            department_id: 'eng',
            provider: 'openrouter',
        });
        expect(b.params).toEqual([TENANT, '2026-05-01T00:00:00.000Z', 'eng', 'openrouter']);
        expect(b.where).toEqual([
            'tenant_id = $1',
            'event_time >= $2',
            'department_id = $3',
            'provider = $4',
        ]);
    });

    it('appends extra filters after until-only at $3+', () => {
        const b = buildBaseWhere(TENANT, {
            until: '2026-06-01T00:00:00.000Z',
            workflow_id: 'wf-7',
        });
        expect(b.params).toEqual([TENANT, '2026-06-01T00:00:00.000Z', 'wf-7']);
        expect(b.where).toEqual([
            'tenant_id = $1',
            'event_time <= $2',
            'workflow_id = $3',
        ]);
    });

    it('appends extra filters after both window bounds at $4+', () => {
        const b = buildBaseWhere(TENANT, {
            since: '2026-05-01T00:00:00.000Z',
            until: '2026-06-01T00:00:00.000Z',
            employee_id: 'alice',
        });
        expect(b.params).toEqual([
            TENANT, '2026-05-01T00:00:00.000Z', '2026-06-01T00:00:00.000Z', 'alice',
        ]);
        expect(b.where).toEqual([
            'tenant_id = $1',
            'event_time >= $2',
            'event_time <= $3',
            'employee_id = $4',
        ]);
    });

    it('appends extra filters with no window bounds starting at $2', () => {
        const b = buildBaseWhere(TENANT, { department_id: 'eng', model_used: 'gpt-4o' });
        expect(b.params).toEqual([TENANT, 'eng', 'gpt-4o']);
        expect(b.where).toEqual([
            'tenant_id = $1',
            'department_id = $2',
            'model_used = $3',
        ]);
    });

    it('aliases all columns including window bounds and extra filters', () => {
        const b = buildBaseWhere(TENANT, {
            since: '2026-05-01T00:00:00.000Z',
            until: '2026-06-01T00:00:00.000Z',
            department_id: 'eng',
        }, 'e');
        expect(b.where).toEqual([
            'e.tenant_id = $1',
            'e.event_time >= $2',
            'e.event_time <= $3',
            'e.department_id = $4',
        ]);
    });

    it('aliased mode with no window bounds still aliases tenant + filters', () => {
        const b = buildBaseWhere(TENANT, { department_id: 'eng' }, 'e');
        expect(b.where).toEqual(['e.tenant_id = $1', 'e.department_id = $2']);
        expect(b.params).toEqual([TENANT, 'eng']);
    });

    it('skips empty-string filter values', () => {
        const b = buildBaseWhere(TENANT, {
            since: '2026-05-01T00:00:00.000Z',
            department_id: '',
            employee_id: 'bob',
        });
        expect(b.params).toEqual([TENANT, '2026-05-01T00:00:00.000Z', 'bob']);
        expect(b.where).toEqual([
            'tenant_id = $1',
            'event_time >= $2',
            'employee_id = $3',
        ]);
    });
});

describe('fetchSpendByGroup — windowless and partial windows', () => {
    it('emits no event_time predicate when neither bound is set', async () => {
        const { pool, calls } = makePool([]);
        await fetchSpendByGroup(pool, TENANT, {}, 'department_id');
        const call = calls[0]!;
        expect(call.params).toEqual([TENANT]);
        expect(call.sql).toMatch(/WHERE tenant_id = \$1/);
        expect(call.sql).not.toMatch(/event_time/);
    });

    it('emits only >= predicate for since-only with extra filter at $3', async () => {
        const { pool, calls } = makePool([]);
        await fetchSpendByGroup(
            pool,
            TENANT,
            { since: '2026-05-01T00:00:00.000Z', provider: 'openrouter' },
            'department_id',
        );
        const call = calls[0]!;
        expect(call.params).toEqual([TENANT, '2026-05-01T00:00:00.000Z', 'openrouter']);
        expect(call.sql).toMatch(/event_time >= \$2/);
        expect(call.sql).not.toMatch(/event_time <=/);
        expect(call.sql).toMatch(/provider = \$3/);
    });

    it('emits only <= predicate for until-only with extra filter at $3', async () => {
        const { pool, calls } = makePool([]);
        await fetchSpendByGroup(
            pool,
            TENANT,
            { until: '2026-06-01T00:00:00.000Z', department_id: 'eng' },
            'workflow_id',
        );
        const call = calls[0]!;
        expect(call.params).toEqual([TENANT, '2026-06-01T00:00:00.000Z', 'eng']);
        expect(call.sql).toMatch(/event_time <= \$2/);
        expect(call.sql).not.toMatch(/event_time >=/);
        expect(call.sql).toMatch(/department_id = \$3/);
    });
});

describe('fetchOutcomePanels — aliased filter with department_id', () => {
    it('aliases department_id at $3 when only since is bound', async () => {
        const { pool, calls } = makePool([{
            total_events: 0, events_with_outcome: 0, accepted_count: 0, accepted_cost: 0,
        }]);
        await fetchOutcomePanels(pool, TENANT, {
            since: '2026-05-01T00:00:00.000Z',
            department_id: 'eng',
        });
        const call = calls[0]!;
        expect(call.params).toEqual([TENANT, '2026-05-01T00:00:00.000Z', 'eng']);
        expect(call.sql).toMatch(/WHERE e\.tenant_id = \$1/);
        expect(call.sql).toMatch(/e\.event_time >= \$2/);
        expect(call.sql).toMatch(/AND e\.department_id = \$3/);
        expect(call.sql).not.toMatch(/e\.event_time <=/);
    });

    it('windowless aliased query: department_id binds at $2', async () => {
        const { pool, calls } = makePool([{
            total_events: 0, events_with_outcome: 0, accepted_count: 0, accepted_cost: 0,
        }]);
        await fetchOutcomePanels(pool, TENANT, { department_id: 'eng' });
        const call = calls[0]!;
        expect(call.params).toEqual([TENANT, 'eng']);
        expect(call.sql).toMatch(/e\.department_id = \$2/);
    });

    it('cost_per_accepted_output only counts request_outcomes.status=accepted', async () => {
        const { pool, calls } = makePool([{
            total_events: 500, events_with_outcome: 500, accepted_count: 100, accepted_cost: 5,
        }]);
        await fetchOutcomePanels(pool, TENANT, FILTERS);
        const sql = calls[0]!.sql;
        // The accepted_count/accepted_cost expressions both gate on o.status = 'accepted'.
        // Never status_code, never output_status — that's the definitional rule.
        expect(sql).toMatch(/COUNT\(\*\) FILTER \(WHERE o\.status = 'accepted'\)::int\s+AS accepted_count/);
        expect(sql).toMatch(/SUM\(e\.cost_usd\) FILTER \(WHERE o\.status = 'accepted'\)/);
        expect(sql).not.toMatch(/o\.status_code/);
        expect(sql).not.toMatch(/o\.output_status/);
    });
});

// ---------------------------------------------------------------------------
// Content-field guard — none of the privacy-sensitive columns may be selected
// ---------------------------------------------------------------------------

describe('content-field guard', () => {
    it('no aggregation SQL reads prompt/response/fingerprint/redacted/stored content', async () => {
        const { pool, calls } = makePool([{
            spend_usd: 0, request_count: 0, total_tokens: 0, avg_latency_ms: null,
            success_col_total: 0, success_col_true: 0,
            status_code_total: 0, status_code_success: 0,
            output_status_total: 0, output_status_success: 0,
            total: 0, with_evidence: 0,
            has_department: 0, has_employee: 0, has_workflow: 0, has_customer: 0, has_feature: 0,
            total_events: 0, events_with_outcome: 0, accepted_count: 0, accepted_cost: 0,
        }]);
        await fetchTotals(pool, TENANT, FILTERS_WITH_ATTR);
        await fetchSpendByGroup(pool, TENANT, FILTERS_WITH_ATTR, 'department_id');
        await fetchSpendByProviderModel(pool, TENANT, FILTERS_WITH_ATTR);
        await fetchCoverage(pool, TENANT, FILTERS_WITH_ATTR);
        await fetchPrivacyModeDistribution(pool, TENANT, FILTERS_WITH_ATTR);
        await fetchOutcomePanels(pool, TENANT, FILTERS_WITH_ATTR);

        const banned = [
            'prompt', 'response', 'fingerprint', 'redacted', 'content',
            'request_body', 'response_body', 'stored_content',
        ];
        for (const call of calls) {
            for (const word of banned) {
                expect(call.sql.toLowerCase()).not.toContain(word);
            }
        }
    });
});

describe('filter pushdown', () => {
    it('appends only filters that are set, in column order', async () => {
        const { pool, calls } = makePool([]);
        await fetchSpendByGroup(pool, TENANT, FILTERS_WITH_ATTR, 'workflow_id');
        const call = calls[0]!;
        expect(call.params).toEqual([
            TENANT,
            FILTERS_WITH_ATTR.since,
            FILTERS_WITH_ATTR.until,
            'eng',
            'alice',
            'openrouter',
        ]);
        expect(call.sql).toMatch(/AND department_id = \$4/);
        expect(call.sql).toMatch(/AND employee_id = \$5/);
        expect(call.sql).toMatch(/AND provider = \$6/);
    });

    it('emits no filter clauses when none are set', async () => {
        const { pool, calls } = makePool([]);
        await fetchSpendByGroup(pool, TENANT, FILTERS, 'department_id');
        const call = calls[0]!;
        expect(call.params).toEqual([TENANT, FILTERS.since, FILTERS.until]);
        expect(call.sql).not.toMatch(/AND department_id =/);
        expect(call.sql).not.toMatch(/AND employee_id =/);
    });
});

// ---------------------------------------------------------------------------
// Unattributed rows
// ---------------------------------------------------------------------------

describe('unattributed rows', () => {
    it('SQL coalesces nulls to Unattributed for group-by panels', async () => {
        const { pool, calls } = makePool([]);
        await fetchSpendByGroup(pool, TENANT, FILTERS, 'employee_id');
        expect(calls[0]!.sql).toMatch(new RegExp(`COALESCE\\(NULLIF\\(employee_id, ''\\), '${UNATTRIBUTED}'\\)`));
    });

    it('returns Unattributed groups in the mapped rows', async () => {
        const { pool } = makePool([
            { key: UNATTRIBUTED, request_count: 3, total_cost_usd: 0.15, avg_cost_usd: 0.05 },
            { key: 'eng',        request_count: 7, total_cost_usd: 0.42, avg_cost_usd: 0.06 },
        ]);
        const rows = await fetchSpendByGroup(pool, TENANT, FILTERS, 'department_id');
        expect(rows).toEqual([
            { key: UNATTRIBUTED, request_count: 3, total_cost_usd: 0.15, avg_cost_usd: 0.05 },
            { key: 'eng',        request_count: 7, total_cost_usd: 0.42, avg_cost_usd: 0.06 },
        ]);
    });
});

// ---------------------------------------------------------------------------
// Cost per accepted output — threshold gate
// ---------------------------------------------------------------------------

describe('evaluateCostPerAcceptedOutput', () => {
    const T = COST_PER_ACCEPTED_OUTPUT_THRESHOLDS;

    it('returns ok when both thresholds are met', () => {
        const r = evaluateCostPerAcceptedOutput({
            totalEvents: 1000,
            eventsWithOutcome: 800,  // 80% coverage
            acceptedCount: 100,
            acceptedCost: 5,
        });
        expect(r.status).toBe('ok');
        expect(r.cost_per_accepted_output_usd).toBe(0.05);
        expect(r.outcome_coverage_pct).toBe(80);
    });

    it('flags insufficient when coverage < 5% even with many accepted', () => {
        const r = evaluateCostPerAcceptedOutput({
            totalEvents: 10000,
            eventsWithOutcome: 400,  // 4% — under floor
            acceptedCount: 400,
            acceptedCost: 20,
        });
        expect(r.status).toBe('insufficient_outcome_data');
        expect(r.cost_per_accepted_output_usd).toBeNull();
        expect(r.outcome_coverage_pct).toBe(4);
        // Returns the raw counts so the UI can explain why.
        expect(r.accepted_count).toBe(400);
        expect(r.thresholds.min_outcome_coverage_pct).toBe(T.min_outcome_coverage_pct);
    });

    it('flags insufficient when accepted_count < 20 even at high coverage', () => {
        const r = evaluateCostPerAcceptedOutput({
            totalEvents: 30,
            eventsWithOutcome: 30,  // 100% coverage
            acceptedCount: 19,
            acceptedCost: 1,
        });
        expect(r.status).toBe('insufficient_outcome_data');
        expect(r.cost_per_accepted_output_usd).toBeNull();
        expect(r.accepted_count).toBe(19);
    });

    it('exactly at floor (20 accepted, 5% coverage) is ok', () => {
        const r = evaluateCostPerAcceptedOutput({
            totalEvents: 400,
            eventsWithOutcome: 20,  // 5% exactly
            acceptedCount: 20,
            acceptedCost: 4,
        });
        expect(r.status).toBe('ok');
        expect(r.cost_per_accepted_output_usd).toBe(0.2);
    });

    it('handles zero-event window without divide-by-zero', () => {
        const r = evaluateCostPerAcceptedOutput({
            totalEvents: 0,
            eventsWithOutcome: 0,
            acceptedCount: 0,
            acceptedCost: 0,
        });
        expect(r.status).toBe('insufficient_outcome_data');
        expect(r.cost_per_accepted_output_usd).toBeNull();
        expect(r.outcome_coverage_pct).toBe(0);
    });
});

// ---------------------------------------------------------------------------
// Evidence coverage zero case + attribution-completeness math
// ---------------------------------------------------------------------------

describe('fetchCoverage', () => {
    it('returns zero pct when window has no events', async () => {
        const { pool } = makePool([{
            total: 0,
            with_evidence: 0,
            has_department: 0,
            has_employee: 0,
            has_workflow: 0,
            has_customer: 0,
            has_feature: 0,
        }]);
        const r = await fetchCoverage(pool, TENANT, FILTERS);
        expect(r.evidence.with_evidence_bundle_pct).toBe(0);
        expect(r.evidence.with_evidence_bundle).toBe(0);
        expect(r.evidence.missing_evidence_bundle).toBe(0);
        expect(r.attribution.total_events).toBe(0);
        for (const f of r.attribution.fields) {
            expect(f.present).toBe(0);
            expect(f.missing).toBe(0);
            expect(f.present_pct).toBe(0);
        }
    });

    it('computes both pct and missing counts per attribution field', async () => {
        const { pool } = makePool([{
            total: 100,
            with_evidence: 75,
            has_department: 82,
            has_employee: 61,
            has_workflow: 74,
            has_customer: 43,
            has_feature: 38,
        }]);
        const r = await fetchCoverage(pool, TENANT, FILTERS);
        expect(r.evidence).toEqual({
            with_evidence_bundle: 75,
            missing_evidence_bundle: 25,
            with_evidence_bundle_pct: 75,
        });
        const byField = Object.fromEntries(r.attribution.fields.map((f) => [f.field, f]));
        expect(byField.department_id).toEqual({ field: 'department_id', present: 82, missing: 18, present_pct: 82 });
        expect(byField.feature_id).toEqual({ field: 'feature_id', present: 38, missing: 62, present_pct: 38 });
    });
});

// ---------------------------------------------------------------------------
// Privacy mode distribution
// ---------------------------------------------------------------------------

describe('fetchPrivacyModeDistribution', () => {
    it('computes pct per mode and orders by count desc', async () => {
        const { pool } = makePool([
            { privacy_mode: 'metadata_only',   count: 75 },
            { privacy_mode: 'fingerprint_only', count: 20 },
            { privacy_mode: 'full_trace',      count: 5 },
        ]);
        const rows = await fetchPrivacyModeDistribution(pool, TENANT, FILTERS);
        expect(rows.map((r) => r.privacy_mode)).toEqual([
            'metadata_only', 'fingerprint_only', 'full_trace',
        ]);
        expect(rows.map((r) => r.pct)).toEqual([75, 20, 5]);
    });

    it('returns empty array on empty window', async () => {
        const { pool } = makePool([]);
        const rows = await fetchPrivacyModeDistribution(pool, TENANT, FILTERS);
        expect(rows).toEqual([]);
    });
});

// ---------------------------------------------------------------------------
// Success-rate precedence
// ---------------------------------------------------------------------------

describe('pickSuccessRate (precedence)', () => {
    it('prefers success_column when it has data', () => {
        const r = pickSuccessRate({
            spend_usd: 0, request_count: 0, total_tokens: 0, avg_latency_ms: 0,
            success_col_total: 100, success_col_true: 95,
            status_code_total: 50, status_code_success: 10,
            output_status_total: 50, output_status_success: 1,
        });
        expect(r.source).toBe('success_column');
        expect(r.pct).toBe(95);
        expect(r.available).toBe(true);
    });

    it('falls back to status_code when success column is empty', () => {
        const r = pickSuccessRate({
            spend_usd: 0, request_count: 0, total_tokens: 0, avg_latency_ms: 0,
            success_col_total: 0, success_col_true: 0,
            status_code_total: 200, status_code_success: 180,
            output_status_total: 50, output_status_success: 5,
        });
        expect(r.source).toBe('status_code');
        expect(r.pct).toBe(90);
    });

    it('falls back to output_status when neither success nor status_code is populated', () => {
        const r = pickSuccessRate({
            spend_usd: 0, request_count: 0, total_tokens: 0, avg_latency_ms: 0,
            success_col_total: 0, success_col_true: 0,
            status_code_total: 0, status_code_success: 0,
            output_status_total: 50, output_status_success: 30,
        });
        expect(r.source).toBe('output_status');
        expect(r.pct).toBe(60);
    });

    it('returns null + not available when no signal exists', () => {
        const r = pickSuccessRate({
            spend_usd: 0, request_count: 0, total_tokens: 0, avg_latency_ms: 0,
            success_col_total: 0, success_col_true: 0,
            status_code_total: 0, status_code_success: 0,
            output_status_total: 0, output_status_success: 0,
        });
        expect(r.source).toBeNull();
        expect(r.pct).toBeNull();
        expect(r.available).toBe(false);
    });
});

// ---------------------------------------------------------------------------
// Totals integration with success-rate precedence
// ---------------------------------------------------------------------------

describe('fetchTotals', () => {
    it('marks success_rate_available=false when no signal exists', async () => {
        const { pool } = makePool([{
            spend_usd: 0, request_count: 0, total_tokens: 0, avg_latency_ms: null,
            success_col_total: 0, success_col_true: 0,
            status_code_total: 0, status_code_success: 0,
            output_status_total: 0, output_status_success: 0,
        }]);
        const t = await fetchTotals(pool, TENANT, FILTERS);
        expect(t.success_rate_available).toBe(false);
        expect(t.success_rate_pct).toBeNull();
        expect(t.success_rate_source).toBeNull();
        expect(t.avg_latency_ms).toBeNull();
    });

    it('rounds success_rate to 2 decimals', async () => {
        const { pool } = makePool([{
            spend_usd: 1.5, request_count: 7, total_tokens: 1000, avg_latency_ms: 120.5,
            success_col_total: 7, success_col_true: 5,
            status_code_total: 0, status_code_success: 0,
            output_status_total: 0, output_status_success: 0,
        }]);
        const t = await fetchTotals(pool, TENANT, FILTERS);
        expect(t.success_rate_source).toBe('success_column');
        expect(t.success_rate_pct).toBeCloseTo(71.43, 2);
    });
});

// ---------------------------------------------------------------------------
// Outcome panels integration
// ---------------------------------------------------------------------------

describe('fetchOutcomePanels', () => {
    it('aliases attribution filters to the e. table so LEFT JOIN does not clash', async () => {
        const { pool, calls } = makePool([{
            total_events: 0, events_with_outcome: 0, accepted_count: 0, accepted_cost: 0,
        }]);
        await fetchOutcomePanels(pool, TENANT, FILTERS_WITH_ATTR);
        const sql = calls[0]!.sql;
        expect(sql).toMatch(/FROM ai_economic_events e/);
        expect(sql).toMatch(/LEFT JOIN request_outcomes o/);
        expect(sql).toMatch(/AND e\.department_id = \$4/);
        expect(sql).toMatch(/AND e\.employee_id = \$5/);
        expect(sql).toMatch(/AND e\.provider = \$6/);
        // Critical: the WHERE clause filters on e.tenant_id, not o.tenant_id.
        expect(sql).toMatch(/WHERE e\.tenant_id = \$1/);
    });

    it('returns insufficient_outcome_data when accepted_count is below the floor', async () => {
        const { pool } = makePool([{
            total_events: 50, events_with_outcome: 50, accepted_count: 19, accepted_cost: 0.95,
        }]);
        const r = await fetchOutcomePanels(pool, TENANT, FILTERS);
        expect(r.costPerAccepted.status).toBe('insufficient_outcome_data');
        expect(r.costPerAccepted.cost_per_accepted_output_usd).toBeNull();
        expect(r.outcomeCompleteness.outcome_coverage_pct).toBe(100);
    });

    it('returns ok when both thresholds are met', async () => {
        const { pool } = makePool([{
            total_events: 500, events_with_outcome: 100, accepted_count: 80, accepted_cost: 4,
        }]);
        const r = await fetchOutcomePanels(pool, TENANT, FILTERS);
        expect(r.costPerAccepted.status).toBe('ok');
        expect(r.costPerAccepted.cost_per_accepted_output_usd).toBe(0.05);
        expect(r.outcomeCompleteness.outcome_coverage_pct).toBe(20);
    });
});
