/**
 * CDP E2E Mock Helpers
 * ====================
 * Playwright helpers for mocking CDP Embedded Wallet in E2E tests.
 *
 * CDP's embedded wallet uses browser-side APIs (indexedDB, Web Crypto).
 * In E2E tests we intercept the CDP auth endpoints and simulate the
 * email OTP flow without making real CDP API calls.
 */

import type { Page } from '@playwright/test';

/**
 * Intercept CDP OTP send endpoint to avoid real email sends.
 */
export async function mockCdpSendOtp(page: Page) {
    await page.route('**/api/auth/otp/send**', (route) =>
        route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify({ success: true, message_id: 'mock-msg-001' }),
        })
    );
}

/**
 * Intercept CDP OTP verify endpoint with a successful wallet response.
 * The mock wallet address is returned so downstream assertions can match it.
 */
export async function mockCdpVerifyOtp(
    page: Page,
    opts: { walletAddress?: string; shouldFail?: boolean } = {}
) {
    const address = opts.walletAddress ?? '0xTest1234567890AbcDEF1234567890abcdef1234';

    await page.route('**/api/auth/otp/verify**', (route) => {
        if (opts.shouldFail) {
            return route.fulfill({
                status: 401,
                contentType: 'application/json',
                body: JSON.stringify({ error: 'Invalid code' }),
            });
        }
        return route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify({
                success: true,
                wallet: { address, network: 'base-mainnet' },
            }),
        });
    });

    return address;
}

/**
 * Inject a mock CDP embedded wallet into the browser context.
 * Must be called before page.goto() so the script runs before CDP SDK loads.
 */
export async function injectCdpWalletMock(page: Page, walletAddress?: string) {
    const address = walletAddress ?? '0xTest1234567890AbcDEF1234567890abcdef1234';

    await page.addInitScript(`
        // Stub CDP wallet provider so wagmi connectors find a connected wallet
        window.__CDP_MOCK_WALLET__ = {
            address: '${address}',
            connected: true,
            signMessage: async (msg) => '0xmocksignature1234567890abcdef',
            signTypedData: async (data) => '0xmocksignature1234567890abcdef',
        };
        // Prevent CDP SDK from trying to open an iframe or OAuth popup
        window.open = function() { return null; };
    `);
}

/**
 * Mock the CDP-wallet NextAuth provider so the login bridge completes
 * without requiring real signature verification.
 */
export async function mockCdpWalletAuth(page: Page, tenantId = 'test-tenant-cdp') {
    await page.route('/api/auth/callback/cdp-wallet', (route) =>
        route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify({ ok: true, url: '/dashboard' }),
        })
    );

    await page.route('/api/auth/session', (route) =>
        route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify({
                user: {
                    name: 'Wallet 0xTest…1234',
                    email: '0xtest1234567890abcdef1234567890abcdef1234@wallet.p402.io',
                    tenantId,
                    role: 'user',
                    id: '0xtest1234567890abcdef1234567890abcdef1234',
                },
                expires: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
            }),
        })
    );
}
