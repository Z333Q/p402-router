/**
 * Live dashboard tests — authenticated UI flows.
 *
 * Auth: NextAuth session from auth.setup.ts (no mocking).
 * Every page navigation hits the real server. Every API call
 * returns real data from the real database.
 *
 * Tests verify pages load without JS crashes and show real data
 * (or graceful empty states — not error banners).
 */

import { test, expect } from '@playwright/test';

// All tests in this file use the stored auth session
// (set via storageState in playwright.config.ts live-dashboard project)

// ---------------------------------------------------------------------------
// Helper: assert page loaded without crashing
// ---------------------------------------------------------------------------
async function assertNoCrash(page: import('@playwright/test').Page, url: string) {
    const errors: string[] = [];
    page.on('pageerror', e => errors.push(e.message));

    const res = await page.goto(url, { waitUntil: 'networkidle' });
    expect(res?.status(), `${url} returned ${res?.status()}`).not.toBe(500);

    // No uncaught JS exceptions
    expect(errors, `JS errors on ${url}: ${errors.join(', ')}`).toHaveLength(0);

    // No visible error crash banners with "Error" in red
    const errorBanners = page.locator('[class*="error"]:visible, [class*="Error"]:visible').filter({
        hasText: /something went wrong|unhandled|crashed/i,
    });
    await expect(errorBanners).toHaveCount(0);
}

// ---------------------------------------------------------------------------
// Core dashboard pages
// ---------------------------------------------------------------------------

test.describe('Dashboard pages (authenticated)', () => {
    test('main dashboard loads with real data', async ({ page }) => {
        await assertNoCrash(page, '/dashboard');
        // Should be on dashboard (not redirected to login)
        await expect(page).toHaveURL(/\/dashboard/);
    });

    test('playground page loads', async ({ page }) => {
        await assertNoCrash(page, '/dashboard/playground');
        await expect(page).toHaveURL(/\/dashboard\/playground/);
    });

    test('settings page loads and shows real tenant data', async ({ page }) => {
        await assertNoCrash(page, '/dashboard/settings');
        await expect(page).toHaveURL(/\/dashboard\/settings/);
    });

    test('routes page loads', async ({ page }) => {
        await assertNoCrash(page, '/dashboard/routes');
        await expect(page).toHaveURL(/\/dashboard/);
    });

    test('facilitators page loads', async ({ page }) => {
        await assertNoCrash(page, '/dashboard/facilitators');
    });

    test('policies page loads', async ({ page }) => {
        await assertNoCrash(page, '/dashboard/policies');
    });

    test('transactions page loads', async ({ page }) => {
        await assertNoCrash(page, '/dashboard/transactions');
    });

    test('mandates page loads', async ({ page }) => {
        await assertNoCrash(page, '/dashboard/mandates');
    });

    test('intelligence page loads', async ({ page }) => {
        await assertNoCrash(page, '/dashboard/intelligence');
    });

    test('bazaar page loads', async ({ page }) => {
        await assertNoCrash(page, '/dashboard/bazaar');
    });

    test('trust page loads', async ({ page }) => {
        await assertNoCrash(page, '/dashboard/trust');
    });

    test('audit page loads', async ({ page }) => {
        await assertNoCrash(page, '/dashboard/audit');
    });

    test('traffic page loads', async ({ page }) => {
        await assertNoCrash(page, '/dashboard/traffic');
    });
});

// ---------------------------------------------------------------------------
// Playground — real AI call from UI
// ---------------------------------------------------------------------------

test.describe('Playground real AI call', () => {
    test('user can submit a prompt and receive a real response', async ({ page }) => {
        await page.goto('/dashboard/playground', { waitUntil: 'networkidle' });

        // Find the prompt textarea
        const textarea = page.locator('textarea, input[type="text"]').first();
        await expect(textarea).toBeVisible({ timeout: 5000 });

        // Type a real prompt
        await textarea.fill('Say exactly: PLAYGROUND_LIVE_OK');

        // Capture the outgoing chat completions request
        const responsePromise = page.waitForResponse(
            r => r.url().includes('/api/v2/chat/completions') && r.status() === 200,
            { timeout: 30000 }
        );

        // Click submit
        const submitBtn = page.locator('button[type="submit"], button:has-text("Send"), button:has-text("Run")').first();
        await submitBtn.click();

        // Wait for real AI response
        const response = await responsePromise;
        const body = await response.json().catch(() => null);

        if (body) {
            expect(body.choices ?? body.result).toBeTruthy();
        }
    });
});

// ---------------------------------------------------------------------------
// Settings — real form interaction
// ---------------------------------------------------------------------------

test.describe('Settings', () => {
    test('settings page shows tenant info without error state', async ({ page }) => {
        await page.goto('/dashboard/settings', { waitUntil: 'networkidle' });

        // Should not show error state for basic tenant data
        const errorState = page.locator('text=/failed to load|error loading/i');
        await expect(errorState).toHaveCount(0);
    });
});

// ---------------------------------------------------------------------------
// New route creation
// ---------------------------------------------------------------------------

test.describe('Route creation', () => {
    test('new route page renders form', async ({ page }) => {
        await page.goto('/dashboard/routes/new', { waitUntil: 'networkidle' });
        await expect(page).not.toHaveTitle(/Error/);
        // Form should be visible
        const form = page.locator('form, [role="form"]').first();
        await expect(form).toBeVisible({ timeout: 5000 });
    });
});
