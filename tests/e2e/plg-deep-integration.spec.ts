import { test, expect } from '@playwright/test';
import { mockSession, mockApi } from './helpers/mock-session';

test.slow(); // Increase timeout for slow dev server compilation

const MOCK_ANALYTICS = {
    summary: {
        total_requests: 1250,
        total_cost_usd: 12.50,
        avg_cost_per_request: 0.01,
        projected_monthly_cost: 375.00
    },
    by_provider: [],
    by_task: [],
    period: { days: 30, start: '2026-01-23', end: '2026-02-22' }
};

const MOCK_RECOMMENDATIONS = {
    summary: {
        total_recommendations: 0,
        high_priority: 0,
        total_potential_savings_usd: 0,
        average_confidence: 0
    },
    recommendations: []
};

const MOCK_PROVIDERS = {
    data: [],
    meta: {
        total_providers: 0,
        total_models: 0,
        models_by_tier: {}
    }
};

const EMPTY_DATA = { events: [], routes: [], resources: [], count: 0, policies: [], sessions: [], identities: [], entries: [], transactions: [] };

async function setupCommonMocks(page: any) {
    // V1 API Mocks
    await mockApi(page, '**/api/v1/events**', EMPTY_DATA);
    await mockApi(page, '**/api/v1/routes**', EMPTY_DATA);
    await mockApi(page, '**/api/v1/facilitators**', []);
    await mockApi(page, '**/api/v1/bazaar**', EMPTY_DATA);
    await mockApi(page, '**/api/v1/policies**', EMPTY_DATA);
    await mockApi(page, '**/api/v1/intelligence/status**', { status: 'active' });
    await mockApi(page, '**/api/v1/stats**', { totalPayments: 0 });
    await mockApi(page, '**/api/v1/trust**', EMPTY_DATA);
    await mockApi(page, '**/api/v1/audit**', EMPTY_DATA);
    await mockApi(page, '**/api/v1/erc8004**', { registered: false });
    await mockApi(page, '**/api/v1/settings**', { api_keys: [], webhook_url: '', webhook_secret: '' });
    await mockApi(page, '**/api/v1/admin/quarantine**', { incidents: [] });

    // V2 API Mocks
    await mockApi(page, '**/api/v2/billing/usage', { planId: 'pro', maxSpendUsd: 5000, currentUsageUsd: 0, usagePercent: 0 });
    await mockApi(page, '**/api/v2/cache/stats**', { entries: 0, hitRate: 0 });
    await mockApi(page, '**/api/v2/providers**', MOCK_PROVIDERS);
    await mockApi(page, '**/api/v2/analytics/spend**', MOCK_ANALYTICS);
    await mockApi(page, '**/api/v2/analytics/recommendations**', MOCK_RECOMMENDATIONS);
    await mockApi(page, '**/api/v2/analytics/cost-comparison**', { comparisons: [] });
    await mockApi(page, '**/api/v2/sessions**', EMPTY_DATA);
    await mockApi(page, '**/api/v2/safety/status**', { status: 'secure' });
    await mockApi(page, '**/api/v2/trust/overview**', { score: 100 });
}

test.describe('PLG Integration Funnels', () => {

    test('Acquisition: Navigation and Landing Page Pricing Strip', async ({ page }) => {
        // Logged out state
        await mockApi(page, '/api/auth/session', {});

        await page.goto('/');
        await page.waitForLoadState('domcontentloaded');

        // 1. Verify TopNav has Pricing and Intelligence
        const navPricing = page.locator('nav >> text=Pricing').first();
        await expect(navPricing).toBeVisible();
        const navIntelligence = page.locator('nav >> text=Intelligence').first();
        await expect(navIntelligence).toBeVisible();

        // 2. Verify Pricing Strip exists on landing page
        const pricingStrip = page.locator('text=Transparent Economics');
        await expect(pricingStrip).toBeVisible();
        await expect(page.locator('text=Free Tier').first()).toBeVisible();
        await expect(page.locator('text=Pro Tier').first()).toBeVisible();
    });

    test('Conversion: Sidebar Upgrade Button for Free Users', async ({ page }) => {
        await setupCommonMocks(page);
        await mockSession(page);
        await mockApi(page, '**/api/v2/billing/usage', {
            planId: 'free',
            maxSpendUsd: 5.00,
            currentUsageUsd: 1.00,
            usagePercent: 20
        });

        await page.goto('/dashboard');
        // Wait for hydration and dashboard to render (avoiding the common error overlay)
        await page.waitForSelector('text=Mission Control', { timeout: 30000 });

        // 1. Verify Sidebar has Billing & Plans
        await expect(page.locator('text=Billing & Plans')).toBeVisible();

        // 2. Verify Upgrade to Pro button exists for Free user
        const upgradeBtn = page.locator('text=Upgrade to Pro');
        await expect(upgradeBtn).toBeVisible();
        await expect(upgradeBtn).toHaveAttribute('href', '/pricing');
    });

    test('Gating: Webhook Manager Intercept for Free Users', async ({ page }) => {
        await setupCommonMocks(page);
        await mockSession(page);
        await mockApi(page, '**/api/v2/billing/usage', {
            planId: 'free',
            maxSpendUsd: 5.00,
            currentUsageUsd: 1.00,
            usagePercent: 20
        });

        await page.goto('/dashboard/settings');
        await page.waitForLoadState('networkidle');

        // 1. Verify Webhook Manager is visible
        await expect(page.locator('text=Webhook Configuration')).toBeVisible();

        // 2. Verify intercept overlay
        await expect(page.locator('text=Webhooks require Pro')).toBeVisible();

        // 3. Verify input is disabled
        const webhookInput = page.locator('input[name="webhookUrl"]');
        await expect(webhookInput).toBeDisabled();
    });

    test('Retention: Spend Overview 80% Usage Warning', async ({ page }) => {
        await setupCommonMocks(page);
        await mockSession(page);
        // Mock high usage (90%)
        await mockApi(page, '**/api/v2/billing/usage', {
            planId: 'pro',
            maxSpendUsd: 1000.00,
            currentUsageUsd: 900.00,
            usagePercent: 90
        });

        await page.goto('/dashboard');
        await page.waitForSelector('text=Mission Control', { timeout: 30000 });

        // 1. Verify warning banner in Spend Overview
        const warning = page.locator('text=Approaching Plan Limit (90.0%)');
        await expect(warning).toBeVisible({ timeout: 15000 });
        await expect(page.locator('text=Upgrade Plan')).toBeVisible();
    });

    test('Activation: [PRO TIER] Badges in Documentation', async ({ page }) => {
        await page.goto('/docs');
        await page.waitForLoadState('domcontentloaded');

        // 1. Verify Pro Tier badges exist
        const badges = page.locator('text=PRO TIER');
        await expect(badges).toHaveCount(2); // Intelligence Layer and Trustless Agents
    });
});
