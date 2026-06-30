/**
 * Phase 1A: dashboard usage-meter source-shape tests.
 *
 * The meter is a client component fetching /api/v2/billing/event-meter. We
 * inspect the TSX source to assert the locked copy, the required fields,
 * the empty-state branch, and the absence of checkout enablement copy.
 */

import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { PLANS } from '@/lib/pricing/rate-card';

const METER_SRC = readFileSync(
    resolve(process.cwd(), 'app', 'dashboard', '_components', 'PlanEventMeter.tsx'),
    'utf8',
);
const PAGE_SRC = readFileSync(
    resolve(process.cwd(), 'app', 'dashboard', 'plan', 'page.tsx'),
    'utf8',
);
const HELPER_SRC = readFileSync(
    resolve(process.cwd(), 'lib', 'billing', 'event-meter.ts'),
    'utf8',
);

describe('PlanEventMeter — source shape', () => {
    it('renders an empty state when no metered events exist', () => {
        expect(METER_SRC).toMatch(/No metered events yet/i);
        expect(METER_SRC).toContain('EmptyState');
    });

    it('exposes Plan, Retention, Month events used, Included this month, First/Last event', () => {
        expect(METER_SRC).toMatch(/Current plan/i);
        expect(METER_SRC).toMatch(/Retention window/i);
        expect(METER_SRC).toMatch(/Month events used/i);
        expect(METER_SRC).toMatch(/Included this month/i);
        expect(METER_SRC).toMatch(/First metered event/i);
        expect(METER_SRC).toMatch(/Last metered event/i);
    });

    it('renders the locked upgrade-notice copy and a Next upgrade reason field', () => {
        expect(METER_SRC).toMatch(/upgradeNotice/);
        expect(METER_SRC).toMatch(/Next upgrade reason/i);
    });

    it('uses the rate-card-driven ProgressBar for percent used', () => {
        expect(METER_SRC).toContain('ProgressBar');
        expect(METER_SRC).toMatch(/percentUsed/);
    });

    it('does not import Stripe or imply checkout is live', () => {
        expect(METER_SRC).not.toMatch(/from\s+['"]stripe['"]/);
        expect(METER_SRC).not.toMatch(/from\s+['"]@stripe\//);
        expect(METER_SRC).not.toMatch(/new Stripe\(/);
        expect(METER_SRC).not.toMatch(/Buy now/i);
        expect(METER_SRC).not.toMatch(/Start paid plan/i);
        expect(METER_SRC).not.toMatch(/Stripe Checkout/i);
        expect(METER_SRC).not.toMatch(/billing\/checkout/);
        expect(METER_SRC).not.toMatch(/billing\/portal/);
    });
});

describe('event-meter helper — locked plan limits and copy', () => {
    it('Sandbox limit equals 25,000 in rate card', () => {
        expect(PLANS.sandbox.includedEventsPerMonth).toBe(25_000);
    });
    it('Build limit equals 250,000 in rate card', () => {
        expect(PLANS.build.includedEventsPerMonth).toBe(250_000);
    });
    it('Growth limit equals 2,000,000 in rate card', () => {
        expect(PLANS.growth.includedEventsPerMonth).toBe(2_000_000);
    });
    it('Scale limit equals 20,000,000 in rate card', () => {
        expect(PLANS.scale.includedEventsPerMonth).toBe(20_000_000);
    });
    it('Enterprise inclusion is custom (null)', () => {
        expect(PLANS.enterprise.includedEventsPerMonth).toBeNull();
    });
    it('helper locks the upgrade-notice phrasing to the billing-rollout copy', () => {
        expect(HELPER_SRC).toContain('Upgrade path is controlled by the billing rollout.');
    });
    it('helper does not import or instantiate Stripe', () => {
        expect(HELPER_SRC).not.toMatch(/from\s+['"]stripe['"]/);
        expect(HELPER_SRC).not.toMatch(/from\s+['"]@stripe\//);
        expect(HELPER_SRC).not.toMatch(/new Stripe\(/);
        expect(HELPER_SRC).not.toMatch(/Stripe Checkout/);
    });
});

describe('dashboard/plan/page — read-only surface', () => {
    it('mounts the PlanEventMeter component', () => {
        expect(PAGE_SRC).toContain('PlanEventMeter');
    });
    it('does not invoke Stripe, billing portal, or checkout routes', () => {
        expect(PAGE_SRC).not.toMatch(/\bStripe\b/);
        expect(PAGE_SRC).not.toMatch(/billing\/checkout/);
        expect(PAGE_SRC).not.toMatch(/billing\/portal/);
    });
});
