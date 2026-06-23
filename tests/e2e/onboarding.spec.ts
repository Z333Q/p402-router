/**
 * 3AZ-2 onboarding flow — Playwright e2e.
 *
 * Covers the V5 funnel surfaces that recently regressed:
 *   - Dashboard gate redirecting authenticated-but-not-onboarded users
 *     to /onboarding (the welcome → key → "Got it" → loop fixed in
 *     20b3eb7, 286d100, efcf9a8).
 *   - PlaygroundTile first-visit behavior + dismiss (3AZ-2-E).
 *   - Stage A → Stage B link navigation.
 *   - Unauthenticated visits to /onboarding/* falling through to /login.
 *
 * Scope notes:
 *   - Server Actions (completeOnboardingAction, generateApiKeyAction)
 *     are exercised by unit tests in lib/actions/__tests__/. Those
 *     code paths are not re-tested at the browser level here.
 *   - The /onboarding/welcome and /onboarding/key page bodies are
 *     gated by server-side getServerSession. Asserting "renders
 *     Stage A" requires a real NextAuth cookie, which lives in the
 *     live-* projects. The mocked-chromium tests here focus on the
 *     pieces that don't require a server-side session: the
 *     unauthenticated redirect, the dashboard gate, and the
 *     PlaygroundTile localStorage logic.
 *
 * Running locally:
 *   1. Ensure nothing is on port 3000 (the playwright.config.ts
 *      `webServer` block expects localhost:3000).
 *   2. `npx playwright test tests/e2e/onboarding.spec.ts --project=chromium`
 *   3. The webServer config auto-starts `npm run dev` and tears it
 *      down on exit.
 *
 * If port 3000 is occupied (e.g., a `vercel dev` or another Next
 * dev server), Playwright cannot route to it and the suite times
 * out. Either free the port or pass `--ui` for a manual run.
 */

import { test, expect } from '@playwright/test';
import { mockSession, mockApi } from './helpers/mock-session';

const TENANT = '00000000-0000-0000-0000-test-tenant-3az';

// Minimal mock surface so the dashboard layout can render once the
// onboarding gate clears. Sourced from smoke.spec.ts patterns.
async function setupDashboardMocks(
    page: Parameters<typeof mockApi>[0],
    opts: { onboarded: boolean }
) {
    await mockSession(page as Parameters<typeof mockSession>[0], TENANT);

    await mockApi(page, '**/api/v1/onboarding/state', { onboarded: opts.onboarded });
    await mockApi(page, '**/api/v2/auth/state', {
        state: 'wallet_linked',
        tenantId: TENANT,
    });
    await mockApi(page, '**/api/v2/billing/usage**', {
        planId: 'sandbox',
        maxSpendUsd: 0,
        currentUsageUsd: 0,
        usagePercent: 0,
    });
    await mockApi(page, '**/api/v1/funnel/event', { ok: true });
    await mockApi(page, '**/api/admin/revenue**', { revenue: [] });
}

test.describe('Onboarding gate behavior', () => {
    test('unauthenticated /onboarding/welcome redirects to /login', async ({ page }) => {
        // No session mock. /onboarding/welcome's server component
        // calls getServerSession() -> null -> redirect('/login').
        const res = await page.goto('/onboarding/welcome', { waitUntil: 'domcontentloaded' });
        // Either landed on /login, OR landed on the welcome page with
        // a client-side push to /login. Accept both.
        await expect.poll(() => page.url(), { timeout: 5000 }).toMatch(/\/login(\?.*)?$/);
        // Sanity: the welcome page hero copy should NOT be visible.
        await expect(page.getByRole('heading', { name: /You['’]re in/i })).not.toBeVisible();
        // page.goto's response should have been a redirect or a 200
        // depending on Next's handling; we don't assert on res.status()
        // because the redirect can happen at multiple layers.
        void res;
    });

    test('unauthenticated /onboarding/key redirects to /login', async ({ page }) => {
        await page.goto('/onboarding/key', { waitUntil: 'domcontentloaded' });
        await expect.poll(() => page.url(), { timeout: 5000 }).toMatch(/\/login(\?.*)?$/);
    });

    test('dashboard gate: state.onboarded=false → redirects to /onboarding/welcome', async ({ page }) => {
        await setupDashboardMocks(page, { onboarded: false });
        await page.goto('/dashboard', { waitUntil: 'domcontentloaded' });
        // The dashboard layout pushes to /onboarding which is a thin
        // server redirect to /onboarding/welcome. We accept either
        // intermediate or final URL since the chain may not fully
        // resolve before the assertion window.
        await expect.poll(() => page.url(), { timeout: 8000 }).toMatch(/\/onboarding(\/welcome)?(\?.*)?$/);
    });
});

test.describe('PlaygroundTile (Stage C, 3AZ-2-E)', () => {
    test.beforeEach(async ({ context }) => {
        // Each test starts with a clean localStorage so the
        // first-visit tile renders predictably.
        await context.clearCookies();
    });

    test('renders on /dashboard when no dismiss/meaningful flag is set', async ({ page }) => {
        await setupDashboardMocks(page, { onboarded: true });
        await page.goto('/dashboard', { waitUntil: 'domcontentloaded' });
        const tile = page.getByTestId('stage-c-playground-tile');
        await expect(tile).toBeVisible({ timeout: 10000 });
        await expect(tile.getByRole('link', { name: /Open Playground/i })).toBeVisible();
    });

    test('Open Playground link points at /dashboard/playground', async ({ page }) => {
        await setupDashboardMocks(page, { onboarded: true });
        await page.goto('/dashboard', { waitUntil: 'domcontentloaded' });
        const cta = page.getByTestId('stage-c-playground-tile').getByRole('link', { name: /Open Playground/i });
        await expect(cta).toHaveAttribute('href', '/dashboard/playground');
        await expect(cta).toHaveAttribute('data-meaningful-kind', 'playground');
    });

    test('dismiss button hides the tile and persists across reload', async ({ page }) => {
        await setupDashboardMocks(page, { onboarded: true });
        await page.goto('/dashboard', { waitUntil: 'domcontentloaded' });
        const tile = page.getByTestId('stage-c-playground-tile');
        await expect(tile).toBeVisible({ timeout: 10000 });

        // The tile has a button with aria-label="Dismiss".
        await tile.getByLabel('Dismiss').click();
        await expect(tile).not.toBeVisible();

        // Reload: tile must remain hidden because the dismiss flag is
        // stored in localStorage.
        await page.reload({ waitUntil: 'domcontentloaded' });
        await expect(page.getByTestId('stage-c-playground-tile')).not.toBeVisible();
    });

    test('hides when the meaningful-interaction flag is pre-set', async ({ page }) => {
        await setupDashboardMocks(page, { onboarded: true });
        // Pre-seed localStorage before any page script runs.
        await page.addInitScript(() => {
            try {
                window.localStorage.setItem('p402_meaningful_interaction', '1');
            } catch {
                /* ignore */
            }
        });
        await page.goto('/dashboard', { waitUntil: 'domcontentloaded' });
        await expect(page.getByTestId('stage-c-playground-tile')).not.toBeVisible();
    });

    test('hides on dashboard subpaths (only renders at /dashboard root)', async ({ page }) => {
        await setupDashboardMocks(page, { onboarded: true });
        // Mock the API key list and other subpath dependencies cheaply.
        await mockApi(page, '**/api/v2/billing/portal**', { url: 'https://stripe.test/portal' });
        await page.goto('/dashboard/billing', { waitUntil: 'domcontentloaded' });
        await expect(page.getByTestId('stage-c-playground-tile')).not.toBeVisible();
    });
});

test.describe('Funnel telemetry posts on dashboard view', () => {
    test('/dashboard mount fires a POST to /api/v1/funnel/event with funnel.dashboard_view', async ({ page }) => {
        await setupDashboardMocks(page, { onboarded: true });

        const eventCalls: Array<{ eventName?: string; properties?: Record<string, unknown> }> = [];
        await page.route('**/api/v1/funnel/event', async (route) => {
            try {
                const body = JSON.parse(route.request().postData() ?? '{}');
                eventCalls.push(body);
            } catch {
                /* ignore */
            }
            await route.fulfill({
                status: 200,
                contentType: 'application/json',
                body: JSON.stringify({ ok: true }),
            });
        });

        await page.goto('/dashboard', { waitUntil: 'domcontentloaded' });
        // Give the client a moment to fire the fire-and-forget emit.
        await expect.poll(
            () => eventCalls.some((c) => c.eventName === 'funnel.dashboard_view'),
            { timeout: 8000 }
        ).toBe(true);
    });
});
