/**
 * Live admin tests — exercises the admin panel with a real admin session.
 *
 * Auth: admin session from admin-auth.setup.ts (real password login, no mocking).
 * All API calls return real data from the real database.
 *
 * Required env vars:
 *   E2E_ADMIN_EMAIL     — admin email
 *   E2E_ADMIN_PASSWORD  — admin password
 */

import { test, expect } from '@playwright/test';

// ---------------------------------------------------------------------------
// Admin API — raw endpoint tests
// ---------------------------------------------------------------------------

test.describe('Admin API (authenticated)', () => {
    test('GET /api/admin/overview returns real platform metrics', async ({ request }) => {
        const res = await request.get('/api/admin/overview');
        expect(res.ok(), `Status: ${res.status()}`).toBeTruthy();
        const body = await res.json();

        // Shape check — all fields must be numeric
        expect(typeof body.platform.totalTenants).toBe('number');
        expect(typeof body.platform.active7d).toBe('number');
        expect(typeof body.financial.volAllTime).toBe('number');
        expect(typeof body.routing.totalRequests24h).toBe('number');
        expect(typeof body.routing.cacheHitPct).toBe('number');
        expect(typeof body.safety.activeMandates).toBe('number');
        expect(typeof body.agents.activeSessions).toBe('number');

        // At least one tenant should exist (the E2E test user itself)
        expect(body.platform.totalTenants).toBeGreaterThan(0);
    });

    test('GET /api/admin/analytics?days=7 returns time-series data', async ({ request }) => {
        const res = await request.get('/api/admin/analytics?days=7');
        expect(res.ok()).toBeTruthy();
        const body = await res.json();

        expect(body.days).toBe(7);
        expect(Array.isArray(body.timeSeries)).toBe(true);
        expect(Array.isArray(body.providers)).toBe(true);
    });

    test('GET /api/admin/analytics?days=30 returns 30-day data', async ({ request }) => {
        const res = await request.get('/api/admin/analytics?days=30');
        expect(res.ok()).toBeTruthy();
        const body = await res.json();
        expect(body.days).toBe(30);
    });

    test('GET /api/admin/users returns tenant list', async ({ request }) => {
        const res = await request.get('/api/admin/users');
        expect(res.ok()).toBeTruthy();
        const body = await res.json();
        const users = body.users ?? body.data ?? body;
        expect(Array.isArray(users)).toBe(true);
        expect(users.length).toBeGreaterThan(0);
    });

    test('GET /api/admin/health returns system health', async ({ request }) => {
        const res = await request.get('/api/admin/health');
        expect(res.ok()).toBeTruthy();
        const body = await res.json();
        expect(body.status ?? body.health).toBeTruthy();
    });

    test('GET /api/admin/audit-log returns entries', async ({ request }) => {
        const res = await request.get('/api/admin/audit-log');
        expect(res.ok()).toBeTruthy();
        const body = await res.json();
        const entries = body.entries ?? body.data ?? body;
        expect(Array.isArray(entries)).toBe(true);
    });

    test('GET /api/admin/stats returns stats', async ({ request }) => {
        const res = await request.get('/api/admin/stats');
        expect(res.ok()).toBeTruthy();
    });
});

// ---------------------------------------------------------------------------
// Admin UI pages
// ---------------------------------------------------------------------------

test.describe('Admin UI pages (authenticated)', () => {
    async function assertAdminPage(page: import('@playwright/test').Page, path: string) {
        const errors: string[] = [];
        page.on('pageerror', e => errors.push(e.message));

        const res = await page.goto(path, { waitUntil: 'networkidle' });
        expect(res?.status(), `${path} returned ${res?.status()}`).not.toBe(500);

        // Must be on the admin page (not redirected to login)
        await expect(page).toHaveURL(/\/admin\//);
        await expect(page).not.toHaveURL(/\/admin\/login/);

        expect(errors, `JS errors on ${path}`).toHaveLength(0);
    }

    test('admin overview page loads with real data', async ({ page }) => {
        await assertAdminPage(page, '/admin/overview');

        // At least one KPI card should show a real number (not —)
        // The tenant count should be > 0
        const kpiValues = page.locator('[class*="kpi"], [class*="KPI"], [class*="stat"]');
        const count = await kpiValues.count();
        expect(count).toBeGreaterThan(0);
    });

    test('analytics page loads', async ({ page }) => {
        await assertAdminPage(page, '/admin/analytics');
    });

    test('users page loads', async ({ page }) => {
        await assertAdminPage(page, '/admin/users');
    });

    test('health page loads', async ({ page }) => {
        await assertAdminPage(page, '/admin/health');
    });

    test('safety page loads', async ({ page }) => {
        await assertAdminPage(page, '/admin/safety');
    });

    test('audit page loads', async ({ page }) => {
        await assertAdminPage(page, '/admin/audit');
    });

    test('intelligence page loads', async ({ page }) => {
        await assertAdminPage(page, '/admin/intelligence');
    });

    test('system page loads', async ({ page }) => {
        await assertAdminPage(page, '/admin/system');
    });

    test('bazaar page loads', async ({ page }) => {
        await assertAdminPage(page, '/admin/bazaar');
    });
});

// ---------------------------------------------------------------------------
// Admin security — unauthenticated access is blocked
// ---------------------------------------------------------------------------

test.describe('Admin security (unauthenticated)', () => {
    test('overview API returns 401 without session', async ({ page }) => {
        // Use a fresh context with no cookies
        const ctx = await page.context().browser()!.newContext();
        const req = ctx.request;
        const res = await req.get('http://localhost:3000/api/admin/overview');
        expect(res.status()).toBe(401);
        await ctx.close();
    });

    test('admin page redirects to login without session', async ({ page }) => {
        const ctx = await page.context().browser()!.newContext();
        const p = await ctx.newPage();
        await p.goto('http://localhost:3000/admin/overview');
        await expect(p).toHaveURL(/\/admin\/login/);
        await ctx.close();
    });
});
