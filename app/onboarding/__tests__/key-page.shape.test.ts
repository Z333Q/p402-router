/**
 * Source-shape tests for app/onboarding/key/page.tsx (Stage B shell)
 * and app/onboarding/key/_components/OnboardingKeyClient.tsx
 * (Stage B client surface). Per 3AZ-2 plan §6.1.
 */

import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

function stripComments(src: string): string {
    return src
        .replace(/\/\*[\s\S]*?\*\//g, '')
        .replace(/^\s*\/\/.*$/gm, '');
}

const SERVER_RAW = readFileSync(
    join(__dirname, '..', 'key', 'page.tsx'),
    'utf8'
);
const CLIENT_RAW = readFileSync(
    join(__dirname, '..', 'key', '_components', 'OnboardingKeyClient.tsx'),
    'utf8'
);

// Vocabulary scans run against comment-stripped source so the docblock
// that names what we forbid doesn't trip its own scan.
const SERVER_SRC = stripComments(SERVER_RAW);
const CLIENT_SRC = stripComments(CLIENT_RAW);
const COMBINED = `${SERVER_SRC}\n\n${CLIENT_SRC}`;

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

describe('Stage B server shell — gate scaffolding', () => {
    it('declares dynamic = force-dynamic', () => {
        expect(SERVER_SRC).toMatch(/export\s+const\s+dynamic\s*=\s*['"]force-dynamic['"]/);
    });

    it('redirects unauthenticated users to /login', () => {
        expect(SERVER_SRC).toMatch(/redirect\s*\(\s*['"]\/login['"]\s*\)/);
    });

    it('gates onboarded users to /dashboard via getPostSigninDestination', () => {
        expect(SERVER_SRC).toMatch(/getPostSigninDestination/);
        expect(SERVER_SRC).toMatch(/redirect\s*\(\s*['"]\/dashboard['"]\s*\)/);
    });

    it('delegates the interactive UI to a client component', () => {
        expect(SERVER_SRC).toMatch(/OnboardingKeyClient/);
    });
});

describe('Stage B client — V5 vocabulary discipline (plan §6.1)', () => {
    it.each(FORBIDDEN_TOKENS_HAPPY_PATH)('client does not mention %s', (pattern) => {
        expect(CLIENT_SRC).not.toMatch(pattern);
    });

    it('client does not use the word "wallet" anywhere', () => {
        expect(CLIENT_SRC).not.toMatch(/\bwallet\b/i);
    });

    it('client does not import CDPEmailAuth', () => {
        expect(CLIENT_SRC).not.toMatch(/CDPEmailAuth/);
        expect(CLIENT_SRC).not.toMatch(/from\s+['"]@\/components\/auth\/CDPEmailAuth['"]/);
    });

    it('does not use em dashes in user-facing copy (CLAUDE.md house style)', () => {
        expect(CLIENT_SRC).not.toMatch(/—/);
    });
});

describe('Stage B — no unsupported public claims', () => {
    it.each(FORBIDDEN_CLAIMS)('does not contain %s anywhere', (pattern) => {
        expect(COMBINED).not.toMatch(pattern);
    });
});

describe('Stage B — required behavior (plan §4.3)', () => {
    it('is a client component', () => {
        expect(CLIENT_SRC).toMatch(/^['"]use client['"]/);
    });

    it('calls generateApiKeyAction to mint a key', () => {
        expect(CLIENT_SRC).toMatch(/generateApiKeyAction/);
        expect(CLIENT_SRC).toMatch(/from\s+['"]@\/lib\/actions\/settings['"]/);
    });

    it('calls completeOnboardingAction on the primary CTA', () => {
        expect(CLIENT_SRC).toMatch(/completeOnboardingAction/);
        expect(CLIENT_SRC).toMatch(/from\s+['"]@\/lib\/actions\/onboarding['"]/);
    });

    it('emits funnel.api_key_issued after key generation', () => {
        expect(CLIENT_SRC).toMatch(/funnel\.api_key_issued/);
        expect(CLIENT_SRC).toMatch(/\/api\/v1\/funnel\/event/);
    });

    it('declares a language toggle with TypeScript / Python / curl', () => {
        expect(CLIENT_SRC).toMatch(/typescript:/);
        expect(CLIENT_SRC).toMatch(/python:/);
        expect(CLIENT_SRC).toMatch(/curl:/);
    });

    it('uses the OpenAI-compatible base URL in the TS snippet', () => {
        expect(CLIENT_SRC).toMatch(/baseURL:\s*['"]https:\/\/p402\.io\/api\/v2['"]/);
    });

    it('exposes a copy-to-clipboard control for the raw key', () => {
        expect(CLIENT_SRC).toMatch(/navigator\.clipboard\.writeText/);
    });

    it('does not write the raw key to localStorage or sessionStorage', () => {
        expect(CLIENT_SRC).not.toMatch(/localStorage\.setItem\([^)]*apiKey/);
        expect(CLIENT_SRC).not.toMatch(/sessionStorage\.setItem\([^)]*apiKey/);
        // Belt-and-braces: no setItem call on either storage at all
        // from this client (we have no legitimate reason to persist).
        expect(CLIENT_SRC).not.toMatch(/localStorage\.setItem/);
        expect(CLIENT_SRC).not.toMatch(/sessionStorage\.setItem/);
    });

    it('contains the V5 Stage B hero copy', () => {
        expect(CLIENT_SRC).toMatch(/Your API key/);
        expect(CLIENT_SRC).toMatch(/Save this now/);
        expect(CLIENT_SRC).toMatch(/won&apos;t be shown again/);
    });

    it('does not include "Welcome to the network" (the old onboarding hero)', () => {
        expect(CLIENT_SRC).not.toMatch(/Welcome to the network/i);
    });
});

describe('Stage B — no scope creep', () => {
    it('client does not import the Stripe SDK', () => {
        expect(CLIENT_SRC).not.toMatch(/from\s+['"]stripe['"]/);
    });

    it('client does not import any third-party analytics SDK', () => {
        expect(CLIENT_SRC).not.toMatch(/from\s+['"](posthog-js|posthog-node|@segment\/analytics-node|mixpanel|amplitude|@growthbook\/growthbook)['"]/i);
    });

    it('client does not call billing checkout', () => {
        expect(CLIENT_SRC).not.toMatch(/api\/v2\/billing\/checkout/);
    });

    it('client does not surface explicit pricing copy ($49/$199/$799 belongs on /pricing)', () => {
        expect(CLIENT_SRC).not.toMatch(/\$49\b/);
        expect(CLIENT_SRC).not.toMatch(/\$199\b/);
        expect(CLIENT_SRC).not.toMatch(/\$799\b/);
    });
});
