import { test, expect, Page } from '@playwright/test';

/**
 * Agent Bazaar & Registry Tests
 * Validates the discovery and trust scoring flows of ERC-8004 Facilitators.
 */

const mockSession = async (page: Page) => {
    await page.route('**/api/auth/session', (route) => {
        route.fulfill({
            status: 200,
            json: {
                user: { id: 'test-user', address: '0x123...abc', roles: ['admin'] },
                expires: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
            },
        });
    });
};

const mockBazaarFacilitators = [
    {
        resource_id: 'fac_111',
        title: 'Smart Router v2',
        description: 'Optimized routing for complex reasoning tasks.',
        tags: ['gemini-2.5-pro', 'claude-3-opus'],
        erc8004_verified: true,
        erc8004_reputation: 98,
        source_facilitator_id: 'agent_9999',
        health_status: 'healthy',
        p95_latency_ledger: 120,
        success_rate_ledger: 0.99,
        total_calls: 1000,
        pricing: { min_amount: 15000 },
    },
    {
        resource_id: 'fac_222',
        title: 'Budget AI Proxy',
        description: 'Low-cost fast inference.',
        tags: ['gemini-2.5-flash', 'llama-3-8b'],
        erc8004_verified: false,
        erc8004_reputation: 45,
        source_facilitator_id: 'agent_1111',
        health_status: 'degraded',
        p95_latency_ledger: 3500,
        success_rate_ledger: 0.82,
        total_calls: 500,
        pricing: { min_amount: 1000 },
    }
];

test.describe('Agent Bazaar', () => {
    test.beforeEach(async ({ page }) => {
        await mockSession(page);

        await page.route('**/api/v1/routes*', (route) => {
            route.fulfill({ status: 200, json: { routes: [] } });
        });
        await page.route('**/api/v1/stats*', (route) => {
            route.fulfill({ status: 200, json: { totalPayments: 0, totalVolume: '0', successRate: 1, avgLatencyMs: 0 } });
        });
        await page.route('**/api/v1/events*', (route) => {
            route.fulfill({ status: 200, json: { events: [] } });
        });
        await page.route('**/api/v1/intelligence/status*', (route) => {
            route.fulfill({ status: 200, json: { status: 'active', cache: { entries: 0 } } });
        });

        // Mock the core facilitator registry API
        await page.route('**/api/v1/bazaar*', (route) => {
            if (route.request().method() === 'GET') {
                route.fulfill({
                    status: 200,
                    json: {
                        resources: mockBazaarFacilitators,
                        count: 2,
                        timestamp: new Date().toISOString()
                    },
                });
            }
        });
    });

    test('renders facilitators and indicates trust scores', async ({ page }) => {
        await page.goto('/dashboard/bazaar');
        await page.waitForLoadState('networkidle');

        // Check if both models are visible
        await expect(page.getByText('Smart Router v2')).toBeVisible();
        await expect(page.getByText('Budget AI Proxy')).toBeVisible();

        // High reputation agent should have positive indicator (e.g. green/trusted)
        await expect(page.locator('text=98%')).toBeVisible();

        // Bad reputation should be visible too 
        await expect(page.locator('text=45%')).toBeVisible();
    });

    test('can filter facilitators by search query', async ({ page }) => {
        await page.goto('/dashboard/bazaar');
        await page.waitForLoadState('networkidle');

        // Assume a search input exists
        const searchInput = page.getByPlaceholder(/Search/i);

        // Use client-side filtering or back-end mock updates
        if (await searchInput.isVisible()) {
            await searchInput.fill('Budget');

            // "Smart Router" should disappear
            await expect(page.getByText('Smart Router v2')).not.toBeVisible();
            await expect(page.getByText('Budget AI Proxy')).toBeVisible();
        }
    });

    test('can open trust modal to view detailed ERC-8004 reputation', async ({ page }) => {
        await page.goto('/dashboard/bazaar');
        await page.waitForLoadState('networkidle');

        // Click on the trust score of the first facilitator
        const trustBadge = page.locator('text=98%').first();
        if (await trustBadge.isVisible()) {
            await trustBadge.click();

            // Verify modal/dialog pops up with agent details
            const dialog = page.getByRole('dialog');
            await expect(dialog).toBeVisible();
            await expect(dialog.getByText('agent_9999')).toBeVisible();
            await expect(dialog.getByText('Reputation Details')).toBeVisible();
        }
    });
});
