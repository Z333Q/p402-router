/**
 * Source-shape tests for app/onboarding/welcome/page.tsx (Stage A).
 *
 * Per 3AZ-2 plan §6.1, the onboarding happy path may not contain
 * crypto / wallet / USDC / payment-precondition vocabulary, nor any
 * unsupported public claim. The test asserts on the raw file contents
 * so a regression is caught at vitest time, before any render.
 */

import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const RAW = readFileSync(
    join(__dirname, '..', 'welcome', 'page.tsx'),
    'utf8'
);

/**
 * Strip /* ... *\/ block comments and // line comments so the
 * vocabulary scan inspects user-facing JSX only and not the docblock
 * that names what we forbid.
 */
function stripComments(src: string): string {
    return src
        .replace(/\/\*[\s\S]*?\*\//g, '')
        .replace(/^\s*\/\/.*$/gm, '');
}

const SRC = stripComments(RAW);

const FORBIDDEN_TOKENS_HAPPY_PATH = [
    /\bUSDC\b/,
    /\bgasless\b/i,
    /\bCoinbase\b/i,
    /\bon\s+Base\b/i,
    /\bpermit\s+allowance\b/i,
    /\bself[\s-]?custody\b/i,
    /\bx402\b/i,
    /\bEIP[\s-]?3009\b/i,
    /\bEIP[\s-]?2612\b/i,
    /One\s+more\s+step/i,
    /Activate\s+Payments/i,
];

const FORBIDDEN_CLAIMS = [
    /verified[\s_-]+savings/i,
    /guaranteed\s+savings/i,
    /save\s+\d+\s*%/i,
    /auto[\s_-]?apply/i,
    /SOC ?2 compliant/i,
    /HIPAA compliant/i,
    /ISO ?\d+ certified/i,
    /runtime enforcement (active|live|enabled)/i,
];

describe('Stage A — V5 vocabulary discipline (plan §6.1)', () => {
    it.each(FORBIDDEN_TOKENS_HAPPY_PATH)('does not mention %s', (pattern) => {
        expect(SRC).not.toMatch(pattern);
    });

    it('does not mention "wallet" anywhere on the critical path', () => {
        // Specifically: no "wallet" or "Wallet" tokens. Settings pages
        // and JIT activation surfaces are allowed elsewhere; not here.
        expect(SRC).not.toMatch(/\bwallet\b/i);
    });

    it('does not import CDPEmailAuth (wallet must not appear on Stage A)', () => {
        expect(SRC).not.toMatch(/CDPEmailAuth/);
        expect(SRC).not.toMatch(/from\s+['"]@\/components\/auth\/CDPEmailAuth['"]/);
    });

    it('does not use em dashes in user-facing copy (CLAUDE.md house style)', () => {
        expect(SRC).not.toMatch(/—/);
    });
});

describe('Stage A — no unsupported public claims', () => {
    it.each(FORBIDDEN_CLAIMS)('does not contain %s', (pattern) => {
        expect(SRC).not.toMatch(pattern);
    });
});

describe('Stage A — required scaffolding (plan §4.3)', () => {
    it('declares dynamic = force-dynamic (session-aware page)', () => {
        expect(SRC).toMatch(/export\s+const\s+dynamic\s*=\s*['"]force-dynamic['"]/);
    });

    it('emits funnel.onboarding_view server-side', () => {
        expect(SRC).toMatch(/funnel\.onboarding_view/);
        expect(SRC).toMatch(/recordFunnelEvent/);
    });

    it('gates onboarded users to /dashboard via getPostSigninDestination', () => {
        expect(SRC).toMatch(/getPostSigninDestination/);
        expect(SRC).toMatch(/redirect\s*\(\s*['"]\/dashboard['"]\s*\)/);
    });

    it('gates unauthenticated users to /login', () => {
        expect(SRC).toMatch(/redirect\s*\(\s*['"]\/login['"]\s*\)/);
    });

    it('links the primary CTA to /onboarding/key (Stage B)', () => {
        expect(SRC).toMatch(/href\s*=\s*['"]\/onboarding\/key['"]/);
    });

    it('links the tertiary CTA to /get-access?intent=scoping-call', () => {
        expect(SRC).toMatch(/href\s*=\s*['"]\/get-access\?intent=scoping-call['"]/);
    });

    it('declares exactly three value tiles per plan §4.3', () => {
        const titleMatches = SRC.match(/title:\s*['"]/g) ?? [];
        expect(titleMatches.length).toBe(3);
    });

    it('contains the V5 hero copy from plan §6.2', () => {
        expect(SRC).toMatch(/You&apos;re in\./);
        expect(SRC).toMatch(/Here&apos;s what P402 does for your AI spend/);
    });
});

describe('Stage A — no scope creep', () => {
    it('does not import the Stripe SDK', () => {
        expect(SRC).not.toMatch(/from\s+['"]stripe['"]/);
    });

    it('does not import any third-party analytics SDK', () => {
        expect(SRC).not.toMatch(/from\s+['"](posthog-js|posthog-node|@segment\/analytics-node|mixpanel|amplitude|@growthbook\/growthbook)['"]/i);
    });

    it('does not call /api/v2/billing/checkout', () => {
        expect(SRC).not.toMatch(/api\/v2\/billing\/checkout/);
    });

    it('does not reference Build / Growth / Scale pricing (those live in /pricing)', () => {
        // Stage A is value-first, not pricing-first. No dollar amounts.
        expect(SRC).not.toMatch(/\$49/);
        expect(SRC).not.toMatch(/\$199/);
        expect(SRC).not.toMatch(/\$799/);
    });
});
