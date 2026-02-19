import type { Page } from '@playwright/test';

/**
 * Mock NextAuth session by intercepting /api/auth/session.
 * Call this before page.goto() so the intercept is registered first.
 */
export async function mockSession(page: Page, tenantId = 'test-tenant-001') {
    await page.route('/api/auth/session', (route) =>
        route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify({
                user: {
                    name: 'Test User',
                    email: 'test@example.com',
                    tenantId,
                    role: 'user',
                },
                expires: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
            }),
        })
    );
}

/**
 * Mock an API endpoint with a JSON response.
 */
export async function mockApi(
    page: Page,
    urlPattern: string | RegExp,
    body: unknown,
    status = 200
) {
    await page.route(urlPattern, (route) =>
        route.fulfill({
            status,
            contentType: 'application/json',
            body: JSON.stringify(body),
        })
    );
}

/**
 * Mock an API endpoint to return a 500 error.
 */
export async function mockApiError(
    page: Page,
    urlPattern: string | RegExp,
    message = 'Internal Server Error'
) {
    await page.route(urlPattern, (route) =>
        route.fulfill({
            status: 500,
            contentType: 'application/json',
            body: JSON.stringify({ error: message }),
        })
    );
}

/**
 * Collect all browser console errors during a page visit.
 */
export function collectConsoleErrors(page: Page): string[] {
    const errors: string[] = [];
    page.on('console', (msg) => {
        if (msg.type() === 'error') {
            errors.push(msg.text());
        }
    });
    page.on('pageerror', (err) => {
        errors.push(err.message);
    });
    return errors;
}
