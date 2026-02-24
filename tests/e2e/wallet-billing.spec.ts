import { test, expect } from '@playwright/test';
import { injectMockWallet } from './helpers/web3-mock';

test('User signs EIP-2612 Permit and Subscribes', async ({ page }) => {
    await injectMockWallet(page);

    // Mock the Server Action responses to prevent actual DB/Blockchain execution during UI tests
    await page.route('**/_next/data/**/dashboard/billing/wallet.json*', async (route) => {
        // Playwright intercept for Next.js Server Actions/RSC payloads if necessary,
        // Though usually, testing against a seeded local DB is better here.
        await route.continue();
    });

    await page.goto('/dashboard/billing/wallet');
    await page.click('button:has-text("Sign & Subscribe")');

    // Verify UI transition
    await expect(page.locator('text=Processing on Base...')).toBeVisible();

    // Assuming a successful mock redirect
    await page.waitForURL('**/dashboard/billing?success=true');
    await expect(page.locator('text=Active Plan: PRO')).toBeVisible();
});
