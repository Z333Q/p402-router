/**
 * Slice 3M — Accountability Health Center types.
 *
 * Single executive readiness surface. Composes existing read-only modules
 * (Slice 3K outcome coverage, Slice 3D flip readiness, Slice 3I report
 * aggregations, plus lightweight Slice 3M-local SQL for meter / attribution
 * / evidence / control / privacy). NEVER produces recommendations or
 * savings claims; the response disclaimers pin that contract.
 */

import type { ReadinessStatus } from '@/lib/prove/coverage';
import type { FlipStatus } from '@/lib/flip-readiness/types';

/**
 * Status vocabulary the dashboard understands. Six values cover every
 * dimension; the score function maps each to a 0..100 subscore.
 *
 *   blocked   — dimension is unusable. Forces overall status to blocked.
 *   warning   — operational but with cleanup needed.
 *   healthy   — green.
 *   not_ready / observing / ready_for_optimize_analysis are passthrough
 *   states from Slice 3K for the outcomes dimension; the score map below
 *   gives each its own subscore.
 *   unknown   — too little data to judge.
 */
export type DimensionStatus =
    | 'healthy'
    | 'warning'
    | 'blocked'
    | 'unknown'
    | 'observing'
    | 'not_ready'
    | 'ready_for_optimize_analysis';

export interface DimensionScore {
    /** 0..100 — the contribution this dimension makes to the overall score. */
    subscore: number;
    /** Raw weight of this dimension. */
    weight: number;
    /** Weighted contribution (subscore * weight / 100), already weighted. */
    weighted: number;
}

export interface MeterHealth {
    status: DimensionStatus;
    score: DimensionScore;
    total_events: number;
    events_in_period: number;
    most_recent_event_at: string | null;
    event_freshness_seconds: number | null;
    source_distribution: Array<{ source: string; count: number }>;
    outbox_pending: number;
    outbox_abandoned: number;
    explainer: string;
}

export interface AttributionHealth {
    status: DimensionStatus;
    score: DimensionScore;
    /** Per-FK coverage = events_with_that_FK_set / events_in_period. */
    department_coverage_pct: number;
    employee_coverage_pct: number;
    workflow_coverage_pct: number;
    customer_coverage_pct: number;
    feature_coverage_pct: number;
    api_key_coverage_pct: number;
    unattributed_event_count: number;
    unattributed_spend_usd: number;
    explainer: string;
}

export interface EvidenceHealth {
    status: DimensionStatus;
    score: DimensionScore;
    events_with_evidence: number;
    events_missing_evidence: number;
    coverage_pct: number;
    missing_by_department: Array<{ key: string; missing: number; total: number }>;
    missing_by_workflow:   Array<{ key: string; missing: number; total: number }>;
    missing_by_provider:   Array<{ key: string; missing: number; total: number }>;
    explainer: string;
}

export interface ControlHealth {
    status: DimensionStatus;
    score: DimensionScore;
    denied_event_count: number;
    denied_with_deny_code: number;
    denied_with_decision_source: number;
    denied_with_deny_rule: number;
    denied_provider_cost_usd: number;  // expected $0 by construction
    deny_code_distribution: Array<{ deny_code: string; count: number }>;
    governance_decision_coverage_pct: number;
    explainer: string;
}

export interface OutcomeHealth {
    status: DimensionStatus;
    score: DimensionScore;
    /** Direct passthrough of the 3K readiness verdict. */
    readiness_status: ReadinessStatus;
    coverage_pct: number;
    accepted_count: number;
    accepted_threshold: number;
    coverage_threshold: number;
    window_days: number;
    baseline_threshold: number;
    cost_per_accepted_output_usd: number | null;
    insufficient_data: boolean;
    top_missing_segments: Array<{ label: string; missing_count: number; sample_request_id: string | null }>;
    explainer: string;
}

export interface PrivacyHealth {
    status: DimensionStatus;
    score: DimensionScore;
    privacy_mode_distribution: Array<{ privacy_mode: string; count: number }>;
    prompt_stored_count: number;
    response_stored_count: number;
    redaction_applied_count: number;
    metadata_only_count: number;
    explainer: string;
}

export interface RuntimeFlipHealth {
    status: DimensionStatus;
    score: DimensionScore;
    /** Direct passthrough of the 3D/3F flip-readiness assessment. */
    flip_status: FlipStatus;
    flip_reason: string;
    mtd_passes: boolean;
    prev_calendar_month_complete: boolean;
    explainer: string;
}

export interface OptimizeReadinessHealth {
    status: DimensionStatus;
    score: DimensionScore;
    /**
     * NEVER true in this slice. Surfaced as a flag so the dashboard
     * can render "blocked" clearly and the contract is pinned by tests.
     */
    recommendations_enabled: false;
    /** Same. Pinned by tests. */
    savings_claims_enabled: false;
    readiness_status: ReadinessStatus;
    explainer: string;
}

export interface HealthDimensions {
    meter:              MeterHealth;
    attribution:        AttributionHealth;
    evidence:           EvidenceHealth;
    control:            ControlHealth;
    outcomes:           OutcomeHealth;
    privacy:            PrivacyHealth;
    runtime_flip:       RuntimeFlipHealth;
    optimize_readiness: OptimizeReadinessHealth;
}

export type OverallStatus = 'blocked' | 'needs_cleanup' | 'operational' | 'audit_ready';

export interface OverallHealth {
    /** 0..100. Weighted sum of dimension subscores. */
    score: number;
    status: OverallStatus;
    label: string;
    explainer: string;
}

export interface CleanupPriority {
    id: string;
    category: 'outcomes' | 'attribution' | 'evidence' | 'control' | 'meter' | 'privacy';
    severity: 'high' | 'medium' | 'low';
    title: string;
    count: number;
    affected_spend_usd: number;
    /** Relative URL of the dashboard / search the operator should open. */
    link: string;
    why_it_matters: string;
}

export interface AccountabilityResponse {
    ok: true;
    generated_at: string;
    period: { since: string; until: string };
    overall: OverallHealth;
    dimensions: HealthDimensions;
    cleanup_priorities: CleanupPriority[];
    disclaimers: {
        readiness_not_recommendation: true;
        no_savings_claim: true;
        content_displayed: false;
        runtime_flip_unchanged: true;
        optimize_recommendations_blocked: true;
    };
}

// ─────────────────────────────────────────────────────────────────────────
// Weights from the 3M brief.
// ─────────────────────────────────────────────────────────────────────────

export const DEFAULT_WEIGHTS = {
    meter:              15,
    attribution:        15,
    evidence:           15,
    control:            15,
    outcomes:           20,
    privacy:            10,
    runtime_flip:       10,
} as const;

/**
 * The Optimize readiness dimension is informational only. It is NOT in the
 * weighted score — recommendations remain blocked and the brief excludes
 * it from the weight table. We still expose its subscore for the
 * dashboard.
 */
