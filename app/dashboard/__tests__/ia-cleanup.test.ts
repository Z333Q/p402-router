/**
 * Slice 3N — Navigation and IA Cleanup source-shape tests.
 *
 * Pins:
 *   - Sidebar primary order: Mission Control, Meter, Monitor, Control, Prove,
 *     Outcomes, Accountability, plus Optimize present and not labelled as
 *     active/live recommendations.
 *   - Sidebar contains no "Savings" entry and no /dashboard/savings link.
 *   - Mission Control PathCard hrefs and nextStep hrefs are wrapped with the
 *     `dq` demo-query helper so demo=1&scenario=<id> propagates.
 *   - Playground does not link to the quarantined savings route; it links
 *     to outcome readiness instead.
 *   - The orphan IntelligenceSummary component no longer fetches
 *     /api/v1/savings, no longer renders a "Saved" tile, and no longer
 *     links to /dashboard/savings.
 *   - The Optimize page (3L invariant) still reads the 3K coverage
 *     endpoint and does not import SavingsView.
 *   - No forbidden CTA labels appear anywhere in primary IA.
 */

import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const ROOT = process.cwd();
const read = (rel: string) => readFileSync(resolve(ROOT, rel), 'utf8');

const SIDEBAR              = read('components/layout/AppSidebar.tsx');
const MISSION_CONTROL      = read('app/dashboard/page.tsx');
const PLAYGROUND           = read('app/dashboard/playground/page.tsx');
const INTELLIGENCE_SUMMARY = read('app/dashboard/_components/IntelligenceSummary.tsx');
const OPTIMIZE             = read('app/dashboard/optimize/page.tsx');
const MONITOR              = read('app/dashboard/monitor/page.tsx');
const PROVE_ROOT           = read('app/dashboard/prove/page.tsx');

const PRIMARY_IA_SURFACES = [SIDEBAR, MISSION_CONTROL, PLAYGROUND, MONITOR, PROVE_ROOT, OPTIMIZE];

describe('Sidebar primary IA', () => {
    it('renders the V5 primary nav in canonical order', () => {
        // V5 §21.3: Overview → Meter → Monitor → Control → Optimize → Settle
        // → Prove → Publish → Developers → Billing → Settings
        const required = [
            'Overview', 'Meter', 'Monitor', 'Control', 'Optimize',
            'Settle', 'Prove', 'Publish', 'Developers', 'Billing', 'Settings',
        ];
        const positions: number[] = [];
        for (const name of required) {
            const pos = SIDEBAR.indexOf(`name: "${name}"`);
            expect({ name, found: pos > -1 }).toEqual({ name, found: true });
            positions.push(pos);
        }
        for (let i = 1; i < positions.length; i += 1) {
            const prev = positions[i - 1] ?? -1;
            const curr = positions[i] ?? -1;
            expect(curr).toBeGreaterThan(prev);
        }
    });

    it('does not include the legacy "Mission Control" sidebar entry', () => {
        // The /dashboard route still exists; only its sidebar label was
        // renamed to Overview per V5 §21.3.
        expect(SIDEBAR).not.toMatch(/name:\s*"Mission Control"/);
    });

    it('does not label Optimize as live recommendations', () => {
        expect(SIDEBAR).toMatch(/name:\s*["']Optimize["']/);
        expect(SIDEBAR).not.toMatch(/Optimize recommendations/i);
        expect(SIDEBAR).not.toMatch(/Recommendations\s*\(live\)/i);
        expect(SIDEBAR).not.toMatch(/Apply recommendation/i);
        expect(SIDEBAR).not.toMatch(/Auto-apply/i);
    });

    it('does not include a Savings entry', () => {
        expect(SIDEBAR).not.toMatch(/name:\s*["']Savings["']/);
    });

    it('does not link to /dashboard/savings', () => {
        expect(SIDEBAR).not.toContain('/dashboard/savings');
    });

    it('does not link to /dashboard/optimize/savings-report', () => {
        expect(SIDEBAR).not.toContain('/dashboard/optimize/savings-report');
    });
});

describe('Mission Control PathCard demo continuity', () => {
    it('wraps every PathCard href with the dq demo helper', () => {
        // PRODUCT_PATH indices 0..5 should each appear as dq(PRODUCT_PATH[N].href)
        for (let i = 0; i < 6; i += 1) {
            expect(MISSION_CONTROL).toContain(`href={dq(PRODUCT_PATH[${i}].href)}`);
        }
    });

    it('wraps every PathCard nextStep href with dq', () => {
        // Spot-check every literal nextStep destination from the page.
        const nextStepHrefs = [
            "dq('/dashboard/prove/outcomes/setup')",
            "dq('/dashboard/control')",
            "dq('/dashboard/prove?governance_decision=denied')",
            "dq('/dashboard/prove/report')",
            "dq('/dashboard/accountability')",
        ];
        for (const expected of nextStepHrefs) {
            expect(MISSION_CONTROL).toContain(expected);
        }
    });

    it('no PathCard or nextStep keeps a bare /dashboard literal href', () => {
        // A bare nextStep `href: '/dashboard/...'` would mean demo continuity is dropped.
        expect(MISSION_CONTROL).not.toMatch(/nextStep=\{\{\s*label:[^}]+href:\s*'\/dashboard\//);
    });
});

describe('Playground IA — no quarantined savings link', () => {
    it('does not link to /dashboard/savings', () => {
        expect(PLAYGROUND).not.toContain('/dashboard/savings');
    });

    it('does not render the "See savings report" label', () => {
        expect(PLAYGROUND).not.toMatch(/See savings report/i);
    });

    it('links to /dashboard/prove/outcomes instead', () => {
        expect(PLAYGROUND).toContain('/dashboard/prove/outcomes');
    });
});

describe('IntelligenceSummary widget — no quarantined savings tile', () => {
    it('does not fetch /api/v1/savings', () => {
        expect(INTELLIGENCE_SUMMARY).not.toMatch(/\/api\/v1\/savings/);
    });

    it('does not link to /dashboard/savings', () => {
        expect(INTELLIGENCE_SUMMARY).not.toContain('/dashboard/savings');
    });

    it('does not render the "Saved" tile label or the TrendingDown icon', () => {
        expect(INTELLIGENCE_SUMMARY).not.toMatch(/label:\s*['"]Saved['"]/);
        expect(INTELLIGENCE_SUMMARY).not.toMatch(/\bTrendingDown\b/);
    });

    it('renders an Outcome readiness tile pointing at /dashboard/prove/outcomes', () => {
        expect(INTELLIGENCE_SUMMARY).toContain('/dashboard/prove/outcomes');
        expect(INTELLIGENCE_SUMMARY).toMatch(/Outcome readiness/);
    });
});

describe('Optimize page — 3L invariants still hold', () => {
    it('still reads /api/v2/outcomes/coverage', () => {
        expect(OPTIMIZE).toContain("'/api/v2/outcomes/coverage'");
    });

    it('does not import SavingsView or link to /dashboard/savings', () => {
        expect(OPTIMIZE).not.toMatch(/SavingsView/);
        expect(OPTIMIZE).not.toContain('/dashboard/savings');
    });
});

describe('Outcomes discoverability across primary IA', () => {
    const expectedSurfaces: Array<[string, string]> = [
        ['Mission Control', MISSION_CONTROL],
        ['Monitor',         MONITOR],
        ['Prove root',      PROVE_ROOT],
        ['Optimize',        OPTIMIZE],
    ];

    for (const [name, src] of expectedSurfaces) {
        it(`${name} links to /dashboard/prove/outcomes`, () => {
            expect(src).toContain('/dashboard/prove/outcomes');
        });
    }
});

describe('Forbidden CTA labels are absent from primary IA', () => {
    const forbidden = [
        /Apply recommendation/i,
        /Auto-apply/i,
        /Verified savings/i,
        /Projected savings/i,
        /Runtime flip active/i,
        /Policy auto-apply/i,
    ];

    for (const re of forbidden) {
        it(`no surface renders ${re}`, () => {
            for (const src of PRIMARY_IA_SURFACES) {
                expect(src).not.toMatch(re);
            }
        });
    }
});
