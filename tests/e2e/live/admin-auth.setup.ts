/**
 * Live admin auth setup — logs in to the admin panel with real credentials.
 *
 * Required env vars (in .env.test.local):
 *   E2E_ADMIN_EMAIL     — must be in ADMIN_EMAILS env var on the server
 *   E2E_ADMIN_PASSWORD  — set via: npx tsx scripts/set-admin-password.ts
 *
 * The admin session cookie is stored to .auth/admin.json and reused by
 * all live admin tests.
 */

import { test as setup, expect } from '@playwright/test';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
export const ADMIN_AUTH_FILE = path.join(__dirname, '.auth/admin.json');

setup('authenticate as admin', async ({ request }) => {
    const email    = process.env.E2E_ADMIN_EMAIL;
    const password = process.env.E2E_ADMIN_PASSWORD;
    if (!email || !password) {
        throw new Error('E2E_ADMIN_EMAIL and E2E_ADMIN_PASSWORD must be set in .env.test.local');
    }

    const res = await request.post('/api/admin/auth', {
        data: { email, password },
    });

    if (!res.ok()) {
        const body = await res.json().catch(() => ({}));
        throw new Error(`Admin login failed (${res.status()}): ${JSON.stringify(body)}`);
    }

    const body = await res.json();
    expect(body.ok).toBe(true);
    expect(body.admin?.email).toBe(email);

    // Save cookie state for admin tests
    await request.storageState({ path: ADMIN_AUTH_FILE });

    console.log(`[live-admin-auth] Logged in as ${body.admin.email} (role: ${body.admin.role})`);
});
