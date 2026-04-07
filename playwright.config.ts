import { defineConfig, devices } from '@playwright/test';
import path from 'path';
import { fileURLToPath } from 'url';
import { config as loadDotenv } from 'dotenv';

// Load live test credentials — must come before defineConfig so env vars are
// available when setup files run. Safe to call even if file doesn't exist.
loadDotenv({ path: '.env.test.local', override: true });

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const USER_AUTH_FILE  = path.join(__dirname, 'tests/e2e/live/.auth/user.json');
const ADMIN_AUTH_FILE = path.join(__dirname, 'tests/e2e/live/.auth/admin.json');

export default defineConfig({
    testDir: './tests/e2e',
    timeout: 30000,
    expect: { timeout: 8000 },
    fullyParallel: false,
    forbidOnly: !!process.env.CI,
    retries: process.env.CI ? 1 : 0,
    workers: 1,
    reporter: [['list'], ['html', { open: 'never' }]],

    use: {
        baseURL: 'http://localhost:3000',
        trace: 'on-first-retry',
        screenshot: 'only-on-failure',
    },

    projects: [
        // ── Original mocked test suite (unchanged) ───────────────────────────
        {
            name: 'chromium',
            use: { ...devices['Desktop Chrome'] },
            testMatch: /tests\/e2e\/(?!live\/).*\.spec\.ts/,
        },

        // ── Live E2E: auth setup (runs first, no browser) ────────────────────
        {
            name: 'live-user-setup',
            use: { ...devices['Desktop Chrome'] },
            testMatch: /live\/auth\.setup\.ts/,
        },
        {
            name: 'live-admin-setup',
            use: { ...devices['Desktop Chrome'] },
            testMatch: /live\/admin-auth\.setup\.ts/,
            dependencies: ['live-user-setup'],
        },

        // ── Live E2E: public smoke (no auth needed) ───────────────────────────
        {
            name: 'live-smoke',
            use: { ...devices['Desktop Chrome'] },
            testMatch: /live\/smoke\.spec\.ts/,
            dependencies: ['live-user-setup'],
        },

        // ── Live E2E: API tests (uses user session) ───────────────────────────
        {
            name: 'live-api',
            use: {
                ...devices['Desktop Chrome'],
                storageState: USER_AUTH_FILE,
            },
            testMatch: /live\/api\.spec\.ts/,
            dependencies: ['live-user-setup'],
        },

        // ── Live E2E: dashboard UI (uses user session) ───────────────────────
        {
            name: 'live-dashboard',
            use: {
                ...devices['Desktop Chrome'],
                storageState: USER_AUTH_FILE,
            },
            testMatch: /live\/dashboard\.spec\.ts/,
            dependencies: ['live-user-setup'],
        },

        // ── Live E2E: admin panel (uses admin session) ────────────────────────
        {
            name: 'live-admin',
            use: {
                ...devices['Desktop Chrome'],
                storageState: ADMIN_AUTH_FILE,
            },
            testMatch: /live\/admin\.spec\.ts/,
            dependencies: ['live-admin-setup'],
        },
    ],

    webServer: {
        command: 'npm run dev',
        url: 'http://localhost:3000',
        reuseExistingServer: !process.env.CI,
        timeout: 120000,
        stdout: 'pipe',
        stderr: 'pipe',
    },
});
