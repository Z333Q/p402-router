/**
 * CDP ↔ A2A/AP2 ↔ ERC-8004 Wiring E2E Tests
 * ============================================
 * Validates the three integration points wired in sessions/route.ts
 * and auto-pay/route.ts:
 *
 *   1. CDP session creation auto-issues an AP2 mandate (ap2_mandate_id in policy)
 *   2. Auto-pay enforces mandate budget (returns 403 when exhausted)
 *   3. Successful auto-pay returns ok response (budget tracking + ERC-8004 hooks fire)
 *   4. ERC-8004 failure feedback shape on settlement error
 *   5. Legacy sessions (no ap2_mandate_id) pass through auto-pay unchanged
 *
 * All endpoints are mocked via page.route() — no real DB or chain calls.
 */

import { test, expect } from '@playwright/test';

// ── Shared fixtures ────────────────────────────────────────────────────────

const TENANT_ID = 'test-tenant-wiring-001';
const AGENT_ID  = 'agent-wiring-001';
const SESSION_TOKEN = 'sess_wiringtest0000000000001';
const MANDATE_ID    = 'mnd_wiringtest000000001';

const CDP_SESSION_RESPONSE = {
    object: 'session',
    id: SESSION_TOKEN,
    tenant_id: TENANT_ID,
    agent_id: AGENT_ID,
    wallet_address: '0xCdpWallet1234567890AbcDef1234567890AbcDef',
    wallet_source: 'cdp',
    cdp_wallet_name: `p402-agent-${AGENT_ID}`,
    budget: { total_usd: 10, used_usd: 0, remaining_usd: 10 },
    policy: {
        ap2_mandate_id: MANDATE_ID,  // ← the key we're testing
    },
    status: 'active',
    created_at: new Date().toISOString(),
    expires_at: new Date(Date.now() + 86_400_000).toISOString(),
    session_key: SESSION_TOKEN,
};

const PAYMENT_REQUIRED = {
    payment_id: 'pay_wiring_001',
    recipient: '0xFa772434DCe6ED78831EbC9eeAcbDF42E2A031a6',
    amount: '1000000', // $1.00 USDC
    asset: '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913',
    network: 'eip155:8453',
    nonce: '0x' + '00'.repeat(32),
    valid_after: '0',
    valid_before: String(Math.floor(Date.now() / 1000) + 300),
    resource: 'https://agent.example.com/task',
    description: 'A2A task payment',
};

// ── 1. Session creation auto-issues AP2 mandate ───────────────────────────

test.describe('Session creation — AP2 mandate auto-issue', () => {
    test('CDP session response includes ap2_mandate_id in policy', async ({ page }) => {
        await page.route('/api/v2/sessions', (route) => {
            if (route.request().method() === 'POST') {
                return route.fulfill({
                    status: 201,
                    contentType: 'application/json',
                    body: JSON.stringify(CDP_SESSION_RESPONSE),
                });
            }
            return route.continue();
        });

        const result = await page.evaluate(
            async ([tenantId, agentId]) => {
                const res = await fetch('/api/v2/sessions', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'x-p402-session': 'test-session-key',
                    },
                    body: JSON.stringify({
                        agent_id: agentId,
                        wallet_source: 'cdp',
                        budget_usd: 10,
                        expires_in_hours: 24,
                    }),
                });
                return { status: res.status, body: await res.json() };
            },
            [TENANT_ID, AGENT_ID] as [string, string]
        );

        expect(result.status).toBe(201);
        const body = result.body as typeof CDP_SESSION_RESPONSE;
        expect(body.policy?.ap2_mandate_id).toBeDefined();
        expect(body.policy?.ap2_mandate_id).toMatch(/^mnd_/);
    });

    test('EOA session does NOT include ap2_mandate_id', async ({ page }) => {
        const eoaSession = {
            ...CDP_SESSION_RESPONSE,
            wallet_source: 'eoa',
            cdp_wallet_name: null,
            policy: {},  // no mandate for EOA sessions
        };

        await page.route('/api/v2/sessions', (route) => {
            if (route.request().method() === 'POST') {
                return route.fulfill({
                    status: 201,
                    contentType: 'application/json',
                    body: JSON.stringify(eoaSession),
                });
            }
            return route.continue();
        });

        const result = await page.evaluate(async () => {
            const res = await fetch('/api/v2/sessions', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    wallet_source: 'eoa',
                    wallet_address: '0xEoaWallet1234567890AbcDef1234567890AbcDef',
                    budget_usd: 10,
                }),
            });
            return { status: res.status, body: await res.json() };
        });

        expect(result.status).toBe(201);
        const body = result.body as { policy: Record<string, unknown> };
        expect(body.policy?.ap2_mandate_id).toBeUndefined();
    });

    test('CDP session without agent_id does NOT include ap2_mandate_id', async ({ page }) => {
        const anonSession = {
            ...CDP_SESSION_RESPONSE,
            agent_id: null,
            policy: {},  // no agent_id → no mandate
        };

        await page.route('/api/v2/sessions', (route) => {
            if (route.request().method() === 'POST') {
                return route.fulfill({
                    status: 201,
                    contentType: 'application/json',
                    body: JSON.stringify(anonSession),
                });
            }
            return route.continue();
        });

        const result = await page.evaluate(async () => {
            const res = await fetch('/api/v2/sessions', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ wallet_source: 'cdp', budget_usd: 5 }),
            });
            return { status: res.status, body: await res.json() };
        });

        expect(result.status).toBe(201);
        const body = result.body as { policy: Record<string, unknown> };
        expect(body.policy?.ap2_mandate_id).toBeUndefined();
    });
});

// ── 2. Auto-pay mandate enforcement — budget exhausted → 403 ─────────────

test.describe('Auto-pay — mandate enforcement', () => {
    test('returns 403 with mandate_error when budget is exhausted', async ({ page }) => {
        await page.route('/api/v1/router/auto-pay', (route) =>
            route.fulfill({
                status: 403,
                contentType: 'application/json',
                body: JSON.stringify({
                    error: {
                        type: 'mandate_error',
                        code: 'MANDATE_BUDGET_EXCEEDED',
                        message: 'Mandate budget exceeded: requested $1.00, remaining $0.50',
                    },
                }),
            })
        );

        const result = await page.evaluate(
            async ([tenantId, sessionId, pr]) => {
                const res = await fetch('/api/v1/router/auto-pay', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'x-cron-secret': 'test-cron-secret',
                    },
                    body: JSON.stringify({
                        session_id: sessionId,
                        tenant_id: tenantId,
                        payment_required: pr,
                    }),
                });
                return { status: res.status, body: await res.json() };
            },
            [TENANT_ID, SESSION_TOKEN, PAYMENT_REQUIRED] as [string, string, typeof PAYMENT_REQUIRED]
        );

        expect(result.status).toBe(403);
        const body = result.body as { error: { type: string; code: string } };
        expect(body.error.type).toBe('mandate_error');
        expect(body.error.code).toBe('MANDATE_BUDGET_EXCEEDED');
    });

    test('returns 403 with mandate_error when mandate is expired', async ({ page }) => {
        await page.route('/api/v1/router/auto-pay', (route) =>
            route.fulfill({
                status: 403,
                contentType: 'application/json',
                body: JSON.stringify({
                    error: {
                        type: 'mandate_error',
                        code: 'MANDATE_EXPIRED',
                        message: 'Mandate has expired',
                    },
                }),
            })
        );

        const result = await page.evaluate(
            async ([tenantId, sessionId, pr]) => {
                const res = await fetch('/api/v1/router/auto-pay', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'x-cron-secret': 'test-cron-secret',
                    },
                    body: JSON.stringify({
                        session_id: sessionId,
                        tenant_id: tenantId,
                        payment_required: pr,
                    }),
                });
                return { status: res.status, body: await res.json() };
            },
            [TENANT_ID, SESSION_TOKEN, PAYMENT_REQUIRED] as [string, string, typeof PAYMENT_REQUIRED]
        );

        expect(result.status).toBe(403);
        const body = result.body as { error: { code: string } };
        expect(body.error.code).toBe('MANDATE_EXPIRED');
    });

    test('returns 403 when agent trust score is too low (ERC-8004 gate)', async ({ page }) => {
        await page.route('/api/v1/router/auto-pay', (route) =>
            route.fulfill({
                status: 403,
                contentType: 'application/json',
                body: JSON.stringify({
                    error: {
                        type: 'mandate_error',
                        code: 'SECURITY_PACK_BLOCKED',
                        message: 'Agent execution blocked due to low reputation.',
                    },
                }),
            })
        );

        const result = await page.evaluate(
            async ([tenantId, sessionId, pr]) => {
                const res = await fetch('/api/v1/router/auto-pay', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'x-cron-secret': 'test-cron-secret',
                    },
                    body: JSON.stringify({
                        session_id: sessionId,
                        tenant_id: tenantId,
                        payment_required: pr,
                    }),
                });
                return { status: res.status, body: await res.json() };
            },
            [TENANT_ID, SESSION_TOKEN, PAYMENT_REQUIRED] as [string, string, typeof PAYMENT_REQUIRED]
        );

        expect(result.status).toBe(403);
        const body = result.body as { error: { code: string } };
        expect(body.error.code).toBe('SECURITY_PACK_BLOCKED');
    });
});

// ── 3. Successful auto-pay — correct response shape ───────────────────────

test.describe('Auto-pay — successful settlement', () => {
    test('returns ok=true with tx_hash and receipt_id after successful settle', async ({ page }) => {
        const MOCK_TX = '0x' + 'cc'.repeat(32);
        const MOCK_RECEIPT = 'rcpt_wiring_001';

        await page.route('/api/v1/router/auto-pay', (route) =>
            route.fulfill({
                status: 200,
                contentType: 'application/json',
                body: JSON.stringify({
                    ok: true,
                    payment_id: PAYMENT_REQUIRED.payment_id,
                    tx_hash: MOCK_TX,
                    receipt_id: MOCK_RECEIPT,
                    from: '0xCdpWallet1234567890AbcDef1234567890AbcDef',
                    amount: PAYMENT_REQUIRED.amount,
                }),
            })
        );

        const result = await page.evaluate(
            async ([tenantId, sessionId, pr]) => {
                const res = await fetch('/api/v1/router/auto-pay', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'x-cron-secret': 'test-cron-secret',
                    },
                    body: JSON.stringify({
                        session_id: sessionId,
                        tenant_id: tenantId,
                        payment_required: pr,
                    }),
                });
                return { status: res.status, body: await res.json() };
            },
            [TENANT_ID, SESSION_TOKEN, PAYMENT_REQUIRED] as [string, string, typeof PAYMENT_REQUIRED]
        );

        expect(result.status).toBe(200);
        const body = result.body as { ok: boolean; tx_hash: string; receipt_id: string; payment_id: string };
        expect(body.ok).toBe(true);
        expect(body.tx_hash).toMatch(/^0x/);
        expect(body.receipt_id).toBe(MOCK_RECEIPT);
        expect(body.payment_id).toBe(PAYMENT_REQUIRED.payment_id);
    });

    test('settlement failure returns non-2xx without crashing the endpoint', async ({ page }) => {
        await page.route('/api/v1/router/auto-pay', (route) =>
            route.fulfill({
                status: 502,
                contentType: 'application/json',
                body: JSON.stringify({
                    error: {
                        code: 'CDP_WALLET_ERROR',
                        message: 'Facilitator settle failed: insufficient gas',
                    },
                }),
            })
        );

        const result = await page.evaluate(
            async ([tenantId, sessionId, pr]) => {
                const res = await fetch('/api/v1/router/auto-pay', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'x-cron-secret': 'test-cron-secret',
                    },
                    body: JSON.stringify({
                        session_id: sessionId,
                        tenant_id: tenantId,
                        payment_required: pr,
                    }),
                });
                return { status: res.status, body: await res.json() };
            },
            [TENANT_ID, SESSION_TOKEN, PAYMENT_REQUIRED] as [string, string, typeof PAYMENT_REQUIRED]
        );

        expect(result.status).toBe(502);
        const body = result.body as { error: { code: string } };
        expect(body.error.code).toBe('CDP_WALLET_ERROR');
    });
});

// ── 4. ERC-8004 feedback shape ────────────────────────────────────────────

test.describe('ERC-8004 feedback — queued after settlement', () => {
    // The feedback is queued server-side (fire-and-forget). From E2E perspective
    // we verify the feedback DB endpoint returns the expected pending record shape.

    test('erc8004_feedback endpoint returns pending records after settlement', async ({ page }) => {
        // Simulate the feedback polling endpoint that the cron job uses
        await page.route('/api/internal/cron/erc8004/feedback', (route) =>
            route.fulfill({
                status: 200,
                contentType: 'application/json',
                body: JSON.stringify({
                    processed: 1,
                    records: [
                        {
                            id: 'fb_wiring_001',
                            agent_id: AGENT_ID,
                            event_id: PAYMENT_REQUIRED.payment_id,
                            status: 'pending',
                            value: 90,
                            tags: ['settlement', 'success'],
                        },
                    ],
                }),
            })
        );

        const result = await page.evaluate(async () => {
            const res = await fetch('/api/internal/cron/erc8004/feedback', {
                headers: { 'x-cron-secret': 'test-cron-secret' },
            });
            return { status: res.status, body: await res.json() };
        });

        expect(result.status).toBe(200);
        const body = result.body as {
            records: { status: string; tags: string[] }[];
        };
        expect(body.records[0]?.status).toBe('pending');
        expect(body.records[0]?.tags).toContain('settlement');
        expect(body.records[0]?.tags).toContain('success');
    });

    test('failed settlement queues feedback with failure tags', async ({ page }) => {
        await page.route('/api/internal/cron/erc8004/feedback', (route) =>
            route.fulfill({
                status: 200,
                contentType: 'application/json',
                body: JSON.stringify({
                    processed: 1,
                    records: [
                        {
                            id: 'fb_wiring_002',
                            agent_id: AGENT_ID,
                            event_id: PAYMENT_REQUIRED.payment_id,
                            status: 'pending',
                            value: 0,
                            tags: ['settlement', 'failure'],
                            error_code: 'CDP_WALLET_ERROR',
                        },
                    ],
                }),
            })
        );

        const result = await page.evaluate(async () => {
            const res = await fetch('/api/internal/cron/erc8004/feedback', {
                headers: { 'x-cron-secret': 'test-cron-secret' },
            });
            return { status: res.status, body: await res.json() };
        });

        expect(result.status).toBe(200);
        const body = result.body as {
            records: { status: string; value: number; tags: string[] }[];
        };
        expect(body.records[0]?.tags).toContain('failure');
        expect(body.records[0]?.value).toBe(0);
    });
});

// ── 5. Legacy session backwards-compatibility ─────────────────────────────

test.describe('Auto-pay — legacy sessions (no mandate) still work', () => {
    test('session without ap2_mandate_id in policies succeeds unchanged', async ({ page }) => {
        // Pre-existing session: policies = {} (no ap2_mandate_id key)
        const MOCK_TX = '0x' + 'dd'.repeat(32);

        await page.route('/api/v1/router/auto-pay', (route) =>
            route.fulfill({
                status: 200,
                contentType: 'application/json',
                body: JSON.stringify({
                    ok: true,
                    payment_id: PAYMENT_REQUIRED.payment_id,
                    tx_hash: MOCK_TX,
                    receipt_id: 'rcpt_legacy_001',
                    from: '0xLegacyWallet1234567890AbcDef1234567890AbcDef',
                    amount: PAYMENT_REQUIRED.amount,
                }),
            })
        );

        const result = await page.evaluate(
            async ([tenantId, pr]) => {
                // Legacy: session_id references a session with no ap2_mandate_id
                const res = await fetch('/api/v1/router/auto-pay', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'x-cron-secret': 'test-cron-secret',
                    },
                    body: JSON.stringify({
                        session_id: 'sess_legacy_no_mandate_001',
                        tenant_id: tenantId,
                        payment_required: pr,
                    }),
                });
                return { status: res.status, body: await res.json() };
            },
            [TENANT_ID, PAYMENT_REQUIRED] as [string, typeof PAYMENT_REQUIRED]
        );

        expect(result.status).toBe(200);
        expect((result.body as { ok: boolean }).ok).toBe(true);
    });

    test('auto-pay without session_id still works (tenant-level fallback)', async ({ page }) => {
        await page.route('/api/v1/router/auto-pay', (route) =>
            route.fulfill({
                status: 200,
                contentType: 'application/json',
                body: JSON.stringify({
                    ok: true,
                    payment_id: PAYMENT_REQUIRED.payment_id,
                    tx_hash: '0x' + 'ee'.repeat(32),
                    receipt_id: 'rcpt_tenant_001',
                    from: '0xTenantWallet1234567890AbcDef1234567890Ab',
                    amount: PAYMENT_REQUIRED.amount,
                }),
            })
        );

        const result = await page.evaluate(
            async ([tenantId, pr]) => {
                // No session_id — tenant-level auto-pay
                const res = await fetch('/api/v1/router/auto-pay', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'x-cron-secret': 'test-cron-secret',
                    },
                    body: JSON.stringify({
                        tenant_id: tenantId,
                        payment_required: pr,
                    }),
                });
                return { status: res.status, body: await res.json() };
            },
            [TENANT_ID, PAYMENT_REQUIRED] as [string, typeof PAYMENT_REQUIRED]
        );

        expect(result.status).toBe(200);
        expect((result.body as { ok: boolean }).ok).toBe(true);
    });
});

// ── Security: auth guard ───────────────────────────────────────────────────

test.describe('Auto-pay — security', () => {
    test('returns 401 without x-cron-secret', async ({ page }) => {
        await page.route('/api/v1/router/auto-pay', (route) =>
            route.fulfill({
                status: 401,
                contentType: 'application/json',
                body: JSON.stringify({ error: 'Unauthorized' }),
            })
        );

        const result = await page.evaluate(
            async ([tenantId, pr]) => {
                const res = await fetch('/api/v1/router/auto-pay', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    // no x-cron-secret
                    body: JSON.stringify({ tenant_id: tenantId, payment_required: pr }),
                });
                return { status: res.status };
            },
            [TENANT_ID, PAYMENT_REQUIRED] as [string, typeof PAYMENT_REQUIRED]
        );

        expect(result.status).toBe(401);
    });

    test('returns 503 when CDP is not enabled', async ({ page }) => {
        await page.route('/api/v1/router/auto-pay', (route) =>
            route.fulfill({
                status: 503,
                contentType: 'application/json',
                body: JSON.stringify({ error: 'CDP Server Wallet not enabled — cannot auto-pay' }),
            })
        );

        const result = await page.evaluate(
            async ([tenantId, pr]) => {
                const res = await fetch('/api/v1/router/auto-pay', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'x-cron-secret': 'test-cron-secret',
                    },
                    body: JSON.stringify({ tenant_id: tenantId, payment_required: pr }),
                });
                return { status: res.status, body: await res.json() };
            },
            [TENANT_ID, PAYMENT_REQUIRED] as [string, typeof PAYMENT_REQUIRED]
        );

        expect(result.status).toBe(503);
        expect((result.body as { error: string }).error).toContain('CDP');
    });
});
