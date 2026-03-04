/**
 * CDP Embedded Wallet E2E tests
 * ==============================
 * Tests the CDP email OTP login flow end-to-end without making real CDP API
 * calls. Validates:
 *   - Login page shows CDP email form as primary
 *   - Google OAuth and RainbowKit are present as secondary options
 *   - Email step → OTP step transition
 *   - Invalid OTP shows error
 *   - Successful OTP redirects to /dashboard
 */

import { test, expect } from '@playwright/test';
import {
    mockCdpSendOtp,
    mockCdpVerifyOtp,
    mockCdpWalletAuth,
} from './helpers/cdp-mock';
import { mockSession, mockApi, collectConsoleErrors } from './helpers/mock-session';

test.describe('Login page — CDP Embedded Wallet', () => {
    test('shows CDP email form as primary auth method', async ({ page }) => {
        await page.goto('/login');

        // CDP email section should be the first/most prominent
        const emailInput = page.locator('input[type="email"]');
        await expect(emailInput).toBeVisible();

        // "Recommended" badge should be visible
        await expect(page.getByText('Recommended')).toBeVisible();

        // Email label
        await expect(page.getByText('Email address', { exact: false })).toBeVisible();
    });

    test('shows Google and RainbowKit as secondary options', async ({ page }) => {
        await page.goto('/login');

        // Google button
        await expect(page.getByRole('button', { name: /continue with google/i })).toBeVisible();

        // RainbowKit "Connect Wallet" (lazy-loaded, may show loading state)
        await expect(
            page.getByText(/connect wallet|use existing wallet/i)
        ).toBeVisible({ timeout: 5000 });
    });

    test('sends OTP and transitions to code entry step', async ({ page }) => {
        await mockCdpSendOtp(page);

        await page.goto('/login');

        // Enter email
        await page.locator('input[type="email"]').fill('test@example.com');

        // Click Continue
        await page.getByRole('button', { name: /continue with email/i }).click();

        // Should show OTP input after successful send
        await expect(page.locator('input[inputmode="numeric"]')).toBeVisible({ timeout: 5000 });
        await expect(page.getByText(/code sent to/i)).toBeVisible();
        await expect(page.getByText('test@example.com')).toBeVisible();
    });

    test('validates email format before sending OTP', async ({ page }) => {
        await page.goto('/login');

        // Enter invalid email
        await page.locator('input[type="email"]').fill('notanemail');
        await page.getByRole('button', { name: /continue with email/i }).click();

        // Should show validation error, not transition to OTP step
        await expect(page.getByText(/valid email/i)).toBeVisible();
        await expect(page.locator('input[inputmode="numeric"]')).not.toBeVisible();
    });

    test('shows error for invalid OTP code', async ({ page }) => {
        await mockCdpSendOtp(page);
        await mockCdpVerifyOtp(page, { shouldFail: true });

        await page.goto('/login');

        await page.locator('input[type="email"]').fill('test@example.com');
        await page.getByRole('button', { name: /continue with email/i }).click();

        // Wait for OTP step
        await page.locator('input[inputmode="numeric"]').waitFor({ timeout: 5000 });

        // Enter a 6-digit OTP
        await page.locator('input[inputmode="numeric"]').fill('000000');
        await page.getByRole('button', { name: /verify code/i }).click();

        // Should show error
        await expect(page.getByText(/invalid|expired/i)).toBeVisible({ timeout: 5000 });
    });

    test('successful OTP redirects to dashboard', async ({ page }) => {
        await mockCdpSendOtp(page);
        await mockCdpVerifyOtp(page);
        await mockCdpWalletAuth(page);

        // Mock dashboard session + APIs
        await mockSession(page, 'test-tenant-cdp');
        await mockApi(page, '/api/v2/sessions', { sessions: [] });
        await mockApi(page, '/api/v1/routes', { routes: [] });

        await page.goto('/login');

        await page.locator('input[type="email"]').fill('test@example.com');
        await page.getByRole('button', { name: /continue with email/i }).click();

        await page.locator('input[inputmode="numeric"]').waitFor({ timeout: 5000 });
        await page.locator('input[inputmode="numeric"]').fill('123456');
        await page.getByRole('button', { name: /verify code/i }).click();

        // Should show connecting spinner then redirect
        // (In mock mode, redirect happens after onSuccess callback fires)
        await expect(page).toHaveURL(/\/dashboard/, { timeout: 5000 });
    });

    test('change email button resets to email step', async ({ page }) => {
        await mockCdpSendOtp(page);

        await page.goto('/login');

        await page.locator('input[type="email"]').fill('test@example.com');
        await page.getByRole('button', { name: /continue with email/i }).click();

        await page.locator('input[inputmode="numeric"]').waitFor({ timeout: 5000 });

        // Click "Change email"
        await page.getByRole('button', { name: /change email/i }).click();

        // Should be back to email step
        await expect(page.locator('input[type="email"]')).toBeVisible();
        await expect(page.locator('input[inputmode="numeric"]')).not.toBeVisible();
    });

    test('no console errors on login page load', async ({ page }) => {
        const errors = collectConsoleErrors(page);
        await page.goto('/login');

        // Give time for async components to settle
        await page.waitForTimeout(1000);

        const fatalErrors = errors.filter(
            e => !e.includes('Warning:') && !e.includes('CDP') && !e.includes('wagmi')
        );
        expect(fatalErrors).toHaveLength(0);
    });
});
