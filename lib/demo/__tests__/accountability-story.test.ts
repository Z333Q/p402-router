/**
 * Slice 3P — Demo data builders.
 *
 * Pin every required scenario from the brief:
 *   - Healthy metering, weak outcomes
 *   - Denied event with $0 provider cost
 *   - Missing attribution
 *   - Missing evidence
 *   - Privacy metadata-only mode
 *   - Runtime flip blocked by observation window
 *   - Optimize analysis not ready due to thin outcome data
 *
 * Plus the isDemoMode gate (only `demo=1` counts) and the safety contract
 * that every demo row carries a `_demo: true` marker so a future
 * export-path regression cannot silently leak demo data as real data.
 */

import { describe, expect, it } from 'vitest';
import {
    DEMO_PREVIEW_LABEL,
    DEMO_STORY_MODE_ENABLED_COPY,
    buildDemoAccountabilityHealth,
    buildDemoCleanupPriorities,
    buildDemoOutcomeCoverage,
    buildDemoProveEvents,
    isDemoMode,
} from '@/lib/demo/accountability-story';

// ─────────────────────────────────────────────────────────────────────────
// isDemoMode
// ─────────────────────────────────────────────────────────────────────────

describe('isDemoMode', () => {
    function sp(value: string | null) {
        return { get: (k: string) => (k === 'demo' ? value : null) };
    }

    it('returns true only for the exact string "1"', () => {
        expect(isDemoMode(sp('1'))).toBe(true);
    });

    it('returns false for any other truthy-looking value', () => {
        for (const v of ['true', 'yes', 'on', 'TRUE', '01', '0', '', ' 1', '1 ']) {
            expect(isDemoMode(sp(v)), `demo='${v}' must not enable demo mode`).toBe(false);
        }
    });

    it('returns false when the param is missing', () => {
        expect(isDemoMode(sp(null))).toBe(false);
        expect(isDemoMode(null)).toBe(false);
        expect(isDemoMode(undefined)).toBe(false);
    });
});

// ─────────────────────────────────────────────────────────────────────────
// Story copy
// ─────────────────────────────────────────────────────────────────────────

describe('Demo copy constants', () => {
    it('label is "Demo preview"', () => {
        expect(DEMO_PREVIEW_LABEL).toBe('Demo preview');
    });
    it('enabled copy carries the no-write contract verbatim', () => {
        expect(DEMO_STORY_MODE_ENABLED_COPY).toContain('example data');
        expect(DEMO_STORY_MODE_ENABLED_COPY).toContain('not written to your ledger');
        expect(DEMO_STORY_MODE_ENABLED_COPY).toContain('audit or finance exports');
    });
});

// ─────────────────────────────────────────────────────────────────────────
// Accountability health story
// ─────────────────────────────────────────────────────────────────────────

describe('buildDemoAccountabilityHealth', () => {
    const h = buildDemoAccountabilityHealth();

    it('carries the _demo marker at the root AND on every cleanup entry', () => {
        expect(h._demo).toBe(true);
        for (const c of h.cleanup_priorities) {
            expect(c._demo, `cleanup ${c.id} must carry _demo: true`).toBe(true);
        }
    });

    it('overall status is needs_cleanup with a NEEDS CLEANUP label', () => {
        expect(h.overall.status).toBe('needs_cleanup');
        expect(h.overall.label).toBe('NEEDS CLEANUP');
        expect(h.overall.score).toBeGreaterThanOrEqual(40);
        expect(h.overall.score).toBeLessThan(85);
    });

    it('discloses that Optimize recommendations and runtime flip remain blocked', () => {
        expect(h.disclaimers.optimize_recommendations_blocked).toBe(true);
        expect(h.disclaimers.runtime_flip_unchanged).toBe(true);
        expect(h.disclaimers.no_savings_claim).toBe(true);
        expect(h.disclaimers.content_displayed).toBe(false);
    });

    it('includes a denied event with cost_usd = $0 (brief scenario #2)', () => {
        const control = h.dimensions.control as { denied_event_count: number; denied_provider_cost_usd: number };
        expect(control.denied_event_count).toBeGreaterThan(0);
        expect(control.denied_provider_cost_usd).toBe(0);
    });

    it('includes missing attribution (brief scenario #3)', () => {
        const a = h.dimensions.attribution as { unattributed_event_count: number; unattributed_spend_usd: number };
        expect(a.unattributed_event_count).toBeGreaterThan(0);
        expect(a.unattributed_spend_usd).toBeGreaterThan(0);
    });

    it('includes missing evidence (brief scenario #4)', () => {
        const e = h.dimensions.evidence as { events_missing_evidence: number };
        expect(e.events_missing_evidence).toBeGreaterThan(0);
    });

    it('uses metadata-only privacy posture (brief scenario #5)', () => {
        const p = h.dimensions.privacy as {
            prompt_stored_count: number; response_stored_count: number; metadata_only_count: number;
        };
        expect(p.prompt_stored_count).toBe(0);
        expect(p.response_stored_count).toBe(0);
        expect(p.metadata_only_count).toBeGreaterThan(0);
    });

    it('runtime flip is observing or blocked, not "ready_to_flip" (brief scenario #6)', () => {
        const r = h.dimensions.runtime_flip as { flip_status: string; status: string };
        expect(['observing', 'not_ready', 'blocked']).toContain(r.flip_status);
        expect(['observing', 'not_ready', 'blocked', 'warning']).toContain(r.status);
    });

    it('outcomes are not_ready with insufficient cost-per-accepted data (brief scenario #7)', () => {
        const o = h.dimensions.outcomes as {
            readiness_status: string; status: string;
            cost_per_accepted_output_usd: number | null; insufficient_data: boolean;
        };
        expect(o.readiness_status).toBe('not_ready');
        expect(o.status).toBe('not_ready');
        expect(o.cost_per_accepted_output_usd).toBeNull();
        expect(o.insufficient_data).toBe(true);
    });

    it('optimize_readiness pins recommendations + savings to false', () => {
        const r = h.dimensions.optimize_readiness as {
            recommendations_enabled: boolean; savings_claims_enabled: boolean;
        };
        expect(r.recommendations_enabled).toBe(false);
        expect(r.savings_claims_enabled).toBe(false);
    });
});

// ─────────────────────────────────────────────────────────────────────────
// Outcome coverage story
// ─────────────────────────────────────────────────────────────────────────

describe('buildDemoOutcomeCoverage', () => {
    const c = buildDemoOutcomeCoverage();

    it('carries the _demo marker on the envelope and on every missing segment', () => {
        expect(c._demo).toBe(true);
        for (const m of c.missing_outcome_leaderboard) {
            expect(m._demo).toBe(true);
        }
    });

    it('readiness status is not_ready with insufficient cost-per-accepted data', () => {
        expect(c.readiness.status).toBe('not_ready');
        expect(c.totals.cost_per_accepted_output_usd).toBeNull();
        expect(c.totals.cost_per_accepted_insufficient_data).toBe(true);
    });

    it('coverage is below the default 20% threshold (insufficient outcome data scenario)', () => {
        expect(c.totals.coverage_pct).toBeLessThan(c.thresholds.min_coverage_pct);
    });
});

// ─────────────────────────────────────────────────────────────────────────
// Cleanup priorities + recent events
// ─────────────────────────────────────────────────────────────────────────

describe('buildDemoCleanupPriorities', () => {
    const items = buildDemoCleanupPriorities();

    it('every item carries _demo: true', () => {
        for (const i of items) expect(i._demo).toBe(true);
    });

    it('contains at least one item per major category surface', () => {
        const categories = new Set(items.map((i) => i.category));
        for (const c of ['outcomes', 'attribution', 'evidence', 'control']) {
            expect(categories.has(c as never)).toBe(true);
        }
    });

    it('uses cleanup language, never recommendation language', () => {
        for (const i of items) {
            const text = `${i.title} ${i.why_it_matters}`.toLowerCase();
            for (const forbidden of [
                'we recommend', 'switch to', 'cheaper than', 'projected savings',
                'use instead', 'savings of $',
            ]) {
                expect(text).not.toContain(forbidden);
            }
        }
    });
});

describe('buildDemoProveEvents', () => {
    const events = buildDemoProveEvents();

    it('every event carries _demo: true', () => {
        for (const e of events) expect(e._demo).toBe(true);
    });

    it('includes at least one denied event with $0 cost', () => {
        const denied = events.find((e) => e.governance_decision === 'denied');
        expect(denied, 'must include a denied event').toBeDefined();
        expect(denied!.cost_usd).toBe('0.0000');
        expect(denied!.deny_code).toBe('API_KEY_BUDGET_EXCEEDED');
        expect(denied!.provider).toBeNull();
        expect(denied!.model_used).toBeNull();
    });

    it('every event is metadata_only (no stored content)', () => {
        for (const e of events) {
            expect(e.privacy_mode).toBe('metadata_only');
        }
    });

    it('includes at least one event missing attribution', () => {
        const missing = events.find((e) => e.department_id == null && e.workflow_id == null);
        expect(missing).toBeDefined();
    });

    it('includes at least one event missing an evidence bundle', () => {
        const missing = events.find((e) => e.evidence_bundle_id == null);
        expect(missing).toBeDefined();
    });
});
