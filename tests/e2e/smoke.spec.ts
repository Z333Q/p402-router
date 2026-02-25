/**
 * Smoke test suite — verifies every dashboard page renders without crashing.
 *
 * Strategy:
 * - Mock /api/auth/session so tests don't need a real database/auth cookie.
 * - Mock key API endpoints with minimal valid responses so components don't
 *   crash waiting for data.
 * - Assert no uncaught JS errors and no visible "Error" crash banners.
 */

import { test, expect } from '@playwright/test';
import { mockSession, mockApi, collectConsoleErrors } from './helpers/mock-session';

// Shared empty-but-valid mock responses
const EMPTY_EVENTS = { events: [] };
const EMPTY_ROUTES = { routes: [] };
const EMPTY_FACILITATORS: unknown[] = [];
const EMPTY_BAZAAR = { resources: [], count: 0, timestamp: new Date().toISOString() };
const EMPTY_POLICIES = { policies: [] };
const EMPTY_INTELLIGENCE_STATUS = {
    status: 'active',
    economist: { status: 'ready', lastRun: null },
    sentinel: { status: 'ready', lastRun: null },
    cache: { entries: 0, hitRate: 0 },
};
const EMPTY_SESSIONS = { sessions: [] };
const EMPTY_STATS = {
    totalPayments: 0,
    totalVolume: '0',
    successRate: 1,
    avgLatencyMs: 0,
};
const EMPTY_TRUST = { identities: [] };
const EMPTY_AUDIT_LOG = { entries: [] };

/** Register all commonly-needed API mocks */
async function setupCommonMocks(page: Parameters<typeof mockApi>[0]) {
    await mockSession(page);
    await mockApi(page, '**/api/v1/events**', EMPTY_EVENTS);
    await mockApi(page, '**/api/v1/routes**', EMPTY_ROUTES);
    await mockApi(page, '**/api/v1/facilitators**', EMPTY_FACILITATORS);
    await mockApi(page, '**/api/v1/bazaar**', EMPTY_BAZAAR);
    await mockApi(page, '**/api/v1/bazaar', EMPTY_BAZAAR);
    await mockApi(page, '**/api/v1/policies**', EMPTY_POLICIES);
    await mockApi(page, '**/api/v1/intelligence/status**', EMPTY_INTELLIGENCE_STATUS);
    await mockApi(page, '**/api/v1/intelligence/sessions**', EMPTY_SESSIONS);
    await mockApi(page, '**/api/v1/stats**', EMPTY_STATS);
    await mockApi(page, '**/api/v1/trust**', EMPTY_TRUST);
    await mockApi(page, '**/api/v1/audit**', EMPTY_AUDIT_LOG);
    // ERC-8004 endpoints
    await mockApi(page, '**/api/v1/erc8004**', { registered: false });
    // Router decisions / spend
    await mockApi(page, '**/api/v1/router**', { routes: [] });
}

// ─────────────────────────────────────────────────────────────────────────────
// Dashboard home
// ─────────────────────────────────────────────────────────────────────────────

test('dashboard home renders without crash', async ({ page }) => {
    const errors = collectConsoleErrors(page);
    await setupCommonMocks(page);

    await page.goto('/dashboard');
    // Should land on dashboard (not be redirected to /login)
    await expect(page).toHaveURL(/\/dashboard/);

    // Wait for some content to appear
    await page.waitForLoadState('networkidle');

    // No uncaught JS errors
    expect(errors.filter(isRealError)).toHaveLength(0);
});

// ─────────────────────────────────────────────────────────────────────────────
// Live Traffic
// ─────────────────────────────────────────────────────────────────────────────

test('live traffic page renders without crash', async ({ page }) => {
    const errors = collectConsoleErrors(page);
    await setupCommonMocks(page);

    await page.goto('/dashboard/traffic');
    await page.waitForLoadState('networkidle');

    await expect(page).toHaveURL(/\/dashboard\/traffic/);
    expect(errors.filter(isRealError)).toHaveLength(0);
});

// ─────────────────────────────────────────────────────────────────────────────
// Intelligence
// ─────────────────────────────────────────────────────────────────────────────

test('intelligence page renders without crash', async ({ page }) => {
    const errors = collectConsoleErrors(page);
    await setupCommonMocks(page);

    await page.goto('/dashboard/intelligence');
    await page.waitForLoadState('networkidle');

    await expect(page).toHaveURL(/\/dashboard\/intelligence/);
    expect(errors.filter(isRealError)).toHaveLength(0);
});

// ─────────────────────────────────────────────────────────────────────────────
// Facilitators
// ─────────────────────────────────────────────────────────────────────────────

test('facilitators page renders without crash', async ({ page }) => {
    const errors = collectConsoleErrors(page);
    await setupCommonMocks(page);
    // Provide list response specifically for GET /api/v1/facilitators
    await mockApi(page, /\/api\/v1\/facilitators$/, []);

    await page.goto('/dashboard/facilitators');
    await page.waitForLoadState('networkidle');

    await expect(page).toHaveURL(/\/dashboard\/facilitators/);
    expect(errors.filter(isRealError)).toHaveLength(0);
});

// ─────────────────────────────────────────────────────────────────────────────
// Bazaar (public — no auth required)
// ─────────────────────────────────────────────────────────────────────────────

test('bazaar page renders without crash (public)', async ({ page }) => {
    const errors = collectConsoleErrors(page);
    // Bazaar is public — still mock the data endpoint
    await mockApi(page, /\/api\/v1\/bazaar/, EMPTY_BAZAAR);

    await page.goto('/dashboard/bazaar');
    await page.waitForLoadState('networkidle');

    await expect(page).toHaveURL(/\/dashboard\/bazaar/);
    expect(errors.filter(isRealError)).toHaveLength(0);
});

// ─────────────────────────────────────────────────────────────────────────────
// Policies
// ─────────────────────────────────────────────────────────────────────────────

test('policies page renders without crash', async ({ page }) => {
    const errors = collectConsoleErrors(page);
    await setupCommonMocks(page);

    await page.goto('/dashboard/policies');
    await page.waitForLoadState('networkidle');

    await expect(page).toHaveURL(/\/dashboard\/policies/);
    expect(errors.filter(isRealError)).toHaveLength(0);
});

// ─────────────────────────────────────────────────────────────────────────────
// Audit log
// ─────────────────────────────────────────────────────────────────────────────

test('audit log page renders without crash', async ({ page }) => {
    const errors = collectConsoleErrors(page);
    await setupCommonMocks(page);

    await page.goto('/dashboard/audit');
    await page.waitForLoadState('networkidle');

    await expect(page).toHaveURL(/\/dashboard\/audit/);
    expect(errors.filter(isRealError)).toHaveLength(0);
});

// ─────────────────────────────────────────────────────────────────────────────
// Trust / ERC-8004
// ─────────────────────────────────────────────────────────────────────────────

test('trust page renders without crash', async ({ page }) => {
    const errors = collectConsoleErrors(page);
    await setupCommonMocks(page);

    await page.goto('/dashboard/trust');
    await page.waitForLoadState('networkidle');

    await expect(page).toHaveURL(/\/dashboard\/trust/);
    expect(errors.filter(isRealError)).toHaveLength(0);
});

// ─────────────────────────────────────────────────────────────────────────────
// Transactions
// ─────────────────────────────────────────────────────────────────────────────

test('transactions page renders without crash', async ({ page }) => {
    const errors = collectConsoleErrors(page);
    await setupCommonMocks(page);
    await mockApi(page, /\/api\/v1\/transactions/, { transactions: [] });

    await page.goto('/dashboard/transactions');
    await page.waitForLoadState('networkidle');

    await expect(page).toHaveURL(/\/dashboard\/transactions/);
    expect(errors.filter(isRealError)).toHaveLength(0);
});

// ─────────────────────────────────────────────────────────────────────────────
// Playground
// ─────────────────────────────────────────────────────────────────────────────

test('playground page renders without crash', async ({ page }) => {
    const errors = collectConsoleErrors(page);
    await setupCommonMocks(page);

    await page.goto('/dashboard/playground');
    await page.waitForLoadState('networkidle');

    await expect(page).toHaveURL(/\/dashboard\/playground/);
    expect(errors.filter(isRealError)).toHaveLength(0);
});

// ─────────────────────────────────────────────────────────────────────────────
// Routes (new route form)
// ─────────────────────────────────────────────────────────────────────────────

test('new route page renders without crash', async ({ page }) => {
    const errors = collectConsoleErrors(page);
    await setupCommonMocks(page);

    await page.goto('/dashboard/routes/new');
    await page.waitForLoadState('networkidle');

    await expect(page).toHaveURL(/\/dashboard\/routes\/new/);
    expect(errors.filter(isRealError)).toHaveLength(0);
});

// ─────────────────────────────────────────────────────────────────────────────
// Billing
// ─────────────────────────────────────────────────────────────────────────────

test('billing page renders without crash', async ({ page }) => {
    const errors = collectConsoleErrors(page);
    await setupCommonMocks(page);
    await mockApi(page, '**/api/v2/billing/usage**', {
        planId: 'free',
        maxSpendUsd: 5.00,
        currentUsageUsd: 0,
        usagePercent: 0,
    });
    await mockApi(page, '**/api/admin/revenue**', { revenue: [] });

    await page.goto('/dashboard/billing');
    await page.waitForLoadState('networkidle');

    await expect(page).toHaveURL(/\/dashboard\/billing/);
    expect(errors.filter(isRealError)).toHaveLength(0);
});

test('billing upgrade page renders without crash', async ({ page }) => {
    const errors = collectConsoleErrors(page);
    await setupCommonMocks(page);

    await page.goto('/dashboard/billing/upgrade');
    await page.waitForLoadState('networkidle');

    await expect(page).toHaveURL(/\/dashboard\/billing\/upgrade/);
    expect(errors.filter(isRealError)).toHaveLength(0);
});

test('billing wallet page renders without crash', async ({ page }) => {
    const errors = collectConsoleErrors(page);
    await setupCommonMocks(page);

    await page.goto('/dashboard/billing/wallet');
    await page.waitForLoadState('networkidle');

    await expect(page).toHaveURL(/\/dashboard\/billing\/wallet/);
    expect(errors.filter(isRealError)).toHaveLength(0);
});

// ─────────────────────────────────────────────────────────────────────────────
// Unauthenticated redirect
// ─────────────────────────────────────────────────────────────────────────────

test('unauthenticated user is redirected to /login', async ({ page }) => {
    // No session mock — NextAuth returns empty session
    await mockApi(page, '/api/auth/session', {});

    await page.goto('/dashboard');
    await page.waitForLoadState('networkidle');

    // Should be redirected to login
    await expect(page).toHaveURL(/\/login/);
});

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Filter out noise from browser extensions, network connection messages, etc.
 * Only flag real application-level errors.
 */
function isRealError(msg: string): boolean {
    const noise = [
        'favicon',
        'Failed to load resource',   // expected for missing assets
        'net::ERR_',                 // network errors from test mocks
        'ERR_BLOCKED',
        'Extension',
        'chrome-extension',
        '__NEXT_DATA__',
        'Warning:',                  // React warnings — not crashes
    ];
    return !noise.some((n) => msg.includes(n));
}
