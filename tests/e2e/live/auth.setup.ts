/**
 * Live auth setup — provisions a real test tenant and a real NextAuth session.
 *
 * Uses the CDP wallet credentials provider with a known test private key.
 * viem signs the message cryptographically — this is a real ECDSA signature,
 * not a mock. The resulting session cookie is stored to .auth/user.json and
 * reused by all live dashboard tests.
 *
 * Required env vars (in .env.test.local):
 *   E2E_WALLET_PRIVATE_KEY   — 0x-prefixed private key (never production funds)
 *
 * The test tenant is auto-provisioned by NextAuth's signIn callback on first run.
 */

import { test as setup, expect } from '@playwright/test';
import { privateKeyToAccount } from 'viem/accounts';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
export const USER_AUTH_FILE = path.join(__dirname, '.auth/user.json');

setup('authenticate as test user via CDP wallet', async ({ request }) => {
    const privateKey = process.env.E2E_WALLET_PRIVATE_KEY;
    if (!privateKey) throw new Error('E2E_WALLET_PRIVATE_KEY is not set in .env.test.local');

    const account = privateKeyToAccount(privateKey as `0x${string}`);

    // 1. Fetch CSRF token — NextAuth requires it for credentials POST
    const csrfRes = await request.get('/api/auth/csrf');
    expect(csrfRes.ok()).toBeTruthy();
    const { csrfToken } = await csrfRes.json();

    // 2. Build the exact message format the CDP wallet provider validates
    const ts = Math.floor(Date.now() / 1000);
    const message = `Sign in to P402\nAddress: ${account.address}\nTimestamp: ${ts}`;

    // 3. Sign with real ECDSA — this is a genuine on-curve signature
    const signature = await account.signMessage({ message });

    // 4. POST to NextAuth credentials callback (form-encoded, same as browser would)
    const signInRes = await request.post('/api/auth/callback/credentials', {
        form: {
            csrfToken,
            id: 'cdp-wallet',
            address: account.address,
            signature,
            message,
            callbackUrl: 'http://localhost:3000/dashboard',
            json: 'true',
        },
    });

    // NextAuth returns 200 or 302 on success
    expect([200, 302]).toContain(signInRes.status());

    // 5. Verify we can reach /api/auth/session and it has a tenantId
    const sessionRes = await request.get('/api/auth/session');
    const session = await sessionRes.json();
    expect(session?.user?.tenantId).toBeTruthy();

    // 6. Save auth state — all live dashboard tests reuse this
    await request.storageState({ path: USER_AUTH_FILE });

    console.log(`[live-auth] Authenticated as ${account.address.slice(0, 10)}… tenantId=${session.user.tenantId}`);
});
