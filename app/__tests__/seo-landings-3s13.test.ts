import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

/**
 * 3S-13: shape test covering the five SEO landings rewritten onto the
 * canonical /meter dark-theme buyer surface. Mirrors the pattern in
 * app/developers/__tests__/page-copy.test.ts.
 */

type Landing = {
    route: string;
    file: string;
    h1: string;
    primaryHref: string;
    secondaryHref: string;
};

const APP_DIR = join(__dirname, '..');

const LANDINGS: ReadonlyArray<Landing> = [
    {
        route: '/enterprise-ai-budget-dashboard',
        file: join(APP_DIR, 'enterprise-ai-budget-dashboard', 'page.tsx'),
        h1: 'Enterprise AI budget',
        primaryHref: '/ai-spend-audit',
        secondaryHref: '/dashboard?demo=1',
    },
    {
        route: '/ai-token-usage-dashboard',
        file: join(APP_DIR, 'ai-token-usage-dashboard', 'page.tsx'),
        h1: 'AI token usage',
        primaryHref: '/dashboard?demo=1',
        secondaryHref: '/docs',
    },
    {
        route: '/embedded-ai-margin-control',
        file: join(APP_DIR, 'embedded-ai-margin-control', 'page.tsx'),
        h1: 'Embedded AI margin',
        primaryHref: '/login',
        secondaryHref: '/developers/quickstart',
    },
    {
        route: '/ai-cogs-dashboard',
        file: join(APP_DIR, 'ai-cogs-dashboard', 'page.tsx'),
        h1: 'AI COGS',
        primaryHref: '/dashboard?demo=1',
        secondaryHref: '/ai-spend-audit',
    },
    {
        route: '/ai-cost-optimization',
        file: join(APP_DIR, 'ai-cost-optimization', 'page.tsx'),
        h1: 'AI cost optimization',
        primaryHref: '/dashboard/optimize?demo=1',
        secondaryHref: '/docs',
    },
];

function escapeRegex(s: string): string {
    return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

for (const landing of LANDINGS) {
    const SRC = readFileSync(landing.file, 'utf8');

    describe(`${landing.route} — shape`, () => {
        it('renders the hero H1', () => {
            expect(SRC).toMatch(new RegExp(escapeRegex(landing.h1), 'i'));
        });

        it('renders the primary CTA href', () => {
            expect(SRC).toContain(`href="${landing.primaryHref}"`);
        });

        it('renders the secondary CTA href', () => {
            expect(SRC).toContain(`href="${landing.secondaryHref}"`);
        });
    });

    describe(`${landing.route} — forbidden phrases`, () => {
        it('contains no banned marketing phrases', () => {
            expect(SRC).not.toMatch(/verified savings/i);
            expect(SRC).not.toMatch(/guaranteed savings/i);
            expect(SRC).not.toMatch(/auto-apply/i);
            expect(SRC).not.toMatch(/SOC ?2 compliant/i);
            expect(SRC).not.toMatch(/HIPAA compliant/i);
            expect(SRC).not.toMatch(/ISO ?\d* ?certified/i);
            expect(SRC).not.toMatch(/GDPR compliant/i);
            expect(SRC).not.toMatch(/FedRAMP/i);
            expect(SRC).not.toMatch(/Developer \$249/);
            expect(SRC).not.toMatch(/Business \$2,500/);
            expect(SRC).not.toMatch(/Proof Sprint/);
            expect(SRC).not.toMatch(/Stripe Checkout/i);
            expect(SRC).not.toMatch(/Buy now/i);
            expect(SRC).not.toMatch(/Start paid plan/i);
            expect(SRC).not.toMatch(/enterprise-ready/i);
            expect(SRC).not.toMatch(/Sentinel/);
            expect(SRC).not.toMatch(/\bunlock\b/i);
            expect(SRC).not.toMatch(/\bharness\b/i);
            expect(SRC).not.toMatch(/\butilize\b/i);
            expect(SRC).not.toMatch(/\bdelve\b/i);
            expect(SRC).not.toMatch(/\blandscape\b/i);
            expect(SRC).not.toMatch(/transformative/i);
            expect(SRC).not.toMatch(/frictionless/i);
            expect(SRC).not.toMatch(/crystal clear/i);
            expect(SRC).not.toMatch(/reimagine/i);
            expect(SRC).not.toMatch(/skyrocket/i);
            expect(SRC).not.toMatch(/supercharge/i);
            expect(SRC).not.toMatch(/future-proof/i);
            expect(SRC).not.toMatch(/effortless/i);
            expect(SRC).not.toMatch(/seamless/i);
            expect(SRC).not.toMatch(/cutting-edge/i);
            expect(SRC).not.toMatch(/revolutionary/i);
            expect(SRC).not.toMatch(/world-class/i);
            expect(SRC).not.toMatch(/next-generation/i);
            expect(SRC).not.toMatch(/\bpowerful\b/i);
        });

        it('contains no "save N%" claim', () => {
            expect(SRC).not.toMatch(/save \d+\s*%/i);
        });

        it('contains no literal p402_live_ key prefix', () => {
            expect(SRC).not.toContain('p402_live_');
        });

        it('contains no em dash', () => {
            expect(SRC).not.toContain('—');
        });
    });
}

// Page-specific: /ai-cost-optimization must carry the gated-status posture.
describe('/ai-cost-optimization — gated-status posture', () => {
    const SRC = readFileSync(
        join(APP_DIR, 'ai-cost-optimization', 'page.tsx'),
        'utf8',
    );

    it('renders the readiness-checks-live status badge', () => {
        expect(SRC).toMatch(/readiness checks live/i);
    });

    it('renders the Recommendations gated status', () => {
        expect(SRC).toContain('Recommendations gated');
    });
});
