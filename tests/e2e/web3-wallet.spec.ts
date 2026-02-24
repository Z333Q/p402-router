import { test, expect, Page } from '@playwright/test';

/**
 * Web3 & Wallet Interaction Tests
 * Validates the core Web3 entry point for P402.io by mocking NextAuth and checking the Wallet Required guards.
 */

test.describe('Web3 Wallet Connections & Guards', () => {

    test('Dashboard layout redirects to login if no wallet/NextAuth session exists', async ({ page }) => {
        // Explicitly ensuring no session exists
        await page.route('**/api/auth/session', (route) => {
            route.fulfill({ status: 200, json: {} });
        });

        await page.goto('/dashboard');
        await page.waitForLoadState('networkidle');

        // Should be kicked back to login
        await expect(page).toHaveURL(/.*\/login/);
    });

    test('Accessing the Agent Bazaar requires a wallet (Wallet Required guard)', async ({ page }) => {
        // Mock a user with a session that has NO address yet (e.g., they didn't finish signing)
        await page.route('**/api/auth/session', (route) => {
            route.fulfill({
                status: 200,
                json: {
                    user: { id: 'test-user', address: undefined },
                    expires: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
                },
            });
        });

        // Some basic required APIs so components don't crash waiting
        await page.route('**/api/v1/routes*', (route) => {
            route.fulfill({ status: 200, json: { routes: [] } });
        });
        await page.route('**/api/v1/stats*', (route) => {
            route.fulfill({ status: 200, json: { totalPayments: 0, totalVolume: '0', successRate: 1, avgLatencyMs: 0 } });
        });
        await page.route('**/api/v1/events*', (route) => {
            route.fulfill({ status: 200, json: { events: [] } });
        });
        await page.route('**/api/v1/intelligence/status*', (route) => {
            route.fulfill({ status: 200, json: { status: 'active', cache: { entries: 0 } } });
        });

        await page.goto('/dashboard/bazaar');
        await page.waitForLoadState('networkidle');

        // Depending on the implementation of WalletRequired:
        // Either they get a prominent "Connect Wallet" CTA overlay on the screen:
        const connectPrompt = page.getByRole('button', { name: /Connect Wallet/i });

        // OR an error message is visible telling them to sign in properly
        const errorMessage = page.getByText(/Please connect a compatible Web3 wallet/i);

        await expect(connectPrompt.or(errorMessage)).toBeVisible();
    });

    test('Connecting a wallet successfully reveals gated dashboard areas', async ({ page }) => {
        // Mock a FULLY authenticated session (wallet assigned)
        await page.route('**/api/auth/session', (route) => {
            route.fulfill({
                status: 200,
                json: {
                    user: { id: 'test-user', address: '0x123...abc', roles: ['admin'] },
                    expires: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
                },
            });
        });

        // Same fallbacks here to prevent dashboard layout crashes
        await page.route('**/api/v1/routes*', (route) => {
            route.fulfill({ status: 200, json: { routes: [] } });
        });
        await page.route('**/api/v1/stats*', (route) => {
            route.fulfill({ status: 200, json: { totalPayments: 0, totalVolume: '0', successRate: 1, avgLatencyMs: 0 } });
        });
        await page.route('**/api/v1/events*', (route) => {
            route.fulfill({ status: 200, json: { events: [] } });
        });
        await page.route('**/api/v1/intelligence/status*', (route) => {
            route.fulfill({ status: 200, json: { status: 'active', cache: { entries: 0 } } });
        });

        await page.goto('/dashboard');
        await page.waitForLoadState('networkidle');

        // We should successfully stay on the dashboard
        await expect(page).toHaveURL(/.*\/dashboard/);

        // A wallet address or indicator should be in the header/nav
        await expect(page.getByText('0x123...abc').or(page.locator('text=0x123'))).toBeVisible();
    });
});
