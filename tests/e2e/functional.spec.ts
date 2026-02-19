/**
 * Functional tests — validates that key app workflows actually work:
 *
 * - Route creation: form validation, submission, error handling
 * - Policy builder: list, templates, toggle rules, save, simulation
 * - Facilitator management: list with data, register modal, health sync
 * - Playground: SDK card interactions (chat, session, policy)
 *
 * Strategy: mock session + API endpoints, then perform real UI interactions
 * and assert on the resulting DOM state and API calls made.
 *
 * Note on WalletRequired: Policies and Facilitators pages wrap their content
 * in `pointer-events-none` when no wallet is connected (soft mode). Tests
 * call enablePointerEvents() after load to override this for interactability.
 */

import { test, expect, type Page } from '@playwright/test';
import { mockSession, mockApi, collectConsoleErrors } from './helpers/mock-session';

// ── Shared fixture data ──────────────────────────────────────────────────────

const MOCK_POLICY = {
    policyId: 'pol_test001',
    name: 'Strict Mode',
    schemaVersion: '1.0.0',
    updatedAt: new Date().toISOString(),
    rules: {
        routeScopes: ['*'],
        budgets: [{ buyerId: 'default', dailyUsd: 10 }],
        rpmLimits: [{ buyerId: 'default', rpm: 60 }],
        denyIf: {
            legacyXPaymentHeader: true,
            missingPaymentSignature: true,
            amountBelowRequired: true,
        },
    },
};

const MOCK_FACILITATOR = {
    facilitatorId: 'fac_test001',
    name: 'Acme Settlement',
    type: 'Global',
    endpoint: 'https://acme.example.com/settle',
    networks: ['base', 'ethereum'],
    status: 'active',
    erc8004Verified: true,
    erc8004ReputationCached: 0.95,
    erc8004AgentId: 'agent_001',
    health: {
        status: 'healthy',
        p95: 145,
        successRate: 0.99,
        lastChecked: new Date(Date.now() - 5 * 60 * 1000).toISOString(),
    },
};

/**
 * Stable baseline mocks — endpoints that never need per-test variation.
 * Does NOT mock: routes, policies, facilitators (set up per describe block).
 */
async function setupBaseAPIs(page: Page) {
    await mockSession(page);
    await mockApi(page, '**/api/v1/events**', { events: [] });
    await mockApi(page, '**/api/v1/bazaar**', { resources: [], count: 0, timestamp: new Date().toISOString() });
    await mockApi(page, '**/api/v1/intelligence/status**', {
        status: 'active',
        economist: { status: 'ready', lastRun: null },
        sentinel: { status: 'ready', lastRun: null },
        cache: { entries: 0, hitRate: 0 },
    });
    await mockApi(page, '**/api/v1/intelligence/sessions**', { sessions: [] });
    await mockApi(page, '**/api/v1/stats**', { totalPayments: 0, totalVolume: '0', successRate: 1, avgLatencyMs: 0 });
    await mockApi(page, '**/api/v1/trust**', { identities: [] });
    await mockApi(page, '**/api/v1/audit**', { entries: [] });
    await mockApi(page, '**/api/v1/erc8004**', { registered: false });
    await mockApi(page, '**/api/v1/router**', { routes: [] });
}

/**
 * Override the pointer-events-none class injected by WalletRequired (soft mode)
 * when no wallet is connected. This lets tests interact with page controls
 * without requiring a real wallet connection.
 */
async function enablePointerEvents(page: Page) {
    await page.addStyleTag({ content: '.pointer-events-none { pointer-events: auto !important; }' });
}

/** Register a handler for both GET and POST on the same pattern. */
async function mockMethodRoute(
    page: Page,
    pattern: string | RegExp,
    getBody: unknown,
    postBody: unknown
) {
    await page.route(pattern, (route) => {
        if (route.request().method() === 'POST') {
            route.fulfill({
                status: 200,
                contentType: 'application/json',
                body: JSON.stringify(postBody),
            });
        } else {
            route.fulfill({
                status: 200,
                contentType: 'application/json',
                body: JSON.stringify(getBody),
            });
        }
    });
}

// ── Route Creation ───────────────────────────────────────────────────────────

test.describe('Route Creation', () => {
    test('form renders all required fields and controls', async ({ page }) => {
        await mockSession(page);
        await page.goto('/dashboard/routes/new');
        await page.waitForLoadState('networkidle');

        // Use heading role to avoid matching the identically-named submit button
        await expect(page.getByRole('heading', { name: 'Publish Route' })).toBeVisible();
        await expect(page.getByPlaceholder('my-api-route')).toBeVisible();
        await expect(page.getByPlaceholder('/api/v1/resource')).toBeVisible();
        await expect(page.getByPlaceholder('My API Service')).toBeVisible();
        await expect(page.getByPlaceholder('Describe what this endpoint does...')).toBeVisible();
        await expect(page.getByPlaceholder('ai, data, analytics')).toBeVisible();
        await expect(page.locator('select.input')).toBeVisible();
        await expect(page.getByRole('button', { name: 'Publish Route' })).toBeVisible();
        await expect(page.getByRole('button', { name: 'Cancel' })).toBeVisible();
    });

    test('method dropdown supports all HTTP verbs', async ({ page }) => {
        await mockSession(page);
        await page.goto('/dashboard/routes/new');
        await page.waitForLoadState('networkidle');

        const methodSelect = page.locator('select.input');
        for (const method of ['GET', 'POST', 'PUT', 'DELETE']) {
            await methodSelect.selectOption(method);
            await expect(methodSelect).toHaveValue(method);
        }
    });

    test('successful submission redirects to /dashboard', async ({ page }) => {
        await setupBaseAPIs(page);
        await mockMethodRoute(page, '**/api/v1/routes**', { routes: [] }, { ok: true, routeId: 'my-test-route' });
        await mockMethodRoute(page, '**/api/v1/facilitators**', { facilitators: [] }, {});
        await mockMethodRoute(page, '**/api/v1/policies**', { policies: [] }, {});

        await page.goto('/dashboard/routes/new');
        await page.waitForLoadState('networkidle');

        await page.getByPlaceholder('my-api-route').fill('my-test-route');
        await page.getByPlaceholder('/api/v1/resource').fill('/api/v1/test');
        await page.getByPlaceholder('My API Service').fill('Test Service');
        await page.locator('textarea[placeholder="Describe what this endpoint does..."]')
            .fill('A test service for automated testing.');
        await page.getByPlaceholder('ai, data, analytics').fill('ai, testing');

        await page.getByRole('button', { name: 'Publish Route' }).click();
        await page.waitForURL(/\/dashboard($|[?#/])/, { timeout: 10000 });
        await expect(page).toHaveURL(/\/dashboard/);
    });

    test('API error displays error banner in the form', async ({ page }) => {
        await mockSession(page);
        await page.route('**/api/v1/routes', (route) => {
            if (route.request().method() === 'POST') {
                route.fulfill({
                    status: 400,
                    contentType: 'application/json',
                    body: JSON.stringify({ error: 'Route ID already exists' }),
                });
            } else {
                route.continue();
            }
        });

        await page.goto('/dashboard/routes/new');
        await page.waitForLoadState('networkidle');

        await page.getByPlaceholder('my-api-route').fill('duplicate-route');
        await page.getByPlaceholder('/api/v1/resource').fill('/api/v1/test');
        await page.getByPlaceholder('My API Service').fill('Test Service');
        await page.locator('textarea[placeholder="Describe what this endpoint does..."]')
            .fill('A test service.');

        await page.getByRole('button', { name: 'Publish Route' }).click();
        await expect(page.getByText('Route ID already exists')).toBeVisible({ timeout: 8000 });
        await expect(page).toHaveURL(/\/routes\/new/);
    });

    test('button shows "Publishing..." while request is in flight', async ({ page }) => {
        await mockSession(page);
        await page.route('**/api/v1/routes', async (route) => {
            if (route.request().method() === 'POST') {
                await new Promise((r) => setTimeout(r, 600));
                route.fulfill({
                    status: 200,
                    contentType: 'application/json',
                    body: JSON.stringify({ ok: true, routeId: 'test' }),
                });
            } else {
                route.continue();
            }
        });

        await page.goto('/dashboard/routes/new');
        await page.waitForLoadState('networkidle');

        await page.getByPlaceholder('my-api-route').fill('my-route');
        await page.getByPlaceholder('/api/v1/resource').fill('/api/v1/test');
        await page.getByPlaceholder('My API Service').fill('Test Service');
        await page.locator('textarea[placeholder="Describe what this endpoint does..."]')
            .fill('A test service.');

        await page.getByRole('button', { name: 'Publish Route' }).click();
        await expect(page.getByRole('button', { name: 'Publishing...' })).toBeVisible({ timeout: 5000 });
    });
});

// ── Policy Builder ───────────────────────────────────────────────────────────

test.describe('Policy Builder', () => {
    async function setupPolicies(page: Page, policies = [MOCK_POLICY]) {
        await setupBaseAPIs(page);
        await mockApi(page, '**/api/v1/routes**', { routes: [] });
        await mockMethodRoute(page, '**/api/v1/policies', { policies }, { policy: MOCK_POLICY });
    }

    test('existing policies appear in the Control Index', async ({ page }) => {
        await setupPolicies(page);
        await page.goto('/dashboard/policies');
        await page.waitForLoadState('networkidle');

        await expect(page.getByText('Strict Mode')).toBeVisible({ timeout: 8000 });
        await expect(page.getByText(/pol_test001/, { exact: false })).toBeVisible();
    });

    test('first policy auto-selects and loads the Policy Configuration panel', async ({ page }) => {
        await setupPolicies(page);
        await page.goto('/dashboard/policies');
        await page.waitForLoadState('networkidle');

        await expect(page.getByText('Policy Configuration')).toBeVisible({ timeout: 8000 });
        await expect(page.getByText('Reject legacy X-PAYMENT')).toBeVisible();
        await expect(page.getByText('Require PAYMENT-SIGNATURE')).toBeVisible();
        await expect(page.getByText('Strict price floor enforcement')).toBeVisible();
    });

    test('empty list shows "No policies found" placeholder', async ({ page }) => {
        await setupPolicies(page, []);
        await page.goto('/dashboard/policies');
        await page.waitForLoadState('networkidle');

        await expect(page.getByText('No policies found')).toBeVisible({ timeout: 8000 });
    });

    test('Quick Template "Agent-Safe Default" loads a draft into builder', async ({ page }) => {
        await setupPolicies(page, []);
        await page.goto('/dashboard/policies');
        await page.waitForLoadState('networkidle');
        await enablePointerEvents(page);

        await expect(page.getByText('+ Agent-Safe Default')).toBeVisible({ timeout: 8000 });
        await page.getByText('+ Agent-Safe Default').click();
        await expect(page.getByText('Policy Configuration')).toBeVisible({ timeout: 4000 });
    });

    test('Quick Template "Legacy Compatible" loads a draft into builder', async ({ page }) => {
        await setupPolicies(page, []);
        await page.goto('/dashboard/policies');
        await page.waitForLoadState('networkidle');
        await enablePointerEvents(page);

        await page.getByText('+ Legacy Compatible').click();
        await expect(page.getByText('Policy Configuration')).toBeVisible({ timeout: 4000 });
    });

    test('"Save Active Policy" calls POST /api/v1/policies', async ({ page }) => {
        let postCalled = false;
        await setupBaseAPIs(page);
        await mockApi(page, '**/api/v1/routes**', { routes: [] });
        await page.route('**/api/v1/policies', (route) => {
            if (route.request().method() === 'POST') {
                postCalled = true;
                route.fulfill({
                    status: 200,
                    contentType: 'application/json',
                    body: JSON.stringify({ policy: MOCK_POLICY }),
                });
            } else {
                route.fulfill({
                    status: 200,
                    contentType: 'application/json',
                    body: JSON.stringify({ policies: [MOCK_POLICY] }),
                });
            }
        });

        await page.goto('/dashboard/policies');
        await page.waitForLoadState('networkidle');
        await enablePointerEvents(page);
        await expect(page.getByText('Policy Configuration')).toBeVisible({ timeout: 8000 });

        await page.getByRole('button', { name: 'Save Active Policy' }).click();
        await page.waitForTimeout(1000);
        expect(postCalled).toBe(true);
    });

    test('enforcement rule checkboxes are interactive', async ({ page }) => {
        await setupPolicies(page);
        await page.goto('/dashboard/policies');
        await page.waitForLoadState('networkidle');
        await enablePointerEvents(page);

        await expect(page.getByText('Policy Configuration')).toBeVisible({ timeout: 8000 });

        const checkbox = page
            .locator('label')
            .filter({ hasText: 'Reject legacy X-PAYMENT' })
            .locator('input[type="checkbox"]');

        await expect(checkbox).toBeVisible({ timeout: 4000 });
        const before = await checkbox.isChecked();
        await checkbox.click();
        await expect(checkbox).toBeChecked({ checked: !before });
    });

    test('"Switch to Raw JSON" shows JSON textarea, "Switch to UI Form" reverts', async ({ page }) => {
        await setupPolicies(page);
        await page.goto('/dashboard/policies');
        await page.waitForLoadState('networkidle');
        await enablePointerEvents(page);

        await expect(page.getByText('Policy Configuration')).toBeVisible({ timeout: 8000 });

        await page.getByText('Switch to Raw JSON').click();
        await expect(page.locator('textarea[placeholder="Paste policy JSON here..."]')).toBeVisible({ timeout: 4000 });

        await page.getByText('Switch to UI Form').click();
        await expect(page.locator('textarea[placeholder="Paste policy JSON here..."]')).not.toBeVisible({ timeout: 4000 });
    });

    test('simulation shows Policy: PASS with candidate count', async ({ page }) => {
        await setupPolicies(page);
        await mockApi(page, '**/api/v1/router/plan**', {
            allow: true,
            candidates: [{ routeId: 'rt_weather' }, { routeId: 'rt_data' }],
            policy: { reasons: ['Payment signature verified', 'Amount meets floor'] },
        });

        await page.goto('/dashboard/policies');
        await page.waitForLoadState('networkidle');
        await enablePointerEvents(page);

        await page.getByRole('button', { name: 'Run Simulation' }).click();
        await expect(page.getByText('Policy: PASS')).toBeVisible({ timeout: 10000 });
        await expect(page.getByText('2 Routes Found')).toBeVisible({ timeout: 4000 });
    });

    test('simulation shows Policy: FAIL with violated rule and detail', async ({ page }) => {
        await setupPolicies(page);
        await mockApi(page, '**/api/v1/router/plan**', {
            allow: false,
            candidates: [],
            policy: {
                deny: {
                    code: 'PRICE_FLOOR_VIOLATION',
                    detail: 'Provided amount 0.001 USDC is below required floor 0.01 USDC',
                },
                reasons: ['Price floor check failed'],
            },
        });

        await page.goto('/dashboard/policies');
        await page.waitForLoadState('networkidle');
        await enablePointerEvents(page);

        await page.getByRole('button', { name: 'Run Simulation' }).click();
        await expect(page.getByText('Policy: FAIL')).toBeVisible({ timeout: 10000 });
        await expect(page.getByText('PRICE_FLOOR_VIOLATION')).toBeVisible({ timeout: 4000 });
        await expect(page.getByText(/below required floor/)).toBeVisible({ timeout: 4000 });
    });

    test('"Reset Builder" does not crash the page', async ({ page }) => {
        const errors = collectConsoleErrors(page);
        await setupPolicies(page);
        await page.goto('/dashboard/policies');
        await page.waitForLoadState('networkidle');
        await enablePointerEvents(page);

        await page.getByRole('button', { name: 'Reset Builder' }).click();
        await page.waitForTimeout(500);

        const realErrors = errors.filter(
            (m) => m.includes('TypeError') || m.includes('Uncaught')
        );
        expect(realErrors).toHaveLength(0);
    });
});

// ── Facilitator Management ───────────────────────────────────────────────────

test.describe('Facilitator Management', () => {
    async function setupFacilitators(
        page: Page,
        facilitators: unknown[] = [MOCK_FACILITATOR]
    ) {
        await setupBaseAPIs(page);
        await mockApi(page, '**/api/v1/routes**', { routes: [] });
        await mockApi(page, '**/api/v1/policies**', { policies: [] });
        await page.route(/\/api\/v1\/facilitators$/, (route) => {
            route.fulfill({
                status: 200,
                contentType: 'application/json',
                body: JSON.stringify({ facilitators }),
            });
        });
    }

    test('facilitator card renders with health badge and stats', async ({ page }) => {
        await setupFacilitators(page);
        await page.goto('/dashboard/facilitators');
        await page.waitForLoadState('networkidle');

        await expect(page.getByText('Acme Settlement')).toBeVisible({ timeout: 8000 });
        await expect(page.getByText('healthy')).toBeVisible();
        await expect(page.getByText('99%')).toBeVisible();
        await expect(page.getByText('145ms')).toBeVisible();
        await expect(page.getByText('Global')).toBeVisible();
    });

    test('ERC-8004 badge visible for verified facilitator', async ({ page }) => {
        await setupFacilitators(page);
        await page.goto('/dashboard/facilitators');
        await page.waitForLoadState('networkidle');

        // exact: true avoids matching 'ERC-8004 VERIFIED' text from TrustBadge
        await expect(page.getByText('ERC-8004', { exact: true })).toBeVisible({ timeout: 8000 });
    });

    test('empty state renders when registry has no entries', async ({ page }) => {
        await setupFacilitators(page, []);
        await page.goto('/dashboard/facilitators');
        await page.waitForLoadState('networkidle');

        await expect(page.getByText('No facilitators found')).toBeVisible({ timeout: 8000 });
    });

    test('multiple facilitators render as a grid of cards', async ({ page }) => {
        const betaNode = {
            ...MOCK_FACILITATOR,
            facilitatorId: 'fac_test002',
            name: 'Beta Node',
            type: 'Private',
            erc8004Verified: false,
            health: { status: 'degraded', p95: 320, successRate: 0.75, lastChecked: null },
        };
        await setupFacilitators(page, [MOCK_FACILITATOR, betaNode]);
        await page.goto('/dashboard/facilitators');
        await page.waitForLoadState('networkidle');

        await expect(page.getByText('Acme Settlement')).toBeVisible({ timeout: 8000 });
        await expect(page.getByText('Beta Node')).toBeVisible();
        await expect(page.getByText('degraded')).toBeVisible();
        await expect(page.getByText('75%')).toBeVisible();
    });

    test('"Register Node" button opens the add facilitator modal', async ({ page }) => {
        await setupFacilitators(page, []);
        await page.goto('/dashboard/facilitators');
        await page.waitForLoadState('networkidle');
        await enablePointerEvents(page);

        await page.getByRole('button', { name: 'Register Node' }).click();
        await expect(page.getByText('Register Facilitator')).toBeVisible({ timeout: 4000 });
        await expect(page.getByPlaceholder('e.g. Acme Private Settlement')).toBeVisible();
        await expect(page.getByPlaceholder('https://facilitator.example.com')).toBeVisible();
        await expect(page.getByPlaceholder('base, ethereum, polygon')).toBeVisible();
    });

    test('"Cancel" button closes the modal without saving', async ({ page }) => {
        await setupFacilitators(page, []);
        await page.goto('/dashboard/facilitators');
        await page.waitForLoadState('networkidle');
        await enablePointerEvents(page);

        await page.getByRole('button', { name: 'Register Node' }).click();
        await expect(page.getByText('Register Facilitator')).toBeVisible({ timeout: 4000 });

        await page.getByRole('button', { name: 'Cancel' }).click();
        await expect(page.getByText('Register Facilitator')).not.toBeVisible({ timeout: 4000 });
    });

    test('"Save & Verify" closes the modal', async ({ page }) => {
        await setupFacilitators(page, []);
        await page.goto('/dashboard/facilitators');
        await page.waitForLoadState('networkidle');
        await enablePointerEvents(page);

        await page.getByRole('button', { name: 'Register Node' }).click();
        await page.getByPlaceholder('e.g. Acme Private Settlement').fill('My Test Node');
        await page.getByPlaceholder('https://facilitator.example.com').fill('https://testnode.example.com');
        await page.getByPlaceholder('base, ethereum, polygon').fill('base, ethereum');

        await page.getByRole('button', { name: 'Save & Verify' }).click();
        await expect(page.getByText('Register Facilitator')).not.toBeVisible({ timeout: 4000 });
    });

    test('"Re-Check Health" triggers POST to /api/v1/facilitators/sync', async ({ page }) => {
        let syncCalled = false;
        await setupFacilitators(page);
        await page.route('**/api/v1/facilitators/sync', (route) => {
            syncCalled = true;
            route.fulfill({
                status: 200,
                contentType: 'application/json',
                body: JSON.stringify({ ok: true, updated: 1 }),
            });
        });

        await page.goto('/dashboard/facilitators');
        await page.waitForLoadState('networkidle');
        await enablePointerEvents(page);

        await page.getByRole('button', { name: 'Re-Check Health' }).click();
        await page.waitForTimeout(1500);
        expect(syncCalled).toBe(true);
    });

    test('"Re-Check Health" shows Synchronizing... state while running', async ({ page }) => {
        await setupFacilitators(page);
        await page.route('**/api/v1/facilitators/sync', async (route) => {
            await new Promise((r) => setTimeout(r, 600));
            route.fulfill({
                status: 200,
                contentType: 'application/json',
                body: JSON.stringify({ ok: true }),
            });
        });

        await page.goto('/dashboard/facilitators');
        await page.waitForLoadState('networkidle');
        await enablePointerEvents(page);

        await page.getByRole('button', { name: 'Re-Check Health' }).click();
        await expect(page.getByRole('button', { name: 'Synchronizing...' })).toBeVisible({ timeout: 4000 });
    });
});

// ── Playground SDK ───────────────────────────────────────────────────────────

test.describe('Playground SDK Interactions', () => {
    async function setupPlayground(page: Page) {
        await mockSession(page);
        await mockApi(page, '**/api/v1/routes**', { routes: [] });
    }

    test('all three SDK cards render on load', async ({ page }) => {
        await setupPlayground(page);
        await page.goto('/dashboard/playground');
        await page.waitForLoadState('networkidle');

        await expect(page.getByText('AI Chat')).toBeVisible();
        await expect(page.getByText('Session Manager')).toBeVisible();
        await expect(page.getByText('Governance Policy')).toBeVisible();
        await expect(page.getByRole('button', { name: 'Send Message' })).toBeVisible();
        await expect(page.getByRole('button', { name: 'Create $10 Session' })).toBeVisible();
        await expect(page.getByRole('button', { name: 'Create Policy' })).toBeVisible();
    });

    test('initial chat history includes the system message', async ({ page }) => {
        await setupPlayground(page);
        await page.goto('/dashboard/playground');
        await page.waitForLoadState('networkidle');

        await expect(page.getByText('You are a helpful AI assistant.')).toBeVisible({ timeout: 4000 });
    });

    test('"Send Message" appends user message and renders assistant reply', async ({ page }) => {
        await setupPlayground(page);
        await mockApi(page, '**/api/v2/chat/completions**', {
            choices: [{
                message: {
                    role: 'assistant',
                    content: 'Quantum computing uses qubits to process information exponentially faster than classical computers.',
                },
            }],
        });

        await page.goto('/dashboard/playground');
        await page.waitForLoadState('networkidle');

        await page.getByRole('button', { name: 'Send Message' }).click();
        await expect(page.getByText('Explain quantum computing in one sentence.')).toBeVisible({ timeout: 10000 });
        await expect(page.getByText(/Quantum computing uses qubits/)).toBeVisible({ timeout: 10000 });
    });

    test('"Send Message" shows Thinking... loading state', async ({ page }) => {
        await setupPlayground(page);
        await page.route('**/api/v2/chat/completions**', async (route) => {
            await new Promise((r) => setTimeout(r, 700));
            route.fulfill({
                status: 200,
                contentType: 'application/json',
                body: JSON.stringify({ choices: [{ message: { role: 'assistant', content: 'Done.' } }] }),
            });
        });

        await page.goto('/dashboard/playground');
        await page.waitForLoadState('networkidle');

        await page.getByRole('button', { name: 'Send Message' }).click();
        await expect(page.getByRole('button', { name: 'Thinking...' })).toBeVisible({ timeout: 5000 });
    });

    test('"Create $10 Session" renders session JSON on success', async ({ page }) => {
        await setupPlayground(page);
        // SDK calls POST /api/v2/sessions
        await mockApi(page, '**/api/v2/sessions**', {
            sessionId: 'sess_abc123',
            budgetUsd: 10,
            expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
            status: 'active',
        });

        await page.goto('/dashboard/playground');
        await page.waitForLoadState('networkidle');

        await page.getByRole('button', { name: 'Create $10 Session' }).click();
        await expect(page.getByText('sess_abc123')).toBeVisible({ timeout: 8000 });
    });

    test('"Create Policy" renders policy JSON on success', async ({ page }) => {
        await setupPlayground(page);
        // SDK calls POST /api/v2/governance/policies
        await mockApi(page, '**/api/v2/governance/policies**', {
            policyId: 'pol_playground_001',
            name: 'Playground Policy',
            rules: { allowed_models: ['gpt-4o', 'claude-3-haiku'] },
        });

        await page.goto('/dashboard/playground');
        await page.waitForLoadState('networkidle');

        await page.getByRole('button', { name: 'Create Policy' }).click();
        await expect(page.getByText('pol_playground_001')).toBeVisible({ timeout: 8000 });
    });
});
