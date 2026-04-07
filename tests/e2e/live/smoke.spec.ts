/**
 * Live smoke tests — public pages that require no authentication.
 * Zero mocking. Every request hits the real server.
 */

import { test, expect } from '@playwright/test';

test.describe('Public pages render correctly', () => {
    test('landing page loads', async ({ page }) => {
        const res = await page.goto('/');
        expect(res?.status()).toBe(200);
        await expect(page).not.toHaveTitle(/Error/);
        // No JS crashes
        const errors: string[] = [];
        page.on('pageerror', e => errors.push(e.message));
        await page.waitForTimeout(1000);
        expect(errors).toHaveLength(0);
    });

    test('health endpoint returns healthy', async ({ request }) => {
        const res = await request.get('/api/health');
        expect(res.ok()).toBeTruthy();
        const body = await res.json();
        expect(body.status).toMatch(/ok|healthy/i);
    });

    test('OpenAPI spec is reachable and valid JSON', async ({ request }) => {
        const res = await request.get('/api/openapi.json');
        expect(res.ok()).toBeTruthy();
        const spec = await res.json();
        expect(spec.openapi ?? spec.swagger).toBeTruthy();
    });

    test('agent card is served at well-known URL', async ({ request }) => {
        const res = await request.get('/.well-known/agent.json');
        expect(res.ok()).toBeTruthy();
        const card = await res.json();
        expect(card.name).toBeTruthy();
        expect(card.url).toBeTruthy();
    });

    test('llms.txt is reachable', async ({ request }) => {
        const res = await request.get('/llms.txt');
        expect(res.ok()).toBeTruthy();
        const text = await res.text();
        expect(text.length).toBeGreaterThan(0);
    });

    test('login page renders', async ({ page }) => {
        const res = await page.goto('/login');
        expect(res?.status()).toBe(200);
        await expect(page).not.toHaveTitle(/Error/);
    });

    test('changelog page renders', async ({ page }) => {
        const res = await page.goto('/changelog');
        expect(res?.status()).toBe(200);
    });

    test('docs pages render', async ({ page }) => {
        for (const path of ['/docs/api', '/docs/a2a', '/docs/router']) {
            const res = await page.goto(path);
            expect(res?.status(), `${path} should return 200`).toBe(200);
        }
    });

    test('unauthenticated /dashboard redirects to login', async ({ page }) => {
        await page.goto('/dashboard');
        // Should redirect — not stay on /dashboard
        await expect(page).not.toHaveURL(/\/dashboard$/);
    });

    test('unauthenticated admin redirect works', async ({ page }) => {
        await page.goto('/admin/overview');
        // Should redirect to /admin/login
        await expect(page).toHaveURL(/\/admin\/login/);
    });
});

test.describe('A2A agents list endpoint', () => {
    test('returns valid response', async ({ request }) => {
        const res = await request.get('/api/a2a/agents');
        expect(res.ok()).toBeTruthy();
        const body = await res.json();
        // Could be empty array or object — just must not 500
        expect(body).toBeDefined();
    });
});

test.describe('Model catalog (no auth required check)', () => {
    test('GET /api/v2/models returns model list or 401', async ({ request }) => {
        const res = await request.get('/api/v2/models');
        // Either authenticated and returns models, or 401 — but not 500
        expect([200, 401]).toContain(res.status());
    });
});
