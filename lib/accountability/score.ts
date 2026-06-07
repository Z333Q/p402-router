/**
 * Slice 3M — Accountability scoring (pure).
 *
 * Maps each DimensionStatus to a subscore in [0, 100] and composes the
 * weighted overall score. The brief is explicit: blocked dimensions are
 * NOT averaged away — any blocked dimension forces the overall status
 * to `blocked` even if the weighted score is otherwise high.
 *
 * The cleanup-priority generator composes findings from the loaded
 * dimensions into a ranked list. Each item carries a category, severity,
 * count, affected spend, link, and rationale — never a recommendation.
 */

import { UNATTRIBUTED } from '@/lib/prove/types';
import {
    DEFAULT_WEIGHTS,
    type CleanupPriority,
    type DimensionScore,
    type DimensionStatus,
    type HealthDimensions,
    type OptimizeReadinessHealth,
    type OutcomeHealth,
    type OverallHealth,
    type OverallStatus,
    type RuntimeFlipHealth,
} from './types';

// ─────────────────────────────────────────────────────────────────────────
// Subscore map
// ─────────────────────────────────────────────────────────────────────────

/**
 * DimensionStatus -> raw subscore. Tunable in one place.
 *
 *   healthy                       -> 100
 *   ready_for_optimize_analysis   -> 100 (used by outcomes/optimize dims)
 *   observing                     -> 75
 *   warning                       -> 60
 *   not_ready                     -> 30
 *   unknown                       -> 50 (neutral; not a credit either way)
 *   blocked                       -> 0
 */
export function statusToSubscore(s: DimensionStatus): number {
    switch (s) {
        case 'healthy':                     return 100;
        case 'ready_for_optimize_analysis': return 100;
        case 'observing':                   return 75;
        case 'warning':                     return 60;
        case 'not_ready':                   return 30;
        case 'unknown':                     return 50;
        case 'blocked':                     return 0;
    }
}

/** Compute a DimensionScore from a status and the dimension weight. */
export function scoreFor(status: DimensionStatus, weight: number): DimensionScore {
    const subscore = statusToSubscore(status);
    return {
        subscore,
        weight,
        weighted: (subscore * weight) / 100,
    };
}

// ─────────────────────────────────────────────────────────────────────────
// Per-dimension status derivation
// ─────────────────────────────────────────────────────────────────────────

export interface MeterFacts {
    total_events: number;
    events_in_period: number;
    event_freshness_seconds: number | null;
    outbox_pending: number;
    outbox_abandoned: number;
}
export function deriveMeterStatus(f: MeterFacts): { status: DimensionStatus; explainer: string } {
    if (f.total_events === 0) {
        return { status: 'unknown', explainer: 'No economic events recorded yet. Wire the SDK or meter endpoint and traffic will appear here.' };
    }
    if (f.outbox_abandoned > 0) {
        return { status: 'blocked', explainer: `${f.outbox_abandoned} abandoned outbox rows. Resolve before relying on Monitor / Control numbers.` };
    }
    if (f.events_in_period === 0) {
        return { status: 'warning', explainer: 'No events in the current period. Total event count is non-zero, so this may indicate a paused integration.' };
    }
    if (f.event_freshness_seconds != null && f.event_freshness_seconds > 86_400) {
        return { status: 'warning', explainer: `Most recent event is over a day old (${Math.floor(f.event_freshness_seconds / 3600)}h). Verify your integrations are still emitting.` };
    }
    if (f.outbox_pending > 0) {
        return { status: 'warning', explainer: `${f.outbox_pending} outbox rows pending replay. Watch the retry worker.` };
    }
    return { status: 'healthy', explainer: 'Meter is recording events with healthy freshness and no outbox backlog.' };
}

export interface AttributionFacts {
    events_in_period: number;
    unattributed_event_count: number;
    unattributed_spend_usd: number;
    total_spend_usd: number;
}
export function deriveAttributionStatus(f: AttributionFacts): { status: DimensionStatus; explainer: string } {
    if (f.events_in_period === 0) {
        return { status: 'unknown', explainer: 'No events in the current period.' };
    }
    const unattrPct = (f.unattributed_event_count / f.events_in_period) * 100;
    const unattrSpendPct = f.total_spend_usd > 0
        ? (f.unattributed_spend_usd / f.total_spend_usd) * 100
        : 0;
    if (unattrPct > 50 || unattrSpendPct > 50) {
        return { status: 'blocked', explainer: `${unattrPct.toFixed(1)}% of events and ${unattrSpendPct.toFixed(1)}% of spend are unattributed; finance cannot assign these to budget owners.` };
    }
    if (unattrPct > 5 || unattrSpendPct > 5) {
        return { status: 'warning', explainer: `${unattrPct.toFixed(1)}% of events and ${unattrSpendPct.toFixed(1)}% of spend are unattributed. Tag missing department / employee / workflow / customer / feature / api_key on the offending events.` };
    }
    return { status: 'healthy', explainer: 'Attribution coverage is high. Finance can assign spend to budget owners.' };
}

export interface EvidenceFacts {
    events_in_period: number;
    events_with_evidence: number;
    events_missing_evidence: number;
}
export function deriveEvidenceStatus(f: EvidenceFacts): { status: DimensionStatus; coverage_pct: number; explainer: string } {
    if (f.events_in_period === 0) {
        return { status: 'unknown', coverage_pct: 0, explainer: 'No events in the current period.' };
    }
    const denom = f.events_with_evidence + f.events_missing_evidence;
    const coverage_pct = denom > 0 ? (f.events_with_evidence / denom) * 100 : 0;
    if (coverage_pct >= 95) {
        return { status: 'healthy', coverage_pct, explainer: `Evidence coverage is ${coverage_pct.toFixed(1)}%. Audit packets can rely on the ledger.` };
    }
    if (coverage_pct >= 75) {
        return { status: 'warning', coverage_pct, explainer: `Evidence coverage is ${coverage_pct.toFixed(1)}%. Some events are missing an evidence bundle; this is not automatically noncompliance.` };
    }
    return { status: 'blocked', coverage_pct, explainer: `Evidence coverage is ${coverage_pct.toFixed(1)}%. Attach evidence bundles before relying on Prove for audit.` };
}

export interface ControlFacts {
    denied_event_count: number;
    denied_with_deny_code: number;
    denied_with_decision_source: number;
    denied_with_deny_rule: number;
    denied_provider_cost_usd: number;
    events_in_period: number;
    governance_decision_set_count: number;
}
export function deriveControlStatus(f: ControlFacts): { status: DimensionStatus; explainer: string; governance_decision_coverage_pct: number } {
    const governance_decision_coverage_pct = f.events_in_period > 0
        ? (f.governance_decision_set_count / f.events_in_period) * 100
        : 0;
    if (f.denied_event_count === 0) {
        return {
            status: 'unknown',
            governance_decision_coverage_pct,
            explainer: 'No denied events recorded yet in this period. Control is read-only until denial paths fire.',
        };
    }
    if (f.denied_provider_cost_usd > 0) {
        return {
            status: 'blocked',
            governance_decision_coverage_pct,
            explainer: `Denied events are reporting non-zero provider cost ($${f.denied_provider_cost_usd.toFixed(4)}); this violates the Slice 3E contract that denials happen before provider execution.`,
        };
    }
    if (f.denied_with_deny_code < f.denied_event_count) {
        return {
            status: 'blocked',
            governance_decision_coverage_pct,
            explainer: `${f.denied_event_count - f.denied_with_deny_code} denied events lack a deny_code. Re-record outcomes or check the writer path.`,
        };
    }
    if (f.denied_with_decision_source < f.denied_event_count
        || f.denied_with_deny_rule    < f.denied_event_count) {
        return {
            status: 'warning',
            governance_decision_coverage_pct,
            explainer: 'Some denied events lack metadata.decision_source or metadata.deny_rule. Backfill missing tags so audit packets carry the full story.',
        };
    }
    return {
        status: 'healthy',
        governance_decision_coverage_pct,
        explainer: 'Denied events are recorded with deterministic deny_code, decision_source, deny_rule, and zero provider cost.',
    };
}

export interface PrivacyFacts {
    events_in_period: number;
    prompt_stored_count: number;
    response_stored_count: number;
    redaction_applied_count: number;
    metadata_only_count: number;
}
export function derivePrivacyStatus(f: PrivacyFacts): { status: DimensionStatus; explainer: string } {
    if (f.events_in_period === 0) {
        return { status: 'unknown', explainer: 'No events in the current period.' };
    }
    // If content is stored without redaction, flag a warning so the
    // operator can verify the tenant intended that posture.
    const unredacted_with_content =
        (f.prompt_stored_count - f.redaction_applied_count) > 0
        || (f.response_stored_count - f.redaction_applied_count) > 0;
    if (unredacted_with_content) {
        return {
            status: 'warning',
            explainer: 'Some events store prompt or response content without redaction. Confirm the tenant privacy posture is intentional.',
        };
    }
    return {
        status: 'healthy',
        explainer: 'Privacy posture matches the tenant configuration. Metadata-only events dominate; stored content is redacted where present.',
    };
}

export function deriveOutcomeStatus(
    readiness_status: OutcomeHealth['readiness_status'],
): DimensionStatus {
    // Pass through 3K vocabulary verbatim — those values already act as
    // dimension statuses in the score map.
    return readiness_status;
}

export function deriveRuntimeFlipStatus(flip_status: RuntimeFlipHealth['flip_status']): DimensionStatus {
    switch (flip_status) {
        case 'ready_to_flip': return 'healthy';
        case 'observing':     return 'observing';
        case 'not_ready':     return 'not_ready';
        case 'blocked':       return 'blocked';
    }
}

// ─────────────────────────────────────────────────────────────────────────
// Overall score + status
// ─────────────────────────────────────────────────────────────────────────

/**
 * Composes the weighted score. Blocked dimensions force the overall
 * status to `blocked` regardless of the numeric total — the brief rule
 * "do not average away blocked dimensions" is enforced here.
 */
export function composeOverall(d: HealthDimensions): OverallHealth {
    // Weighted sum across the seven scored dimensions (optimize_readiness
    // is informational only).
    const weighted_total =
        d.meter.score.weighted +
        d.attribution.score.weighted +
        d.evidence.score.weighted +
        d.control.score.weighted +
        d.outcomes.score.weighted +
        d.privacy.score.weighted +
        d.runtime_flip.score.weighted;

    const score = Math.round(weighted_total);

    // Hard override: any blocked dimension drops the overall to blocked
    // (and we surface which dimension caused the block in the explainer).
    const blockedDims: string[] = [];
    if (d.meter.status        === 'blocked') blockedDims.push('meter');
    if (d.attribution.status  === 'blocked') blockedDims.push('attribution');
    if (d.evidence.status     === 'blocked') blockedDims.push('evidence');
    if (d.control.status      === 'blocked') blockedDims.push('control');
    if (d.outcomes.status     === 'blocked') blockedDims.push('outcomes');
    if (d.privacy.status      === 'blocked') blockedDims.push('privacy');
    if (d.runtime_flip.status === 'blocked') blockedDims.push('runtime_flip');

    let status: OverallStatus;
    if (blockedDims.length > 0)  status = 'blocked';
    else if (score < 40)         status = 'blocked';
    else if (score < 70)         status = 'needs_cleanup';
    else if (score < 85)         status = 'operational';
    else                         status = 'audit_ready';

    const label: Record<OverallStatus, string> = {
        blocked:        'BLOCKED',
        needs_cleanup:  'NEEDS CLEANUP',
        operational:    'OPERATIONAL',
        audit_ready:    'AUDIT READY',
    };

    let explainer: string;
    if (blockedDims.length > 0) {
        explainer = `Overall status is blocked because the ${blockedDims.join(', ')} dimension${blockedDims.length === 1 ? ' is' : 's are'} blocked. Weighted score (${score}) is informational only until the blocking dimensions are resolved.`;
    } else if (status === 'audit_ready') {
        explainer = `Score ${score}. All scored dimensions are healthy enough for executive review and audit. Optimize recommendations remain blocked.`;
    } else if (status === 'operational') {
        explainer = `Score ${score}. The accountability system is operational; small cleanup items remain.`;
    } else if (status === 'needs_cleanup') {
        explainer = `Score ${score}. Several cleanup items remain before the system is audit-ready.`;
    } else {
        explainer = `Score ${score}. Multiple dimensions are below threshold.`;
    }

    return { score, status, label: label[status], explainer };
}

// ─────────────────────────────────────────────────────────────────────────
// Cleanup priority generation
// ─────────────────────────────────────────────────────────────────────────

/**
 * Compose a ranked cleanup list from the loaded dimensions. Each entry
 * is a non-recommendation finding: "X events are missing Y" rather than
 * "switch to provider Z". Severity follows the dimension status:
 *
 *   blocked -> high
 *   warning / not_ready / observing -> medium
 *   healthy -> low (typically excluded from the list)
 */
export function buildCleanupPriorities(d: HealthDimensions): CleanupPriority[] {
    const out: CleanupPriority[] = [];

    function sev(status: DimensionStatus): CleanupPriority['severity'] {
        if (status === 'blocked')   return 'high';
        if (status === 'not_ready') return 'high';
        if (status === 'warning' || status === 'observing') return 'medium';
        return 'low';
    }

    // ── Outcomes — top missing segments from 3K ─────────────────────────
    if (d.outcomes.status !== 'ready_for_optimize_analysis' && d.outcomes.status !== 'healthy') {
        const missing = d.outcomes.top_missing_segments.slice(0, 5);
        for (const seg of missing) {
            out.push({
                id: `outcomes:${seg.label}`,
                category: 'outcomes',
                severity: sev(d.outcomes.status),
                title: `Add outcomes for ${seg.label}`,
                count: seg.missing_count,
                affected_spend_usd: 0, // outcome coverage rows do not carry spend
                link: '/dashboard/prove/outcomes',
                why_it_matters: 'Optimize analysis is blocked until outcome coverage is sufficient. Recording accepted / rejected outcomes for this segment unlocks cost-per-accepted-output for it.',
            });
        }
    }

    // ── Attribution ─────────────────────────────────────────────────────
    if (d.attribution.status === 'blocked' || d.attribution.status === 'warning') {
        out.push({
            id: 'attribution:unattributed',
            category: 'attribution',
            severity: sev(d.attribution.status),
            title: `Resolve ${d.attribution.unattributed_event_count.toLocaleString()} unattributed events`,
            count: d.attribution.unattributed_event_count,
            affected_spend_usd: d.attribution.unattributed_spend_usd,
            link: '/dashboard/prove?attribution_status=unattributed',
            why_it_matters: 'Finance cannot assign spend to a budget owner until at least one of department, employee, workflow, customer, feature, or api_key is set on each event.',
        });
    }

    // ── Evidence ────────────────────────────────────────────────────────
    if (d.evidence.status === 'blocked' || d.evidence.status === 'warning') {
        out.push({
            id: 'evidence:missing',
            category: 'evidence',
            severity: sev(d.evidence.status),
            title: `Attach evidence bundles for ${d.evidence.events_missing_evidence.toLocaleString()} events`,
            count: d.evidence.events_missing_evidence,
            affected_spend_usd: 0,
            link: '/dashboard/prove?evidence_status=missing',
            why_it_matters: 'Evidence bundles are how audit packets prove a request happened with the metadata claimed. Missing bundles do not automatically mean noncompliance, but they limit what audit can verify.',
        });
        for (const row of d.evidence.missing_by_provider.slice(0, 3)) {
            if (row.missing === 0) continue;
            out.push({
                id: `evidence:provider:${row.key}`,
                category: 'evidence',
                severity: 'medium',
                title: `Attach evidence for provider ${row.key}`,
                count: row.missing,
                affected_spend_usd: 0,
                link: `/dashboard/prove?provider=${encodeURIComponent(row.key)}&evidence_status=missing`,
                why_it_matters: 'Concentrated evidence gaps by vendor make procurement review harder.',
            });
        }
    }

    // ── Control ─────────────────────────────────────────────────────────
    if (d.control.status === 'warning' || d.control.status === 'blocked') {
        const missingTags = Math.max(0, d.control.denied_event_count - d.control.denied_with_deny_rule);
        if (missingTags > 0) {
            out.push({
                id: 'control:missing-deny-rule',
                category: 'control',
                severity: sev(d.control.status),
                title: `Review ${missingTags.toLocaleString()} denied events missing deny_rule`,
                count: missingTags,
                affected_spend_usd: 0,
                link: '/dashboard/prove?governance_decision=denied',
                why_it_matters: 'Audit packets need the deny_rule so finance can see which configured limit triggered the denial.',
            });
        }
    }

    // ── Meter ───────────────────────────────────────────────────────────
    if (d.meter.outbox_pending > 0 || d.meter.outbox_abandoned > 0) {
        out.push({
            id: 'meter:outbox',
            category: 'meter',
            severity: d.meter.outbox_abandoned > 0 ? 'high' : 'medium',
            title: `Resolve ${d.meter.outbox_pending + d.meter.outbox_abandoned} outbox writes`,
            count: d.meter.outbox_pending + d.meter.outbox_abandoned,
            affected_spend_usd: 0,
            link: '/dashboard/audit',
            why_it_matters: 'Pending or abandoned writes mean some economic events have not landed in the canonical ledger. The retry worker should drain them.',
        });
    }

    // ── Privacy ─────────────────────────────────────────────────────────
    if (d.privacy.status === 'warning') {
        out.push({
            id: 'privacy:unredacted-stored',
            category: 'privacy',
            severity: 'medium',
            title: 'Verify unredacted stored-content posture',
            count: d.privacy.prompt_stored_count + d.privacy.response_stored_count,
            affected_spend_usd: 0,
            link: '/dashboard/settings',
            why_it_matters: 'Some events store prompt or response content without recording a redaction step. Confirm the tenant privacy mode is intentional or roll back to metadata-only.',
        });
    }

    // Stable ordering: severity high -> medium -> low, then count desc.
    const SEV_RANK: Record<CleanupPriority['severity'], number> = { high: 0, medium: 1, low: 2 };
    return out.sort((a, b) => {
        if (SEV_RANK[a.severity] !== SEV_RANK[b.severity]) return SEV_RANK[a.severity] - SEV_RANK[b.severity];
        return b.count - a.count;
    });
}

// ─────────────────────────────────────────────────────────────────────────
// Convenience: dimension scores from the default weights
// ─────────────────────────────────────────────────────────────────────────

export const DIMENSION_WEIGHTS = DEFAULT_WEIGHTS;

/** Best-effort canonical unattributed label, kept here for cleanup messages. */
export const UNATTRIBUTED_LABEL = UNATTRIBUTED;

// Compile-time assertions to catch a future regression that changes the
// outcome readiness vocabulary without updating the scoring map.
export type _OutcomeHealthAssertion = OutcomeHealth['readiness_status'];
export type _OptimizeAssertion = OptimizeReadinessHealth['recommendations_enabled'];
