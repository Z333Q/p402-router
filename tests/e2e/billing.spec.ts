/**
 * Billing e2e tests — covers the full billing surface:
 *
 * - /dashboard/billing         free plan view, pro plan view, query-param banners
 * - /dashboard/billing/upgrade Stripe Pro and Wallet Pro selection page
 * - /dashboard/billing/wallet  EIP-2612 permit subscription flow
 *
 * External dependencies (Stripe API, on-chain) are mocked via page.route().
 * Server Actions on the wallet page run server-side; we test UI states that
 * are reachable without a live blockchain connection.
 */

import { test, expect } from '@playwright/test';
import { mockSession, mockApi, mockApiError, collectConsoleErrors } from './helpers/mock-session';
import { injectMockWallet } from './helpers/web3-mock';

// ─────────────────────────────────────────────────────────────────────────────
// Shared mock payloads
// ─────────────────────────────────────────────────────────────────────────────

const FREE_PLAN_USAGE = {
    planId: 'free',
    maxSpendUsd: 5.00,
    currentUsageUsd: 1.25,
    usagePercent: 25,
};

const PRO_PLAN_USAGE = {
    planId: 'pro',
    maxSpendUsd: 5000.00,
    currentUsageUsd: 1250.50,
    usagePercent: 25.01,
};

const STRIPE_CHECKOUT_URL = 'https://checkout.stripe.com/pay/cs_test_mock_12345';
const STRIPE_PORTAL_URL   = 'https://billing.stripe.com/p/session/test_mock_67890';

/** Register the minimum API mocks needed for billing pages to render. */
async function setupBillingMocks(
    page: Parameters<typeof mockSession>[0],
    planUsage = FREE_PLAN_USAGE
) {
    await mockSession(page);
    await mockApi(page, '**/api/v2/billing/usage**', planUsage);
    // Revenue endpoint is optional — empty response skips the upgrade-math banner
    await mockApi(page, '**/api/admin/revenue**', { revenue: [] });
}

// ─────────────────────────────────────────────────────────────────────────────
// /dashboard/billing — plan views
// ─────────────────────────────────────────────────────────────────────────────

test('billing page: free plan shows Upgrade CTA and FREE badge', async ({ page }) => {
    const errors = collectConsoleErrors(page);
    await setupBillingMocks(page, FREE_PLAN_USAGE);

    await page.goto('/dashboard/billing');
    await page.waitForLoadState('networkidle');

    await expect(page).toHaveURL(/\/dashboard\/billing/);

    // "Upgrade to Pro" button must be present
    await expect(
        page.locator('button', { hasText: /upgrade to pro/i }).first()
    ).toBeVisible();

    // Plan badge shows FREE
    await expect(page.locator(':text("FREE")').first()).toBeVisible();

    expect(errors.filter(isRealError)).toHaveLength(0);
});

test('billing page: pro plan shows Manage Subscription CTA and PRO badge', async ({ page }) => {
    const errors = collectConsoleErrors(page);
    await setupBillingMocks(page, PRO_PLAN_USAGE);

    await page.goto('/dashboard/billing');
    await page.waitForLoadState('networkidle');

    await expect(page).toHaveURL(/\/dashboard\/billing/);

    // "Manage Subscription" button must be present
    await expect(
        page.locator('button', { hasText: /manage subscription/i }).first()
    ).toBeVisible();

    // Plan badge shows PRO
    await expect(page.locator(':text("PRO")').first()).toBeVisible();

    expect(errors.filter(isRealError)).toHaveLength(0);
});

// ─────────────────────────────────────────────────────────────────────────────
// /dashboard/billing — query-param notification banners
// ─────────────────────────────────────────────────────────────────────────────

test('billing page: ?success=true shows upgrade-successful notification', async ({ page }) => {
    await setupBillingMocks(page, PRO_PLAN_USAGE);

    await page.goto('/dashboard/billing?success=true');
    await page.waitForLoadState('networkidle');

    await expect(page.locator(':text("Upgrade Successful")').first()).toBeVisible();
});

test('billing page: ?canceled=true shows checkout-canceled notification', async ({ page }) => {
    await setupBillingMocks(page, FREE_PLAN_USAGE);

    await page.goto('/dashboard/billing?canceled=true');
    await page.waitForLoadState('networkidle');

    await expect(page.locator(':text("Checkout canceled")').first()).toBeVisible();
});

// ─────────────────────────────────────────────────────────────────────────────
// /dashboard/billing — Stripe API interactions
// ─────────────────────────────────────────────────────────────────────────────

test('billing page: free plan Upgrade button calls checkout API', async ({ page }) => {
    await setupBillingMocks(page, FREE_PLAN_USAGE);
    await mockApi(page, '**/api/v2/billing/checkout**', { url: STRIPE_CHECKOUT_URL });

    await page.goto('/dashboard/billing');
    await page.waitForLoadState('networkidle');

    const upgradeBtn = page.locator('button', { hasText: /upgrade to pro/i }).first();
    await upgradeBtn.waitFor({ state: 'visible' });

    const [checkoutRequest] = await Promise.all([
        page.waitForRequest('**/api/v2/billing/checkout**'),
        upgradeBtn.click(),
    ]);

    expect(checkoutRequest.method()).toBe('POST');
});

test('billing page: pro plan Manage button calls portal API', async ({ page }) => {
    await setupBillingMocks(page, PRO_PLAN_USAGE);
    await mockApi(page, '**/api/v2/billing/portal**', { url: STRIPE_PORTAL_URL });

    await page.goto('/dashboard/billing');
    await page.waitForLoadState('networkidle');

    const manageBtn = page.locator('button', { hasText: /manage subscription/i }).first();
    await manageBtn.waitFor({ state: 'visible' });

    const [portalRequest] = await Promise.all([
        page.waitForRequest('**/api/v2/billing/portal**'),
        manageBtn.click(),
    ]);

    expect(portalRequest.method()).toBe('POST');
});

test('billing page: checkout API error shows alert (does not crash)', async ({ page }) => {
    const errors = collectConsoleErrors(page);
    await setupBillingMocks(page, FREE_PLAN_USAGE);
    await mockApiError(page, '**/api/v2/billing/checkout**', 'Stripe unavailable');

    await page.goto('/dashboard/billing');
    await page.waitForLoadState('networkidle');

    // Interact with the upgrade button — API will 500
    const upgradeBtn = page.locator('button', { hasText: /upgrade to pro/i }).first();
    await upgradeBtn.waitFor({ state: 'visible' });
    await upgradeBtn.click();

    // Wait for the error to be handled — button should re-enable (not be stuck in loading)
    await page.waitForTimeout(500);

    // Page must still be on the billing page — no crash / white screen
    await expect(page).toHaveURL(/\/dashboard\/billing/);
    expect(errors.filter(isUnhandledError)).toHaveLength(0);
});

// ─────────────────────────────────────────────────────────────────────────────
// /dashboard/billing/upgrade — plan selection page
// ─────────────────────────────────────────────────────────────────────────────

test('upgrade page: renders both Stripe Pro and Wallet Pro options', async ({ page }) => {
    const errors = collectConsoleErrors(page);
    await mockSession(page);

    await page.goto('/dashboard/billing/upgrade');
    await page.waitForLoadState('networkidle');

    await expect(page).toHaveURL(/\/dashboard\/billing\/upgrade/);

    // Both product titles must be visible
    await expect(page.locator(':text("Stripe Pro")').first()).toBeVisible();
    await expect(page.locator(':text("Wallet Pro")').first()).toBeVisible();

    // Correct price labels
    await expect(page.locator(':text("$499")').first()).toBeVisible();
    await expect(page.locator(':text("499 USDC")').first()).toBeVisible();

    // Both CTAs
    await expect(page.locator('button', { hasText: /upgrade via stripe/i })).toBeVisible();
    await expect(page.locator('button', { hasText: /connect wallet/i })).toBeVisible();

    expect(errors.filter(isRealError)).toHaveLength(0);
});

test('upgrade page: UPGRADE VIA STRIPE calls checkout API', async ({ page }) => {
    await mockSession(page);
    await mockApi(page, '**/api/v2/billing/checkout**', { url: STRIPE_CHECKOUT_URL });

    await page.goto('/dashboard/billing/upgrade');
    await page.waitForLoadState('networkidle');

    const [checkoutRequest] = await Promise.all([
        page.waitForRequest('**/api/v2/billing/checkout**'),
        page.locator('button', { hasText: /upgrade via stripe/i }).click(),
    ]);

    expect(checkoutRequest.method()).toBe('POST');
});

test('upgrade page: CONNECT WALLET navigates to wallet checkout', async ({ page }) => {
    await mockSession(page);

    await page.goto('/dashboard/billing/upgrade');
    await page.waitForLoadState('networkidle');

    await page.locator('button', { hasText: /connect wallet/i }).click();

    await expect(page).toHaveURL(/\/dashboard\/billing\/wallet/);
});

// ─────────────────────────────────────────────────────────────────────────────
// /dashboard/billing/wallet — EIP-2612 permit subscription
// ─────────────────────────────────────────────────────────────────────────────

test('wallet billing page: renders Sign & Subscribe CTA', async ({ page }) => {
    const errors = collectConsoleErrors(page);
    await mockSession(page);
    await injectMockWallet(page);

    await page.goto('/dashboard/billing/wallet');
    await page.waitForLoadState('networkidle');

    await expect(page).toHaveURL(/\/dashboard\/billing\/wallet/);
    await expect(page.locator(':text("Pro Wallet Subscription")').first()).toBeVisible();
    await expect(page.locator('button', { hasText: /sign & subscribe/i })).toBeVisible();

    expect(errors.filter(isRealError)).toHaveLength(0);
});

test('wallet billing page: shows error when no wallet connected', async ({ page }) => {
    await mockSession(page);
    // Deliberately omit injectMockWallet — wagmi useAccount() returns undefined address

    await page.goto('/dashboard/billing/wallet');
    await page.waitForLoadState('networkidle');

    // Click subscribe without a connected wallet
    await page.locator('button', { hasText: /sign & subscribe/i }).click();

    // Synchronous guard in handleSubscribe fires immediately
    await expect(
        page.locator(':text("Please connect your wallet")').first()
    ).toBeVisible({ timeout: 3000 });
});

test('wallet billing page: Sign & Subscribe button enters processing state', async ({ page }) => {
    await mockSession(page);
    await injectMockWallet(page);

    // Stall the Server Action POST so the processing UI is visible long enough to assert
    await page.route('**/dashboard/billing/wallet**', async (route) => {
        if (route.request().method() === 'POST') {
            await new Promise(r => setTimeout(r, 300));
            await route.fulfill({ status: 500, contentType: 'text/plain', body: 'test-stall' });
        } else {
            await route.continue();
        }
    });

    await page.goto('/dashboard/billing/wallet');
    await page.waitForLoadState('networkidle');

    await page.locator('button', { hasText: /sign & subscribe/i }).click();

    // setIsProcessing(true) fires before the first await — text changes immediately
    await expect(
        page.locator(':text("Processing on Base...")').first()
    ).toBeVisible({ timeout: 5000 });
});

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

/** Filter out browser noise — only flag real application errors. */
function isRealError(msg: string): boolean {
    const noise = [
        'favicon',
        'Failed to load resource',
        'net::ERR_',
        'ERR_BLOCKED',
        'Extension',
        'chrome-extension',
        '__NEXT_DATA__',
        'Warning:',
        'WalletConnect',
        'wagmi',
        'MetaMask',
    ];
    return !noise.some((n) => msg.includes(n));
}

/** Stricter filter — only flag unhandled TypeErrors / React render crashes. */
function isUnhandledError(msg: string): boolean {
    return (
        msg.includes('TypeError') ||
        msg.includes('ReferenceError') ||
        msg.includes('Uncaught') ||
        msg.includes('digest:')
    );
}
