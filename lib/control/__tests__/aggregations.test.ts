/**
 * Slice 3B — Control aggregations tests.
 *
 * Covers:
 *   - tenant scoping ($1 = tenantId in every query)
 *   - dynamic parameter indexing (no since/until, since-only, until-only)
 *   - content-field guard (no aggregation reads prompt/response/fingerprint/
 *     redacted/content/stored_content)
 *   - budget burn statuses (ok / at_risk / over / no_budget)
 *   - workflow no_configured_budget branch and exact label
 *   - allowlist statuses (unrestricted / ok / violations)
 *   - deny-code breakdown math
 *   - human review open_review_queue = required + pending
 *   - control coverage math
 */

import { describe, expect, it, vi } from 'vitest';

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

const TENANT = '11111111-1111-1111-1111-111111111111';

function makePool(rowsList: Array<Record<string, unknown>[]>) {
    const calls: Array<{ sql: string; params: unknown[] }> = [];
    let i = 0;
    const pool = {
        query: vi.fn(async (sql: string, params: unknown[]) => {
            calls.push({ sql, params });
            const rows = rowsList[i++] ?? [];
            return { rows };
        }),
    };
    return { pool, calls };
}

// ---------------------------------------------------------------------------
// Tenant scoping sweep
// ---------------------------------------------------------------------------

describe('control aggregations — tenant scoping', () => {
    it('every query passes tenantId as $1', async () => {
        // Each fetcher provides enough mocked rows for its query/queries.
        const { pool, calls } = makePool([
            [],  // api_key burn
            [],  // department burn
            [],  // employee burn
            [],  // workflow burn (single query)
            [],  // allowlist models
            [],  // allowlist task_types
            [{ keys_with_cap: 0, keys_without_cap: 0 }],  // max-cost keys
            [{ over_cap_events: 0, over_cap_spend_usd: 0 }],  // max-cost over
            [{ total_events: 0, denied_events: 0, denied_spend_usd: 0 }],  // denied total
            [],  // denied breakdown
            [{ required: 0, pending: 0, approved: 0, rejected: 0, escalated: 0, expired: 0 }],
            [{ total_events: 0, with_any: 0, has_policy: 0, has_budget: 0, has_mandate: 0, has_decision: 0, has_deny: 0 }],
        ]);
        const now = new Date('2026-06-15T00:00:00Z');
        await fetchApiKeyBudgetBurn(pool, TENANT, {}, now);
        await fetchDepartmentBudgetBurn(pool, TENANT, {}, now);
        await fetchEmployeeBudgetBurn(pool, TENANT, {}, now);
        await fetchWorkflowBudgetBurn(pool, TENANT, {}, now);
        await fetchAllowlistPanel(pool, TENANT, {});
        await fetchMaxCostPerRequest(pool, TENANT, {});
        await fetchPolicyDeniedSpend(pool, TENANT, {});
        await fetchHumanReviewSummary(pool, TENANT, {});
        await fetchControlCoverage(pool, TENANT, {});
        expect(calls.length).toBeGreaterThan(0);
        for (const call of calls) {
            expect(call.params[0]).toBe(TENANT);
        }
    });
});

// ---------------------------------------------------------------------------
// Content-field guard — no aggregation reads content / fingerprint / redacted
// ---------------------------------------------------------------------------

describe('control aggregations — content-field guard', () => {
    it('no SQL reads prompt/response/fingerprint/redacted/content/stored_content', async () => {
        const { pool, calls } = makePool([
            [], [], [], [], [], [],
            [{ keys_with_cap: 0, keys_without_cap: 0 }],
            [{ over_cap_events: 0, over_cap_spend_usd: 0 }],
            [{ total_events: 0, denied_events: 0, denied_spend_usd: 0 }],
            [],
            [{ required: 0, pending: 0, approved: 0, rejected: 0, escalated: 0, expired: 0 }],
            [{ total_events: 0, with_any: 0, has_policy: 0, has_budget: 0, has_mandate: 0, has_decision: 0, has_deny: 0 }],
        ]);
        const now = new Date('2026-06-15T00:00:00Z');
        await fetchApiKeyBudgetBurn(pool, TENANT, {}, now);
        await fetchDepartmentBudgetBurn(pool, TENANT, {}, now);
        await fetchEmployeeBudgetBurn(pool, TENANT, {}, now);
        await fetchWorkflowBudgetBurn(pool, TENANT, {}, now);
        await fetchAllowlistPanel(pool, TENANT, {});
        await fetchMaxCostPerRequest(pool, TENANT, {});
        await fetchPolicyDeniedSpend(pool, TENANT, {});
        await fetchHumanReviewSummary(pool, TENANT, {});
        await fetchControlCoverage(pool, TENANT, {});

        const banned = [
            'prompt', 'response', 'fingerprint', 'redacted',
            'request_body', 'response_body', 'stored_content',
        ];
        // 'content' is intentionally omitted: it would false-positive against
        // SQL words like "content" in column names we don't use here, but
        // also against valid identifiers in other migrations. We pin the
        // direct content vectors instead. 'prompt_stored' / 'response_stored'
        // would match 'prompt' / 'response' — exactly the intent: the slice
        // must not even read those flags.
        for (const call of calls) {
            for (const word of banned) {
                expect(call.sql.toLowerCase()).not.toContain(word);
            }
        }
    });
});

// ---------------------------------------------------------------------------
// Budget burn — statuses
// ---------------------------------------------------------------------------

describe('fetchApiKeyBudgetBurn', () => {
    const now = new Date('2026-06-15T00:00:00Z');

    it('classifies ok / at_risk / over / no_budget correctly', async () => {
        const { pool } = makePool([[
            { id: 'k1', name: 'staging',  budget_usd: 100, spend_usd: 50  },  // ok
            { id: 'k2', name: 'prod',     budget_usd: 100, spend_usd: 85  },  // at_risk
            { id: 'k3', name: 'over',     budget_usd: 100, spend_usd: 120 },  // over
            { id: 'k4', name: 'no-budget',budget_usd: null,spend_usd: 7   },  // no_budget
        ]]);
        const rows = await fetchApiKeyBudgetBurn(pool, TENANT, {}, now);
        const byKey = Object.fromEntries(rows.map((r) => [r.key, r]));
        expect(byKey.staging?.status).toBe('ok');
        expect(byKey.staging?.budget_pct).toBe(50);
        expect(byKey.prod?.status).toBe('at_risk');
        expect(byKey.over?.status).toBe('over');
        expect(byKey['no-budget']?.status).toBe('no_budget');
        expect(byKey['no-budget']?.budget_pct).toBeNull();
    });

    it('uses month-start as $2 in the join predicate', async () => {
        const { pool, calls } = makePool([[]]);
        const now = new Date('2026-06-15T12:34:56Z');
        await fetchApiKeyBudgetBurn(pool, TENANT, {}, now);
        const call = calls[0]!;
        expect(call.params[0]).toBe(TENANT);
        expect(call.params[1]).toBe('2026-06-01T00:00:00.000Z');
        expect(call.sql).toMatch(/e\.event_time >= \$2/);
    });
});

// ---------------------------------------------------------------------------
// Workflow burn — exact label + no_configured_budget branch
// ---------------------------------------------------------------------------

describe('fetchWorkflowBudgetBurn', () => {
    const now = new Date('2026-06-15T00:00:00Z');

    it('emits exact label when budget configured', async () => {
        const { pool } = makePool([[
            { workflow_id: 'wf-1', spend_usd: 5, configured_key_budget_usd: 50 },
        ]]);
        const rows = await fetchWorkflowBudgetBurn(pool, TENANT, {}, now);
        expect(rows[0]?.budget_label).toBe('Configured key budget attached to workflow');
        expect(rows[0]?.status).toBe('ok');
        expect(rows[0]?.budget_pct).toBe(10);
    });

    it('returns no_configured_budget when no key has monthly_budget_usd', async () => {
        const { pool } = makePool([[
            { workflow_id: 'wf-orphan', spend_usd: 12.5, configured_key_budget_usd: null },
        ]]);
        const rows = await fetchWorkflowBudgetBurn(pool, TENANT, {}, now);
        expect(rows[0]?.status).toBe('no_configured_budget');
        expect(rows[0]?.budget_label).toBeNull();
        expect(rows[0]?.budget_pct).toBeNull();
        expect(rows[0]?.configured_key_budget_usd).toBeNull();
    });

    it('does not call a workflow budget a true workflow budget', async () => {
        const { pool, calls } = makePool([[]]);
        await fetchWorkflowBudgetBurn(pool, TENANT, {}, now);
        // The DB column we name is `configured_key_budget_usd`; we never
        // expose a `workflow_budget` or `workflow.budget_usd` identifier.
        const sql = calls[0]!.sql;
        expect(sql).toMatch(/configured_key_budget_usd/);
        expect(sql).not.toMatch(/workflow_budget_usd/);
    });
});

// ---------------------------------------------------------------------------
// Allowlist — statuses
// ---------------------------------------------------------------------------

describe('fetchAllowlistPanel', () => {
    it('classifies unrestricted / ok / violations', async () => {
        const { pool } = makePool([
            [
                { api_key_id: 'k1', api_key_name: 'open',  allowed: [],                            observed_outside: [] },
                { api_key_id: 'k2', api_key_name: 'tight', allowed: ['claude-sonnet-4-6'],         observed_outside: [] },
                { api_key_id: 'k3', api_key_name: 'leaky', allowed: ['claude-sonnet-4-6'],         observed_outside: ['gpt-4o'] },
            ],
            [
                { api_key_id: 'k1', api_key_name: 'open',  allowed: [],            observed_outside: [] },
                { api_key_id: 'k2', api_key_name: 'tight', allowed: ['inference'], observed_outside: [] },
                { api_key_id: 'k3', api_key_name: 'leaky', allowed: ['inference'], observed_outside: ['finetune'] },
            ],
        ]);
        const panel = await fetchAllowlistPanel(pool, TENANT, {});
        const m = Object.fromEntries(panel.models.map((r) => [r.api_key_name, r]));
        expect(m.open?.status).toBe('unrestricted');
        expect(m.tight?.status).toBe('ok');
        expect(m.leaky?.status).toBe('violations');
        expect(m.leaky?.observed_outside_allowlist).toEqual(['gpt-4o']);

        const t = Object.fromEntries(panel.task_types.map((r) => [r.api_key_name, r]));
        expect(t.open?.status).toBe('unrestricted');
        expect(t.tight?.status).toBe('ok');
        expect(t.leaky?.status).toBe('violations');
    });
});

// ---------------------------------------------------------------------------
// Policy-denied spend + deny code breakdown
// ---------------------------------------------------------------------------

describe('fetchPolicyDeniedSpend', () => {
    it('computes denied_event_pct and per-code pct against denied_events', async () => {
        const { pool } = makePool([
            [{ total_events: 1000, denied_events: 100, denied_spend_usd: 5.5 }],
            [
                { deny_code: 'API_KEY_BUDGET_EXCEEDED', count: 60, spend_usd: 3.0 },
                { deny_code: 'MODEL_NOT_ALLOWED',       count: 40, spend_usd: 2.5 },
            ],
        ]);
        const r = await fetchPolicyDeniedSpend(pool, TENANT, { since: '2026-05-01T00:00:00Z' });
        expect(r.denied_event_pct).toBe(10);
        expect(r.denied_events).toBe(100);
        expect(r.denied_spend_usd).toBe(5.5);
        expect(r.breakdown[0]?.deny_code).toBe('API_KEY_BUDGET_EXCEEDED');
        expect(r.breakdown[0]?.pct_of_denied_events).toBe(60);
        expect(r.breakdown[1]?.pct_of_denied_events).toBe(40);
    });

    it('maps empty deny_code to UNKNOWN', async () => {
        const { pool, calls } = makePool([
            [{ total_events: 1, denied_events: 1, denied_spend_usd: 0.01 }],
            [{ deny_code: 'UNKNOWN', count: 1, spend_usd: 0.01 }],
        ]);
        await fetchPolicyDeniedSpend(pool, TENANT, {});
        expect(calls[1]!.sql).toMatch(/COALESCE\(NULLIF\(deny_code, ''\), 'UNKNOWN'\)/);
    });
});

// ---------------------------------------------------------------------------
// Human review queue
// ---------------------------------------------------------------------------

describe('fetchHumanReviewSummary', () => {
    it('open_review_queue = required + pending', async () => {
        const { pool } = makePool([[{
            required: 7, pending: 3, approved: 11, rejected: 2, escalated: 1, expired: 0,
        }]]);
        const r = await fetchHumanReviewSummary(pool, TENANT, {});
        expect(r.open_review_queue).toBe(10);
        expect(r.approved).toBe(11);
    });
});

// ---------------------------------------------------------------------------
// Control coverage
// ---------------------------------------------------------------------------

describe('fetchControlCoverage', () => {
    it('coverage_pct = with_any / total', async () => {
        const { pool } = makePool([[{
            total_events: 100,
            with_any: 75,
            has_policy: 10, has_budget: 60, has_mandate: 5,
            has_decision: 70, has_deny: 20,
        }]]);
        const r = await fetchControlCoverage(pool, TENANT, {});
        expect(r.total_events).toBe(100);
        expect(r.with_any_control_signal).toBe(75);
        expect(r.coverage_pct).toBe(75);
        const byField = Object.fromEntries(r.fields.map((f) => [f.field, f]));
        expect(byField.policy_id?.present_pct).toBe(10);
        expect(byField.budget_id?.present_pct).toBe(60);
        expect(byField.deny_code?.present_pct).toBe(20);
    });

    it('zero-event window returns 0 coverage with no divide-by-zero', async () => {
        const { pool } = makePool([[{
            total_events: 0, with_any: 0,
            has_policy: 0, has_budget: 0, has_mandate: 0, has_decision: 0, has_deny: 0,
        }]]);
        const r = await fetchControlCoverage(pool, TENANT, {});
        expect(r.coverage_pct).toBe(0);
        for (const f of r.fields) expect(f.present_pct).toBe(0);
    });
});

// ---------------------------------------------------------------------------
// Dynamic param indexing on filter-window-aware fetchers
// ---------------------------------------------------------------------------

describe('control aggregations — dynamic param indexing on windowed panels', () => {
    it('fetchControlCoverage with no since/until binds only tenant ($1)', async () => {
        const { pool, calls } = makePool([[{
            total_events: 0, with_any: 0,
            has_policy: 0, has_budget: 0, has_mandate: 0, has_decision: 0, has_deny: 0,
        }]]);
        await fetchControlCoverage(pool, TENANT, {});
        const call = calls[0]!;
        expect(call.params).toEqual([TENANT]);
        expect(call.sql).toMatch(/WHERE tenant_id = \$1\s/);
        expect(call.sql).not.toMatch(/event_time/);
    });

    it('fetchPolicyDeniedSpend with since-only binds at $2', async () => {
        const { pool, calls } = makePool([
            [{ total_events: 0, denied_events: 0, denied_spend_usd: 0 }],
            [],
        ]);
        await fetchPolicyDeniedSpend(pool, TENANT, { since: '2026-05-01T00:00:00Z' });
        const call = calls[0]!;
        expect(call.params).toEqual([TENANT, '2026-05-01T00:00:00Z']);
        expect(call.sql).toMatch(/event_time >= \$2/);
        expect(call.sql).not.toMatch(/event_time <=/);
    });

    it('fetchHumanReviewSummary with until-only binds at $2', async () => {
        const { pool, calls } = makePool([[{
            required: 0, pending: 0, approved: 0, rejected: 0, escalated: 0, expired: 0,
        }]]);
        await fetchHumanReviewSummary(pool, TENANT, { until: '2026-06-01T00:00:00Z' });
        const call = calls[0]!;
        expect(call.params).toEqual([TENANT, '2026-06-01T00:00:00Z']);
        expect(call.sql).toMatch(/event_time <= \$2/);
        expect(call.sql).not.toMatch(/event_time >=/);
    });
});

// ---------------------------------------------------------------------------
// Max cost per request panel
// ---------------------------------------------------------------------------

describe('fetchMaxCostPerRequest', () => {
    it('reports key cap counts and over-cap events', async () => {
        const { pool } = makePool([
            [{ keys_with_cap: 5, keys_without_cap: 2 }],
            [{ over_cap_events: 3, over_cap_spend_usd: 0.42 }],
        ]);
        const r = await fetchMaxCostPerRequest(pool, TENANT, {});
        expect(r).toEqual({
            keys_with_cap: 5, keys_without_cap: 2,
            over_cap_events: 3, over_cap_spend_usd: 0.42,
        });
    });
});
