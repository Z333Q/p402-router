/**
 * Slice 3M — Accountability scoring (pure tests).
 *
 * Pins the status -> subscore map, the per-dimension derivation rules,
 * the weighted overall composition, the no-averaging-of-blocked rule,
 * and the non-recommendation cleanup generator.
 */

import { describe, expect, it } from 'vitest';
import {
    buildCleanupPriorities,
    composeOverall,
    deriveAttributionStatus,
    deriveControlStatus,
    deriveEvidenceStatus,
    deriveMeterStatus,
    derivePrivacyStatus,
    deriveRuntimeFlipStatus,
    scoreFor,
    statusToSubscore,
} from '@/lib/accountability/score';
import { DEFAULT_WEIGHTS, type HealthDimensions } from '@/lib/accountability/types';

// ─────────────────────────────────────────────────────────────────────────
// Subscore map
// ─────────────────────────────────────────────────────────────────────────

describe('statusToSubscore', () => {
    it.each([
        ['healthy', 100],
        ['ready_for_optimize_analysis', 100],
        ['observing', 75],
        ['warning', 60],
        ['not_ready', 30],
        ['unknown', 50],
        ['blocked', 0],
    ] as const)('%s -> %d', (s, expected) => {
        expect(statusToSubscore(s)).toBe(expected);
    });

    it('scoreFor produces (subscore * weight / 100)', () => {
        expect(scoreFor('healthy', 20)).toEqual({ subscore: 100, weight: 20, weighted: 20 });
        expect(scoreFor('blocked', 20)).toEqual({ subscore: 0,   weight: 20, weighted: 0  });
        expect(scoreFor('warning', 10)).toEqual({ subscore: 60,  weight: 10, weighted: 6  });
    });
});

// ─────────────────────────────────────────────────────────────────────────
// Per-dimension derivation
// ─────────────────────────────────────────────────────────────────────────

describe('deriveMeterStatus', () => {
    it('unknown with no events', () => {
        expect(deriveMeterStatus({ total_events: 0, events_in_period: 0, event_freshness_seconds: null, outbox_pending: 0, outbox_abandoned: 0 }).status).toBe('unknown');
    });
    it('blocked when outbox has abandoned rows', () => {
        expect(deriveMeterStatus({ total_events: 100, events_in_period: 50, event_freshness_seconds: 30, outbox_pending: 0, outbox_abandoned: 3 }).status).toBe('blocked');
    });
    it('warning when freshness > 1 day', () => {
        expect(deriveMeterStatus({ total_events: 100, events_in_period: 50, event_freshness_seconds: 90_000, outbox_pending: 0, outbox_abandoned: 0 }).status).toBe('warning');
    });
    it('warning when there are pending outbox rows', () => {
        expect(deriveMeterStatus({ total_events: 100, events_in_period: 50, event_freshness_seconds: 30, outbox_pending: 2, outbox_abandoned: 0 }).status).toBe('warning');
    });
    it('warning when total events exist but in-period is zero', () => {
        expect(deriveMeterStatus({ total_events: 100, events_in_period: 0, event_freshness_seconds: 30, outbox_pending: 0, outbox_abandoned: 0 }).status).toBe('warning');
    });
    it('healthy when all signals green', () => {
        expect(deriveMeterStatus({ total_events: 100, events_in_period: 50, event_freshness_seconds: 30, outbox_pending: 0, outbox_abandoned: 0 }).status).toBe('healthy');
    });
});

describe('deriveAttributionStatus', () => {
    const base = { events_in_period: 1000, total_spend_usd: 1000 };
    it('unknown when no events', () => {
        expect(deriveAttributionStatus({ events_in_period: 0, total_spend_usd: 0, unattributed_event_count: 0, unattributed_spend_usd: 0 }).status).toBe('unknown');
    });
    it('blocked above 50% unattributed', () => {
        expect(deriveAttributionStatus({ ...base, unattributed_event_count: 600, unattributed_spend_usd: 200 }).status).toBe('blocked');
        expect(deriveAttributionStatus({ ...base, unattributed_event_count: 100, unattributed_spend_usd: 700 }).status).toBe('blocked');
    });
    it('warning 5..50%', () => {
        expect(deriveAttributionStatus({ ...base, unattributed_event_count: 100, unattributed_spend_usd: 100 }).status).toBe('warning');
    });
    it('healthy under 5%', () => {
        expect(deriveAttributionStatus({ ...base, unattributed_event_count: 10, unattributed_spend_usd: 10 }).status).toBe('healthy');
    });
});

describe('deriveEvidenceStatus', () => {
    it('unknown with no events', () => {
        expect(deriveEvidenceStatus({ events_in_period: 0, events_with_evidence: 0, events_missing_evidence: 0 }).status).toBe('unknown');
    });
    it('healthy at >= 95%', () => {
        expect(deriveEvidenceStatus({ events_in_period: 100, events_with_evidence: 96, events_missing_evidence: 4 }).status).toBe('healthy');
    });
    it('warning 75..95%', () => {
        expect(deriveEvidenceStatus({ events_in_period: 100, events_with_evidence: 80, events_missing_evidence: 20 }).status).toBe('warning');
    });
    it('blocked under 75%', () => {
        expect(deriveEvidenceStatus({ events_in_period: 100, events_with_evidence: 50, events_missing_evidence: 50 }).status).toBe('blocked');
    });
});

describe('deriveControlStatus', () => {
    const base = { events_in_period: 100, governance_decision_set_count: 100 };
    it('unknown with zero denied', () => {
        expect(deriveControlStatus({ ...base, denied_event_count: 0, denied_with_deny_code: 0, denied_with_decision_source: 0, denied_with_deny_rule: 0, denied_provider_cost_usd: 0 }).status).toBe('unknown');
    });
    it('blocked when denied provider cost > 0', () => {
        expect(deriveControlStatus({ ...base, denied_event_count: 5, denied_with_deny_code: 5, denied_with_decision_source: 5, denied_with_deny_rule: 5, denied_provider_cost_usd: 1.23 }).status).toBe('blocked');
    });
    it('blocked when some denied lack deny_code', () => {
        expect(deriveControlStatus({ ...base, denied_event_count: 5, denied_with_deny_code: 3, denied_with_decision_source: 5, denied_with_deny_rule: 5, denied_provider_cost_usd: 0 }).status).toBe('blocked');
    });
    it('warning when deny_rule / decision_source are partial', () => {
        expect(deriveControlStatus({ ...base, denied_event_count: 5, denied_with_deny_code: 5, denied_with_decision_source: 5, denied_with_deny_rule: 3, denied_provider_cost_usd: 0 }).status).toBe('warning');
    });
    it('healthy when all tagged and $0', () => {
        expect(deriveControlStatus({ ...base, denied_event_count: 5, denied_with_deny_code: 5, denied_with_decision_source: 5, denied_with_deny_rule: 5, denied_provider_cost_usd: 0 }).status).toBe('healthy');
    });
});

describe('derivePrivacyStatus', () => {
    it('unknown with no events', () => {
        expect(derivePrivacyStatus({ events_in_period: 0, prompt_stored_count: 0, response_stored_count: 0, redaction_applied_count: 0, metadata_only_count: 0 }).status).toBe('unknown');
    });
    it('warning when content stored without redaction', () => {
        expect(derivePrivacyStatus({ events_in_period: 100, prompt_stored_count: 10, response_stored_count: 0, redaction_applied_count: 0, metadata_only_count: 90 }).status).toBe('warning');
    });
    it('healthy when content stored with matching redaction', () => {
        expect(derivePrivacyStatus({ events_in_period: 100, prompt_stored_count: 5, response_stored_count: 5, redaction_applied_count: 5, metadata_only_count: 90 }).status).toBe('healthy');
    });
});

describe('deriveRuntimeFlipStatus', () => {
    it.each([
        ['ready_to_flip', 'healthy'],
        ['observing',     'observing'],
        ['not_ready',     'not_ready'],
        ['blocked',       'blocked'],
    ] as const)('%s -> %s', (flip, expected) => {
        expect(deriveRuntimeFlipStatus(flip)).toBe(expected);
    });
});

// ─────────────────────────────────────────────────────────────────────────
// composeOverall — no-averaging-of-blocked rule
// ─────────────────────────────────────────────────────────────────────────

function dim(status: Parameters<typeof statusToSubscore>[0], weight: number) {
    return { status, score: scoreFor(status, weight), explainer: '' };
}

function makeDimensions(over: Partial<Record<keyof HealthDimensions, Parameters<typeof statusToSubscore>[0]>> = {}): HealthDimensions {
    const s = {
        meter:        over.meter        ?? 'healthy',
        attribution:  over.attribution  ?? 'healthy',
        evidence:     over.evidence     ?? 'healthy',
        control:      over.control      ?? 'healthy',
        outcomes:     over.outcomes     ?? 'ready_for_optimize_analysis',
        privacy:      over.privacy      ?? 'healthy',
        runtime_flip: over.runtime_flip ?? 'observing',
        optimize_readiness: over.optimize_readiness ?? 'ready_for_optimize_analysis',
    } as const;
    // We only need the fields composeOverall + buildCleanupPriorities read.
    return {
        meter: { ...dim(s.meter, DEFAULT_WEIGHTS.meter), total_events: 1, events_in_period: 1, most_recent_event_at: null, event_freshness_seconds: null, source_distribution: [], outbox_pending: 0, outbox_abandoned: 0 },
        attribution: { ...dim(s.attribution, DEFAULT_WEIGHTS.attribution), department_coverage_pct: 100, employee_coverage_pct: 100, workflow_coverage_pct: 100, customer_coverage_pct: 100, feature_coverage_pct: 100, api_key_coverage_pct: 100, unattributed_event_count: 0, unattributed_spend_usd: 0 },
        evidence: { ...dim(s.evidence, DEFAULT_WEIGHTS.evidence), events_with_evidence: 100, events_missing_evidence: 0, coverage_pct: 100, missing_by_department: [], missing_by_workflow: [], missing_by_provider: [] },
        control: { ...dim(s.control, DEFAULT_WEIGHTS.control), denied_event_count: 0, denied_with_deny_code: 0, denied_with_decision_source: 0, denied_with_deny_rule: 0, denied_provider_cost_usd: 0, deny_code_distribution: [], governance_decision_coverage_pct: 100 },
        outcomes: { ...dim(s.outcomes, DEFAULT_WEIGHTS.outcomes), readiness_status: 'ready_for_optimize_analysis', coverage_pct: 100, accepted_count: 100, accepted_threshold: 30, coverage_threshold: 20, window_days: 30, baseline_threshold: 14, cost_per_accepted_output_usd: 0.5, insufficient_data: false, top_missing_segments: [] },
        privacy: { ...dim(s.privacy, DEFAULT_WEIGHTS.privacy), privacy_mode_distribution: [], prompt_stored_count: 0, response_stored_count: 0, redaction_applied_count: 0, metadata_only_count: 0 },
        runtime_flip: { ...dim(s.runtime_flip, DEFAULT_WEIGHTS.runtime_flip), flip_status: 'observing', flip_reason: '', mtd_passes: true, prev_calendar_month_complete: false },
        optimize_readiness: { ...dim(s.optimize_readiness, 0), recommendations_enabled: false, savings_claims_enabled: false, readiness_status: 'ready_for_optimize_analysis' },
    };
}

describe('composeOverall', () => {
    it('audit_ready when every scored dim is healthy / ready', () => {
        const o = composeOverall(makeDimensions());
        expect(o.score).toBeGreaterThanOrEqual(85);
        expect(o.status).toBe('audit_ready');
        expect(o.label).toBe('AUDIT READY');
    });

    it('FORCES blocked even with a high numeric score when ANY dimension is blocked', () => {
        // Only the small-weight privacy dim is blocked (weight 10), so the
        // raw weighted total stays high (~90), but the override drops
        // overall to blocked.
        const o = composeOverall(makeDimensions({ privacy: 'blocked' }));
        expect(o.status).toBe('blocked');
        expect(o.explainer).toContain('privacy');
    });

    it('lists every blocked dimension by name in the explainer', () => {
        const o = composeOverall(makeDimensions({
            meter: 'blocked',
            attribution: 'blocked',
            control: 'blocked',
        }));
        expect(o.status).toBe('blocked');
        for (const name of ['meter', 'attribution', 'control']) {
            expect(o.explainer).toContain(name);
        }
    });

    it('needs_cleanup in the 40..69 band when no dim is blocked', () => {
        const o = composeOverall(makeDimensions({
            meter: 'warning', attribution: 'warning', evidence: 'warning',
            control: 'warning', outcomes: 'not_ready', privacy: 'warning',
            runtime_flip: 'not_ready',
        }));
        expect(o.score).toBeGreaterThanOrEqual(40);
        expect(o.score).toBeLessThan(70);
        expect(o.status).toBe('needs_cleanup');
    });
});

// ─────────────────────────────────────────────────────────────────────────
// Cleanup priorities — never proposes a recommendation
// ─────────────────────────────────────────────────────────────────────────

describe('buildCleanupPriorities', () => {
    it('produces entries that NEVER use recommendation / savings language', () => {
        const items = buildCleanupPriorities(makeDimensions({
            outcomes: 'not_ready', attribution: 'warning', evidence: 'warning',
            control: 'warning', privacy: 'warning',
        }));
        for (const item of items) {
            const text = `${item.title} ${item.why_it_matters}`.toLowerCase();
            for (const forbidden of [
                'savings', 'we recommend', 'switch to ', 'projected savings',
                'cheaper than', 'use instead', 'route to instead',
            ]) {
                expect(text, `cleanup ${item.id} must not contain '${forbidden}'`).not.toContain(forbidden);
            }
        }
    });

    it('orders by severity (high -> medium -> low) then count desc', () => {
        const items = buildCleanupPriorities(makeDimensions({
            outcomes: 'not_ready',    // high severity entries
            attribution: 'blocked',   // high
            privacy: 'warning',       // medium
        }));
        for (let i = 1; i < items.length; i++) {
            const a = items[i - 1]!.severity;
            const b = items[i]!.severity;
            const rank: Record<string, number> = { high: 0, medium: 1, low: 2 };
            expect(rank[a]! <= rank[b]!).toBe(true);
        }
    });

    it('returns empty list when every scored dim is healthy / ready', () => {
        const items = buildCleanupPriorities(makeDimensions());
        expect(items).toEqual([]);
    });

    it('every item carries category, link, and why_it_matters', () => {
        const items = buildCleanupPriorities(makeDimensions({
            attribution: 'blocked', evidence: 'warning',
            outcomes: 'not_ready', control: 'warning',
        }));
        for (const item of items) {
            expect(item.category.length).toBeGreaterThan(0);
            expect(item.link.length).toBeGreaterThan(0);
            expect(item.why_it_matters.length).toBeGreaterThan(0);
        }
    });
});
