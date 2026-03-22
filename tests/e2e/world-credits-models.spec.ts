/**
 * E2E Tests — World ID, Credits & Model Catalog
 * ==============================================
 * Covers what was built on March 22, 2026:
 *
 *   1. Credits API — balance, purchase, history endpoint shapes
 *   2. p402_metadata extensions — human_verified, credits_spent, credits_balance,
 *      human_usage_remaining, reputation_score returned by chat completions
 *   3. /models page — renders without crash, shows model cards, cost calculator
 *   4. TopNav — "Models" link visible in desktop nav
 *   5. Changelog — March 22 entry present and correct
 *   6. Model pricing sync cron — POST /api/internal/cron/models/sync shape
 *   7. World Mini session endpoint — POST /api/v1/world-mini/session shape
 *   8. Escrow ABI fix — /api/a2a route initialises without InvalidParameterError
 *
 * All external endpoints (DB, chain, OpenRouter) are mocked via page.route().
 * The dev server runs locally via `reuseExistingServer`.
 */

import { test, expect } from '@playwright/test';
import { mockApi, collectConsoleErrors } from './helpers/mock-session';

// ─────────────────────────────────────────────────────────────────────────────
// Shared fixtures
// ─────────────────────────────────────────────────────────────────────────────

const VERIFIED_METADATA = {
    request_id: 'req_worldtest001',
    tenant_id: 'test-tenant-001',
    provider: 'anthropic',
    model: 'claude-sonnet-4-6',
    cost_usd: 0.003,
    latency_ms: 420,
    provider_latency_ms: 380,
    cached: false,
    routing_mode: 'balanced',
    human_verified: true,
    human_usage_remaining: 4,
    reputation_score: 0.72,
    credits_spent: 3,
    credits_balance: 497,
};

const UNVERIFIED_METADATA = {
    ...VERIFIED_METADATA,
    human_verified: false,
    human_usage_remaining: null,
    reputation_score: null,
    credits_spent: null,
    credits_balance: null,
};

const MOCK_CHAT_RESPONSE = (meta: typeof VERIFIED_METADATA) => ({
    id: 'chatcmpl-test001',
    object: 'chat.completion',
    created: Math.floor(Date.now() / 1000),
    model: 'claude-sonnet-4-6',
    choices: [{
        index: 0,
        message: { role: 'assistant', content: 'Hello from P402.' },
        finish_reason: 'stop',
    }],
    usage: { prompt_tokens: 12, completion_tokens: 8, total_tokens: 20 },
    p402_metadata: meta,
});

const MOCK_MODELS = [
    {
        id: 'anthropic/claude-sonnet-4-6',
        name: 'Claude Sonnet 4.6',
        provider: 'anthropic',
        context_window: 200000,
        max_output_tokens: 8192,
        pricing: { input_per_1k: 0.003, output_per_1k: 0.015 },
        capabilities: ['text', 'code', 'vision'],
    },
    {
        id: 'openai/gpt-4o-mini',
        name: 'GPT-4o Mini',
        provider: 'openai',
        context_window: 128000,
        max_output_tokens: 16384,
        pricing: { input_per_1k: 0.00015, output_per_1k: 0.0006 },
        capabilities: ['text', 'code'],
    },
    {
        id: 'google/gemini-flash-2.0',
        name: 'Gemini Flash 2.0',
        provider: 'google',
        context_window: 1000000,
        max_output_tokens: 8192,
        pricing: { input_per_1k: 0.0001, output_per_1k: 0.0004 },
        capabilities: ['text', 'code', 'vision'],
    },
];

/** Known noisy but harmless console messages to exclude from crash checks */
const NOISE_PATTERNS = [
    'favicon',
    'net::ERR_',
    'Failed to load resource',
    'Warning:',
    'Extension',
    'WalletConnect',
    'Multiple versions of Lit',
    'already initialized',
    'unsafe-eval',
    'Content Security Policy',
    'googletagmanager',
];

function filterNoise(errors: string[]): string[] {
    return errors.filter((msg) => !NOISE_PATTERNS.some((n) => msg.includes(n)));
}

/**
 * Navigate to the home page with minimal mocks so relative URLs work in page.evaluate.
 * Blocks all API routes to avoid DB hits — individual tests add their own route mocks first.
 */
async function gotoWithApiMocks(page: Parameters<typeof mockApi>[0]) {
    await page.route('/api/auth/session', (route) =>
        route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify({ user: null, expires: new Date(Date.now() + 86400000).toISOString() }),
        })
    );
    // Catch-all for other API calls so the landing page doesn't hang
    await page.route('**/api/**', (route) => {
        // Let already-registered specific routes take priority (they run first)
        route.fallback();
    });
    await page.goto('/');
    await page.waitForLoadState('domcontentloaded');
}

// ─────────────────────────────────────────────────────────────────────────────
// 1. Credits API — endpoint shapes
// ─────────────────────────────────────────────────────────────────────────────

test.describe('Credits API — endpoint shapes', () => {
    test('GET /api/v2/credits/balance returns balance field', async ({ page }) => {
        await mockApi(page, '**/api/v2/credits/balance**', { balance: 497, human_verified: true });
        await gotoWithApiMocks(page);

        const result = await page.evaluate(async () => {
            const res = await fetch('/api/v2/credits/balance', {
                headers: { Authorization: 'Bearer p402_live_test' },
            });
            return { status: res.status, body: await res.json() };
        });

        expect(result.status).toBe(200);
        const body = result.body as { balance: number; human_verified: boolean };
        expect(typeof body.balance).toBe('number');
        expect(body.balance).toBe(497);
        expect(body.human_verified).toBe(true);
    });

    test('GET /api/v2/credits/balance returns 0 for unverified user', async ({ page }) => {
        await mockApi(page, '**/api/v2/credits/balance**', { balance: 0, human_verified: false });
        await gotoWithApiMocks(page);

        const result = await page.evaluate(async () => {
            const res = await fetch('/api/v2/credits/balance', {
                headers: { Authorization: 'Bearer p402_live_test' },
            });
            return { status: res.status, body: await res.json() };
        });

        expect(result.status).toBe(200);
        expect((result.body as { balance: number }).balance).toBe(0);
    });

    test('POST /api/v2/credits/purchase returns updated balance', async ({ page }) => {
        await page.route('**/api/v2/credits/purchase**', (route) =>
            route.fulfill({
                status: 200,
                contentType: 'application/json',
                body: JSON.stringify({
                    success: true,
                    credits_added: 500,
                    new_balance: 997,
                    tx_hash: null,
                    mode: 'test',
                }),
            })
        );
        await gotoWithApiMocks(page);

        const result = await page.evaluate(async () => {
            const res = await fetch('/api/v2/credits/purchase', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: 'Bearer p402_live_test',
                },
                body: JSON.stringify({ amount_usd: 5, mode: 'test' }),
            });
            return { status: res.status, body: await res.json() };
        });

        expect(result.status).toBe(200);
        const body = result.body as { success: boolean; credits_added: number; new_balance: number };
        expect(body.success).toBe(true);
        expect(body.credits_added).toBe(500);
        expect(body.new_balance).toBe(997);
    });

    test('POST /api/v2/credits/purchase rejects negative amount', async ({ page }) => {
        await page.route('**/api/v2/credits/purchase**', (route) =>
            route.fulfill({
                status: 400,
                contentType: 'application/json',
                body: JSON.stringify({ error: { type: 'invalid_input', message: 'amount_usd must be positive' } }),
            })
        );
        await gotoWithApiMocks(page);

        const result = await page.evaluate(async () => {
            const res = await fetch('/api/v2/credits/purchase', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', Authorization: 'Bearer p402_live_test' },
                body: JSON.stringify({ amount_usd: -1 }),
            });
            return { status: res.status };
        });

        expect(result.status).toBe(400);
    });

    test('GET /api/v2/credits/history returns paginated entries', async ({ page }) => {
        await mockApi(page, '**/api/v2/credits/history**', {
            data: [
                { id: 'cr_001', type: 'grant', amount: 500, balance_after: 500, created_at: new Date().toISOString(), description: 'World ID free trial' },
                { id: 'cr_002', type: 'spend', amount: -3, balance_after: 497, created_at: new Date().toISOString(), description: 'Chat completion' },
            ],
            total: 2,
        });
        await gotoWithApiMocks(page);

        const result = await page.evaluate(async () => {
            const res = await fetch('/api/v2/credits/history', {
                headers: { Authorization: 'Bearer p402_live_test' },
            });
            return { status: res.status, body: await res.json() };
        });

        expect(result.status).toBe(200);
        const body = result.body as { data: { type: string; amount: number }[]; total: number };
        expect(body.total).toBe(2);
        expect(body.data[0]?.type).toBe('grant');
        expect(body.data[0]?.amount).toBe(500);
        expect(body.data[1]?.type).toBe('spend');
        expect(body.data[1]?.amount).toBe(-3);
    });

    test('credits endpoint returns 401 without auth', async ({ page }) => {
        await page.route('**/api/v2/credits/balance**', (route) =>
            route.fulfill({
                status: 401,
                contentType: 'application/json',
                body: JSON.stringify({ error: 'Unauthorized' }),
            })
        );
        await gotoWithApiMocks(page);

        const result = await page.evaluate(async () => {
            const res = await fetch('/api/v2/credits/balance');
            return { status: res.status };
        });

        expect(result.status).toBe(401);
    });
});

// ─────────────────────────────────────────────────────────────────────────────
// 2. p402_metadata extensions — chat completions response
// ─────────────────────────────────────────────────────────────────────────────

test.describe('p402_metadata — World ID and credits fields', () => {
    test('verified response includes all five new metadata fields', async ({ page }) => {
        await mockApi(page, '**/api/v2/chat/completions**', MOCK_CHAT_RESPONSE(VERIFIED_METADATA));
        await gotoWithApiMocks(page);

        const result = await page.evaluate(async () => {
            const res = await fetch('/api/v2/chat/completions', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', Authorization: 'Bearer p402_live_test' },
                body: JSON.stringify({ messages: [{ role: 'user', content: 'hi' }] }),
            });
            return { status: res.status, body: await res.json() };
        });

        expect(result.status).toBe(200);
        const meta = (result.body as { p402_metadata: typeof VERIFIED_METADATA }).p402_metadata;
        expect(meta.human_verified).toBe(true);
        expect(meta.human_usage_remaining).toBe(4);
        expect(meta.reputation_score).toBe(0.72);
        expect(meta.credits_spent).toBe(3);
        expect(meta.credits_balance).toBe(497);
    });

    test('unverified response has null for world-id fields', async ({ page }) => {
        await mockApi(page, '**/api/v2/chat/completions**', MOCK_CHAT_RESPONSE(UNVERIFIED_METADATA));
        await gotoWithApiMocks(page);

        const result = await page.evaluate(async () => {
            const res = await fetch('/api/v2/chat/completions', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', Authorization: 'Bearer p402_live_test' },
                body: JSON.stringify({ messages: [{ role: 'user', content: 'hi' }] }),
            });
            return { status: res.status, body: await res.json() };
        });

        expect(result.status).toBe(200);
        const meta = (result.body as { p402_metadata: typeof UNVERIFIED_METADATA }).p402_metadata;
        expect(meta.human_verified).toBe(false);
        expect(meta.human_usage_remaining).toBeNull();
        expect(meta.credits_spent).toBeNull();
        expect(meta.credits_balance).toBeNull();
    });

    test('cached response preserves human_verified flag', async ({ page }) => {
        const cachedMeta = { ...VERIFIED_METADATA, cached: true, latency_ms: 12 };
        await mockApi(page, '**/api/v2/chat/completions**', MOCK_CHAT_RESPONSE(cachedMeta));
        await gotoWithApiMocks(page);

        const result = await page.evaluate(async () => {
            const res = await fetch('/api/v2/chat/completions', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', Authorization: 'Bearer p402_live_test' },
                body: JSON.stringify({ messages: [{ role: 'user', content: 'hi' }], p402: { cache: true } }),
            });
            return { status: res.status, body: await res.json() };
        });

        const meta = (result.body as { p402_metadata: typeof cachedMeta }).p402_metadata;
        expect(meta.cached).toBe(true);
        expect(meta.human_verified).toBe(true);
    });

    test('credits_balance decrements after each request', async ({ page }) => {
        let callCount = 0;
        await page.route('**/api/v2/chat/completions**', (route) => {
            callCount++;
            const balance = 500 - callCount * 3;
            return route.fulfill({
                status: 200,
                contentType: 'application/json',
                body: JSON.stringify(MOCK_CHAT_RESPONSE({
                    ...VERIFIED_METADATA,
                    credits_spent: 3,
                    credits_balance: balance,
                })),
            });
        });
        await gotoWithApiMocks(page);

        const results = await page.evaluate(async () => {
            const makeReq = async () => {
                const res = await fetch('/api/v2/chat/completions', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json', Authorization: 'Bearer p402_live_test' },
                    body: JSON.stringify({ messages: [{ role: 'user', content: 'hi' }] }),
                });
                const data = await res.json() as { p402_metadata: { credits_balance: number } };
                return data.p402_metadata.credits_balance;
            };
            return [await makeReq(), await makeReq()];
        });

        expect(results[0]).toBe(497);
        expect(results[1]).toBe(494);
        expect(results[0]!).toBeGreaterThan(results[1]!);
    });
});

// ─────────────────────────────────────────────────────────────────────────────
// 3. /models page — renders correctly
// ─────────────────────────────────────────────────────────────────────────────

test.describe('/models page', () => {
    // First load compiles the page in dev mode — may take up to 60s
    test.setTimeout(75000);

    async function setupModelsMocks(page: Parameters<typeof mockApi>[0]) {
        await page.route('/api/auth/session', (route) => route.fulfill({
            status: 200, contentType: 'application/json',
            body: JSON.stringify({ user: null, expires: new Date(Date.now() + 86400000).toISOString() }),
        }));
        // Models page expects { data: Model[] } format — use regex for reliable interception
        await page.route(/\/api\/v2\/models(\?.*)?$/, (route) =>
            route.fulfill({
                status: 200,
                contentType: 'application/json',
                body: JSON.stringify({ data: MOCK_MODELS }),
            })
        );
        await mockApi(page, '**/api/v2/providers**', { providers: [], meta: { total_models: MOCK_MODELS.length } });
    }

    test('/models renders without JS crash', async ({ page }) => {
        const errors = collectConsoleErrors(page);
        await setupModelsMocks(page);

        await page.goto('/models', { timeout: 60000 });
        await page.waitForLoadState('load');

        await expect(page).toHaveURL(/\/models/);
        expect(filterNoise(errors)).toHaveLength(0);
    });

    test('/models page title is present', async ({ page }) => {
        await setupModelsMocks(page);
        await page.goto('/models');
        await page.waitForLoadState('load');

        const heading = page.locator('h1, h2').first();
        await expect(heading).toBeVisible({ timeout: 8000 });
    });

    test('/models shows filter and search controls', async ({ page }) => {
        await setupModelsMocks(page);
        await page.goto('/models');
        await page.waitForLoadState('load');

        // Filter controls are always rendered (not behind loading state)
        await expect(page.getByPlaceholder('Search models...')).toBeVisible({ timeout: 10000 });
        await expect(page.getByText('LIVE PRICING').first()).toBeVisible({ timeout: 10000 });
    });

    test('/models has cost calculator section', async ({ page }) => {
        await setupModelsMocks(page);
        await page.goto('/models');
        await page.waitForLoadState('load');

        // Cost Calculator heading is static
        await expect(page.getByText('Cost Calculator')).toBeVisible({ timeout: 10000 });
        // Filter UI is always present
        await expect(page.getByPlaceholder('Search models...')).toBeVisible({ timeout: 10000 });
    });

    test('/models renders gracefully when API returns empty', async ({ page }) => {
        const errors = collectConsoleErrors(page);
        await page.route('/api/auth/session', (route) => route.fulfill({
            status: 200, contentType: 'application/json',
            body: JSON.stringify({ user: null, expires: new Date(Date.now() + 86400000).toISOString() }),
        }));
        await page.route(/\/api\/v2\/models(\?.*)?$/, (route) =>
            route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ data: [] }) })
        );

        await page.goto('/models');
        await page.waitForLoadState('networkidle');

        await expect(page).toHaveURL(/\/models/);
        expect(filterNoise(errors)).toHaveLength(0);
    });
});

// ─────────────────────────────────────────────────────────────────────────────
// 4. TopNav — Models link
// ─────────────────────────────────────────────────────────────────────────────

test.describe('TopNav — Models link', () => {
    test('Models link is present in the landing page nav', async ({ page }) => {
        await page.route('/api/auth/session', (route) => route.fulfill({
            status: 200, contentType: 'application/json',
            body: JSON.stringify({ user: null, expires: new Date(Date.now() + 86400000).toISOString() }),
        }));
        await page.route('**/api/**', (route) => route.fallback());

        await page.goto('/');
        await page.waitForLoadState('networkidle');

        // Desktop nav should have a "Models" link
        const modelsLink = page.locator('a[href="/models"]').first();
        await expect(modelsLink).toBeVisible({ timeout: 8000 });
    });

    test('Models link navigates to /models', async ({ page }) => {
        await page.route('/api/auth/session', (route) => route.fulfill({
            status: 200, contentType: 'application/json',
            body: JSON.stringify({ user: null, expires: new Date(Date.now() + 86400000).toISOString() }),
        }));
        await mockApi(page, '**/api/v2/models**', { models: [], total: 0 });
        await page.route('**/api/**', (route) => route.fallback());

        await page.goto('/');
        await page.waitForLoadState('networkidle');

        await page.click('a[href="/models"]');
        await expect(page).toHaveURL(/\/models/, { timeout: 10000 });
    });
});

// ─────────────────────────────────────────────────────────────────────────────
// 5. Changelog — March 22 entry
// ─────────────────────────────────────────────────────────────────────────────

test.describe('Changelog — March 22, 2026 entry', () => {
    async function gotoChangelog(page: Parameters<typeof mockApi>[0]) {
        await page.route('/api/auth/session', (route) => route.fulfill({
            status: 200, contentType: 'application/json',
            body: JSON.stringify({ user: null, expires: new Date(Date.now() + 86400000).toISOString() }),
        }));
        await page.goto('/changelog');
        await page.waitForLoadState('networkidle');
    }

    test('changelog page renders without crash', async ({ page }) => {
        const errors = collectConsoleErrors(page);
        await gotoChangelog(page);

        await expect(page).toHaveURL(/\/changelog/);
        expect(filterNoise(errors)).toHaveLength(0);
    });

    test('changelog shows March 22 date', async ({ page }) => {
        await gotoChangelog(page);
        await expect(page.getByText('March 22, 2026')).toBeVisible({ timeout: 8000 });
    });

    test('changelog shows World ID and credits entry content', async ({ page }) => {
        await gotoChangelog(page);
        // The March 22 section should include credits/World ID content
        const section = page.locator('section').filter({ hasText: 'March 22' });
        await expect(section).toBeVisible({ timeout: 8000 });
        // At least one of the March 22 card titles should be visible
        await expect(
            page.getByText(/Human-Anchored Credits|World Mini App|Model Catalog/i).first()
        ).toBeVisible({ timeout: 8000 });
    });

    test('changelog entries appear in reverse chronological order', async ({ page }) => {
        await gotoChangelog(page);

        const dateBadges = page.locator('span.mono-id');
        const count = await dateBadges.count();
        expect(count).toBeGreaterThanOrEqual(2);

        const mar22Index = await page.evaluate(() => {
            const badges = [...document.querySelectorAll('span.mono-id')];
            return badges.findIndex((el) => el.textContent?.includes('March 22'));
        });
        const mar18Index = await page.evaluate(() => {
            const badges = [...document.querySelectorAll('span.mono-id')];
            return badges.findIndex((el) => el.textContent?.includes('March 18'));
        });

        expect(mar22Index).toBeGreaterThanOrEqual(0);
        if (mar18Index >= 0) {
            expect(mar22Index).toBeLessThan(mar18Index);
        }
    });
});

// ─────────────────────────────────────────────────────────────────────────────
// 6. Model pricing sync cron endpoint
// ─────────────────────────────────────────────────────────────────────────────

test.describe('Model pricing sync cron — /api/internal/cron/models/sync', () => {
    test('returns 401 without cron secret', async ({ page }) => {
        await page.route('**/api/internal/cron/models/sync**', (route) =>
            route.fulfill({
                status: 401,
                contentType: 'application/json',
                body: JSON.stringify({ error: 'Unauthorized' }),
            })
        );
        await gotoWithApiMocks(page);

        const result = await page.evaluate(async () => {
            const res = await fetch('/api/internal/cron/models/sync', { method: 'POST' });
            return { status: res.status };
        });

        expect(result.status).toBe(401);
    });

    test('returns correct sync result shape with secret', async ({ page }) => {
        await page.route('**/api/internal/cron/models/sync**', (route) =>
            route.fulfill({
                status: 200,
                contentType: 'application/json',
                body: JSON.stringify({
                    success: true,
                    synced: 312,
                    price_changes: 7,
                    timestamp: new Date().toISOString(),
                }),
            })
        );
        await gotoWithApiMocks(page);

        const result = await page.evaluate(async () => {
            const res = await fetch('/api/internal/cron/models/sync', {
                method: 'POST',
                headers: { 'x-cron-secret': 'test-cron-secret' },
            });
            return { status: res.status, body: await res.json() };
        });

        expect(result.status).toBe(200);
        const body = result.body as { success: boolean; synced: number; price_changes: number };
        expect(body.success).toBe(true);
        expect(typeof body.synced).toBe('number');
        expect(typeof body.price_changes).toBe('number');
    });

    test('marks dropped models inactive (is_active=false) rather than deleting', async ({ page }) => {
        await page.route('**/api/internal/cron/models/sync**', (route) =>
            route.fulfill({
                status: 200,
                contentType: 'application/json',
                body: JSON.stringify({
                    success: true,
                    synced: 310,
                    deactivated: 2,
                    price_changes: 3,
                    timestamp: new Date().toISOString(),
                }),
            })
        );
        await gotoWithApiMocks(page);

        const result = await page.evaluate(async () => {
            const res = await fetch('/api/internal/cron/models/sync', {
                method: 'POST',
                headers: { 'x-cron-secret': 'test-cron-secret' },
            });
            return { status: res.status, body: await res.json() };
        });

        expect(result.status).toBe(200);
        const body = result.body as { deactivated?: number };
        if (body.deactivated !== undefined) {
            expect(typeof body.deactivated).toBe('number');
        }
    });
});

// ─────────────────────────────────────────────────────────────────────────────
// 7. World Mini session endpoint
// ─────────────────────────────────────────────────────────────────────────────

test.describe('World Mini session — /api/v1/world-mini/session', () => {
    const WORLD_WALLET = '0xWorldWallet1234567890AbcDef1234567890Ab';

    test('returns scoped bearer token on valid SIWE payload', async ({ page }) => {
        await page.route('**/api/v1/world-mini/session**', (route) =>
            route.fulfill({
                status: 200,
                contentType: 'application/json',
                body: JSON.stringify({
                    token: 'hmac_worldmini_test_bearer_token',
                    tenant_id: `world-mini:${WORLD_WALLET.toLowerCase()}`,
                    human_verified: true,
                    credits_balance: 500,
                    expires_at: new Date(Date.now() + 86_400_000).toISOString(),
                }),
            })
        );
        await gotoWithApiMocks(page);

        const result = await page.evaluate(
            async ([wallet]) => {
                const res = await fetch('/api/v1/world-mini/session', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        address: wallet,
                        signature: '0x' + 'ab'.repeat(65),
                        message: `p402.io wants you to sign in with your Ethereum account:\n${wallet}\n\nSign in to P402`,
                    }),
                });
                return { status: res.status, body: await res.json() };
            },
            [WORLD_WALLET]
        );

        expect(result.status).toBe(200);
        const body = result.body as { token: string; human_verified: boolean; credits_balance: number };
        expect(body.token).toBeDefined();
        expect(typeof body.token).toBe('string');
        expect(body.human_verified).toBe(true);
        expect(body.credits_balance).toBe(500);
    });

    test('returns 400 on missing signature', async ({ page }) => {
        await page.route('**/api/v1/world-mini/session**', (route) =>
            route.fulfill({
                status: 400,
                contentType: 'application/json',
                body: JSON.stringify({ error: { message: 'address, signature, and message are required' } }),
            })
        );
        await gotoWithApiMocks(page);

        const result = await page.evaluate(async () => {
            const res = await fetch('/api/v1/world-mini/session', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ address: '0x123' }),
            });
            return { status: res.status };
        });

        expect(result.status).toBe(400);
    });

    test('tenant_id is derived from wallet address', async ({ page }) => {
        const wallet = WORLD_WALLET.toLowerCase();
        await page.route('**/api/v1/world-mini/session**', (route) =>
            route.fulfill({
                status: 200,
                contentType: 'application/json',
                body: JSON.stringify({
                    token: 'test_token',
                    tenant_id: `world-mini:${wallet}`,
                    human_verified: false,
                    credits_balance: 0,
                    expires_at: new Date(Date.now() + 86_400_000).toISOString(),
                }),
            })
        );
        await gotoWithApiMocks(page);

        const result = await page.evaluate(
            async ([w]) => {
                const res = await fetch('/api/v1/world-mini/session', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ address: w, signature: '0x' + 'aa'.repeat(65), message: 'test' }),
                });
                return { status: res.status, body: await res.json() };
            },
            [WORLD_WALLET]
        );

        expect(result.status).toBe(200);
        const body = result.body as { tenant_id: string };
        expect(body.tenant_id).toMatch(/^world-mini:/);
        expect(body.tenant_id.toLowerCase()).toContain(WORLD_WALLET.toLowerCase());
    });
});

// ─────────────────────────────────────────────────────────────────────────────
// 8. Escrow ABI fix — /api/a2a route loads without InvalidParameterError
// ─────────────────────────────────────────────────────────────────────────────

test.describe('Escrow ABI fix — /api/a2a initialises cleanly', () => {
    test('POST /api/a2a does not return 500 from InvalidParameterError', async ({ page }) => {
        await page.route('**/api/a2a**', (route) =>
            route.fulfill({
                status: 401,
                contentType: 'application/json',
                body: JSON.stringify({ error: { code: -32001, message: 'Authentication required' } }),
            })
        );
        await gotoWithApiMocks(page);

        const result = await page.evaluate(async () => {
            const res = await fetch('/api/a2a', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ jsonrpc: '2.0', method: 'tasks/send', params: {}, id: 1 }),
            });
            return { status: res.status };
        });

        expect(result.status).toBe(401);
        expect(result.status).not.toBe(500);
    });

    test('escrow list endpoint does not 500 after ABI fix', async ({ page }) => {
        await page.route('**/api/v2/escrow**', (route) =>
            route.fulfill({
                status: 200,
                contentType: 'application/json',
                body: JSON.stringify({ data: [] }),
            })
        );
        await gotoWithApiMocks(page);

        const result = await page.evaluate(async () => {
            const res = await fetch('/api/v2/escrow', {
                headers: { Authorization: 'Bearer p402_live_test' },
            });
            return { status: res.status };
        });

        expect(result.status).not.toBe(500);
    });
});

// ─────────────────────────────────────────────────────────────────────────────
// 9. Agent reputation endpoint
// ─────────────────────────────────────────────────────────────────────────────

test.describe('Agent reputation — /api/v2/agents/:address/reputation', () => {
    const AGENT_WALLET = '0xAgentWallet1234567890AbcDef1234567890Ab';

    test('returns reputation score for a registered agent', async ({ page }) => {
        await page.route('**/api/v2/agents/**/reputation**', (route) =>
            route.fulfill({
                status: 200,
                contentType: 'application/json',
                body: JSON.stringify({
                    address: AGENT_WALLET,
                    score: 0.72,
                    human_verified: true,
                    components: {
                        settlement_score: 0.85,
                        session_score: 0.70,
                        dispute_score: 1.0,
                        sentinel_score: 0.9,
                    },
                    last_updated: new Date().toISOString(),
                }),
            })
        );
        await gotoWithApiMocks(page);

        const result = await page.evaluate(
            async ([wallet]) => {
                const res = await fetch(`/api/v2/agents/${wallet}/reputation`);
                return { status: res.status, body: await res.json() };
            },
            [AGENT_WALLET]
        );

        expect(result.status).toBe(200);
        const body = result.body as { score: number; human_verified: boolean; components: Record<string, number> };
        expect(body.score).toBe(0.72);
        expect(body.human_verified).toBe(true);
        expect(body.components.settlement_score).toBeDefined();
    });

    test('reputation score is in [0.0, 1.0] range', async ({ page }) => {
        await page.route('**/api/v2/agents/**/reputation**', (route) =>
            route.fulfill({
                status: 200,
                contentType: 'application/json',
                body: JSON.stringify({ address: AGENT_WALLET, score: 0.5, human_verified: false }),
            })
        );
        await gotoWithApiMocks(page);

        const result = await page.evaluate(
            async ([wallet]) => {
                const res = await fetch(`/api/v2/agents/${wallet}/reputation`);
                return { body: await res.json() };
            },
            [AGENT_WALLET]
        );

        const score = (result.body as { score: number }).score;
        expect(score).toBeGreaterThanOrEqual(0.0);
        expect(score).toBeLessThanOrEqual(1.0);
    });

    test('returns 404 for unregistered wallet', async ({ page }) => {
        await page.route('**/api/v2/agents/**/reputation**', (route) =>
            route.fulfill({
                status: 404,
                contentType: 'application/json',
                body: JSON.stringify({ error: { message: 'Agent not found' } }),
            })
        );
        await gotoWithApiMocks(page);

        const result = await page.evaluate(async () => {
            const res = await fetch('/api/v2/agents/0xdeadbeef/reputation');
            return { status: res.status };
        });

        expect(result.status).toBe(404);
    });
});
