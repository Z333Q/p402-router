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
    /** Whether a denied row has been seen in ai_economic_events within
     *  the 7-day window. Slice 3E payment-grade signal. */
    recentDeniedRowPresent?: boolean;
}

function pool(opts: MockOpts) {
    const cols = opts.columns ?? [];
    const uniquePresent = opts.uniqueRequestPresent ?? true;
    const recentDenied  = opts.recentDeniedRowPresent ?? false;
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
            // Slice 3E denied-row probe — separate from the coverage COUNT
            // queries against ai_economic_events because the loader uses
            // `SELECT 1 ... LIMIT 1`.
            if (/FROM ai_economic_events/i.test(sql) && /governance_decision\s*=\s*'denied'/i.test(sql)) {
                return { rows: recentDenied ? [{ '?column?': 1 }] : [] };
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
    'AEE_DENIED_EVENT_KIND_TEST_PROVEN',
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
    process.env.AEE_DENIED_WRITE_PATH_TEST_PROVEN   = 'true';
    // Slice 3E: production write-kind support is proven by either a recent
    // denied row OR this CI marker. Upstream tests that aren't isolating
    // the kind-support criterion use the CI marker so earlier blockers
    // don't mask the criterion under test.
    process.env.AEE_DENIED_EVENT_KIND_TEST_PROVEN   = 'true';
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

describe('denied-event idempotency (payment-grade, truth-based)', () => {
    // Slice 3E signal semantics (payment-grade):
    //   writer_deterministic_deny_code <- DENY_CODE_MAPPING_DETERMINISTIC
    //   denied_event_kind_supported    <- recent denied row OR CI proof env
    //   deny_code_bound_to_idempotency <- schema UNIQUE AND mapping marker
    //
    // A compiled code path is NOT a production write. The kind-supported
    // signal must be backed by either an observed row or an explicit
    // CI-signed-off marker.

    it('writer_deterministic_deny_code is true at import time (DENY_CODE_MAPPING_DETERMINISTIC marker)', async () => {
        const input = await loadAssessmentInput(pool({
            uniqueRequestPresent: true,
            columns: ['tenant_id', 'request_id'],
        }), TENANT, { now: NOW });
        expect(input.denied_event_idempotency.writer_deterministic_deny_code).toBe(true);
    });

    it('denied_event_kind_supported is FALSE when no recent denied row AND no CI proof marker', async () => {
        const input = await loadAssessmentInput(pool({
            uniqueRequestPresent: true,
            recentDeniedRowPresent: false,
            columns: ['tenant_id', 'request_id'],
        }), TENANT, { now: NOW });
        expect(input.denied_event_idempotency.denied_event_kind_supported).toBe(false);
        // Without kind-supported, the bundle cannot be ready even with the
        // mapping marker + schema bond.
        expect(input.denied_event_idempotency.ready).toBe(false);
    });

    it('denied_event_kind_supported is TRUE when a recent denied row exists', async () => {
        const input = await loadAssessmentInput(pool({
            uniqueRequestPresent: true,
            recentDeniedRowPresent: true,
            columns: ['tenant_id', 'request_id'],
        }), TENANT, { now: NOW });
        expect(input.denied_event_idempotency.denied_event_kind_supported).toBe(true);
        expect(input.denied_event_idempotency.deny_code_bound_to_idempotency).toBe(true);
        expect(input.denied_event_idempotency.ready).toBe(true);
    });

    it('denied_event_kind_supported is TRUE when CI marker is set, even without a recent denied row', async () => {
        process.env.AEE_DENIED_EVENT_KIND_TEST_PROVEN = 'true';
        const input = await loadAssessmentInput(pool({
            uniqueRequestPresent: true,
            recentDeniedRowPresent: false,
            columns: ['tenant_id', 'request_id'],
        }), TENANT, { now: NOW });
        expect(input.denied_event_idempotency.denied_event_kind_supported).toBe(true);
        expect(input.denied_event_idempotency.ready).toBe(true);
    });

    it('deny_code_bound_to_idempotency requires schema UNIQUE AND the mapping marker', async () => {
        // Schema bond missing -> binding fails even with kind proof present.
        const input = await loadAssessmentInput(pool({
            uniqueRequestPresent: false,
            recentDeniedRowPresent: true,
            columns: ['tenant_id', 'request_id'],
        }), TENANT, { now: NOW });
        expect(input.denied_event_idempotency.schema_unique_request_present).toBe(false);
        expect(input.denied_event_idempotency.deny_code_bound_to_idempotency).toBe(false);
        expect(input.denied_event_idempotency.ready).toBe(false);
    });
});
