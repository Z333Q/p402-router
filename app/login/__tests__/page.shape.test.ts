/**
 * Source-shape tests for app/login/page.tsx after the 3AZ-2-D cutover.
 *
 * Asserts:
 *   - V5 hero copy is in place.
 *   - Google is the primary provider (rendered first, callbackUrl is
 *     /onboarding/welcome).
 *   - The CDP component is still imported (email path under "Continue
 *     with email"), but the "self-custody" / "secured by Coinbase"
 *     disclaimer is gone.
 *   - Wallet connect is gated behind "More options".
 *   - funnel.login_view + funnel.signin_started emits exist.
 *   - None of the §6.1 forbidden tokens appear in user-visible code.
 */

import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

function stripComments(src: string): string {
    return src
        .replace(/\/\*[\s\S]*?\*\//g, '')
        .replace(/^\s*\/\/.*$/gm, '');
}

const RAW = readFileSync(join(__dirname, '..', 'page.tsx'), 'utf8');
const SRC = stripComments(RAW);

describe('/login — V5 hero + scaffolding', () => {
    it('declares the V5 hero copy from plan §6', () => {
        expect(SRC).toMatch(/Make your AI spend/);
        expect(SRC).toMatch(/accountable/);
        expect(SRC).toMatch(/Free Sandbox\. No credit card/);
    });

    it('strips the old "Get your API key. Start routing." hero', () => {
        expect(SRC).not.toMatch(/Get your API key\./);
        expect(SRC).not.toMatch(/Start routing\./);
    });

    it('strips the old "No wallet required" / "Free to start" subhead', () => {
        expect(SRC).not.toMatch(/No wallet required\./);
        expect(SRC).not.toMatch(/Free to start\./);
    });

    it('points the Google callbackUrl at /onboarding/welcome (not legacy /onboarding)', () => {
        expect(SRC).toMatch(/callbackUrl:\s*['"]\/onboarding\/welcome['"]/);
        // The legacy path appears only as the redirect destination in
        // the new app/onboarding/page.tsx; it must not be wired here.
        expect(SRC).not.toMatch(/callbackUrl:\s*['"]\/onboarding['"](?!\/welcome)/);
    });

    it('points the email-path onSuccess router.push at /onboarding/welcome', () => {
        expect(SRC).toMatch(/router\.push\(\s*['"]\/onboarding\/welcome['"]\s*\)/);
    });
});

describe('/login — V5 vocabulary discipline (plan §6.1)', () => {
    it('does not mention self-custody', () => {
        expect(SRC).not.toMatch(/\bself[\s-]?custody\b/i);
    });

    it('does not mention Coinbase in user-visible copy', () => {
        // The CDP component import is allowed; user-facing string is not.
        expect(SRC).not.toMatch(/secured by Coinbase/i);
        expect(SRC).not.toMatch(/Coinbase Wallet/i);
    });

    it('does not surface USDC / gasless / Base / x402 / permit on the entry surface', () => {
        expect(SRC).not.toMatch(/\bUSDC\b/);
        expect(SRC).not.toMatch(/\bgasless\b/i);
        expect(SRC).not.toMatch(/\bon\s+Base\b/i);
        expect(SRC).not.toMatch(/\bx402\b/i);
        expect(SRC).not.toMatch(/\bpermit\s+allowance\b/i);
    });

    it('strips the "Add a wallet in onboarding to enable payments" disclaimer', () => {
        expect(SRC).not.toMatch(/Add a wallet in onboarding/i);
        expect(SRC).not.toMatch(/enable payments/i);
    });

    it('does not use em dashes in user-facing copy', () => {
        expect(SRC).not.toMatch(/—/);
    });
});

describe('/login — funnel emit (plan §8)', () => {
    it('emits funnel.login_view on mount', () => {
        expect(SRC).toMatch(/funnel\.login_view/);
    });

    it('emits funnel.signin_started with the chosen provider', () => {
        expect(SRC).toMatch(/funnel\.signin_started/);
    });

    it('posts emits to /api/v1/funnel/event', () => {
        expect(SRC).toMatch(/\/api\/v1\/funnel\/event/);
    });
});

describe('/login — provider ordering (plan §4.1)', () => {
    it('Google button appears before the email card in source order', () => {
        const googleIdx = SRC.indexOf('Continue with Google');
        const emailIdx = SRC.indexOf('Continue with email');
        expect(googleIdx).toBeGreaterThan(-1);
        expect(emailIdx).toBeGreaterThan(-1);
        expect(googleIdx).toBeLessThan(emailIdx);
    });

    it('wallet connect is hidden behind a "More options" disclosure', () => {
        expect(SRC).toMatch(/More options/);
        expect(SRC).toMatch(/setShowMore/);
    });

    it('email card uses the user-facing label "Continue with email" (not a wallet label)', () => {
        expect(SRC).toMatch(/Continue with email/);
        expect(SRC).not.toMatch(/Sign in with Email\b/);
    });
});

describe('/login — no scope creep', () => {
    it('does not import the Stripe SDK', () => {
        expect(SRC).not.toMatch(/from\s+['"]stripe['"]/);
    });

    it('does not import any third-party analytics SDK', () => {
        expect(SRC).not.toMatch(/from\s+['"](posthog-js|posthog-node|@segment\/analytics-node|mixpanel|amplitude|@growthbook\/growthbook)['"]/i);
    });

    it('does not call billing checkout', () => {
        expect(SRC).not.toMatch(/api\/v2\/billing\/checkout/);
    });
});
