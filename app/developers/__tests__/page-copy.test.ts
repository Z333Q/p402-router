import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const PAGE = join(__dirname, '..', 'page.tsx');
const SRC = readFileSync(PAGE, 'utf8');

describe('/developers hub page — copy and CTAs', () => {
    it('renders the hero H1', () => {
        expect(SRC).toMatch(/Build AI features with/);
        expect(SRC).toMatch(/cost ownership\./);
    });

    it('renders Start free CTA pointing at /login', () => {
        expect(SRC).toMatch(/href="\/login"/);
        expect(SRC).toMatch(/Start free/);
    });

    it('renders Read quickstart CTA pointing at /developers/quickstart', () => {
        expect(SRC).toMatch(/href="\/developers\/quickstart"/);
        expect(SRC).toMatch(/Read quickstart/);
    });

    it('renders metadata-only privacy copy', () => {
        expect(SRC).toMatch(/meters economics, not content/i);
    });

    it('renders optional-settlement copy', () => {
        expect(SRC).toMatch(/Meter works without settlement/);
    });
});

describe('/developers hub page — forbidden phrases', () => {
    it('contains no banned marketing phrases', () => {
        expect(SRC).not.toMatch(/verified savings/i);
        expect(SRC).not.toMatch(/guaranteed savings/i);
        expect(SRC).not.toMatch(/auto-apply/i);
        expect(SRC).not.toMatch(/SOC ?2 compliant/i);
        expect(SRC).not.toMatch(/HIPAA compliant/i);
        expect(SRC).not.toMatch(/ISO ?\d* ?certified/i);
        expect(SRC).not.toMatch(/Developer \$249/);
        expect(SRC).not.toMatch(/Business \$2,500/);
        expect(SRC).not.toMatch(/Proof Sprint/);
        expect(SRC).not.toMatch(/Stripe Checkout/i);
        expect(SRC).not.toMatch(/Buy now/i);
        expect(SRC).not.toMatch(/Start paid plan/i);
    });

    it('contains no literal p402_live_ key prefix', () => {
        expect(SRC).not.toContain('p402_live_');
        expect(SRC).not.toMatch(/p402_live_[a-z0-9]/i);
    });

    it('contains no "save N%" claim', () => {
        expect(SRC).not.toMatch(/save \d+\s*%/i);
    });
});
