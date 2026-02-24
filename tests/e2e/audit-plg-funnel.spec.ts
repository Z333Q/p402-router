import { test, expect } from '@playwright/test';

test.describe('Audit PLG Funnel & SSE Streams', () => {
    test('User runs audit, sees real-time SSE update, and hits Upgrade Gate', async ({ page }) => {
        // 1. Mock the SSE endpoint to instantly return a success payload
        await page.route('**/api/v1/audit/stream*', async (route) => {
            const encoder = new TextEncoder();
            const mockPayload = {
                type: 'AUDIT_SUCCESS',
                data: {
                    overall_score: { score: 72, grade: 'C' },
                    top_findings: [{ severity: 'critical', title: 'Missing Retries' }]
                }
            };

            const stream = new ReadableStream({
                start(controller) {
                    controller.enqueue(encoder.encode(`data: ${JSON.stringify(mockPayload)}\n\n`));
                    controller.close();
                }
            });

            await route.fulfill({
                headers: { 'Content-Type': 'text/event-stream' },
                body: stream, // Playwright handles ReadableStreams natively
            });
        });

        await page.goto('/dashboard/playground');

        // 2. Trigger the React 19 Server Action
        await page.click('button:has-text("Run Setup Audit")');

        // 3. Verify TanStack Query hydrated the UI from the SSE stream instantly
        await expect(page.locator('.text-5xl')).toContainText('72');
        await expect(page.locator('text=Missing Retries')).toBeVisible();

        // 4. Verify the Neo-Brutalist Gate Banner
        await expect(page.locator('text=Scheduled Audits Preview')).toBeVisible();
        await expect(page.locator('a:has-text("Upgrade Plan")')).toBeVisible();
    });
});
