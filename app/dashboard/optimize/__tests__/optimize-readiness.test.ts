/**
 * Slice 3L — Optimize Readiness Boundary source-shape tests.
 *
 * The page is a heavy 'use client' useQuery surface; rendering it under
 * vitest would require a full QueryClient + DOM shim. Following the
 * mission-control test pattern, we inspect the TSX source directly to pin
 * the readiness contract: no savings claims, no recommendation writes,
 * no runtime-enforcement mutations, the spec copy is present, all four
 * readiness statuses are surfaced, and the page reads from the 3K
 * coverage endpoint rather than producing its own.
 */

import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const PAGE_PATH = resolve(process.cwd(), 'app', 'dashboard', 'optimize', 'page.tsx');
const SRC = readFileSync(PAGE_PATH, 'utf8');
/** JSX text often wraps across lines; collapse whitespace so spec sentences match. */
const SRC_FLAT = SRC.replace(/\s+/g, ' ');

describe('Optimize page — readiness contract', () => {
    it('reads from the 3K coverage endpoint', () => {
        expect(SRC).toContain("'/api/v2/outcomes/coverage'");
    });

    it('does not create recommendation records (no POST/PUT/PATCH/DELETE to any endpoint)', () => {
        expect(SRC).not.toMatch(/method:\s*['"](POST|PUT|PATCH|DELETE)['"]/);
        expect(SRC).not.toMatch(/recommendations\/(create|apply|enqueue)/);
    });

    it('does not import budget-guard, settlement, or runtime enforcement modules', () => {
        expect(SRC).not.toMatch(/from\s+['"]@?\/?lib\/budget-guard/);
        expect(SRC).not.toMatch(/from\s+['"]@?\/?lib\/billing/);
        expect(SRC).not.toMatch(/from\s+['"]@?\/?middleware/);
    });

    it('does not import the savings view', () => {
        expect(SRC).not.toMatch(/SavingsView/);
    });
});

describe('Optimize page — spec copy', () => {
    it('renders "Optimize recommendations are not active yet."', () => {
        expect(SRC).toContain('Optimize recommendations are not active yet.');
    });

    it('renders "P402 needs enough outcome data before it can compare cost and quality."', () => {
        expect(SRC_FLAT).toContain('P402 needs enough outcome data before it can compare cost and quality.');
    });

    it('renders "This page shows readiness only. It does not claim savings."', () => {
        expect(SRC_FLAT).toContain('This page shows readiness only. It does not claim savings.');
    });

    it('renders "This is readiness analysis, not a savings claim."', () => {
        expect(SRC).toContain('This is readiness analysis, not a savings claim.');
    });
});

describe('Optimize page — readiness states', () => {
    it('handles every ReadinessStatus from lib/prove/coverage.ts', () => {
        for (const s of ['blocked', 'not_ready', 'observing', 'ready_for_optimize_analysis']) {
            expect(SRC).toContain(s);
        }
    });

    it('explicitly states that ready-for-analysis does NOT imply recommendations', () => {
        expect(SRC_FLAT).toMatch(/when the readiness verdict reads ready_for_analysis.*not the same as a proposed change/);
    });

    it('surfaces the four canonical readiness states with display labels', () => {
        expect(SRC).toContain('Ready for analysis');
        expect(SRC).toContain('Blocked');
        expect(SRC).toContain('Not ready');
        expect(SRC).toContain('Observing');
    });
});

describe('Optimize page — readiness checklist', () => {
    it('includes every spec checklist item', () => {
        expect(SRC).toContain('Outcome coverage');
        expect(SRC).toContain('Accepted outcome count');
        expect(SRC).toContain('Baseline window');
        expect(SRC).toContain('Cost per accepted output');
        expect(SRC).toContain('Segment readiness');
        expect(SRC).toContain('Attribution completeness');
        expect(SRC).toContain('Evidence coverage');
    });
});

describe('Optimize page — next-action links', () => {
    it('includes every spec next-action link label', () => {
        expect(SRC).toContain('View outcome readiness');
        expect(SRC).toContain('View Prove dashboard');
        expect(SRC).toContain('View missing outcomes');
        expect(SRC).toContain('View event detail examples');
    });

    it('preserves demo continuity via withDemoQs', () => {
        expect(SRC).toContain('withDemoQs');
    });
});

describe('Optimize page — savings-claim removal', () => {
    it('does not render "Existing Savings" KPI', () => {
        expect(SRC).not.toMatch(/Existing Savings/);
    });

    it('does not render "Forecast Month-End" KPI', () => {
        expect(SRC).not.toMatch(/Forecast Month-End/);
    });

    it('does not link to /dashboard/optimize/savings-report', () => {
        expect(SRC).not.toMatch(/optimize\/savings-report/);
    });

    it('does not render "Projected monthly savings" or "automated savings"', () => {
        expect(SRC).not.toMatch(/Projected monthly savings/i);
        expect(SRC).not.toMatch(/automated savings/i);
        expect(SRC).not.toMatch(/savings attribution/i);
    });

    it('does not render any positive savings claim', () => {
        expect(SRC).not.toMatch(/saved\s+\$\d/i);
        expect(SRC).not.toMatch(/\$\d[\d,.]*\s+(saved|in savings)/i);
        expect(SRC).not.toMatch(/\d+%\s+(savings|saved|reduction)/i);
        expect(SRC).not.toMatch(/projected\s+savings/i);
        expect(SRC).not.toMatch(/verified\s+savings/i);
    });
});
