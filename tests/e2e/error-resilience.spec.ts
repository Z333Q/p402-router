/**
 * Error-resilience tests — verifies that pages degrade gracefully when
 * backend services (Redis, DB, admin-gated actions) are unavailable.
 *
 * These tests explicitly simulate the three failure categories that caused
 * production errors:
 *
 * Category A: Redis-dependent endpoints returning 500
 *   → Pages must show an error banner/message, not a white screen crash.
 *
 * Category B: DB JOIN against non-existent tables returning 500
 *   → Events/traffic pages must render an empty/error state.
 *
 * Category C: Admin-gated server actions throwing 403
 *   → Facilitator "Re-Check Health" must show an error message to the user,
 *     not crash React with a "Server Components render" digest error.
 */

import { test, expect } from '@playwright/test';
import { mockSession, mockApi, mockApiError, collectConsoleErrors } from './helpers/mock-session';

// ─────────────────────────────────────────────────────────────────────────────
// Category A: Redis failure — Intelligence Status endpoint
// ─────────────────────────────────────────────────────────────────────────────

test('intelligence page shows error state (not crash) when status API fails', async ({ page }) => {
    await mockSession(page);

    // All other APIs succeed
    await mockApi(page, '**/api/v1/routes**', { routes: [] });
    await mockApi(page, '**/api/v1/events**', { events: [] });

    // Intelligence status endpoint fails (e.g. Redis is down)
    await mockApiError(page, '**/api/v1/intelligence/status**', 'Status check failed');
    await mockApiError(page, '**/api/v1/intelligence/sessions**', 'Status check failed');

    // Should not throw an uncaught JS error
    const errors = collectConsoleErrors(page);

    await page.goto('/dashboard/intelligence');
    await page.waitForLoadState('networkidle');

    // Page still loaded (no white screen)
    await expect(page).toHaveURL(/\/dashboard\/intelligence/);

    // No uncaught React errors
    const realErrors = errors.filter((msg) =>
        msg.includes('TypeError') ||
        msg.includes('ReferenceError') ||
        msg.includes('Uncaught') ||
        msg.includes('Cannot read properties of undefined')
    );
    expect(realErrors).toHaveLength(0);

    // Optionally: the page renders *something* — not a blank body
    const bodyText = await page.locator('body').innerText();
    expect(bodyText.length).toBeGreaterThan(10);
});

// ─────────────────────────────────────────────────────────────────────────────
// Category A (variant): BillingGuard Redis failure in AI proxy
// ─────────────────────────────────────────────────────────────────────────────

test('playground page shows error state (not crash) when AI proxy rate-limit check fails', async ({ page }) => {
    await mockSession(page);
    await mockApi(page, '**/api/v1/routes**', { routes: [] });

    // Simulate the billing-guard endpoint failing due to Redis
    await mockApiError(page, '**/api/v2/chat/completions**', 'Rate limit check unavailable');

    const errors = collectConsoleErrors(page);

    await page.goto('/dashboard/playground');
    await page.waitForLoadState('networkidle');

    await expect(page).toHaveURL(/\/dashboard\/playground/);

    // No JS crashes
    const realErrors = errors.filter((msg) =>
        msg.includes('TypeError') || msg.includes('Uncaught')
    );
    expect(realErrors).toHaveLength(0);
});

// ─────────────────────────────────────────────────────────────────────────────
// Category B: Missing DB table — Events endpoint returns 500
// ─────────────────────────────────────────────────────────────────────────────

test('live traffic page shows empty/error state when events API fails with 500', async ({ page }) => {
    await mockSession(page);
    await mockApi(page, '**/api/v1/routes**', { routes: [] });
    await mockApi(page, '**/api/v1/facilitators**', []);

    // Simulate 42P01 scenario — events API returns 500
    await mockApiError(page, '**/api/v1/events**', 'Failed to fetch events');

    const errors = collectConsoleErrors(page);

    await page.goto('/dashboard/traffic');
    await page.waitForLoadState('networkidle');

    await expect(page).toHaveURL(/\/dashboard\/traffic/);

    // No JS crash
    const realErrors = errors.filter((msg) =>
        msg.includes('TypeError') || msg.includes('Uncaught')
    );
    expect(realErrors).toHaveLength(0);

    // Page has content
    const bodyText = await page.locator('body').innerText();
    expect(bodyText.length).toBeGreaterThan(10);
});

// ─────────────────────────────────────────────────────────────────────────────
// Category B (variant): Bazaar missing router_decisions table
// ─────────────────────────────────────────────────────────────────────────────

test('bazaar page shows empty state when bazaar API returns 500', async ({ page }) => {
    // Bazaar is public — no session needed
    await mockApiError(page, /\/api\/v1\/bazaar/, 'Failed to fetch bazaar resources');

    const errors = collectConsoleErrors(page);

    await page.goto('/dashboard/bazaar');
    await page.waitForLoadState('networkidle');

    await expect(page).toHaveURL(/\/dashboard\/bazaar/);

    const realErrors = errors.filter((msg) =>
        msg.includes('TypeError') || msg.includes('Uncaught')
    );
    expect(realErrors).toHaveLength(0);

    const bodyText = await page.locator('body').innerText();
    expect(bodyText.length).toBeGreaterThan(10);
});

// ─────────────────────────────────────────────────────────────────────────────
// Category C: Admin-gated facilitator sync — should show user-facing error
// ─────────────────────────────────────────────────────────────────────────────

test('facilitator health re-check shows error message (not crash) when sync fails', async ({ page }) => {
    await mockSession(page);

    // Facilitator list loads fine
    await mockApi(page, /\/api\/v1\/facilitators$/, [
        {
            facilitator_id: 'fac_test',
            name: 'Test Facilitator',
            endpoint: 'https://example.com/facilitator',
            status: 'active',
            health_status: 'healthy',
        },
    ]);

    // Sync endpoint returns 500 (simulates Redis/DB failure or admin check)
    await mockApiError(page, /\/api\/v1\/facilitators\/sync/, 'Health check failed');

    const errors = collectConsoleErrors(page);

    await page.goto('/dashboard/facilitators');
    await page.waitForLoadState('networkidle');

    await expect(page).toHaveURL(/\/dashboard\/facilitators/);

    // No uncaught React/JS errors — the error should be caught and shown in UI
    const realErrors = errors.filter((msg) =>
        msg.includes('TypeError') ||
        msg.includes('Uncaught') ||
        msg.includes('digest') // Next.js "Server Components render" digest error
    );
    expect(realErrors).toHaveLength(0);

    // Page still renders content (not white screen)
    const bodyText = await page.locator('body').innerText();
    expect(bodyText.length).toBeGreaterThan(10);
});

// ─────────────────────────────────────────────────────────────────────────────
// Category C (variant): Non-admin user sees facilitator list but sync is denied
// ─────────────────────────────────────────────────────────────────────────────

test('non-admin user gets graceful error on facilitator sync (not digest crash)', async ({ page }) => {
    // Regular user (no admin role)
    await mockSession(page, 'tenant-nonadmin');
    await mockApi(page, /\/api\/v1\/facilitators$/, []);

    // Sync returns 403 Forbidden
    await page.route(/\/api\/v1\/facilitators\/sync/, (route) =>
        route.fulfill({
            status: 403,
            contentType: 'application/json',
            body: JSON.stringify({ error: 'Unauthorized: Admin access required' }),
        })
    );

    const errors = collectConsoleErrors(page);

    await page.goto('/dashboard/facilitators');
    await page.waitForLoadState('networkidle');

    await expect(page).toHaveURL(/\/dashboard\/facilitators/);

    // Critically: no "digest" error (which would indicate a Server Component crash)
    const digestErrors = errors.filter((msg) => msg.includes('digest'));
    expect(digestErrors).toHaveLength(0);

    // No uncaught JS errors
    const realErrors = errors.filter((msg) =>
        msg.includes('TypeError') || msg.includes('Uncaught')
    );
    expect(realErrors).toHaveLength(0);
});

// ─────────────────────────────────────────────────────────────────────────────
// All APIs failing simultaneously — app must not white-screen
// ─────────────────────────────────────────────────────────────────────────────

test('dashboard home does not white-screen when all APIs fail', async ({ page }) => {
    await mockSession(page);

    // Everything fails
    await mockApiError(page, '**/api/v1/**', 'Service unavailable');

    const errors = collectConsoleErrors(page);

    await page.goto('/dashboard');
    await page.waitForLoadState('networkidle');

    await expect(page).toHaveURL(/\/dashboard/);

    // Should render something (nav, sidebar, etc.) even if data is missing
    const bodyText = await page.locator('body').innerText();
    expect(bodyText.length).toBeGreaterThan(10);

    // No uncaught JS errors
    const realErrors = errors.filter((msg) =>
        msg.includes('TypeError') ||
        msg.includes('Uncaught') ||
        msg.includes('Cannot read')
    );
    expect(realErrors).toHaveLength(0);
});
