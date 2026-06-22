/**
 * Source-shape tests for components/landing/PricingStrip.tsx after the
 * 3AZ-2-D V5 refresh.
 *
 * Asserts:
 *   - No 3AX-era plan names ("Pro") or prices ($499, $2,500, $5,000).
 *   - No "Platform Fee" BPS line.
 *   - Reads prices from lib/pricing/rate-card.ts (single source of truth).
 *   - Three V5 slots: Sandbox, Build, Growth.
 *   - CTAs route through /get-access?intent=… or /login.
 *   - No crypto / wallet vocabulary in landing copy.
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
    join(__dirname, '..', 'PricingStrip.tsx'),
    'utf8'
);
const SRC = stripComments(RAW);

describe('PricingStrip — V5 ladder discipline', () => {
    it('imports PLANS from the rate-card source of truth', () => {
        expect(SRC).toMatch(/from\s+['"]@\/lib\/pricing\/rate-card['"]/);
        expect(SRC).toMatch(/PLANS/);
    });

    it('does not hardcode the 3AX Pro $499 price', () => {
        expect(SRC).not.toMatch(/\$499\b/);
        expect(SRC).not.toMatch(/['"]Pro['"]/);
    });

    it('does not hardcode the retired Business / Developer prices', () => {
        expect(SRC).not.toMatch(/\$249\b/);
        expect(SRC).not.toMatch(/\$2,500\b/);
        expect(SRC).not.toMatch(/\$5,000\b/);
    });

    it('does not surface a "Platform Fee" BPS strip line', () => {
        expect(SRC).not.toMatch(/Platform Fee/i);
        expect(SRC).not.toMatch(/Volume-tiered/i);
        expect(SRC).not.toMatch(/\b1\.00%\b/);
        expect(SRC).not.toMatch(/\b0\.75%\b/);
    });

    it('exposes exactly three slots: Sandbox, Build, Growth', () => {
        expect(SRC).toMatch(/PLANS\.sandbox/);
        expect(SRC).toMatch(/PLANS\.build/);
        expect(SRC).toMatch(/PLANS\.growth/);
        // Scale and Enterprise stay on the full /pricing page only.
        expect(SRC).not.toMatch(/PLANS\.scale/);
        expect(SRC).not.toMatch(/PLANS\.enterprise/);
    });

    it('Build is the highlighted slot', () => {
        // The popular flag is on the Build slot per V5 funnel.
        const buildIdx = SRC.indexOf('PLANS.build');
        const popularIdx = SRC.indexOf('popular: true');
        expect(buildIdx).toBeGreaterThan(-1);
        expect(popularIdx).toBeGreaterThan(-1);
        // popular flag appears within the Build slot block (within ~400
        // chars of the PLANS.build reference).
        expect(Math.abs(popularIdx - buildIdx)).toBeLessThan(400);
    });

    it('CTAs route through the V5 funnel (/get-access?intent=… or /login)', () => {
        expect(SRC).toMatch(/\/get-access\?intent=build/);
        expect(SRC).toMatch(/\/get-access\?intent=growth/);
        // Sandbox lands at /login (entry surface) per V5.
        expect(SRC).toMatch(/href:\s*['"]\/login['"]/);
    });

    it('does not link Build / Growth to /dashboard/billing (legacy upgrade target)', () => {
        expect(SRC).not.toMatch(/\/dashboard\/billing/);
    });

    it('does not surface mailto links on the strip', () => {
        expect(SRC).not.toMatch(/mailto:/i);
    });
});

describe('PricingStrip — V5 vocabulary discipline', () => {
    it('does not mention USDC, gasless, Coinbase, on Base, x402, permit, or self-custody', () => {
        expect(SRC).not.toMatch(/\bUSDC\b/);
        expect(SRC).not.toMatch(/\bgasless\b/i);
        expect(SRC).not.toMatch(/\bCoinbase\b/i);
        expect(SRC).not.toMatch(/\bon\s+Base\b/i);
        expect(SRC).not.toMatch(/\bx402\b/i);
        expect(SRC).not.toMatch(/\bpermit\s+allowance\b/i);
        expect(SRC).not.toMatch(/\bself[\s-]?custody\b/i);
    });

    it('does not surface unsupported claims', () => {
        expect(SRC).not.toMatch(/verified[\s_-]+savings/i);
        expect(SRC).not.toMatch(/guaranteed\s+savings/i);
        expect(SRC).not.toMatch(/save\s+\d+\s*%/i);
        expect(SRC).not.toMatch(/auto[\s_-]?apply/i);
        expect(SRC).not.toMatch(/SOC ?2 compliant/i);
        expect(SRC).not.toMatch(/HIPAA compliant/i);
    });

    it('does not use em dashes in user-facing copy', () => {
        expect(SRC).not.toMatch(/—/);
    });
});

describe('PricingStrip — link to full pricing remains', () => {
    it('points the footer link at /pricing', () => {
        expect(SRC).toMatch(/href\s*=\s*['"]\/pricing['"]/);
    });
});
