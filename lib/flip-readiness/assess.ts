// Slice 3D — pure flip-readiness assessment.
//
// No DB calls. The loader hands in an AssessmentInput; this function
// computes the status by walking an ordered, fail-closed decision tree.
//
// Status hierarchy (first match wins):
//
//   blocked
//     - loader_error
//     - tenant scoping uncertainty (no tenantId)
//     - denied-event write path not implemented (when required)
//     - denied-event idempotency not ready (when denied writes required)
//     - context-binding fields missing (any required field false)
//     - outbox.abandoned > threshold
//
//   not_ready
//     - coverage_pct below threshold in current MTD
//     - any scope delta over tolerance in current MTD
//     - outbox.pending > threshold
//
//   observing
//     - all current-MTD criteria pass
//     - previous-calendar-month window not complete OR not passing
//     - (only reachable when require_completed_billing_cycle = true)
//
//   ready_to_flip
//     - all current-MTD criteria pass
//     - previous-calendar-month window is complete AND passes
//     - denied-event write path implemented and tested
//     - denied-event idempotency ready
//     - no pending or abandoned outbox rows; oldest_pending_age = null

import type {
    AssessmentInput,
    CoverageSnapshot,
    CriterionVerdict,
    FlipReadinessAssessment,
    OutboxSnapshot,
    ScopeDelta,
    Thresholds,
    WindowSpec,
} from './types.js';

function coverageVerdict(snap: CoverageSnapshot, t: Thresholds, label: string): CriterionVerdict {
    const pass = snap.coverage_pct >= t.coverage_min_pct;
    return {
        criterion: `coverage_pct_${label}`,
        status: pass ? 'pass' : 'fail',
        detail: {
            coverage_pct: snap.coverage_pct,
            threshold: t.coverage_min_pct,
            hosted_requests: snap.hosted_requests,
            economic_events: snap.economic_events,
        },
    };
}

function scopeDeltaVerdict(d: ScopeDelta, t: Thresholds, label: string): CriterionVerdict {
    const absPass = Math.abs(d.absolute_usd) <= t.delta_absolute_max_usd;
    const relPass = d.relative_pct <= t.delta_relative_max_pct;
    const pass = absPass && relPass;
    return {
        criterion: `delta_${d.scope}_${label}`,
        status: pass ? 'pass' : 'fail',
        detail: {
            absolute_usd: d.absolute_usd,
            relative_pct: d.relative_pct,
            absolute_threshold_usd: t.delta_absolute_max_usd,
            relative_threshold_pct: t.delta_relative_max_pct,
            worst_bucket_id: d.worst_bucket_id,
            primary_usd: d.primary_usd,
            legacy_usd: d.legacy_usd,
        },
    };
}

function outboxVerdict(o: OutboxSnapshot, t: Thresholds): CriterionVerdict[] {
    return [
        {
            criterion: 'outbox_pending',
            status: o.pending <= t.outbox_pending_max ? 'pass' : 'fail',
            detail: { pending: o.pending, threshold: t.outbox_pending_max, oldest_pending_age_seconds: o.oldest_pending_age_seconds },
        },
        {
            criterion: 'outbox_abandoned',
            status: o.abandoned <= t.outbox_abandoned_max ? 'pass' : 'fail',
            detail: { abandoned: o.abandoned, threshold: t.outbox_abandoned_max },
        },
    ];
}

function deniedWritePathVerdict(d: AssessmentInput['denied_event_write_path']): CriterionVerdict {
    return {
        criterion: 'denied_event_write_path',
        status: d.implemented ? 'pass' : 'fail',
        detail: {
            config_enabled: d.config_enabled,
            code_path_present: d.code_path_present,
            test_proof_present: d.test_proof_present,
            health_check_green: d.health_check_green,
        },
    };
}

function idempotencyVerdict(i: AssessmentInput['denied_event_idempotency']): CriterionVerdict {
    return {
        criterion: 'denied_event_idempotency_ready',
        status: i.ready ? 'pass' : 'fail',
        detail: {
            schema_unique_request_present: i.schema_unique_request_present,
            denied_event_kind_supported: i.denied_event_kind_supported,
            deny_code_bound_to_idempotency: i.deny_code_bound_to_idempotency,
            writer_deterministic_deny_code: i.writer_deterministic_deny_code,
        },
    };
}

function contextBindingVerdict(c: AssessmentInput['context_binding']): CriterionVerdict {
    const missing = Object.entries(c.fields)
        .filter(([, present]) => !present)
        .map(([name]) => name);
    return {
        criterion: 'context_binding_complete',
        status: c.complete ? 'pass' : 'fail',
        detail: { missing_fields: missing, fields: c.fields },
    };
}

function previousMonthWindowVerdict(w: WindowSpec): CriterionVerdict {
    return {
        criterion: 'previous_calendar_month_complete',
        status: w.complete ? 'pass' : 'fail',
        detail: { since: w.since, until: w.until, complete: w.complete },
    };
}

export function assess(input: AssessmentInput, thresholds: Thresholds): FlipReadinessAssessment {
    const t = thresholds;
    const windows = {
        month_to_date: input.coverage.month_to_date.window,
        previous_calendar_month: input.coverage.previous_calendar_month.window,
    };

    // Build the full criterion list once — the dashboard surfaces all
    // verdicts regardless of which one drove the status.
    const mtdCoverage = coverageVerdict(input.coverage.month_to_date, t, 'mtd');
    const prevCoverage = coverageVerdict(input.coverage.previous_calendar_month, t, 'previous_calendar_month');
    const mtdDeltas = input.deltas.month_to_date.map((d) => scopeDeltaVerdict(d, t, 'mtd'));
    const prevDeltas = input.deltas.previous_calendar_month.map((d) =>
        scopeDeltaVerdict(d, t, 'previous_calendar_month'),
    );
    const outboxVs = outboxVerdict(input.outbox, t);
    const deniedV = deniedWritePathVerdict(input.denied_event_write_path);
    const idempV = idempotencyVerdict(input.denied_event_idempotency);
    const bindingV = contextBindingVerdict(input.context_binding);
    const prevWindowV = previousMonthWindowVerdict(input.coverage.previous_calendar_month.window);

    const criteria: CriterionVerdict[] = [
        mtdCoverage,
        prevCoverage,
        ...mtdDeltas,
        ...prevDeltas,
        ...outboxVs,
        deniedV,
        idempV,
        bindingV,
        prevWindowV,
    ];

    const result = (status: FlipReadinessAssessment['status'], reason: string): FlipReadinessAssessment => ({
        status,
        reason,
        generated_at: input.generated_at,
        windows,
        thresholds: t,
        criteria,
        metrics: {
            coverage: input.coverage,
            outbox: input.outbox,
            deltas: input.deltas,
            denied_event_write_path: input.denied_event_write_path,
            denied_event_idempotency: input.denied_event_idempotency,
            context_binding: input.context_binding,
        },
    });

    // ── BLOCKED — fail-closed checks first ──────────────────────────────
    if (input.loader_error.occurred) {
        return result('blocked', input.loader_error.reason ?? 'loader_error');
    }
    if (!input.tenantId) {
        return result('blocked', 'tenant_scoping_uncertain');
    }
    if (t.require_denied_write_path && !input.denied_event_write_path.implemented) {
        return result('blocked', 'denied_event_write_path_not_implemented');
    }
    if (t.require_denied_write_path && !input.denied_event_idempotency.ready) {
        return result('blocked', 'denied_event_idempotency_not_ready');
    }
    if (!input.context_binding.complete) {
        return result('blocked', 'context_binding_incomplete');
    }
    if (input.outbox.abandoned > t.outbox_abandoned_max) {
        return result('blocked', 'outbox_has_abandoned_rows');
    }

    // ── NOT_READY — current-MTD failures ───────────────────────────────
    const mtdFails: string[] = [];
    if (mtdCoverage.status === 'fail') mtdFails.push('coverage_pct_mtd');
    for (const v of mtdDeltas) if (v.status === 'fail') mtdFails.push(v.criterion);
    if (input.outbox.pending > t.outbox_pending_max) mtdFails.push('outbox_pending');
    if (mtdFails.length > 0) {
        return result('not_ready', `current_mtd_failures:${mtdFails.join(',')}`);
    }

    // ── OBSERVING / READY_TO_FLIP — billing-cycle gate ─────────────────
    if (!t.require_completed_billing_cycle) {
        // Operator has explicitly opted out (staging/dev). Current MTD is
        // already passing; mark ready.
        return result('ready_to_flip', 'mtd_passes_billing_cycle_not_required');
    }

    const prevFails: string[] = [];
    if (!input.coverage.previous_calendar_month.window.complete) {
        prevFails.push('previous_calendar_month_not_complete');
    }
    if (prevCoverage.status === 'fail') prevFails.push('coverage_pct_previous_calendar_month');
    for (const v of prevDeltas) if (v.status === 'fail') prevFails.push(v.criterion);
    if (prevFails.length > 0) {
        return result('observing', `awaiting_billing_cycle:${prevFails.join(',')}`);
    }

    // oldest_pending_age_seconds must be null for ready_to_flip per the
    // strict outbox rule. Even with pending = 0 the check is cheap.
    if (input.outbox.oldest_pending_age_seconds !== null) {
        return result('not_ready', 'outbox_has_pending_age');
    }

    return result('ready_to_flip', 'all_criteria_pass');
}
