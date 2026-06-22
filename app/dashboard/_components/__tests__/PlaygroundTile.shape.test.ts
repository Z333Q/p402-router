/**
 * Source-shape tests for PlaygroundTile.tsx (3AZ-2-E Stage C).
 *
 * Asserts:
 *   - V5 vocabulary discipline.
 *   - Visibility gates wired against the two localStorage keys.
 *   - Only renders on /dashboard, not subpaths.
 *   - CTA points at /dashboard/playground with the data-meaningful-kind
 *     attribute the DashboardTelemetry tracker reads.
 *   - Has a dismiss button that writes the dismiss key.
 */

import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

function stripComments(src: string): string {
    return src
        .replace(/\/\*[\s\S]*?\*\//g, '')
        .replace(/^\s*\/\/.*$/gm, '');
}

const RAW = readFileSync(
    join(__dirname, '..', 'PlaygroundTile.tsx'),
    'utf8'
);
const SRC = stripComments(RAW);

describe('PlaygroundTile — visibility gates', () => {
    it('reads the dismissed key from localStorage', () => {
        expect(SRC).toMatch(/p402_stage_c_dismissed/);
        expect(SRC).toMatch(/localStorage\.getItem/);
    });

    it('reads the meaningful-interaction key from localStorage', () => {
        expect(SRC).toMatch(/p402_meaningful_interaction/);
    });

    it('only renders when pathname is /dashboard (root)', () => {
        expect(SRC).toMatch(/usePathname/);
        expect(SRC).toMatch(/pathname\s*!==\s*['"]\/dashboard['"]/);
    });
});

describe('PlaygroundTile — CTA wiring', () => {
    it('links the primary CTA to /dashboard/playground', () => {
        expect(SRC).toMatch(/href\s*=\s*['"]\/dashboard\/playground['"]/);
    });

    it('tags the primary CTA with data-meaningful-kind="playground"', () => {
        expect(SRC).toMatch(/data-meaningful-kind\s*=\s*['"]playground['"]/);
    });

    it('provides a dismiss control that writes the dismiss key', () => {
        expect(SRC).toMatch(/localStorage\.setItem\s*\(\s*DISMISSED_KEY/);
    });

    it('exposes a data-testid for end-to-end smoke tests', () => {
        expect(SRC).toMatch(/data-testid\s*=\s*['"]stage-c-playground-tile['"]/);
    });
});

describe('PlaygroundTile — V5 vocabulary discipline (plan §6.1)', () => {
    it('does not mention USDC / wallet / gasless / Coinbase / x402', () => {
        expect(SRC).not.toMatch(/\bUSDC\b/);
        expect(SRC).not.toMatch(/\bwallet\b/i);
        expect(SRC).not.toMatch(/\bgasless\b/i);
        expect(SRC).not.toMatch(/\bCoinbase\b/i);
        expect(SRC).not.toMatch(/\bx402\b/i);
    });

    it('does not surface "Activate Payments" or "One more step"', () => {
        expect(SRC).not.toMatch(/Activate\s+Payments/i);
        expect(SRC).not.toMatch(/One\s+more\s+step/i);
    });

    it('does not use em dashes', () => {
        expect(SRC).not.toMatch(/—/);
    });

    it('does not surface unsupported claims', () => {
        expect(SRC).not.toMatch(/verified[\s_-]+savings/i);
        expect(SRC).not.toMatch(/save\s+\d+\s*%/i);
        expect(SRC).not.toMatch(/auto[\s_-]?apply/i);
    });
});

describe('PlaygroundTile — no scope creep', () => {
    it('does not call /api/v2/billing/checkout', () => {
        expect(SRC).not.toMatch(/api\/v2\/billing\/checkout/);
    });

    it('does not import Stripe or any analytics SDK', () => {
        expect(SRC).not.toMatch(/from\s+['"]stripe['"]/);
        expect(SRC).not.toMatch(/from\s+['"](posthog-js|posthog-node|@segment\/analytics-node|mixpanel|amplitude|@growthbook\/growthbook)['"]/i);
    });
});
