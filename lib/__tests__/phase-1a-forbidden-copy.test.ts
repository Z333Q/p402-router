/**
 * Phase 1A: forbidden-copy + no-Stripe-impl scan across all Phase 1A files.
 *
 * This guard test reads every file produced in Phase 1A (Revenue Visibility
 * Foundation) and asserts that none of them:
 *   - import or call the Stripe SDK
 *   - imply checkout is live
 *   - claim unsupported compliance posture
 *   - print live-API-key prefixes
 *   - declare a new tenant plan mutation route
 */

import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const PHASE_1A_FILES = [
    'lib/billing/event-meter.ts',
    'app/api/v2/billing/event-meter/route.ts',
    'app/dashboard/_components/PlanEventMeter.tsx',
    'app/dashboard/plan/page.tsx',
    'hooks/usePlanEventMeter.ts',
    'lib/admin/revenue.ts',
    'app/api/admin/revenue/billing/route.ts',
    'app/api/admin/revenue/access-intent/route.ts',
    'app/api/admin/revenue/funnel-visibility/route.ts',
    'app/api/admin/revenue/paid-intent/route.ts',
    'app/admin/(protected)/revenue/page.tsx',
    'app/admin/(protected)/revenue/billing/page.tsx',
    'app/admin/(protected)/revenue/access-requests/page.tsx',
    'app/admin/(protected)/revenue/funnel/page.tsx',
    'app/admin/(protected)/revenue/paid-intent/page.tsx',
];

const FORBIDDEN_SUBSTRINGS = [
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

const STRIPE_IMPORT_PATTERNS = [
    /from\s+['"]stripe['"]/,
    /from\s+['"]@stripe\//,
    /require\(['"]stripe['"]\)/,
    /new Stripe\(/,
];

const TENANT_PLAN_MUTATION_PATTERNS = [
    /UPDATE\s+tenants\s+SET\s+plan/i,
    /INSERT\s+INTO\s+tenants[^;]*plan/i,
];

const SAVE_PERCENT_RE = /save\s*\d+%/i;

describe('Phase 1A — no forbidden copy in any new file', () => {
    for (const rel of PHASE_1A_FILES) {
        it(`${rel}: clean of forbidden pricing/compliance copy`, () => {
            const src = readFileSync(resolve(process.cwd(), rel), 'utf8');
            for (const phrase of FORBIDDEN_SUBSTRINGS) {
                expect(src, `${rel} contained "${phrase}"`).not.toContain(phrase);
            }
            expect(src, `${rel} matched save N% pattern`).not.toMatch(SAVE_PERCENT_RE);
        });
    }
});

describe('Phase 1A — no Stripe SDK import or call in any new file', () => {
    for (const rel of PHASE_1A_FILES) {
        it(`${rel}: does not import / instantiate Stripe`, () => {
            const src = readFileSync(resolve(process.cwd(), rel), 'utf8');
            for (const pat of STRIPE_IMPORT_PATTERNS) {
                expect(src, `${rel} matched ${pat}`).not.toMatch(pat);
            }
        });
    }
});

describe('Phase 1A — no tenant plan mutation in any new file', () => {
    for (const rel of PHASE_1A_FILES) {
        it(`${rel}: does not write to tenants.plan`, () => {
            const src = readFileSync(resolve(process.cwd(), rel), 'utf8');
            for (const pat of TENANT_PLAN_MUTATION_PATTERNS) {
                expect(src, `${rel} matched ${pat}`).not.toMatch(pat);
            }
        });
    }
});

describe('Phase 1A — admin API routes export only GET', () => {
    const ADMIN_ROUTES = PHASE_1A_FILES.filter((p) => p.startsWith('app/api/admin/revenue/'));

    for (const rel of ADMIN_ROUTES) {
        it(`${rel}: only GET handler exported`, () => {
            const src = readFileSync(resolve(process.cwd(), rel), 'utf8');
            expect(src).toMatch(/export\s+async\s+function\s+GET\b/);
            expect(src).not.toMatch(/export\s+async\s+function\s+(POST|PUT|PATCH|DELETE)\b/);
        });
    }
});

describe('Phase 1A — locked CTA copy on visible surfaces', () => {
    const VISIBLE = [
        'app/dashboard/_components/PlanEventMeter.tsx',
        'app/admin/(protected)/revenue/page.tsx',
        'app/admin/(protected)/revenue/billing/page.tsx',
        'app/admin/(protected)/revenue/access-requests/page.tsx',
        'app/admin/(protected)/revenue/funnel/page.tsx',
        'app/admin/(protected)/revenue/paid-intent/page.tsx',
    ];
    for (const rel of VISIBLE) {
        it(`${rel}: includes "Upgrade path is controlled by the billing rollout."`, () => {
            const src = readFileSync(resolve(process.cwd(), rel), 'utf8');
            expect(src).toContain('Upgrade path is controlled by the billing rollout.');
        });
    }
});
