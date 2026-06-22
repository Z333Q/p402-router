/**
 * Source-shape tests for DashboardTelemetry.tsx (3AZ-2-E).
 *
 * Asserts:
 *   - Emits funnel.dashboard_view with first_visit boolean.
 *   - Emits funnel.dashboard_meaningful once per device.
 *   - Path inference covers playground / settings / docs.
 *   - Fire-and-forget against /api/v1/funnel/event.
 *   - No render output; returns null.
 *   - No PII, no localStorage of anything content-bearing.
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
    join(__dirname, '..', 'DashboardTelemetry.tsx'),
    'utf8'
);
const SRC = stripComments(RAW);

describe('DashboardTelemetry — emit contract', () => {
    it('posts to /api/v1/funnel/event', () => {
        expect(SRC).toMatch(/\/api\/v1\/funnel\/event/);
    });

    it('emits funnel.dashboard_view', () => {
        expect(SRC).toMatch(/funnel\.dashboard_view/);
    });

    it('emits funnel.dashboard_meaningful', () => {
        expect(SRC).toMatch(/funnel\.dashboard_meaningful/);
    });

    it('includes first_visit in dashboard_view payload', () => {
        expect(SRC).toMatch(/first_visit/);
    });

    it('infers kind from pathname for playground / settings / docs', () => {
        expect(SRC).toMatch(/\/dashboard\/playground/);
        expect(SRC).toMatch(/\/dashboard\/settings/);
        expect(SRC).toMatch(/\/dashboard\/docs|\/docs/);
        // Plan §8.3 kinds we ship in v1
        expect(SRC).toMatch(/['"]playground['"]/);
        expect(SRC).toMatch(/['"]settings['"]/);
        expect(SRC).toMatch(/['"]docs['"]/);
    });

    it('uses localStorage keys for idempotency', () => {
        expect(SRC).toMatch(/p402_dashboard_first_visit_recorded/);
        expect(SRC).toMatch(/p402_meaningful_interaction/);
    });
});

describe('DashboardTelemetry — resilience contract', () => {
    it('is a client component', () => {
        expect(RAW).toMatch(/^['"]use client['"]/);
    });

    it('renders null (no UI)', () => {
        expect(SRC).toMatch(/return\s+null;?\s*$/m);
    });

    it('wraps fetch in .catch so DB / network failure cannot block render', () => {
        expect(SRC).toMatch(/fetch\([\s\S]*\)\s*\.catch\(/);
    });

    it('guards localStorage access for SSR / private-mode safety', () => {
        expect(SRC).toMatch(/typeof window === 'undefined'/);
        expect(SRC).toMatch(/try\s*\{[\s\S]*localStorage/);
    });
});

describe('DashboardTelemetry — privacy', () => {
    it('does not send any PII / content fields in properties', () => {
        const forbidden = [
            'email', 'name', 'tenantId', 'tenant_id', 'apiKey', 'api_key',
            'token', 'password', 'prompt', 'response', 'messages',
            'ip', 'ip_address',
        ];
        for (const k of forbidden) {
            expect(SRC, `${k} must not appear in emit payload`).not.toMatch(
                new RegExp(`['"]${k}['"]\\s*:`)
            );
        }
    });

    it('does not import third-party analytics SDK', () => {
        expect(SRC).not.toMatch(/from\s+['"](posthog-js|posthog-node|@segment\/analytics-node|mixpanel|amplitude|@growthbook\/growthbook)['"]/i);
    });

    it('does not import Stripe', () => {
        expect(SRC).not.toMatch(/from\s+['"]stripe['"]/);
    });
});

describe('DashboardTelemetry — V5 vocabulary', () => {
    it('does not surface USDC / wallet / gasless tokens in source', () => {
        expect(SRC).not.toMatch(/\bUSDC\b/);
        expect(SRC).not.toMatch(/\bgasless\b/i);
        expect(SRC).not.toMatch(/\bself[\s-]?custody\b/i);
    });
});
