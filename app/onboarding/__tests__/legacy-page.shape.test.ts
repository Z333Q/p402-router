/**
 * Source-shape tests for app/onboarding/page.tsx after the 3AZ-2-D
 * cutover. The legacy 442-line role-selection / wallet-pre-step page
 * is replaced by a thin server-side redirect to /onboarding/welcome.
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

describe('/onboarding (legacy) — replaced by redirect (plan §11.4)', () => {
    it('is a short file (legacy 442-line implementation removed)', () => {
        const lineCount = RAW.split('\n').length;
        expect(lineCount).toBeLessThan(40);
    });

    it('redirects to /onboarding/welcome', () => {
        expect(SRC).toMatch(/redirect\s*\(\s*['"]\/onboarding\/welcome['"]\s*\)/);
    });

    it('declares dynamic = force-dynamic (so the redirect cannot be statically cached)', () => {
        expect(SRC).toMatch(/export\s+const\s+dynamic\s*=\s*['"]force-dynamic['"]/);
    });

    it('no longer imports CDPEmailAuth', () => {
        expect(SRC).not.toMatch(/CDPEmailAuth/);
        expect(SRC).not.toMatch(/@\/components\/auth\/CDPEmailAuth/);
    });

    it('no longer imports useAuthState or useSession', () => {
        expect(SRC).not.toMatch(/useAuthState/);
        expect(SRC).not.toMatch(/useSession/);
    });

    it('no longer declares Role / Goal / ROLES / CODE_SNIPPETS / NEXT_STEPS', () => {
        expect(SRC).not.toMatch(/\bRoleOption\b/);
        expect(SRC).not.toMatch(/\bROLES\s*[:=]/);
        expect(SRC).not.toMatch(/\bCODE_SNIPPETS\b/);
        expect(SRC).not.toMatch(/\bNEXT_STEPS\b/);
    });

    it('no longer surfaces V5-forbidden tokens', () => {
        expect(SRC).not.toMatch(/\bUSDC\b/);
        expect(SRC).not.toMatch(/\bgasless\b/i);
        expect(SRC).not.toMatch(/\bCoinbase\b/i);
        expect(SRC).not.toMatch(/\bself[\s-]?custody\b/i);
        expect(SRC).not.toMatch(/One\s+more\s+step/i);
        expect(SRC).not.toMatch(/Welcome to the network/i);
    });
});
