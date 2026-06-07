import { DEFAULT_SCENARIO, getScenarioCleanup, SCENARIO_META, type DemoScenario } from './scenarios';

/**
 * Slice 3P — Demo data and empty-state story mode.
 *
 * Pure builders that return shapes IDENTICAL to the production API
 * responses for the read-only accountability surface
 * (Slice 3M /api/v2/accountability/health) and the Slice 3K outcome
 * coverage endpoint. The dashboard pages can swap a real fetch for one
 * of these builders when `?demo=1` is on the URL.
 *
 * Hard contract:
 *   - These builders NEVER write to the database.
 *   - They NEVER ship inside production API responses; they are
 *     consumed client-side and the pages that consume them MUST render
 *     a visible "Demo preview" marker.
 *   - Every shape carries `_demo: true` (or the parent envelope carries
 *     a demo flag) so a future regression that pipes the result through
 *     an export path can be caught.
 *
 * Story coverage matches the 3P brief — every required scenario is
 * represented: healthy metering with weak outcomes, a denied event with
 * $0 provider cost, missing attribution, missing evidence, metadata-only
 * privacy posture, runtime flip blocked by observation window, and
 * Optimize analysis not ready due to thin outcome data.
 */

// ─────────────────────────────────────────────────────────────────────────
// Mode detection + copy
// ─────────────────────────────────────────────────────────────────────────

/**
 * Minimal interface — accepts either a URLSearchParams instance or the
 * Next.js useSearchParams() result (which exposes the same .get method).
 * Test code can pass a plain { get } object.
 */
export interface SearchParamsLike {
    get(key: string): string | null;
}

/**
 * Returns true iff the caller explicitly opted into demo mode via
 * `?demo=1`. Any other value (missing, "0", "true", "yes") returns false
 * — we want the demo gate to be intentional, not accidentally tripped.
 */
export function isDemoMode(searchParams: SearchParamsLike | null | undefined): boolean {
    if (!searchParams) return false;
    return searchParams.get('demo') === '1';
}

export const DEMO_STORY_MODE_ENABLED_COPY =
    'This is example data. It is not written to your ledger, and it will never appear in real audit or finance exports.';

export const DEMO_PREVIEW_LABEL = 'Demo preview';

// ─────────────────────────────────────────────────────────────────────────
// Accountability health story
// ─────────────────────────────────────────────────────────────────────────

/**
 * Mirrors the AccountabilityResponse shape from Slice 3M with a `_demo`
 * marker and demo-flagged cleanup priorities. The story is intentionally
 * "needs cleanup" rather than "audit ready" — a clean demo state would
 * not show off the cleanup, gates, or readiness machinery the buyer
 * came to see.
 */
export interface DemoAccountabilityHealth {
    _demo: true;
    ok: true;
    generated_at: string;
    period: { since: string; until: string };
    overall: {
        score: number;
        status: 'needs_cleanup';
        label: 'NEEDS CLEANUP';
        explainer: string;
    };
    dimensions: Record<string, unknown>;
    cleanup_priorities: DemoCleanupPriority[];
    disclaimers: {
        readiness_not_recommendation: true;
        no_savings_claim: true;
        content_displayed: false;
        runtime_flip_unchanged: true;
        optimize_recommendations_blocked: true;
    };
}

export interface DemoCleanupPriority {
    _demo: true;
    id: string;
    category: 'outcomes' | 'attribution' | 'evidence' | 'control' | 'meter' | 'privacy';
    severity: 'high' | 'medium' | 'low';
    title: string;
    count: number;
    affected_spend_usd: number;
    link: string;
    why_it_matters: string;
}

function demoWindow(now: Date = new Date()): { since: string; until: string } {
    const until = now;
    const since = new Date(until.getTime() - 30 * 86_400_000);
    return { since: since.toISOString(), until: until.toISOString() };
}

export function buildDemoCleanupPriorities(scenario: DemoScenario = DEFAULT_SCENARIO): DemoCleanupPriority[] {
    const s = getScenarioCleanup(scenario);
    const qs = scenario === DEFAULT_SCENARIO ? 'demo=1' : `demo=1&scenario=${scenario}`;
    return [
        {
            _demo: true,
            id: `demo:outcomes:${s.workflow_label}`,
            category: 'outcomes',
            severity: 'high',
            title: `Add outcomes for ${s.outcome_segment_label}`,
            count: 412,
            affected_spend_usd: 0,
            link: `/dashboard/prove/outcomes?${qs}`,
            why_it_matters:
                'Outcome coverage on this segment is at 4%. Optimize analysis remains blocked until coverage and accepted-count thresholds are reached.',
        },
        {
            _demo: true,
            id: 'demo:attribution:unattributed',
            category: 'attribution',
            severity: 'high',
            title: 'Resolve 87 unattributed events',
            count: 87,
            affected_spend_usd: 42.18,
            link: `/dashboard/prove?attribution_status=unattributed&${qs}`,
            why_it_matters:
                'Finance cannot assign this spend to a budget owner until at least one of department, employee, workflow, customer, feature, or api_key is set.',
        },
        {
            _demo: true,
            id: 'demo:evidence:missing',
            category: 'evidence',
            severity: 'medium',
            title: 'Attach evidence bundles for 23 events',
            count: 23,
            affected_spend_usd: 0,
            link: `/dashboard/prove?evidence_status=missing&${qs}`,
            why_it_matters:
                'Evidence bundles back the canonical ledger with reproducible proof. Missing bundles are not automatically noncompliance but limit what audit can verify.',
        },
        {
            _demo: true,
            id: 'demo:control:deny_rule',
            category: 'control',
            severity: 'low',
            title: 'Backfill metadata.deny_rule on 1 denied event',
            count: 1,
            affected_spend_usd: 0,
            link: `/dashboard/prove?governance_decision=denied&${qs}`,
            why_it_matters:
                'Audit packets need the deny_rule so finance can see which configured limit triggered each denial.',
        },
    ];
}

export function buildDemoAccountabilityHealth(
    scenario: DemoScenario = DEFAULT_SCENARIO,
    now: Date = new Date(),
): DemoAccountabilityHealth {
    const period = demoWindow(now);
    const meta = SCENARIO_META[scenario];
    // Subscores derived from the brief's required scenarios:
    //   meter: healthy        -> 100
    //   attribution: warning  -> 60
    //   evidence: warning     -> 60
    //   control: healthy      -> 100
    //   outcomes: not_ready   -> 30
    //   privacy: healthy      -> 100
    //   runtime_flip: blocked -> 0 (forces overall blocked? we use observing
    //                                instead — see explainer below — so the
    //                                story shows "needs cleanup" rather than
    //                                a hard block)
    // Using observing for runtime_flip lets the demo overall land in the
    // "needs cleanup" band (40..69). That matches the brief story.
    const sub = {
        meter: 100, attribution: 60, evidence: 60, control: 100,
        outcomes: 30, privacy: 100, runtime_flip: 75,
    };
    const score = Math.round(
        sub.meter * 0.15 + sub.attribution * 0.15 + sub.evidence * 0.15 +
        sub.control * 0.15 + sub.outcomes * 0.20 + sub.privacy * 0.10 +
        sub.runtime_flip * 0.10,
    );

    return {
        _demo: true,
        ok: true,
        generated_at: now.toISOString(),
        period,
        overall: {
            score,
            status: 'needs_cleanup',
            label: 'NEEDS CLEANUP',
            explainer:
                `${meta.name} demo · score ${score}. The accountability system is operational; outcome coverage and attribution need cleanup before this tenant is audit-ready. Optimize recommendations remain blocked.`,
        },
        dimensions: {
            meter: {
                status: 'healthy',
                score: { subscore: sub.meter, weight: 15, weighted: sub.meter * 0.15 },
                total_events: 2_148,
                events_in_period: 2_148,
                most_recent_event_at: new Date(now.getTime() - 6 * 60_000).toISOString(),
                event_freshness_seconds: 360,
                source_distribution: [
                    { source: 'chat_completions', count: 1_812 },
                    { source: 'meter_only',       count:   336 },
                ],
                outbox_pending: 0,
                outbox_abandoned: 0,
                explainer: 'Meter is recording events with healthy freshness and no outbox backlog.',
            },
            attribution: {
                status: 'warning',
                score: { subscore: sub.attribution, weight: 15, weighted: sub.attribution * 0.15 },
                department_coverage_pct: 76.3,
                employee_coverage_pct:   72.1,
                workflow_coverage_pct:   88.4,
                customer_coverage_pct:   54.0,
                feature_coverage_pct:    32.7,
                api_key_coverage_pct:    96.1,
                unattributed_event_count: 87,
                unattributed_spend_usd:   42.18,
                explainer: '4.0% of events and 5.1% of spend are unattributed. Tag missing department / employee / workflow / customer / feature / api_key on the offending events.',
            },
            evidence: {
                status: 'warning',
                score: { subscore: sub.evidence, weight: 15, weighted: sub.evidence * 0.15 },
                events_with_evidence: 2_125,
                events_missing_evidence: 23,
                coverage_pct: 98.93,
                missing_by_department: [{ key: 'product',  missing: 12, total: 408 }],
                missing_by_workflow:   [{ key: 'support',  missing: 11, total: 540 }],
                missing_by_provider:   [{ key: 'openai',   missing: 15, total: 1_402 }],
                explainer: 'Evidence coverage is 98.9%. A small number of events lack a bundle; this is not automatically noncompliance.',
            },
            control: {
                status: 'healthy',
                score: { subscore: sub.control, weight: 15, weighted: sub.control * 0.15 },
                denied_event_count: 1,
                denied_with_deny_code: 1,
                denied_with_decision_source: 1,
                denied_with_deny_rule: 1,
                denied_provider_cost_usd: 0,           // contract: $0 by construction
                deny_code_distribution: [{ deny_code: 'API_KEY_BUDGET_EXCEEDED', count: 1 }],
                governance_decision_coverage_pct: 100,
                explainer: 'Denied events are recorded with deterministic deny_code, decision_source, deny_rule, and zero provider cost.',
            },
            outcomes: {
                status: 'not_ready',
                score: { subscore: sub.outcomes, weight: 20, weighted: sub.outcomes * 0.20 },
                readiness_status: 'not_ready',
                coverage_pct: 12.4,
                accepted_count: 18,
                accepted_threshold: 30,
                coverage_threshold: 20,
                window_days: 30,
                baseline_threshold: 14,
                cost_per_accepted_output_usd: null,
                insufficient_data: true,
                top_missing_segments: [
                    { label: 'workflow=customer_support', missing_count: 412, sample_request_id: 'demo-req-cs-001' },
                ],
                explainer:
                    'Outcome coverage is 12.4%. Optimize analysis needs at least 20% coverage and 30 accepted outcomes before this tenant is analysis-ready.',
            },
            privacy: {
                status: 'healthy',
                score: { subscore: sub.privacy, weight: 10, weighted: sub.privacy * 0.10 },
                privacy_mode_distribution: [
                    { privacy_mode: 'metadata_only',   count: 2_098 },
                    { privacy_mode: 'fingerprint_only', count:    50 },
                ],
                prompt_stored_count: 0,
                response_stored_count: 0,
                redaction_applied_count: 0,
                metadata_only_count: 2_098,
                explainer: 'Privacy posture matches the tenant configuration. Metadata-only events dominate; no content is stored.',
            },
            runtime_flip: {
                status: 'observing',
                score: { subscore: sub.runtime_flip, weight: 10, weighted: sub.runtime_flip * 0.10 },
                flip_status: 'observing',
                flip_reason: 'awaiting_billing_cycle:previous_calendar_month_not_complete',
                mtd_passes: true,
                prev_calendar_month_complete: false,
                explainer:
                    'Runtime flip remains blocked until the observation window and reconciliation gates pass. Current MTD passes; the previous calendar month has not yet closed cleanly.',
            },
            optimize_readiness: {
                status: 'not_ready',
                score: { subscore: 30, weight: 0, weighted: 0 },
                recommendations_enabled: false,
                savings_claims_enabled:  false,
                readiness_status: 'not_ready',
                explainer:
                    'Optimize readiness reports whether outcome data is sufficient for ANALYSIS. Recommendations and savings claims remain blocked regardless of this status.',
            },
        },
        cleanup_priorities: buildDemoCleanupPriorities(scenario),
        disclaimers: {
            readiness_not_recommendation:     true,
            no_savings_claim:                 true,
            content_displayed:                false,
            runtime_flip_unchanged:           true,
            optimize_recommendations_blocked: true,
        },
    };
}

// ─────────────────────────────────────────────────────────────────────────
// Outcome coverage story
// ─────────────────────────────────────────────────────────────────────────

export interface DemoOutcomeCoverage {
    _demo: true;
    ok: true;
    generated_at: string;
    filters_applied: Record<string, string>;
    thresholds: { min_coverage_pct: number; min_accepted_count: number; min_baseline_days: number };
    readiness: {
        status: 'not_ready';
        reason: string;
        explainer: string;
    };
    totals: {
        total_events: number;
        events_with_outcome: number;
        events_without_outcome: number;
        coverage_pct: number;
        status: {
            accepted: number; rejected: number; revised: number;
            escalated: number; failed: number; pending_review: number; unknown: number;
        };
        total_spend_usd: number;
        accepted_spend_usd: number;
        cost_per_accepted_output_usd: null;
        cost_per_accepted_insufficient_data: true;
        window_days: number;
        most_recent_outcome_at: string;
        outcome_freshness_seconds: number;
    };
    segments: {
        by_department: unknown[];
        by_workflow:   unknown[];
        by_customer:   unknown[];
        by_feature:    unknown[];
    };
    provider_model_matrix: unknown[];
    missing_outcome_leaderboard: Array<{
        _demo: true;
        label: string;
        dimension: 'workflow' | 'department' | 'customer' | 'provider_model';
        key: string;
        missing_count: number;
        total_events: number;
        coverage_pct: number;
        sample_request_id: string | null;
    }>;
    disclaimers: {
        readiness_not_recommendation: true;
        no_savings_claim: true;
        content_displayed: false;
    };
}

export function buildDemoOutcomeCoverage(
    scenario: DemoScenario = DEFAULT_SCENARIO,
    now: Date = new Date(),
): DemoOutcomeCoverage {
    const cleanup = getScenarioCleanup(scenario);
    return {
        _demo: true,
        ok: true,
        generated_at: now.toISOString(),
        filters_applied: {},
        thresholds: { min_coverage_pct: 20, min_accepted_count: 30, min_baseline_days: 14 },
        readiness: {
            status: 'not_ready',
            reason: 'coverage_below_threshold:12.4<20',
            explainer:
                'Outcome coverage is 12.4%. Optimize analysis needs at least 20% to avoid silent miscounting. Recommendations remain blocked.',
        },
        totals: {
            total_events: 2_148,
            events_with_outcome: 267,
            events_without_outcome: 1_881,
            coverage_pct: 12.4,
            status: {
                accepted: 18, rejected: 9, revised: 4,
                escalated: 2, failed: 11, pending_review: 220, unknown: 3,
            },
            total_spend_usd: 824.10,
            accepted_spend_usd: 6.21,
            cost_per_accepted_output_usd: null,
            cost_per_accepted_insufficient_data: true,
            window_days: 30,
            most_recent_outcome_at: new Date(now.getTime() - 2 * 60_000).toISOString(),
            outcome_freshness_seconds: 120,
        },
        segments: { by_department: [], by_workflow: [], by_customer: [], by_feature: [] },
        provider_model_matrix: [],
        missing_outcome_leaderboard: [
            { _demo: true, label: cleanup.outcome_segment_label, dimension: 'workflow',
              key: cleanup.outcome_segment_label.replace(/^workflow=|^matter=/, ''),
              missing_count: 412, total_events: 540, coverage_pct: 23.7,
              sample_request_id: cleanup.sample_request_id },
            { _demo: true, label: 'workflow=internal_qa',     dimension: 'workflow',
              key: 'internal_qa',     missing_count: 188, total_events: 240, coverage_pct: 21.7,
              sample_request_id: 'demo-req-qa-001' },
        ],
        disclaimers: {
            readiness_not_recommendation: true,
            no_savings_claim:             true,
            content_displayed:            false,
        },
    };
}

// ─────────────────────────────────────────────────────────────────────────
// Recent events story
// ─────────────────────────────────────────────────────────────────────────

export interface DemoProveEvent {
    _demo: true;
    event_time: string;
    request_id: string;
    source: string;
    provider: string | null;
    model_used: string | null;
    status_code: number | null;
    success: boolean | null;
    cost_usd: string;
    department_id: string | null;
    workflow_id: string | null;
    governance_decision: 'approved' | 'denied' | null;
    deny_code: string | null;
    privacy_mode: 'metadata_only';
    evidence_bundle_id: string | null;
}

/**
 * Canonical demo request_ids. The event-detail page checks this set
 * before swapping in the demo card; any non-demo request_id falls
 * through to the real API even with `?demo=1` on the URL.
 */
export const DEMO_REQUEST_IDS = [
    'demo-req-001', // approved, attributed, evidence attached
    'demo-req-002', // denied, $0 cost, deny rule populated
    'demo-req-003', // approved, unattributed, missing evidence
] as const;
export type DemoRequestId = (typeof DEMO_REQUEST_IDS)[number];

export function isDemoRequestId(value: string): value is DemoRequestId {
    return (DEMO_REQUEST_IDS as readonly string[]).includes(value);
}

export function buildDemoProveEvents(now: Date = new Date()): DemoProveEvent[] {
    const t = (mins: number) => new Date(now.getTime() - mins * 60_000).toISOString();
    return [
        {
            _demo: true,
            event_time: t(6),
            request_id: 'demo-req-001',
            source: 'chat_completions',
            provider: 'openai',
            model_used: 'gpt-4o-mini',
            status_code: 200, success: true,
            cost_usd: '0.0124',
            department_id: 'engineering',
            workflow_id: 'customer_support',
            governance_decision: 'approved',
            deny_code: null,
            privacy_mode: 'metadata_only',
            evidence_bundle_id: 'demo-bndl-001',
        },
        {
            _demo: true,
            event_time: t(12),
            request_id: 'demo-req-002',
            source: 'chat_completions',
            provider: null, model_used: null,
            status_code: 403, success: false,
            cost_usd: '0.0000',
            department_id: 'engineering',
            workflow_id: 'internal_qa',
            governance_decision: 'denied',
            deny_code: 'API_KEY_BUDGET_EXCEEDED',
            privacy_mode: 'metadata_only',
            evidence_bundle_id: null,
        },
        {
            _demo: true,
            event_time: t(22),
            request_id: 'demo-req-003',
            source: 'meter_only',
            provider: 'anthropic',
            model_used: 'claude-3-5-sonnet',
            status_code: 200, success: true,
            cost_usd: '0.0418',
            department_id: null,         // unattributed
            workflow_id: null,
            governance_decision: 'approved',
            deny_code: null,
            privacy_mode: 'metadata_only',
            evidence_bundle_id: null,    // missing evidence
        },
    ];
}

// ─────────────────────────────────────────────────────────────────────────
// Prove search story (Slice 3Q)
//
// Mirrors the SearchResponse shape from /api/v2/prove/search. Includes
// the same story rows surfaced by Mission Control plus a few extras so
// the search page shows a realistic mix of states (approved, denied,
// missing evidence, unattributed, accepted outcome, pending review).
// ─────────────────────────────────────────────────────────────────────────

export interface DemoSearchHit {
    _demo: true;
    event_time: string;
    request_id: string;
    source: string;
    route: string | null;
    provider: string | null;
    model_used: string | null;
    status_code: number | null;
    success: boolean | null;
    cost_usd: string;
    input_tokens: number;
    output_tokens: number;
    total_tokens: number;
    department_id: string | null;
    employee_id: string | null;
    api_key_id: string | null;
    workflow_id: string | null;
    customer_id: string | null;
    feature_id: string | null;
    governance_decision: 'approved' | 'denied' | null;
    deny_code: string | null;
    privacy_mode: 'metadata_only';
    evidence_bundle_id: string | null;
    decision_source: string | null;
    deny_rule: string | null;
    attribution_status: 'attributed' | 'partial' | 'unattributed';
}

export interface DemoSearchResponse {
    _demo: true;
    ok: true;
    generated_at: string;
    filters_applied: Record<string, string>;
    explanation: string;
    count: number;
    limit: number;
    offset: number;
    hits: DemoSearchHit[];
}

export function buildDemoSearchResponse(
    scenario: DemoScenario = DEFAULT_SCENARIO,
    now: Date = new Date(),
): DemoSearchResponse {
    const t = (mins: number) => new Date(now.getTime() - mins * 60_000).toISOString();
    const workflow = scenario === 'enterprise_ai_spend_control' ? 'customer_support'
        :  scenario === 'healthcare_prior_auth'              ? 'prior_authorization'
        :  scenario === 'legal_mna_due_diligence'            ? 'mna_due_diligence'
        :                                                       'tenant_screening';
    const customer = scenario === 'enterprise_ai_spend_control' ? 'cust_acme'
        :  scenario === 'healthcare_prior_auth'              ? 'payer_demo_health'
        :  scenario === 'legal_mna_due_diligence'            ? 'matter_demo_acme'
        :                                                       'property_demo_north';
    const featureA = scenario === 'enterprise_ai_spend_control' ? 'reply_assist'
        :  scenario === 'healthcare_prior_auth'              ? 'evidence_lookup'
        :  scenario === 'legal_mna_due_diligence'            ? 'conflict_detection'
        :                                                       'inconsistency_check';
    const featureB = scenario === 'enterprise_ai_spend_control' ? 'audit_assist'
        :  scenario === 'healthcare_prior_auth'              ? 'um_summary'
        :  scenario === 'legal_mna_due_diligence'            ? 'redline_summary'
        :                                                       'fraud_score';
    const hits: DemoSearchHit[] = [
        {
            _demo: true,
            event_time: t(6),
            request_id: 'demo-req-001',
            source: 'chat_completions',
            route: '/api/v2/chat/completions',
            provider: 'openai',
            model_used: 'gpt-4o-mini',
            status_code: 200, success: true,
            cost_usd: '0.0124',
            input_tokens: 412, output_tokens: 180, total_tokens: 592,
            department_id: 'engineering', employee_id: 'alice@example.com',
            api_key_id: 'demo-ak-001', workflow_id: workflow,
            customer_id: customer, feature_id: featureA,
            governance_decision: 'approved', deny_code: null,
            privacy_mode: 'metadata_only',
            evidence_bundle_id: 'demo-bndl-001',
            decision_source: null, deny_rule: null,
            attribution_status: 'attributed',
        },
        {
            _demo: true,
            event_time: t(12),
            request_id: 'demo-req-002',
            source: 'chat_completions',
            route: '/api/v2/chat/completions',
            provider: null, model_used: null,
            status_code: 403, success: false,
            cost_usd: '0.0000',
            input_tokens: 0, output_tokens: 0, total_tokens: 0,
            department_id: 'engineering', employee_id: 'bob@example.com',
            api_key_id: 'demo-ak-002', workflow_id: 'internal_qa',
            customer_id: null, feature_id: null,
            governance_decision: 'denied',
            deny_code: 'MODEL_NOT_ALLOWED',
            privacy_mode: 'metadata_only',
            evidence_bundle_id: null,
            decision_source: 'budget_guard',
            deny_rule: 'api_key.allowed_models',
            attribution_status: 'partial',
        },
        {
            _demo: true,
            event_time: t(22),
            request_id: 'demo-req-003',
            source: 'meter_only',
            route: '/api/v2/meter/events',
            provider: 'anthropic', model_used: 'claude-3-5-sonnet',
            status_code: 200, success: true,
            cost_usd: '0.0418',
            input_tokens: 1_204, output_tokens: 420, total_tokens: 1_624,
            department_id: null, employee_id: null,
            api_key_id: null, workflow_id: null,
            customer_id: null, feature_id: null,
            governance_decision: 'approved', deny_code: null,
            privacy_mode: 'metadata_only',
            evidence_bundle_id: null,
            decision_source: null, deny_rule: null,
            attribution_status: 'unattributed',
        },
        {
            _demo: true,
            event_time: t(34),
            request_id: 'demo-req-004',
            source: 'chat_completions',
            route: '/api/v2/chat/completions',
            provider: 'openai', model_used: 'gpt-4o-mini',
            status_code: 200, success: true,
            cost_usd: '0.0091',
            input_tokens: 312, output_tokens: 90, total_tokens: 402,
            department_id: 'finance', employee_id: 'carol@example.com',
            api_key_id: 'demo-ak-003', workflow_id: workflow,
            customer_id: customer, feature_id: featureB,
            governance_decision: 'approved', deny_code: null,
            privacy_mode: 'metadata_only',
            evidence_bundle_id: 'demo-bndl-004',
            decision_source: null, deny_rule: null,
            attribution_status: 'attributed',
        },
    ];
    return {
        _demo: true,
        ok: true,
        generated_at: now.toISOString(),
        filters_applied: {},
        explanation: 'Demo preview — example data only; not written to your ledger.',
        count: hits.length,
        limit: 100,
        offset: 0,
        hits,
    };
}

// ─────────────────────────────────────────────────────────────────────────
// Event detail story (Slice 3Q)
//
// Mirrors EventDetailResponse from /api/v2/prove/economic-events/[request_id].
// Three canonical request_ids resolve; everything else returns null and
// the page falls back to the real API.
// ─────────────────────────────────────────────────────────────────────────

export interface DemoEventDetail {
    _demo: true;
    ok: true;
    event: Record<string, unknown> & { request_id: DemoRequestId };
    attribution: {
        api_key_id: string | null; department_id: string | null;
        employee_id: string | null; workflow_id: string | null;
        customer_id: string | null; feature_id: string | null;
        owner_type: string | null; owner_id: string | null;
        completeness_count: number; completeness_pct: number;
        missing: Array<'department' | 'employee' | 'api_key' | 'workflow' | 'customer' | 'feature'>;
        status: 'attributed' | 'partial' | 'unattributed';
    };
    governance: {
        decision: string | null;
        deny_code: string | null;
        deny_rule: string | null;
        decision_source: string | null;
        budget_id: string | null;
        policy_id: string | null;
        mandate_id: string | null;
        status_code: number | null;
        success: boolean | null;
        provider_call_blocked: boolean;
    };
    privacy: {
        privacy_mode: 'metadata_only';
        prompt_stored: false;
        response_stored: false;
        redaction_applied: boolean;
        retention_expires_at: string | null;
        content_displayed: false;
    };
    evidence: { evidence_bundle_id: string | null; present: boolean; bundle_url: string | null };
    cost: {
        cost_usd: number; direct_cost_usd: number;
        input_tokens: number; output_tokens: number; total_tokens: number;
        avg_cost_per_1k_tokens: number | null;
        zero_cost_denied: boolean;
    };
    related_events: Array<Record<string, unknown>>;
    outcome: null;
    explanation: { headline: string; details: string[]; notes: string[] };
}

export function buildDemoEventDetail(
    request_id: DemoRequestId,
    now: Date = new Date(),
): DemoEventDetail {
    const t = (mins: number) => new Date(now.getTime() - mins * 60_000).toISOString();
    if (request_id === 'demo-req-002') {
        // Denied — the headline scenario for the buyer demo.
        return {
            _demo: true, ok: true,
            event: {
                request_id,
                event_time: t(12),
                tenant_id: 'demo-tenant',
                source: 'chat_completions',
                route: '/api/v2/chat/completions',
                provider: null, model_used: null, model_requested: 'gpt-4',
                status_code: 403, success: false,
                cost_usd: '0', direct_cost_usd: '0',
                input_tokens: 0, output_tokens: 0, total_tokens: 0,
                latency_ms: 12, cache_hit: false,
                department_id: 'engineering', employee_id: 'bob@example.com',
                api_key_id: 'demo-ak-002', workflow_id: 'internal_qa',
                customer_id: null, feature_id: null,
                owner_type: 'tenant', owner_id: 'demo-tenant',
                budget_id: null, policy_id: null, mandate_id: null,
                governance_decision: 'denied',
                deny_code: 'MODEL_NOT_ALLOWED',
                privacy_mode: 'metadata_only',
                prompt_stored: false, response_stored: false, redaction_applied: false,
                retention_expires_at: null,
                evidence_bundle_id: null,
                metadata_decision_source: 'budget_guard',
                metadata_deny_rule: 'api_key.allowed_models',
                created_at: t(12), updated_at: t(12),
            },
            attribution: {
                api_key_id: 'demo-ak-002', department_id: 'engineering',
                employee_id: 'bob@example.com', workflow_id: 'internal_qa',
                customer_id: null, feature_id: null,
                owner_type: 'tenant', owner_id: 'demo-tenant',
                completeness_count: 4, completeness_pct: 66.67,
                missing: ['customer', 'feature'],
                status: 'partial',
            },
            governance: {
                decision: 'denied',
                deny_code: 'MODEL_NOT_ALLOWED',
                deny_rule: 'api_key.allowed_models',
                decision_source: 'budget_guard',
                budget_id: null, policy_id: null, mandate_id: null,
                status_code: 403, success: false,
                provider_call_blocked: true,
            },
            privacy: {
                privacy_mode: 'metadata_only',
                prompt_stored: false, response_stored: false,
                redaction_applied: false, retention_expires_at: null,
                content_displayed: false,
            },
            evidence: { evidence_bundle_id: null, present: false, bundle_url: null },
            cost: {
                cost_usd: 0, direct_cost_usd: 0,
                input_tokens: 0, output_tokens: 0, total_tokens: 0,
                avg_cost_per_1k_tokens: null,
                zero_cost_denied: true,
            },
            related_events: [],
            outcome: null,
            explanation: {
                headline: 'MODEL_NOT_ALLOWED, rule api_key.allowed_models. Request blocked before provider call. $0 provider cost.',
                details: [
                    'This demo request was denied before provider execution. No provider call was made.',
                    'The deny rule that fired was api_key.allowed_models.',
                    'Decision source: budget_guard.',
                    'Provider cost is $0 because the request never reached the model.',
                ],
                notes: [
                    'This event is missing customer, feature attribution; the rest of the chain is present.',
                    'This event has no evidence bundle attached.',
                ],
            },
        };
    }
    if (request_id === 'demo-req-003') {
        // Approved, unattributed, missing evidence.
        return {
            _demo: true, ok: true,
            event: {
                request_id,
                event_time: t(22),
                tenant_id: 'demo-tenant',
                source: 'meter_only',
                route: '/api/v2/meter/events',
                provider: 'anthropic',
                model_used: 'claude-3-5-sonnet',
                model_requested: 'claude-3-5-sonnet',
                status_code: 200, success: true,
                cost_usd: '0.0418', direct_cost_usd: '0.0398',
                input_tokens: 1_204, output_tokens: 420, total_tokens: 1_624,
                latency_ms: 1_402, cache_hit: false,
                department_id: null, employee_id: null,
                api_key_id: null, workflow_id: null,
                customer_id: null, feature_id: null,
                owner_type: null, owner_id: null,
                budget_id: null, policy_id: null, mandate_id: null,
                governance_decision: 'approved',
                deny_code: null,
                privacy_mode: 'metadata_only',
                prompt_stored: false, response_stored: false, redaction_applied: false,
                retention_expires_at: null,
                evidence_bundle_id: null,
                metadata_decision_source: null,
                metadata_deny_rule: null,
                created_at: t(22), updated_at: t(22),
            },
            attribution: {
                api_key_id: null, department_id: null, employee_id: null,
                workflow_id: null, customer_id: null, feature_id: null,
                owner_type: null, owner_id: null,
                completeness_count: 0, completeness_pct: 0,
                missing: ['department', 'employee', 'api_key', 'workflow', 'customer', 'feature'],
                status: 'unattributed',
            },
            governance: {
                decision: 'approved', deny_code: null, deny_rule: null,
                decision_source: null, budget_id: null, policy_id: null,
                mandate_id: null, status_code: 200, success: true,
                provider_call_blocked: false,
            },
            privacy: {
                privacy_mode: 'metadata_only',
                prompt_stored: false, response_stored: false,
                redaction_applied: false, retention_expires_at: null,
                content_displayed: false,
            },
            evidence: { evidence_bundle_id: null, present: false, bundle_url: null },
            cost: {
                cost_usd: 0.0418, direct_cost_usd: 0.0398,
                input_tokens: 1_204, output_tokens: 420, total_tokens: 1_624,
                avg_cost_per_1k_tokens: 0.0258,
                zero_cost_denied: false,
            },
            related_events: [],
            outcome: null,
            explanation: {
                headline: 'This demo request was approved and completed through anthropic using claude-3-5-sonnet. Total provider cost was $0.04.',
                details: [
                    'Token usage: 1204 input, 420 output, 1624 total.',
                    'Prompt content was not stored.',
                    'Response content was not stored.',
                ],
                notes: [
                    'This event is fully unattributed. Finance cannot assign it to a budget owner until at least one of department, employee, workflow, customer, feature, or api_key is set.',
                    'This event has no evidence bundle attached.',
                ],
            },
        };
    }
    // demo-req-001 — the healthy attributed approved event.
    return {
        _demo: true, ok: true,
        event: {
            request_id,
            event_time: t(6),
            tenant_id: 'demo-tenant',
            source: 'chat_completions',
            route: '/api/v2/chat/completions',
            provider: 'openai', model_used: 'gpt-4o-mini',
            model_requested: 'gpt-4o-mini',
            status_code: 200, success: true,
            cost_usd: '0.0124', direct_cost_usd: '0.0118',
            input_tokens: 412, output_tokens: 180, total_tokens: 592,
            latency_ms: 612, cache_hit: false,
            department_id: 'engineering', employee_id: 'alice@example.com',
            api_key_id: 'demo-ak-001', workflow_id: 'customer_support',
            customer_id: 'cust_acme', feature_id: 'reply_assist',
            owner_type: 'tenant', owner_id: 'demo-tenant',
            budget_id: null, policy_id: null, mandate_id: null,
            governance_decision: 'approved', deny_code: null,
            privacy_mode: 'metadata_only',
            prompt_stored: false, response_stored: false, redaction_applied: false,
            retention_expires_at: null,
            evidence_bundle_id: 'demo-bndl-001',
            metadata_decision_source: null, metadata_deny_rule: null,
            created_at: t(6), updated_at: t(6),
        },
        attribution: {
            api_key_id: 'demo-ak-001', department_id: 'engineering',
            employee_id: 'alice@example.com', workflow_id: 'customer_support',
            customer_id: 'cust_acme', feature_id: 'reply_assist',
            owner_type: 'tenant', owner_id: 'demo-tenant',
            completeness_count: 6, completeness_pct: 100,
            missing: [], status: 'attributed',
        },
        governance: {
            decision: 'approved', deny_code: null, deny_rule: null,
            decision_source: null, budget_id: null, policy_id: null,
            mandate_id: null, status_code: 200, success: true,
            provider_call_blocked: false,
        },
        privacy: {
            privacy_mode: 'metadata_only',
            prompt_stored: false, response_stored: false,
            redaction_applied: false, retention_expires_at: null,
            content_displayed: false,
        },
        evidence: {
            evidence_bundle_id: 'demo-bndl-001',
            present: true,
            bundle_url: '/api/v1/analytics/evidence-bundle/demo-bndl-001',
        },
        cost: {
            cost_usd: 0.0124, direct_cost_usd: 0.0118,
            input_tokens: 412, output_tokens: 180, total_tokens: 592,
            avg_cost_per_1k_tokens: 0.0209,
            zero_cost_denied: false,
        },
        related_events: [],
        outcome: null,
        explanation: {
            headline: 'This demo request was approved and completed through openai using gpt-4o-mini. Total provider cost was $0.01.',
            details: [
                'Token usage: 412 input, 180 output, 592 total.',
                'Prompt content was not stored.',
                'Response content was not stored.',
            ],
            notes: [],
        },
    };
}
