/**
 * Source-shape tests for app/dashboard/layout.tsx after the 3AZ-2-D
 * cutover.
 *
 * Asserts:
 *   - The AuthStateBanner component and its invocation are gone.
 *   - The "Payments not activated" / "Activate Now" copy is gone.
 *   - The "Your wallet has no USDC yet" funding banner is gone from
 *     the layout (M2/M3/M4 surfaces own wallet activation now).
 *   - The onboarding gate from 3AZ-2-B (useOnboardedState) is still
 *     wired.
 *   - FundWalletProvider remains so the modal can still be invoked
 *     from M4 surfaces (Settings → Payments).
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
    join(__dirname, '..', 'layout.tsx'),
    'utf8'
);
const SRC = stripComments(RAW);

describe('dashboard layout — AuthStateBanner removed', () => {
    it('does not declare an AuthStateBanner component', () => {
        expect(SRC).not.toMatch(/function\s+AuthStateBanner/);
    });

    it('does not invoke <AuthStateBanner />', () => {
        expect(SRC).not.toMatch(/<AuthStateBanner\s*\/>/);
    });

    it('does not import useAuthState', () => {
        expect(SRC).not.toMatch(/useAuthState/);
    });

    it('does not import useFundWallet (modal is invoked from M4 surfaces, not the layout)', () => {
        expect(SRC).not.toMatch(/useFundWallet/);
    });

    it('does not import the X icon (banner-only)', () => {
        expect(SRC).not.toMatch(/X\s*[},]/);
    });
});

describe('dashboard layout — forbidden copy removed', () => {
    it('does not show "Payments not activated"', () => {
        expect(SRC).not.toMatch(/Payments not activated/i);
    });

    it('does not show "Activate Now"', () => {
        expect(SRC).not.toMatch(/Activate\s+Now/i);
    });

    it('does not show "wallet has no USDC"', () => {
        expect(SRC).not.toMatch(/wallet has no USDC/i);
    });

    it('does not surface USDC / on-chain payments copy', () => {
        expect(SRC).not.toMatch(/\bUSDC\b/);
        expect(SRC).not.toMatch(/on-chain payments/i);
    });

    it('does not use em dashes', () => {
        expect(SRC).not.toMatch(/—/);
    });
});

describe('dashboard layout — kept scaffolding', () => {
    it('still imports useOnboardedState (3AZ-2-B gate)', () => {
        expect(SRC).toMatch(/useOnboardedState/);
    });

    it('still wraps children in FundWalletProvider so M4 surfaces can open the modal', () => {
        expect(SRC).toMatch(/FundWalletProvider/);
    });

    it('still redirects unauthenticated users to /login', () => {
        expect(SRC).toMatch(/router\.push\(['"]\/login['"]\)/);
    });
});
