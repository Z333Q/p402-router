/**
 * Slice 3M — Savings Claim Quarantine source-shape tests.
 *
 * Pins the quarantine contract across the dashboard surfaces that
 * previously rendered unsafe savings claims.
 */

import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const ROOT = process.cwd();
const read = (rel: string) => readFileSync(resolve(ROOT, rel), 'utf8');

const SAVINGS_VIEW  = read('app/dashboard/_components/SavingsView.tsx');
const SAVINGS_PAGE  = read('app/dashboard/savings/page.tsx');
const REPORT_PAGE   = read('app/dashboard/optimize/savings-report/page.tsx');
const SIDEBAR       = read('components/layout/AppSidebar.tsx');
const EVENT_DETAIL  = read('app/dashboard/meter/events/[id]/page.tsx');
const OPTIMIZE_PAGE = read('app/dashboard/optimize/page.tsx');

const flat = (s: string) => s.replace(/\s+/g, ' ');

describe('SavingsView quarantine state', () => {
    it('does not fetch /api/v1/savings', () => {
        expect(SAVINGS_VIEW).not.toMatch(/\/api\/v1\/savings/);
    });

    it('does not call useQuery, fetch, or any HTTP mutation', () => {
        expect(SAVINGS_VIEW).not.toMatch(/useQuery/);
        expect(SAVINGS_VIEW).not.toMatch(/\bfetch\s*\(/);
        expect(SAVINGS_VIEW).not.toMatch(/method:\s*['"](POST|PUT|PATCH|DELETE)['"]/);
    });

    it('renders the blocked-state spec copy verbatim', () => {
        const f = flat(SAVINGS_VIEW);
        expect(f).toContain('Savings proof is not available yet.');
        expect(f).toContain('Optimize recommendations are not active.');
        expect(f).toContain('This page shows readiness and audit context only.');
        expect(f).toMatch(/P402 does not claim savings until an approved recommendation has a baseline, outcome evidence, a rollback condition, and a verified post-change result\./);
    });

    it('does not render any of the old savings-claim labels', () => {
        for (const phrase of [
            'Total Saved',
            'Average Savings per Request',
            'Breakdown by Mode',
            'Daily Savings',
            'savings_pct',
            'savings_usd',
            'total_savings',
        ]) {
            expect(SAVINGS_VIEW).not.toContain(phrase);
        }
    });

    it('does not render positive savings claim patterns', () => {
        expect(SAVINGS_VIEW).not.toMatch(/\$\d[\d,.]*\s+(saved|in savings)/i);
        expect(SAVINGS_VIEW).not.toMatch(/\d+%\s+(savings|saved|reduction)/i);
        expect(SAVINGS_VIEW).not.toMatch(/projected\s+savings/i);
        expect(SAVINGS_VIEW).not.toMatch(/verified\s+savings/i);
        expect(SAVINGS_VIEW).not.toMatch(/automated\s+savings/i);
    });

    it('does not render an Apply or Auto-apply CTA', () => {
        expect(SAVINGS_VIEW).not.toMatch(/Apply recommendation/i);
        expect(SAVINGS_VIEW).not.toMatch(/Auto-apply/i);
    });

    it('does not import budget-guard, billing, settlement, or middleware', () => {
        expect(SAVINGS_VIEW).not.toMatch(/from\s+['"]@?\/?lib\/budget-guard/);
        expect(SAVINGS_VIEW).not.toMatch(/from\s+['"]@?\/?lib\/billing/);
        expect(SAVINGS_VIEW).not.toMatch(/from\s+['"]@?\/?lib\/settlement/);
        expect(SAVINGS_VIEW).not.toMatch(/from\s+['"]@?\/?middleware/);
    });

    it('links to the safe readiness surfaces only', () => {
        expect(SAVINGS_VIEW).toContain('/dashboard/optimize');
        expect(SAVINGS_VIEW).toContain('/dashboard/prove/outcomes');
        expect(SAVINGS_VIEW).toContain('/dashboard/prove');
        expect(SAVINGS_VIEW).toContain('/dashboard/monitor');
    });
});

describe('Consumer routes — still mount SavingsView (URLs preserved)', () => {
    it('/dashboard/savings still renders SavingsView', () => {
        expect(SAVINGS_PAGE).toMatch(/SavingsView/);
    });

    it('/dashboard/optimize/savings-report still renders SavingsView', () => {
        expect(REPORT_PAGE).toMatch(/SavingsView/);
    });
});

describe('AppSidebar — Savings nav removed', () => {
    it('no longer lists a "Savings" entry under INTELLIGENCE_ITEMS', () => {
        expect(SIDEBAR).not.toMatch(/name:\s*["']Savings["']/);
    });

    it('no longer links to /dashboard/savings from the sidebar', () => {
        expect(SIDEBAR).not.toContain('/dashboard/savings');
    });

    it('no longer imports the TrendingDown icon (was the Savings glyph)', () => {
        expect(SIDEBAR).not.toMatch(/\bTrendingDown\b/);
    });
});

describe('Per-event detail — savings labels reframed to cost deltas', () => {
    it('does not render the labels "Route savings" or "Cache savings"', () => {
        expect(EVENT_DETAIL).not.toMatch(/label=["']Route savings["']/);
        expect(EVENT_DETAIL).not.toMatch(/label=["']Cache savings["']/);
    });

    it('renders "Route cost delta" and "Cache cost delta" instead', () => {
        expect(EVENT_DETAIL).toMatch(/label=["']Route cost delta["']/);
        expect(EVENT_DETAIL).toMatch(/label=["']Cache cost delta["']/);
    });
});

describe('Optimize readiness boundary — 3L invariants still hold', () => {
    it('/dashboard/optimize still reads the 3K coverage endpoint', () => {
        expect(OPTIMIZE_PAGE).toContain("'/api/v2/outcomes/coverage'");
    });

    it('/dashboard/optimize does not link to the savings-report path', () => {
        expect(OPTIMIZE_PAGE).not.toMatch(/optimize\/savings-report/);
    });

    it('/dashboard/optimize does not import SavingsView', () => {
        expect(OPTIMIZE_PAGE).not.toMatch(/SavingsView/);
    });
});
