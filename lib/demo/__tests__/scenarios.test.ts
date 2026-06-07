/**
 * Slice 3Q — Vertical Demo Story Alignment tests.
 *
 * Pin the scenario library + selector contract:
 *   - selector default is enterprise; unknown values fall back to enterprise
 *   - every vertical carries the safety labels the truth document demands
 *     (healthcare: no PHI + human approval required, legal: synthetic data
 *      room + human legal review, real estate: synthetic docs + human final
 *      decision, enterprise: Optimize recommendations remain blocked)
 *   - withDemoQs preserves scenario continuity across internal links
 *   - the per-scenario builders never include prompt/response content
 *   - cleanup language stays cleanup, never recommendation
 */

import { describe, expect, it } from 'vitest';
import {
    DEFAULT_SCENARIO,
    SCENARIOS,
    SCENARIO_META,
    buildDemoQs,
    getDemoScenario,
    getScenarioBanner,
    getScenarioCleanup,
    withDemoQs,
    type DemoScenario,
} from '@/lib/demo/scenarios';
import {
    buildDemoAccountabilityHealth,
    buildDemoCleanupPriorities,
    buildDemoOutcomeCoverage,
    buildDemoSearchResponse,
} from '@/lib/demo/accountability-story';

// ─────────────────────────────────────────────────────────────────────────
// Selector
// ─────────────────────────────────────────────────────────────────────────

describe('getDemoScenario', () => {
    function sp(value: string | null) {
        return { get: (k: string) => (k === 'scenario' ? value : null) };
    }

    it('defaults to enterprise_ai_spend_control when scenario is missing', () => {
        expect(getDemoScenario(sp(null))).toBe('enterprise_ai_spend_control');
        expect(getDemoScenario(null)).toBe('enterprise_ai_spend_control');
        expect(getDemoScenario(undefined)).toBe('enterprise_ai_spend_control');
    });

    it('accepts canonical and alias values', () => {
        for (const [input, expected] of [
            ['enterprise',                    'enterprise_ai_spend_control'],
            ['enterprise_ai_spend_control',   'enterprise_ai_spend_control'],
            ['healthcare',                    'healthcare_prior_auth'],
            ['healthcare_prior_auth',         'healthcare_prior_auth'],
            ['legal',                         'legal_mna_due_diligence'],
            ['legal_mna_due_diligence',       'legal_mna_due_diligence'],
            ['real_estate',                   'real_estate_tenant_screening'],
            ['real-estate',                   'real_estate_tenant_screening'],
            ['real_estate_tenant_screening',  'real_estate_tenant_screening'],
            ['HEALTHCARE',                    'healthcare_prior_auth'], // case-insensitive
        ] as const) {
            expect(getDemoScenario(sp(input))).toBe(expected);
        }
    });

    it('falls back to enterprise for unknown scenario values', () => {
        for (const bad of ['acme_special', 'optimize', '', '  ', '__proto__', 'savings']) {
            expect(getDemoScenario(sp(bad))).toBe('enterprise_ai_spend_control');
        }
    });

    it('SCENARIOS list begins with the default scenario', () => {
        expect(SCENARIOS[0]).toBe(DEFAULT_SCENARIO);
    });
});

// ─────────────────────────────────────────────────────────────────────────
// withDemoQs continuity helper
// ─────────────────────────────────────────────────────────────────────────

describe('withDemoQs', () => {
    it('returns the href unchanged when demo is inactive', () => {
        expect(withDemoQs('/dashboard/prove', false, 'enterprise_ai_spend_control')).toBe('/dashboard/prove');
    });

    it('appends demo=1 alone for the default scenario', () => {
        expect(withDemoQs('/dashboard/prove', true, 'enterprise_ai_spend_control'))
            .toBe('/dashboard/prove?demo=1');
    });

    it('appends scenario for non-default verticals', () => {
        expect(withDemoQs('/dashboard/prove', true, 'healthcare_prior_auth'))
            .toBe('/dashboard/prove?demo=1&scenario=healthcare_prior_auth');
    });

    it('uses & instead of ? when the href already has a query string', () => {
        expect(withDemoQs('/dashboard/prove?attribution_status=unattributed', true, 'legal_mna_due_diligence'))
            .toBe('/dashboard/prove?attribution_status=unattributed&demo=1&scenario=legal_mna_due_diligence');
    });

    it('buildDemoQs produces the same suffix shape', () => {
        expect(buildDemoQs(false, 'healthcare_prior_auth')).toBe('');
        expect(buildDemoQs(true,  'enterprise_ai_spend_control')).toBe('demo=1');
        expect(buildDemoQs(true,  'real_estate_tenant_screening')).toBe('demo=1&scenario=real_estate_tenant_screening');
    });
});

// ─────────────────────────────────────────────────────────────────────────
// Safety labels per vertical
// ─────────────────────────────────────────────────────────────────────────

describe('Scenario safety labels', () => {
    it('healthcare carries No PHI and Human approval required', () => {
        const m = SCENARIO_META.healthcare_prior_auth;
        const labels = m.safety_labels.join(' | ').toLowerCase();
        expect(labels).toContain('no phi');
        expect(labels).toContain('human approval required');
        expect(labels).toContain('synthetic data');
    });

    it('legal carries Synthetic data room and Human legal review required', () => {
        const m = SCENARIO_META.legal_mna_due_diligence;
        const labels = m.safety_labels.join(' | ').toLowerCase();
        expect(labels).toContain('synthetic data room');
        expect(labels).toContain('human legal review required');
    });

    it('real estate carries Synthetic applicants/docs and Human final decision required', () => {
        const m = SCENARIO_META.real_estate_tenant_screening;
        const labels = m.safety_labels.join(' | ').toLowerCase();
        expect(labels).toContain('synthetic applicants');
        expect(labels).toContain('human final decision required');
    });

    it('enterprise framing disclaimer explicitly says Optimize recommendations remain blocked', () => {
        const m = SCENARIO_META.enterprise_ai_spend_control;
        expect(m.framing_disclaimer.toLowerCase()).toContain('optimize recommendations remain blocked');
    });

    it('every scenario has a banner with non-empty pill, body, safety_labels, and framing_disclaimer', () => {
        for (const s of SCENARIOS) {
            const b = getScenarioBanner(s);
            expect(b.pill.length).toBeGreaterThan(0);
            expect(b.body.length).toBeGreaterThan(0);
            expect(b.safety_labels.length).toBeGreaterThan(0);
            expect(b.framing_disclaimer.length).toBeGreaterThan(0);
        }
    });

    it('every scenario cleanup label references a workflow or matter, never a person', () => {
        for (const s of SCENARIOS) {
            const c = getScenarioCleanup(s);
            const lc = c.workflow_label.toLowerCase();
            // No worst-user / bad-employee language.
            for (const forbidden of ['worst', 'bad ', 'low performer']) {
                expect(lc).not.toContain(forbidden);
            }
        }
    });
});

// ─────────────────────────────────────────────────────────────────────────
// Per-vertical builder content safety
// ─────────────────────────────────────────────────────────────────────────

describe('Per-vertical builder output is content-safe', () => {
    const FORBIDDEN_KEY_NEEDLES = [
        '"prompt"', '"messages"', '"completion"', '"transcript"',
        '"response_body"', '"request_body"', '"raw_trace"',
        '"stored_content"',
    ];

    it.each(SCENARIOS.map((s) => [s] as const))(
        '%s — accountability builder carries no content-bearing JSON keys and no savings/recommendation language',
        (scenario) => {
            const json = JSON.stringify(buildDemoAccountabilityHealth(scenario));
            for (const needle of FORBIDDEN_KEY_NEEDLES) expect(json).not.toContain(needle);
            const lc = json.toLowerCase();
            for (const forbidden of [
                'we recommend', 'switch to ', 'projected savings',
                'cheaper than', 'savings of $',
            ]) expect(lc).not.toContain(forbidden);
        },
    );

    it.each(SCENARIOS.map((s) => [s] as const))(
        '%s — search response carries no content-bearing JSON keys',
        (scenario) => {
            const json = JSON.stringify(buildDemoSearchResponse(scenario));
            for (const needle of FORBIDDEN_KEY_NEEDLES) expect(json).not.toContain(needle);
        },
    );

    it.each(SCENARIOS.map((s) => [s] as const))(
        '%s — outcome coverage carries no content-bearing JSON keys',
        (scenario) => {
            const json = JSON.stringify(buildDemoOutcomeCoverage(scenario));
            for (const needle of FORBIDDEN_KEY_NEEDLES) expect(json).not.toContain(needle);
        },
    );
});

// ─────────────────────────────────────────────────────────────────────────
// Scenario distinctness — every vertical tells a distinct story
// ─────────────────────────────────────────────────────────────────────────

describe('Per-vertical builder output is distinct', () => {
    it('cleanup priority titles differ across verticals (workflow label drives it)', () => {
        const titles = new Set<string>();
        for (const s of SCENARIOS) {
            const top = buildDemoCleanupPriorities(s)[0];
            expect(top, `expected at least one cleanup item for ${s}`).toBeDefined();
            titles.add(top!.title);
        }
        // All four scenarios produce distinct top-cleanup titles.
        expect(titles.size).toBe(SCENARIOS.length);
    });

    it('accountability explainer mentions the scenario name', () => {
        for (const s of SCENARIOS) {
            const h = buildDemoAccountabilityHealth(s);
            const meta = SCENARIO_META[s];
            expect(h.overall.explainer).toContain(meta.name);
        }
    });

    it('search responses produce different request_id workflow assignments per vertical', () => {
        const workflows = new Set<string | null>();
        for (const s of SCENARIOS) {
            const hit = buildDemoSearchResponse(s).hits[0]!;
            workflows.add(hit.workflow_id);
        }
        // Enterprise / healthcare / legal / real estate each use distinct workflow ids.
        expect(workflows.size).toBe(SCENARIOS.length);
    });

    it('outcome coverage leaderboard surfaces a scenario-specific top segment', () => {
        for (const s of SCENARIOS) {
            const c = buildDemoOutcomeCoverage(s);
            const meta = getScenarioCleanup(s);
            expect(c.missing_outcome_leaderboard[0]!.label).toBe(meta.outcome_segment_label);
            expect(c.missing_outcome_leaderboard[0]!.sample_request_id).toBe(meta.sample_request_id);
        }
    });
});

// ─────────────────────────────────────────────────────────────────────────
// Truth contract regression — Optimize recommendations stay blocked
// ─────────────────────────────────────────────────────────────────────────

describe('Truth contract holds per scenario', () => {
    it.each(SCENARIOS.map((s) => [s] as const))(
        '%s — accountability optimize_recommendations_blocked flag is true',
        (scenario) => {
            const h = buildDemoAccountabilityHealth(scenario);
            expect(h.disclaimers.optimize_recommendations_blocked).toBe(true);
            expect(h.disclaimers.no_savings_claim).toBe(true);
            expect(h.disclaimers.content_displayed).toBe(false);
            const opt = h.dimensions.optimize_readiness as {
                recommendations_enabled: boolean; savings_claims_enabled: boolean;
            };
            expect(opt.recommendations_enabled).toBe(false);
            expect(opt.savings_claims_enabled).toBe(false);
        },
    );

    it.each(SCENARIOS.map((s) => [s] as const))(
        '%s — denied event in search response carries cost_usd of 0',
        (scenario) => {
            const r = buildDemoSearchResponse(scenario);
            const denied = r.hits.find((h) => h.governance_decision === 'denied');
            expect(denied, `${scenario}: must include a denied event`).toBeDefined();
            expect(denied!.cost_usd).toBe('0.0000');
            expect(denied!.provider).toBeNull();
            expect(denied!.model_used).toBeNull();
        },
    );

    it('every scenario marks privacy posture as metadata_only across hits', () => {
        for (const s of SCENARIOS) {
            for (const hit of buildDemoSearchResponse(s).hits) {
                expect(hit.privacy_mode).toBe('metadata_only');
            }
        }
    });
});
