import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const PAGE = join(__dirname, '..', 'page.tsx');
const SRC = readFileSync(PAGE, 'utf8');

describe('/trust page — copy and CTAs', () => {
    it('renders the hero H1', () => {
        expect(SRC).toMatch(/Trust for AI spend/);
        expect(SRC).toMatch(/accountability\./);
    });

    it('renders metadata-only privacy copy', () => {
        expect(SRC).toMatch(/Meter economics, not content/i);
    });

    it('renders the "What P402 records" section content', () => {
        expect(SRC).toMatch(/Per-event economic facts/);
        expect(SRC).toMatch(/workflow_id/);
        expect(SRC).toMatch(/customer_id/);
    });

    it('renders the "what P402 does not require" section', () => {
        expect(SRC).toMatch(/Files/);
        expect(SRC).toMatch(/Documents/);
        expect(SRC).toMatch(/Source code/);
    });

    it('renders the procurement section', () => {
        expect(SRC).toMatch(/Procurement/);
        expect(SRC).toMatch(/DPA path/);
        expect(SRC).toMatch(/BAA path/);
    });

    it('renders the Request security review CTA pointing at the access route', () => {
        expect(SRC).toMatch(/href="\/get-access\?intent=security-review"/);
        expect(SRC).toMatch(/Request security review/);
    });

    it('uses qualified language for the BAA path', () => {
        expect(SRC).toMatch(/BAA path[\s\S]*available after security and contracting review/);
    });
});

describe('/trust page — compliance-claim discipline', () => {
    it('does not claim SOC 2 compliance', () => {
        expect(SRC).not.toMatch(/SOC 2 compliant/i);
    });

    it('does not claim HIPAA compliance', () => {
        expect(SRC).not.toMatch(/HIPAA compliant/i);
    });

    it('does not claim ISO certification', () => {
        expect(SRC).not.toMatch(/ISO certified/i);
    });

    it('does not claim GDPR compliance', () => {
        expect(SRC).not.toMatch(/GDPR compliant/i);
    });

    it('does not claim FedRAMP', () => {
        expect(SRC).not.toMatch(/FedRAMP/i);
    });
});

describe('/trust page — forbidden phrases', () => {
    it('contains no banned marketing phrases', () => {
        expect(SRC).not.toMatch(/verified savings/i);
        expect(SRC).not.toMatch(/guaranteed savings/i);
        expect(SRC).not.toMatch(/save \d+\s*%/i);
        expect(SRC).not.toMatch(/auto-apply/i);
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

    it('does not imply checkout is live', () => {
        expect(SRC).not.toMatch(/checkout is live/i);
        expect(SRC).not.toMatch(/Subscribe now/i);
    });
});
