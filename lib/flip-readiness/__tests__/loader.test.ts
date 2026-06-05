/**
 * Slice 3D — Loader tests for the payment-protocol-grade binding rules.
 *
 * These are NOT happy-path tests. They exist to prove the gate refuses
 * weaker semantics that earlier iterations accepted.
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { assess } from '@/lib/flip-readiness/assess';
import { loadAssessmentInput } from '@/lib/flip-readiness/loader';
import { DEFAULT_THRESHOLDS } from '@/lib/flip-readiness/thresholds';

const TENANT = '22222222-2222-2222-2222-222222222222';

interface MockOpts {
    /** information_schema.columns rows for ai_economic_events. */
    columns?: string[];
    /** Whether the (tenant_id, request_id) UNIQUE constraint exists. */
    uniqueRequestPresent?: boolean;
}

function pool(opts: MockOpts) {
    const cols = opts.columns ?? [];
    const uniquePresent = opts.uniqueRequestPresent ?? true;
    return {
        async query(sql: string) {
            if (/information_schema\.columns/i.test(sql)) {
                return { rows: cols.map((c) => ({ column_name: c })) };
            }
            if (/information_schema\.table_constraints/i.test(sql)) {
                return { rows: uniquePresent ? [{}] : [] };
            }
            if (/economic_event_write_failures/i.test(sql)) {
                if (/recent_failures/i.test(sql)) return { rows: [{ recent_failures: 0 }] };
                return { rows: [{ pending: 0, abandoned: 0, oldest_pending: null }] };
            }
            // Coverage + delta queries: empty.
            return { rows: [{ count: 0 }] };
        },
    };
}

const NOW = new Date('2026-06-15T12:00:00Z');

const ALL_ENV_FLAGS = [
    'AEE_DENIED_WRITE_PATH',
    'AEE_DENIED_WRITE_PATH_CODE_PRESENT',
    'AEE_DENIED_WRITE_PATH_TEST_PROVEN',
    'AEE_DENIED_EVENT_KIND_SUPPORTED',
    'AEE_DENY_CODE_BOUND_TO_IDEMPOTENCY',
    'AEE_WRITER_DETERMINISTIC_DENY_CODE',
] as const;

// Sanitize the multi-signal env flags so each test is deterministic.
beforeEach(() => {
    for (const k of ALL_ENV_FLAGS) delete process.env[k];
});
afterEach(() => vi.restoreAllMocks());

/**
 * Set the env flags that prove Slice 3E denied-write + idempotency are
 * live. Tests that want to isolate a downstream criterion (decision_source
 * binding, budget_scope_binding, ...) use this so the earlier blockers
 * stop being the reason for `blocked`.
 */
function unlockDeniedWritePathEnv() {
    process.env.AEE_DENIED_WRITE_PATH               = 'enabled';
    process.env.AEE_DENIED_WRITE_PATH_CODE_PRESENT  = 'true';
    process.env.AEE_DENIED_WRITE_PATH_TEST_PROVEN   = 'true';
    process.env.AEE_DENIED_EVENT_KIND_SUPPORTED     = 'true';
    process.env.AEE_DENY_CODE_BOUND_TO_IDEMPOTENCY  = 'true';
    process.env.AEE_WRITER_DETERMINISTIC_DENY_CODE  = 'true';
}

describe('decision_source binding (payment-grade)', () => {
    it('FAILS when only governance_decision exists (a result is not a source)', async () => {
        unlockDeniedWritePathEnv();
        const input = await loadAssessmentInput(pool({
            columns: [
                'tenant_id', 'api_key_id', 'request_id', 'route',
                'governance_decision', // RESULT — must NOT satisfy decision_source
                'budget_id', 'deny_code', 'event_time',
            ],
        }), TENANT, { now: NOW });
        expect(input.context_binding.fields.decision_source).toBe(false);
        const r = assess(input, DEFAULT_THRESHOLDS);
        expect(r.status).toBe('blocked');
        expect(r.reason).toBe('context_binding_incomplete');
    });

    it('PASSES when governance_decision_source exists', async () => {
        const input = await loadAssessmentInput(pool({
            columns: [
                'tenant_id', 'api_key_id', 'request_id', 'route',
                'governance_decision_source',
                'employee_id',
                'deny_code', 'event_time',
            ],
        }), TENANT, { now: NOW });
        expect(input.context_binding.fields.decision_source).toBe(true);
    });

    it('PASSES when policy_id or mandate_id exists (real authority binding)', async () => {
        const input = await loadAssessmentInput(pool({
            columns: [
                'tenant_id', 'api_key_id', 'request_id', 'route',
                'policy_id', 'department_id', 'deny_code', 'event_time',
            ],
        }), TENANT, { now: NOW });
        expect(input.context_binding.fields.decision_source).toBe(true);
    });
});

describe('budget_scope_binding (payment-grade)', () => {
    it('FAILS when only budget_id exists (a budget is not a scope)', async () => {
        unlockDeniedWritePathEnv();
        const input = await loadAssessmentInput(pool({
            columns: [
                'tenant_id', 'request_id', 'route', 'governance_decision_source',
                'budget_id',         // <-- alone, not enough
                'deny_code', 'event_time',
                // No api_key_id / employee_id / etc.
            ],
        }), TENANT, { now: NOW });
        expect(input.context_binding.fields.budget_scope_binding).toBe(false);
        const r = assess(input, DEFAULT_THRESHOLDS);
        expect(r.status).toBe('blocked');
        expect(r.reason).toBe('context_binding_incomplete');
    });

    it('PASSES when a direct scope column exists (employee_id)', async () => {
        const input = await loadAssessmentInput(pool({
            columns: [
                'tenant_id', 'api_key_id', 'request_id', 'route',
                'governance_decision_source',
                'employee_id', 'deny_code', 'event_time',
            ],
        }), TENANT, { now: NOW });
        expect(input.context_binding.fields.budget_scope_binding).toBe(true);
    });

    it('PASSES when budget_id is paired with explicit budget_scope semantics', async () => {
        const input = await loadAssessmentInput(pool({
            columns: [
                'tenant_id', 'api_key_id', 'request_id', 'route',
                'governance_decision_source',
                'budget_id', 'budget_scope',  // paired — explicit semantics
                'deny_code', 'event_time',
            ],
        }), TENANT, { now: NOW });
        expect(input.context_binding.fields.budget_scope_binding).toBe(true);
    });
});

describe('denied-event idempotency (payment-grade)', () => {
    it('is NOT ready when only the UNIQUE (tenant_id, request_id) constraint exists', async () => {
        // Slice 3D ships with denied-event writes deferred to 3E. The
        // schema constraint alone must not satisfy the criterion.
        const input = await loadAssessmentInput(pool({
            uniqueRequestPresent: true,
            columns: ['tenant_id', 'request_id'],
        }), TENANT, { now: NOW });
        expect(input.denied_event_idempotency.schema_unique_request_present).toBe(true);
        expect(input.denied_event_idempotency.denied_event_kind_supported).toBe(false);
        expect(input.denied_event_idempotency.deny_code_bound_to_idempotency).toBe(false);
        expect(input.denied_event_idempotency.ready).toBe(false);
    });

    it('becomes ready only when all four signals are true (simulating Slice 3E)', async () => {
        process.env.AEE_DENIED_EVENT_KIND_SUPPORTED = 'true';
        process.env.AEE_DENY_CODE_BOUND_TO_IDEMPOTENCY = 'true';
        process.env.AEE_WRITER_DETERMINISTIC_DENY_CODE = 'true';
        const input = await loadAssessmentInput(pool({
            uniqueRequestPresent: true,
            columns: ['tenant_id', 'request_id'],
        }), TENANT, { now: NOW });
        expect(input.denied_event_idempotency.ready).toBe(true);
    });

    it('stays NOT ready when the schema constraint is missing, even with all env signals', async () => {
        process.env.AEE_DENIED_EVENT_KIND_SUPPORTED = 'true';
        process.env.AEE_DENY_CODE_BOUND_TO_IDEMPOTENCY = 'true';
        process.env.AEE_WRITER_DETERMINISTIC_DENY_CODE = 'true';
        const input = await loadAssessmentInput(pool({
            uniqueRequestPresent: false,
            columns: ['tenant_id', 'request_id'],
        }), TENANT, { now: NOW });
        expect(input.denied_event_idempotency.schema_unique_request_present).toBe(false);
        expect(input.denied_event_idempotency.ready).toBe(false);
    });
});
