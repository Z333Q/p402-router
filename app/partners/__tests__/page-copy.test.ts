import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const PAGE = join(__dirname, '..', 'page.tsx');
const SRC = readFileSync(PAGE, 'utf8');

describe('/partners page — copy and CTAs', () => {
    it('renders the hero H1', () => {
        expect(SRC).toMatch(/Help clients deploy AI spend/);
        expect(SRC).toMatch(/accountability\./);
    });

    it('renders the Apply as partner CTA pointing at the apply route', () => {
        expect(SRC).toMatch(/href="\/partners\/apply"/);
        expect(SRC).toMatch(/Apply as partner/);
    });

    it('renders the Read docs CTA pointing at /docs', () => {
        expect(SRC).toMatch(/href="\/docs"/);
        expect(SRC).toMatch(/Read docs/);
    });

    it('renders all three track names', () => {
        expect(SRC).toMatch(/Developer Affiliate/);
        expect(SRC).toMatch(/Integration Partner/);
        expect(SRC).toMatch(/Enterprise Referral Partner/);
    });

    it('renders metadata-only privacy copy', () => {
        expect(SRC).toMatch(/metadata-only economic events/);
    });

    it('renders related buyer-path cards', () => {
        expect(SRC).toMatch(/'\/ai-spend-audit'/);
        expect(SRC).toMatch(/'\/developers'/);
        expect(SRC).toMatch(/'\/enterprise'/);
        expect(SRC).toMatch(/href="\/partners\/apply"/);
    });
});

describe('/partners page — forbidden phrases', () => {
    it('contains no banned marketing phrases', () => {
        expect(SRC).not.toMatch(/verified savings/i);
        expect(SRC).not.toMatch(/guaranteed savings/i);
        expect(SRC).not.toMatch(/auto-apply/i);
        expect(SRC).not.toMatch(/SOC 2 compliant/i);
        expect(SRC).not.toMatch(/HIPAA compliant/i);
        expect(SRC).not.toMatch(/ISO certified/i);
        expect(SRC).not.toMatch(/GDPR compliant/i);
        expect(SRC).not.toMatch(/FedRAMP/i);
        expect(SRC).not.toMatch(/Developer \$249/);
        expect(SRC).not.toMatch(/Business \$2,500/);
        expect(SRC).not.toMatch(/Proof Sprint/);
        expect(SRC).not.toMatch(/Stripe Checkout/i);
        expect(SRC).not.toMatch(/Buy now/i);
        expect(SRC).not.toMatch(/Start paid plan/i);
    });

    it('does not match save N percent claims', () => {
        expect(SRC).not.toMatch(/save \d+\s*%/i);
    });

    it('contains no literal p402_live_ key prefix', () => {
        expect(SRC).not.toContain('p402_live_');
    });

    it('contains no em dash', () => {
        expect(SRC).not.toContain('—');
    });
});
