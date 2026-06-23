/**
 * Source-shape tests for /admin/funnel page (3AZ-3).
 *
 * Light coverage: asserts the page imports the expected admin UI
 * primitives, fetches the rollup endpoint with no-store, and does
 * not leak PII strings into the visible source.
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
    join(__dirname, '..', 'page.tsx'),
    'utf8'
);
const SRC = stripComments(RAW);

describe('/admin/funnel — page scaffolding', () => {
    it('is a client component', () => {
        expect(RAW).toMatch(/^['"]use client['"]/);
    });

    it('uses the shared admin primitives', () => {
        expect(SRC).toMatch(/AdminCard/);
        expect(SRC).toMatch(/AdminPageHeader/);
    });

    it('fetches /api/admin/funnel/rollup with cache: no-store', () => {
        expect(SRC).toMatch(/\/api\/admin\/funnel\/rollup/);
        expect(SRC).toMatch(/cache:\s*['"]no-store['"]/);
    });

    it('passes the days param through the URL', () => {
        expect(SRC).toMatch(/days=\$\{[^}]*d[^}]*\}|days=\$\{encodeURIComponent\(d\)\}/);
    });

    it('provides a 7d / 30d / 90d period selector', () => {
        expect(SRC).toMatch(/'7'/);
        expect(SRC).toMatch(/'30'/);
        expect(SRC).toMatch(/'90'/);
    });

    it('renders all 8 stages by event name', () => {
        const events = [
            'funnel.login_view',
            'funnel.signin_started',
            'funnel.signin_success',
            'funnel.onboarding_view',
            'funnel.api_key_issued',
            'funnel.onboarding_completed',
            'funnel.dashboard_view',
            'funnel.dashboard_meaningful',
        ];
        for (const ev of events) {
            expect(SRC, `missing label for ${ev}`).toContain(ev);
        }
    });
});

describe('/admin/funnel — privacy', () => {
    it('does not render tenant_id / email / anonymous_id columns', () => {
        // The page renders aggregated metrics only; raw PII columns
        // must not appear as cell content.
        expect(SRC).not.toMatch(/<td[^>]*>\s*\{\s*row\.tenant_id\s*\}\s*<\/td>/i);
        expect(SRC).not.toMatch(/<td[^>]*>\s*\{\s*row\.email\s*\}\s*<\/td>/i);
        expect(SRC).not.toMatch(/<td[^>]*>\s*\{\s*row\.anonymous_id\s*\}\s*<\/td>/i);
    });

    it('does not embed a third-party analytics SDK', () => {
        expect(SRC).not.toMatch(/from\s+['"](posthog-js|posthog-node|@segment\/analytics-node|mixpanel|amplitude|@growthbook\/growthbook)['"]/i);
    });
});

describe('/admin/funnel — no scope creep', () => {
    it('does not call billing checkout', () => {
        expect(SRC).not.toMatch(/api\/v2\/billing\/checkout/);
    });

    it('does not import the Stripe SDK', () => {
        expect(SRC).not.toMatch(/from\s+['"]stripe['"]/);
    });

    it('does not contain unsupported public claims', () => {
        expect(SRC).not.toMatch(/verified[\s_-]+savings/i);
        expect(SRC).not.toMatch(/guaranteed\s+savings/i);
        expect(SRC).not.toMatch(/auto[\s_-]?apply/i);
        expect(SRC).not.toMatch(/SOC ?2 compliant/i);
        expect(SRC).not.toMatch(/HIPAA compliant/i);
    });
});
