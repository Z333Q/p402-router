import { describe, it, expect } from 'vitest';

import { assess } from '@/lib/flip-readiness/assess';
import { DEFAULT_THRESHOLDS } from '@/lib/flip-readiness/thresholds';
import type {
    AssessmentInput,
    ScopeDelta,
    ScopeDimension,
    WindowSpec,
} from '@/lib/flip-readiness/types';

const MTD_WINDOW: WindowSpec = {
    kind: 'month_to_date',
    since: '2026-06-01T00:00:00.000Z',
    until: '2026-06-15T12:00:00.000Z',
    complete: false,
};
const PREV_WINDOW_COMPLETE: WindowSpec = {
    kind: 'previous_calendar_month',
    since: '2026-05-01T00:00:00.000Z',
    until: '2026-06-01T00:00:00.000Z',
    complete: true,
};
const PREV_WINDOW_INCOMPLETE: WindowSpec = { ...PREV_WINDOW_COMPLETE, complete: false };

function passingDeltas(window: WindowSpec): ScopeDelta[] {
    const dims: ScopeDimension[] = ['api_key', 'employee', 'department'];
    return dims.map((scope) => ({
        scope, window,
        worst_bucket_id: 'b_1',
        primary_usd: 10,
        legacy_usd: 10,
        absolute_usd: 0,
        relative_pct: 0,
    }));
}

function passingInput(): AssessmentInput {
    return {
        tenantId: 't_1',
        generated_at: '2026-06-15T12:00:00.000Z',
        coverage: {
            month_to_date: {
                window: MTD_WINDOW, hosted_requests: 1000, economic_events: 1000, coverage_pct: 100,
            },
            previous_calendar_month: {
                window: PREV_WINDOW_COMPLETE, hosted_requests: 5000, economic_events: 5000, coverage_pct: 100,
            },
        },
        outbox: { pending: 0, abandoned: 0, oldest_pending_age_seconds: null },
        deltas: {
            month_to_date: passingDeltas(MTD_WINDOW),
            previous_calendar_month: passingDeltas(PREV_WINDOW_COMPLETE),
        },
        denied_event_write_path: {
            config_enabled: true, code_path_present: true,
            test_proof_present: true, health_check_green: true, implemented: true,
        },
        denied_event_idempotency: {
            schema_unique_request_present: true,
            denied_event_kind_supported: true,
            deny_code_bound_to_idempotency: true,
            writer_deterministic_deny_code: true,
            ready: true,
        },
        context_binding: {
            fields: {
                tenant_id: true, api_key_id: true, request_id: true, route: true,
                decision_source: true, budget_scope_binding: true, deny_code: true,
                event_time: true, idempotency_key: true,
            },
            complete: true,
        },
        loader_error: { occurred: false, reason: null },
    };
}

describe('assess — blocked (fail-closed)', () => {
    it('returns blocked when loader_error.occurred', () => {
        const i = passingInput();
        i.loader_error = { occurred: true, reason: 'loader_exception:TypeError' };
        const r = assess(i, DEFAULT_THRESHOLDS);
        expect(r.status).toBe('blocked');
        expect(r.reason).toBe('loader_exception:TypeError');
    });

    it('returns blocked when tenantId is missing', () => {
        const i = passingInput();
        i.tenantId = '';
        const r = assess(i, DEFAULT_THRESHOLDS);
        expect(r.status).toBe('blocked');
        expect(r.reason).toBe('tenant_scoping_uncertain');
    });

    it('returns blocked when denied write path is required but not implemented', () => {
        const i = passingInput();
        i.denied_event_write_path.implemented = false;
        const r = assess(i, DEFAULT_THRESHOLDS);
        expect(r.status).toBe('blocked');
        expect(r.reason).toBe('denied_event_write_path_not_implemented');
    });

    it('blocked > not_ready when both apply (denied write missing AND coverage low)', () => {
        const i = passingInput();
        i.denied_event_write_path.implemented = false;
        i.coverage.month_to_date.coverage_pct = 50;
        const r = assess(i, DEFAULT_THRESHOLDS);
        expect(r.status).toBe('blocked');
    });

    it('returns blocked when idempotency is not ready', () => {
        const i = passingInput();
        i.denied_event_idempotency.ready = false;
        const r = assess(i, DEFAULT_THRESHOLDS);
        expect(r.status).toBe('blocked');
        expect(r.reason).toBe('denied_event_idempotency_not_ready');
    });

    it('returns blocked when any context-binding field is missing', () => {
        const i = passingInput();
        i.context_binding.fields.deny_code = false;
        i.context_binding.complete = false;
        const r = assess(i, DEFAULT_THRESHOLDS);
        expect(r.status).toBe('blocked');
        expect(r.reason).toBe('context_binding_incomplete');
    });

    it('returns blocked when outbox has abandoned rows', () => {
        const i = passingInput();
        i.outbox.abandoned = 1;
        const r = assess(i, DEFAULT_THRESHOLDS);
        expect(r.status).toBe('blocked');
        expect(r.reason).toBe('outbox_has_abandoned_rows');
    });
});

describe('assess — not_ready (current MTD failures)', () => {
    it('returns not_ready when MTD coverage is below threshold', () => {
        const i = passingInput();
        i.coverage.month_to_date.coverage_pct = 95;
        const r = assess(i, DEFAULT_THRESHOLDS);
        expect(r.status).toBe('not_ready');
        expect(r.reason).toContain('coverage_pct_mtd');
    });

    it('returns not_ready when any scope delta exceeds absolute tolerance', () => {
        const i = passingInput();
        i.deltas.month_to_date[1] = {
            ...i.deltas.month_to_date[1]!,
            absolute_usd: 5,
            relative_pct: 0.4,
        };
        const r = assess(i, DEFAULT_THRESHOLDS);
        expect(r.status).toBe('not_ready');
        expect(r.reason).toContain('delta_employee_mtd');
    });

    it('returns not_ready when any scope delta exceeds relative tolerance', () => {
        const i = passingInput();
        i.deltas.month_to_date[2] = {
            ...i.deltas.month_to_date[2]!,
            absolute_usd: 0.005,
            relative_pct: 1.2,
        };
        const r = assess(i, DEFAULT_THRESHOLDS);
        expect(r.status).toBe('not_ready');
        expect(r.reason).toContain('delta_department_mtd');
    });

    it('returns not_ready when outbox has pending rows', () => {
        const i = passingInput();
        i.outbox.pending = 1;
        i.outbox.oldest_pending_age_seconds = 30;
        const r = assess(i, DEFAULT_THRESHOLDS);
        expect(r.status).toBe('not_ready');
        expect(r.reason).toContain('outbox_pending');
    });

    it('no-averaging rule: passing aggregate cannot hide a single failing scope', () => {
        const i = passingInput();
        // api_key + employee pass, department fails. Aggregate-style logic
        // would average it away. Strict per-scope logic must reject.
        i.deltas.month_to_date[2] = {
            ...i.deltas.month_to_date[2]!,
            absolute_usd: 1.0,
            relative_pct: 0.1,
        };
        const r = assess(i, DEFAULT_THRESHOLDS);
        expect(r.status).toBe('not_ready');
        expect(r.reason).toContain('delta_department_mtd');
        // Other scopes still pass — surface them in criteria so the
        // dashboard can show the full picture.
        const apiKeyV = r.criteria.find((c) => c.criterion === 'delta_api_key_mtd');
        expect(apiKeyV?.status).toBe('pass');
    });
});

describe('assess — observing (MTD passes, billing-cycle not yet done)', () => {
    it('returns observing when previous calendar month is incomplete', () => {
        const i = passingInput();
        i.coverage.previous_calendar_month.window = PREV_WINDOW_INCOMPLETE;
        i.deltas.previous_calendar_month = passingDeltas(PREV_WINDOW_INCOMPLETE);
        const r = assess(i, DEFAULT_THRESHOLDS);
        expect(r.status).toBe('observing');
        expect(r.reason).toContain('previous_calendar_month_not_complete');
    });

    it('returns observing when previous month coverage fails', () => {
        const i = passingInput();
        i.coverage.previous_calendar_month.coverage_pct = 50;
        const r = assess(i, DEFAULT_THRESHOLDS);
        expect(r.status).toBe('observing');
        expect(r.reason).toContain('coverage_pct_previous_calendar_month');
    });

    it('returns observing when previous month delta fails on any scope', () => {
        const i = passingInput();
        i.deltas.previous_calendar_month[0] = {
            ...i.deltas.previous_calendar_month[0]!,
            absolute_usd: 10, relative_pct: 50,
        };
        const r = assess(i, DEFAULT_THRESHOLDS);
        expect(r.status).toBe('observing');
        expect(r.reason).toContain('delta_api_key_previous_calendar_month');
    });
});

describe('assess — ready_to_flip', () => {
    it('returns ready_to_flip when every criterion passes', () => {
        const r = assess(passingInput(), DEFAULT_THRESHOLDS);
        expect(r.status).toBe('ready_to_flip');
        expect(r.reason).toBe('all_criteria_pass');
    });

    it('downgrades to not_ready if oldest_pending_age is non-null even with pending=0', () => {
        const i = passingInput();
        i.outbox.oldest_pending_age_seconds = 1; // anomaly: stale data
        const r = assess(i, DEFAULT_THRESHOLDS);
        expect(r.status).toBe('not_ready');
        expect(r.reason).toBe('outbox_has_pending_age');
    });

    it('returns ready_to_flip on MTD-only when billing-cycle requirement is off (staging)', () => {
        const i = passingInput();
        i.coverage.previous_calendar_month.window = PREV_WINDOW_INCOMPLETE;
        const r = assess(i, {
            ...DEFAULT_THRESHOLDS,
            require_completed_billing_cycle: false,
        });
        expect(r.status).toBe('ready_to_flip');
        expect(r.reason).toBe('mtd_passes_billing_cycle_not_required');
    });
});

describe('assess — criteria list completeness', () => {
    it('always returns one verdict per criterion regardless of status', () => {
        const r = assess(passingInput(), DEFAULT_THRESHOLDS);
        const names = r.criteria.map((c) => c.criterion);
        expect(names).toContain('coverage_pct_mtd');
        expect(names).toContain('coverage_pct_previous_calendar_month');
        expect(names).toContain('delta_api_key_mtd');
        expect(names).toContain('delta_employee_mtd');
        expect(names).toContain('delta_department_mtd');
        expect(names).toContain('delta_api_key_previous_calendar_month');
        expect(names).toContain('delta_employee_previous_calendar_month');
        expect(names).toContain('delta_department_previous_calendar_month');
        expect(names).toContain('outbox_pending');
        expect(names).toContain('outbox_abandoned');
        expect(names).toContain('denied_event_write_path');
        expect(names).toContain('denied_event_idempotency_ready');
        expect(names).toContain('context_binding_complete');
        expect(names).toContain('previous_calendar_month_complete');
    });
});
