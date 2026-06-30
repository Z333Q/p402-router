/**
 * Phase 1A: admin revenue surface source-shape tests.
 *
 * Pins read-only posture across the four admin views and the four API
 * routes; rejects checkout enablement copy, Stripe SDK imports, PATCH /
 * POST / DELETE handlers, and forbidden pricing copy.
 */

import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { PAID_INTENT_IDS, suggestedNextAction } from '@/lib/admin/revenue';

function read(rel: string): string {
    return readFileSync(resolve(process.cwd(), rel), 'utf8');
}

const FILES = {
    indexPage:       'app/admin/(protected)/revenue/page.tsx',
    billingPage:     'app/admin/(protected)/revenue/billing/page.tsx',
    accessPage:      'app/admin/(protected)/revenue/access-requests/page.tsx',
    funnelPage:      'app/admin/(protected)/revenue/funnel/page.tsx',
    paidIntentPage:  'app/admin/(protected)/revenue/paid-intent/page.tsx',
    billingRoute:    'app/api/admin/revenue/billing/route.ts',
    accessRoute:     'app/api/admin/revenue/access-intent/route.ts',
    funnelRoute:     'app/api/admin/revenue/funnel-visibility/route.ts',
    paidIntentRoute: 'app/api/admin/revenue/paid-intent/route.ts',
    revenueLib:      'lib/admin/revenue.ts',
} as const;

const FORBIDDEN_PRICING = [
    'Stripe Checkout',
    'Buy now',
    'Start paid plan',
    'verified savings',
    'guaranteed savings',
    'auto-apply',
    'SOC 2 compliant',
    'HIPAA compliant',
    'ISO certified',
    'Developer $249',
    'Business $2,500',
    'p402_live_',
];

const SAVE_PERCENT_RE = /save\s*\d+%/i;

describe('admin revenue pages — read-only posture', () => {
    for (const [name, rel] of Object.entries(FILES)) {
        it(`${name}: does not call Stripe SDK or import stripe`, () => {
            const src = read(rel);
            expect(src).not.toMatch(/from\s+['"]stripe['"]/);
            expect(src).not.toMatch(/require\(['"]stripe['"]\)/);
            expect(src).not.toMatch(/new Stripe\(/);
        });

        it(`${name}: does not import @stripe/* SDKs`, () => {
            const src = read(rel);
            expect(src).not.toMatch(/from\s+['"]@stripe\//);
        });

        it(`${name}: does not contain forbidden pricing or compliance copy`, () => {
            const src = read(rel);
            for (const phrase of FORBIDDEN_PRICING) {
                expect(src).not.toContain(phrase);
            }
            expect(src).not.toMatch(SAVE_PERCENT_RE);
        });
    }
});

describe('admin revenue API routes — read-only handlers only', () => {
    const routeFiles = [FILES.billingRoute, FILES.accessRoute, FILES.funnelRoute, FILES.paidIntentRoute];

    for (const rel of routeFiles) {
        it(`${rel}: exports only a GET handler`, () => {
            const src = read(rel);
            expect(src).toMatch(/export\s+async\s+function\s+GET\b/);
            expect(src).not.toMatch(/export\s+async\s+function\s+POST\b/);
            expect(src).not.toMatch(/export\s+async\s+function\s+PATCH\b/);
            expect(src).not.toMatch(/export\s+async\s+function\s+PUT\b/);
            expect(src).not.toMatch(/export\s+async\s+function\s+DELETE\b/);
        });

        it(`${rel}: gates on requireAdminAccess`, () => {
            const src = read(rel);
            expect(src).toContain('requireAdminAccess');
        });
    }
});

describe('revenue library — read-only data layer', () => {
    it('does not contain UPDATE, INSERT, or DELETE SQL', () => {
        const src = read(FILES.revenueLib);
        expect(src).not.toMatch(/\bUPDATE\s+\w+\s+SET\b/i);
        expect(src).not.toMatch(/\bINSERT\s+INTO\b/i);
        expect(src).not.toMatch(/\bDELETE\s+FROM\b/i);
        expect(src).not.toMatch(/\bALTER\s+TABLE\b/i);
        expect(src).not.toMatch(/\bDROP\s+TABLE\b/i);
        expect(src).not.toMatch(/\bCREATE\s+TABLE\b/i);
    });

    it('groups access requests by resolved_intent, plan_id, offer_id', () => {
        const src = read(FILES.revenueLib);
        expect(src).toMatch(/GROUP BY resolved_intent/);
        expect(src).toMatch(/GROUP BY plan_id/);
        expect(src).toMatch(/GROUP BY offer_id/);
    });

    it('does not import Stripe', () => {
        const src = read(FILES.revenueLib);
        expect(src).not.toMatch(/from\s+['"]stripe['"]/);
        expect(src).not.toMatch(/from\s+['"]@stripe\//);
    });
});

describe('paid-intent queue — excludes unknown free-only intents', () => {
    it('PAID_INTENT_IDS does not include scoping-call (free) or unknown', () => {
        expect(PAID_INTENT_IDS).not.toContain('scoping-call' as never);
        expect(PAID_INTENT_IDS).not.toContain('unknown' as never);
    });

    it('PAID_INTENT_IDS contains build, growth, scale, enterprise, ai-spend-audit, paid-pilot, regulated-pilot', () => {
        for (const id of ['build', 'growth', 'scale', 'enterprise', 'ai-spend-audit', 'paid-pilot', 'regulated-pilot']) {
            expect(PAID_INTENT_IDS).toContain(id);
        }
    });

    it('suggestedNextAction returns the no-action message for free-only intents', () => {
        expect(suggestedNextAction('scoping-call')).toMatch(/No action required/);
        expect(suggestedNextAction(null)).toMatch(/No action required/);
        expect(suggestedNextAction('unknown')).toMatch(/No action required/);
    });

    it('suggestedNextAction returns a non-empty paid action for each paid intent', () => {
        for (const id of PAID_INTENT_IDS) {
            const action = suggestedNextAction(id);
            expect(action.length).toBeGreaterThan(0);
            expect(action).not.toMatch(/No action required/);
        }
    });

    it('Build action references the checkout-enabled gate but does not enable it', () => {
        expect(suggestedNextAction('build')).toMatch(/checkout is enabled/i);
    });
});

describe('admin pages — Phase 1A locked CTA copy', () => {
    for (const rel of [FILES.indexPage, FILES.billingPage, FILES.accessPage, FILES.funnelPage, FILES.paidIntentPage]) {
        it(`${rel}: contains the locked upgrade-rollout phrasing`, () => {
            const src = read(rel);
            expect(src).toContain('Upgrade path is controlled by the billing rollout.');
        });
    }
});

describe('no tenant plan mutation route was added in Phase 1A', () => {
    it('no Phase 1A file writes to tenants.plan', () => {
        for (const rel of Object.values(FILES)) {
            const src = read(rel);
            expect(src).not.toMatch(/UPDATE\s+tenants\s+SET\s+plan/i);
        }
    });
});
