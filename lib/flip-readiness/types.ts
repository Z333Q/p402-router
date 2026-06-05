// Slice 3D — Runtime flip readiness types.
//
// This is a payment-protocol-grade gate, not a confidence widget. Every
// field is a financial-control signal. The status field is computed by an
// ordered, fail-closed decision function. See assess.ts.

export type FlipStatus = 'ready_to_flip' | 'observing' | 'not_ready' | 'blocked';

export type ScopeDimension = 'api_key' | 'employee' | 'department';

export type WindowKind = 'month_to_date' | 'previous_calendar_month';

export interface WindowSpec {
    kind: WindowKind;
    /** ISO8601 inclusive lower bound. */
    since: string;
    /** ISO8601 exclusive upper bound. */
    until: string;
    /**
     * True when the window represents a fully completed period (entire
     * billing-cycle window passed and now closed). False for in-progress
     * windows such as month_to_date.
     */
    complete: boolean;
}

export interface CoverageSnapshot {
    window: WindowSpec;
    hosted_requests: number;
    economic_events: number;
    coverage_pct: number;
}

export interface OutboxSnapshot {
    pending: number;
    abandoned: number;
    /** null only when there are no pending rows. Any non-null value blocks
     *  ready_to_flip per Slice 3D rule "oldest_pending_age_seconds must be null". */
    oldest_pending_age_seconds: number | null;
}

/**
 * Worst-case bucket delta within a scope dimension. The Slice 3D rule
 * "do not average away risk" means we evaluate per-bucket and report the
 * single worst bucket. If even one api_key, employee, or department has a
 * delta over tolerance, the scope fails.
 */
export interface ScopeDelta {
    scope: ScopeDimension;
    window: WindowSpec;
    /** Bucket id (api_key_id / employee_id / department_id) driving the
     *  worst delta, or null when no bucket has any spend in either source. */
    worst_bucket_id: string | null;
    primary_usd: number;
    legacy_usd: number;
    /** primary − legacy. Negative = primary lower than legacy (the dangerous
     *  side of the asymmetry — flipping would lose visibility on that spend). */
    absolute_usd: number;
    /** |absolute_usd| / max(primary, legacy) × 100. 0 when both are 0. */
    relative_pct: number;
}

export interface DeniedWritePathSignal {
    /** Config flag intentionally enabling denied-event writes. */
    config_enabled: boolean;
    /** Production write path actually emits denied economic events. */
    code_path_present: boolean;
    /** A test in the suite proves denied requests create
     *  ai_economic_events rows with governance_decision='denied' and a
     *  deny_code. The loader sets this to false unless explicitly observed
     *  via a test-marker mechanism — never inferred. */
    test_proof_present: boolean;
    /** Health check sees no denied-event write failures in the lookback
     *  window. False when health data is missing. */
    health_check_green: boolean;
    /** Computed: implemented requires ALL four signals true. */
    implemented: boolean;
}

export interface IdempotencyReadiness {
    /** Schema-level UNIQUE (tenant_id, request_id) exists on
     *  ai_economic_events. Proves at most one row per request, but NOT by
     *  itself that denied events are idempotent on deny_code. Verified via
     *  information_schema. */
    schema_unique_request_present: boolean;
    /** The writer actually emits denied-event kind rows
     *  (governance_decision = 'denied'). Stays false until Slice 3E
     *  implements the denied write path. */
    denied_event_kind_supported: boolean;
    /** A repeat denied attempt for the same (tenant_id, request_id) yields
     *  the same deny_code — either by writer determinism or a schema
     *  constraint that includes deny_code. Stays false until Slice 3E. */
    deny_code_bound_to_idempotency: boolean;
    /** Writer deterministically produces the same deny_code for the same
     *  request inputs. False when denied writes are not yet implemented. */
    writer_deterministic_deny_code: boolean;
    /** Computed: ready requires ALL of:
     *    schema_unique_request_present
     *    denied_event_kind_supported
     *    writer_deterministic_deny_code
     *    deny_code_bound_to_idempotency
     */
    ready: boolean;
}

export interface ContextBindingFields {
    tenant_id: boolean;
    api_key_id: boolean;
    request_id: boolean;
    route: boolean;
    /** Authority/mechanism that produced the decision. Backed ONLY by a
     *  real source-binding column: governance_decision_source, policy_id,
     *  mandate_id, or control_decision_source. governance_decision is the
     *  RESULT, not a source — it does NOT satisfy this binding. */
    decision_source: boolean;
    /** The decision is bound to a concrete enforcement scope. Satisfied
     *  when ai_economic_events carries any of: api_key_id, employee_id,
     *  department_id, workflow_id, customer_id, feature_id; OR budget_id
     *  paired with an explicit `budget_scope` column. budget_id alone is
     *  NOT sufficient — a budget object is not a scope. */
    budget_scope_binding: boolean;
    deny_code: boolean;
    event_time: boolean;
    /** Stable per-request idempotency key. The writer uses request_id today;
     *  exposed as a separate field so the gate can require it independently. */
    idempotency_key: boolean;
}

export interface ContextBindingSnapshot {
    /** Which evidence fields the system can bind to an authorization
     *  outcome. The flip gate exposes these so operators can audit the
     *  authorization-binding posture. Missing fields are flip-blockers. */
    fields: ContextBindingFields;
    /** Computed: all true. */
    complete: boolean;
}

export interface AssessmentInput {
    tenantId: string;
    /** When the loader gathered the inputs. Used to interpret window.complete. */
    generated_at: string;

    coverage: {
        month_to_date: CoverageSnapshot;
        previous_calendar_month: CoverageSnapshot;
    };
    outbox: OutboxSnapshot;
    deltas: {
        month_to_date: ScopeDelta[];           // exactly 3: api_key, employee, department
        previous_calendar_month: ScopeDelta[]; // exactly 3
    };
    denied_event_write_path: DeniedWritePathSignal;
    denied_event_idempotency: IdempotencyReadiness;
    context_binding: ContextBindingSnapshot;

    /** Loader sets this true on any error path so assess() returns 'blocked'
     *  with a clear reason. Fail-closed contract. */
    loader_error: { occurred: boolean; reason: string | null };
}

export interface CriterionVerdict {
    criterion: string;
    status: 'pass' | 'fail' | 'observing';
    detail: Record<string, unknown>;
}

export interface Thresholds {
    coverage_min_pct: number;
    delta_absolute_max_usd: number;
    delta_relative_max_pct: number;
    outbox_pending_max: number;
    outbox_abandoned_max: number;
    /** When false, the gate stays at most 'observing' (or worse) until
     *  the previous_calendar_month window passes. Set to true to flip to
     *  the billing-cycle requirement. */
    require_completed_billing_cycle: boolean;
    /** When true, denied_event_write_path.implemented must be true for any
     *  status better than 'blocked'. */
    require_denied_write_path: boolean;
}

export interface FlipReadinessAssessment {
    status: FlipStatus;
    /** Why we landed at this status — first matching rule wins. */
    reason: string;
    generated_at: string;
    windows: { month_to_date: WindowSpec; previous_calendar_month: WindowSpec };
    thresholds: Thresholds;
    criteria: CriterionVerdict[];
    metrics: {
        coverage: AssessmentInput['coverage'];
        outbox: OutboxSnapshot;
        deltas: AssessmentInput['deltas'];
        denied_event_write_path: DeniedWritePathSignal;
        denied_event_idempotency: IdempotencyReadiness;
        context_binding: ContextBindingSnapshot;
    };
}
