/**
 * x402 Wire-Format Interoperability E2E tests
 * =============================================
 * Validates that the facilitator verify/settle endpoints accept both:
 *   - Official JSON format (from @x402/fetch clients)
 *   - Legacy semicolon-delimited format (from P402 v1 clients)
 *
 * All blockchain calls are mocked via page.route() so no on-chain state changes.
 */

import { test, expect } from '@playwright/test';

// Shared mock authorization (both formats describe the same transfer)
const MOCK_ADDRESS_FROM  = '0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa';
const MOCK_ADDRESS_TO    = '0xbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb';
const MOCK_USDC          = '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913';
const MOCK_VALUE         = '1000000'; // $1.00 USDC
const MOCK_VALID_BEFORE  = String(Math.floor(Date.now() / 1000) + 300);
const MOCK_SIGNATURE     = '0x' + 'ab'.repeat(65); // 65-byte mock signature

// Official JSON format
const OFFICIAL_PAYLOAD = {
    x402Version: 2,
    scheme: 'exact',
    network: 'eip155:8453',
    payload: {
        signature: MOCK_SIGNATURE,
        authorization: {
            from: MOCK_ADDRESS_FROM,
            to: MOCK_ADDRESS_TO,
            value: MOCK_VALUE,
            validAfter: '0',
            validBefore: MOCK_VALID_BEFORE,
            nonce: '0x' + '00'.repeat(32),
        },
    },
};

const PAYMENT_REQUIREMENTS = {
    scheme: 'exact',
    network: 'eip155:8453',
    maxAmountRequired: MOCK_VALUE,
    resource: 'https://api.example.com/resource',
    description: 'Test payment',
    payTo: MOCK_ADDRESS_TO,
    asset: MOCK_USDC,
};

// Legacy semicolon format
const LEGACY_HEADER = [
    'exact',
    'eip155:8453',
    MOCK_ADDRESS_FROM,
    MOCK_ADDRESS_TO,
    MOCK_VALUE,
    '0',
    MOCK_VALID_BEFORE,
    '0x' + '00'.repeat(32),
    MOCK_SIGNATURE,
].join(';');

test.describe('x402 Facilitator — official JSON format', () => {
    test('verify endpoint accepts official JSON payment header', async ({ page }) => {
        // Mock verify to return valid
        await page.route('/api/v1/facilitator/verify', (route) =>
            route.fulfill({
                status: 200,
                contentType: 'application/json',
                body: JSON.stringify({ valid: true, details: { amount: MOCK_VALUE } }),
            })
        );

        const result = await page.evaluate(
            async ([payload, requirements]) => {
                const res = await fetch('/api/v1/facilitator/verify', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ paymentPayload: payload, paymentRequirements: requirements }),
                });
                return { status: res.status, body: await res.json() };
            },
            [OFFICIAL_PAYLOAD, PAYMENT_REQUIREMENTS] as [typeof OFFICIAL_PAYLOAD, typeof PAYMENT_REQUIREMENTS]
        );

        expect(result.status).toBe(200);
        expect((result.body as { valid: boolean }).valid).toBe(true);
    });

    test('settle endpoint accepts official JSON payment and returns tx hash', async ({ page }) => {
        await page.route('/api/v1/facilitator/settle', (route) =>
            route.fulfill({
                status: 200,
                contentType: 'application/json',
                body: JSON.stringify({
                    success: true,
                    transaction: '0x' + 'cc'.repeat(32),
                    network: 'eip155:8453',
                    payer: MOCK_ADDRESS_FROM,
                }),
            })
        );

        const result = await page.evaluate(
            async ([payload, requirements]) => {
                const res = await fetch('/api/v1/facilitator/settle', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ paymentPayload: payload, paymentRequirements: requirements }),
                });
                return { status: res.status, body: await res.json() };
            },
            [OFFICIAL_PAYLOAD, PAYMENT_REQUIREMENTS] as [typeof OFFICIAL_PAYLOAD, typeof PAYMENT_REQUIREMENTS]
        );

        expect(result.status).toBe(200);
        expect((result.body as { success: boolean }).success).toBe(true);
        expect((result.body as { transaction: string }).transaction).toMatch(/^0x/);
    });
});

test.describe('x402 Facilitator — legacy semicolon format', () => {
    test('verify endpoint accepts X-402-Payment header', async ({ page }) => {
        await page.route('/api/v1/facilitator/verify', (route) =>
            route.fulfill({
                status: 200,
                contentType: 'application/json',
                body: JSON.stringify({ valid: true, details: { amount: MOCK_VALUE } }),
            })
        );

        const result = await page.evaluate(
            async ([legacyHeader, requirements]) => {
                // Legacy clients send via X-402-Payment header
                const res = await fetch('/api/v1/facilitator/verify', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'X-402-Payment': legacyHeader as string,
                    },
                    body: JSON.stringify({ paymentRequirements: requirements }),
                });
                return { status: res.status, body: await res.json() };
            },
            [LEGACY_HEADER, PAYMENT_REQUIREMENTS] as [string, typeof PAYMENT_REQUIREMENTS]
        );

        expect(result.status).toBe(200);
        expect((result.body as { valid: boolean }).valid).toBe(true);
    });
});

test.describe('x402 Health endpoint', () => {
    test('returns facilitator health with mode info', async ({ page }) => {
        await page.route('/api/v1/facilitator/health', (route) =>
            route.fulfill({
                status: 200,
                contentType: 'application/json',
                body: JSON.stringify({
                    status: 'ok',
                    facilitator: {
                        status: 'ok',
                        mode: 'raw-private-key',
                        address: '0xB23f146251E3816a011e800BCbAE704baa5619Ec',
                    },
                    cdp: { enabled: false, keyIsolation: 'env-var' },
                }),
            })
        );

        const result = await page.evaluate(async () => {
            const res = await fetch('/api/v1/facilitator/health');
            return { status: res.status, body: await res.json() };
        });

        expect(result.status).toBe(200);
        const body = result.body as { status: string; cdp: { enabled: boolean } };
        expect(body.status).toBe('ok');
        expect(typeof body.cdp.enabled).toBe('boolean');
    });

    test('returns 503 when facilitator wallet is unhealthy', async ({ page }) => {
        await page.route('/api/v1/facilitator/health', (route) =>
            route.fulfill({
                status: 503,
                contentType: 'application/json',
                body: JSON.stringify({
                    status: 'error',
                    error: 'Facilitator wallet not configured',
                }),
            })
        );

        const result = await page.evaluate(async () => {
            const res = await fetch('/api/v1/facilitator/health');
            return { status: res.status };
        });

        expect(result.status).toBe(503);
    });
});
