/**
 * V5 §17 checkout-dispatch contract.
 *
 * Pins:
 *   1. Client cannot pass a raw Stripe price ID; only a productKey enum.
 *   2. Empty body (back-compat for the sidebar upgrade button) defaults to
 *      'pro'. Explicit unknown productKey fails closed with 400
 *      INVALID_PRODUCT_KEY and Stripe is never called.
 *   3. Audit + Dept Dashboard route to one-time / subscription respectively.
 *   4. When the V5 price ID is not configured, the route returns
 *      { ok: false, code: 'CONTACT_SALES' }; never creates a broken Stripe
 *      checkout session.
 *   5. 3AY-8R-Impl-4: the 'build' productKey is gated by
 *      env.BILLING_CHECKOUT_ENABLED === 'true'. Other keys are not gated.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

// Both `sessionsCreate` and `mockEnv` must be hoisted so the vi.mock
// factories below can reference them at module-load time. vi.hoisted
// runs before the top-of-file `const` declarations.
const { sessionsCreate, mockEnv } = vi.hoisted(() => ({
    sessionsCreate: vi.fn(),
    // Mutable env so individual tests can flip the kill switch / unset a
    // price id without re-mocking the module.
    mockEnv: {
        STRIPE_PRICE_ID_PRO: 'price_pro_test',
        STRIPE_PRICE_ID_ENTERPRISE: 'price_enterprise_test',
        STRIPE_PRICE_ID_AUDIT: 'price_audit_test',
        STRIPE_PRICE_ID_DEPT_DASHBOARD: undefined,            // intentionally unset; exercises CONTACT_SALES path
        STRIPE_PRICE_ID_BUILD_MONTHLY: 'price_build_test',    // 3AY-8R-Impl-4
        BILLING_CHECKOUT_ENABLED: 'true',                     // kill switch defaults ON for tests; individual tests override
    } as Record<string, unknown>,
}));

vi.mock('next-auth', () => ({
    getServerSession: vi.fn(async () => ({
        user: { tenantId: '00000000-0000-0000-0000-000000000ABC', email: 'cfo@example.com' },
    })),
}));

vi.mock('@/lib/auth', () => ({ authOptions: {} }));

vi.mock('@/lib/db', () => ({
    default: {
        query: vi.fn(async (sql: string) => {
            if (sql.includes('FROM tenants')) {
                return { rows: [{ id: 'tenant-1', name: 'Acme', owner_email: 'cfo@example.com', stripe_customer_id: 'cus_existing' }] };
            }
            return { rows: [] };
        }),
    },
}));

vi.mock('@/lib/stripe', () => ({
    stripe: {
        customers: { create: vi.fn(async () => ({ id: 'cus_new' })) },
        checkout: { sessions: { create: sessionsCreate } },
    },
}));

vi.mock('@/lib/env', () => ({
    env: mockEnv,
}));

import { POST } from './route';

function reqWithBody(body: unknown) {
    return new Request('http://localhost/api/v2/billing/checkout', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: typeof body === 'string' ? body : JSON.stringify(body),
    });
}

beforeEach(() => {
    sessionsCreate.mockReset();
    sessionsCreate.mockResolvedValue({ url: 'https://stripe.test/checkout/foo' });
    // Reset env to documented defaults before each test.
    mockEnv.STRIPE_PRICE_ID_PRO = 'price_pro_test';
    mockEnv.STRIPE_PRICE_ID_BUILD_MONTHLY = 'price_build_test';
    mockEnv.STRIPE_PRICE_ID_AUDIT = 'price_audit_test';
    mockEnv.STRIPE_PRICE_ID_DEPT_DASHBOARD = undefined;
    mockEnv.BILLING_CHECKOUT_ENABLED = 'true';
});

describe('POST /api/v2/billing/checkout — V5 productKey dispatch', () => {
    it('default (no body) uses pro subscription price', async () => {
        const res = await POST(reqWithBody(''));
        expect(res.status).toBe(200);
        const data = await res.json();
        expect(data.ok).toBe(true);
        expect(sessionsCreate).toHaveBeenCalledTimes(1);
        const args = sessionsCreate.mock.calls[0]![0];
        expect(args.line_items[0].price).toBe('price_pro_test');
        expect(args.mode).toBe('subscription');
    });

    it('productKey "audit" uses one-time payment mode + audit price', async () => {
        const res = await POST(reqWithBody({ productKey: 'audit' }));
        expect(res.status).toBe(200);
        const args = sessionsCreate.mock.calls[0]![0];
        expect(args.line_items[0].price).toBe('price_audit_test');
        expect(args.mode).toBe('payment');
        // Subscription metadata path MUST NOT fire for one-time
        expect(args.subscription_data).toBeUndefined();
        expect(args.payment_intent_data).toBeDefined();
    });

    it('productKey "dept_dashboard" with unconfigured price returns CONTACT_SALES', async () => {
        const res = await POST(reqWithBody({ productKey: 'dept_dashboard' }));
        expect(res.status).toBe(200);
        const data = await res.json();
        expect(data.ok).toBe(false);
        expect(data.code).toBe('CONTACT_SALES');
        expect(data.contactUrl).toBe('/get-access?product=dept_dashboard');
        // Stripe was NOT called — we never create a broken checkout session.
        expect(sessionsCreate).not.toHaveBeenCalled();
    });

    it('client-provided raw price ID is ignored (never accepted)', async () => {
        const res = await POST(reqWithBody({
            productKey: 'pro',
            priceId: 'price_attacker_chosen_anything',   // attempted injection
            price: 'price_attacker_chosen_anything',
        }));
        expect(res.status).toBe(200);
        const args = sessionsCreate.mock.calls[0]![0];
        // Server-resolved price wins.
        expect(args.line_items[0].price).toBe('price_pro_test');
    });

    it('explicit unknown productKey fails closed with 400 INVALID_PRODUCT_KEY', async () => {
        const res = await POST(reqWithBody({ productKey: '../../etc/passwd' }));
        expect(res.status).toBe(400);
        const data = await res.json();
        expect(data.ok).toBe(false);
        expect(data.code).toBe('INVALID_PRODUCT_KEY');
        // Critical: Stripe MUST NOT be called for an unknown product intent.
        expect(sessionsCreate).not.toHaveBeenCalled();
    });

    it('non-string productKey (number) fails closed with 400 INVALID_PRODUCT_KEY', async () => {
        const res = await POST(reqWithBody({ productKey: 42 }));
        expect(res.status).toBe(400);
        const data = await res.json();
        expect(data.code).toBe('INVALID_PRODUCT_KEY');
        expect(sessionsCreate).not.toHaveBeenCalled();
    });

    it('explicit null productKey is treated as absent and defaults to pro (back-compat)', async () => {
        const res = await POST(reqWithBody({ productKey: null }));
        expect(res.status).toBe(200);
        const data = await res.json();
        expect(data.ok).toBe(true);
        const args = sessionsCreate.mock.calls[0]![0];
        expect(args.line_items[0].price).toBe('price_pro_test');
    });

    it('binds tenantId in metadata so the webhook can attribute the charge', async () => {
        await POST(reqWithBody({ productKey: 'audit' }));
        const args = sessionsCreate.mock.calls[0]![0];
        expect(args.metadata.tenantId).toBe('tenant-1');
        expect(args.metadata.productKey).toBe('audit');
    });
});

describe('POST /api/v2/billing/checkout — V5 Build (3AY-8R-Impl-4)', () => {
    it('productKey "build" with kill switch ON and price set creates a subscription checkout', async () => {
        const res = await POST(reqWithBody({ productKey: 'build' }));
        expect(res.status).toBe(200);
        const data = await res.json();
        expect(data.ok).toBe(true);
        expect(sessionsCreate).toHaveBeenCalledTimes(1);
        const args = sessionsCreate.mock.calls[0]![0];
        expect(args.line_items[0].price).toBe('price_build_test');
        expect(args.mode).toBe('subscription');
        expect(args.subscription_data).toBeDefined();
        expect(args.payment_intent_data).toBeUndefined();
    });

    it('build sets planId metadata to "build" so the webhook does not need a Price -> plan resolver', async () => {
        await POST(reqWithBody({ productKey: 'build' }));
        const args = sessionsCreate.mock.calls[0]![0];
        expect(args.metadata.planId).toBe('build');
        expect(args.metadata.productKey).toBe('build');
        expect(args.subscription_data.metadata.planId).toBe('build');
    });

    it('build with kill switch OFF returns CHECKOUT_DISABLED, no Stripe call', async () => {
        mockEnv.BILLING_CHECKOUT_ENABLED = 'false';
        const res = await POST(reqWithBody({ productKey: 'build' }));
        expect(res.status).toBe(200);
        const data = await res.json();
        expect(data.ok).toBe(false);
        expect(data.code).toBe('CHECKOUT_DISABLED');
        expect(data.contactUrl).toBe('/get-access?intent=build');
        expect(sessionsCreate).not.toHaveBeenCalled();
    });

    it('build with kill switch UNSET (env missing) returns CHECKOUT_DISABLED', async () => {
        mockEnv.BILLING_CHECKOUT_ENABLED = undefined;
        const res = await POST(reqWithBody({ productKey: 'build' }));
        const data = await res.json();
        expect(data.code).toBe('CHECKOUT_DISABLED');
        expect(sessionsCreate).not.toHaveBeenCalled();
    });

    it('build with kill switch ON but STRIPE_PRICE_ID_BUILD_MONTHLY missing returns CONTACT_SALES', async () => {
        mockEnv.STRIPE_PRICE_ID_BUILD_MONTHLY = undefined;
        const res = await POST(reqWithBody({ productKey: 'build' }));
        const data = await res.json();
        expect(data.ok).toBe(false);
        expect(data.code).toBe('CONTACT_SALES');
        expect(data.contactUrl).toBe('/get-access?product=build');
        expect(sessionsCreate).not.toHaveBeenCalled();
    });

    it('build does not touch existing pro / audit paths when its env is unset', async () => {
        mockEnv.STRIPE_PRICE_ID_BUILD_MONTHLY = undefined;
        mockEnv.BILLING_CHECKOUT_ENABLED = undefined;
        const res = await POST(reqWithBody({ productKey: 'pro' }));
        expect(res.status).toBe(200);
        const data = await res.json();
        expect(data.ok).toBe(true);
        const args = sessionsCreate.mock.calls[0]![0];
        expect(args.line_items[0].price).toBe('price_pro_test');
    });

    it('build kill switch does NOT gate audit (one-time) checkouts', async () => {
        mockEnv.BILLING_CHECKOUT_ENABLED = undefined;
        const res = await POST(reqWithBody({ productKey: 'audit' }));
        expect(res.status).toBe(200);
        const data = await res.json();
        expect(data.ok).toBe(true);
        expect(sessionsCreate).toHaveBeenCalled();
    });

    it('build success metadata includes the tenantId for webhook attribution', async () => {
        await POST(reqWithBody({ productKey: 'build' }));
        const args = sessionsCreate.mock.calls[0]![0];
        expect(args.metadata.tenantId).toBe('tenant-1');
        expect(args.subscription_data.metadata.tenantId).toBe('tenant-1');
    });

    it('build success_url contains the productKey for dashboard post-checkout state', async () => {
        await POST(reqWithBody({ productKey: 'build' }));
        const args = sessionsCreate.mock.calls[0]![0];
        expect(args.success_url).toContain('product=build');
    });

    it('build ignores a spoofed planId in the client body (server derives planId from productKey)', async () => {
        await POST(reqWithBody({ productKey: 'build', planId: 'enterprise', plan_id: 'enterprise' }));
        const args = sessionsCreate.mock.calls[0]![0];
        // Server-derived planId wins; the client value is never written.
        expect(args.metadata.planId).toBe('build');
    });

    it('build ignores a spoofed priceId in the client body', async () => {
        await POST(reqWithBody({ productKey: 'build', priceId: 'price_attacker' }));
        const args = sessionsCreate.mock.calls[0]![0];
        expect(args.line_items[0].price).toBe('price_build_test');
    });
});

describe('POST /api/v2/billing/checkout — source-shape contracts (3AY-8R-Impl-4)', () => {
    // Pulled in late so vi.mock at the top wins for module-load order.
    it('the route enum lists build in the canonical position', async () => {
        const { readFileSync } = await import('node:fs');
        const { join } = await import('node:path');
        const src = readFileSync(join(process.cwd(), 'app/api/v2/billing/checkout/route.ts'), 'utf8');
        expect(src).toMatch(/PRODUCT_KEYS\s*=\s*\[\s*'pro',\s*'build',/);
    });

    it('the INVALID_PRODUCT_KEY message lists build', async () => {
        const { readFileSync } = await import('node:fs');
        const { join } = await import('node:path');
        const src = readFileSync(join(process.cwd(), 'app/api/v2/billing/checkout/route.ts'), 'utf8');
        expect(src).toMatch(/pro, build, audit, dept_dashboard/);
    });

    it('the route gates only build behind BILLING_CHECKOUT_ENABLED', async () => {
        const { readFileSync } = await import('node:fs');
        const { join } = await import('node:path');
        const src = readFileSync(join(process.cwd(), 'app/api/v2/billing/checkout/route.ts'), 'utf8');
        expect(src).toMatch(/productKey === 'build'\s*&&\s*env\.BILLING_CHECKOUT_ENABLED !== 'true'/);
        // The kill-switch check should not gate the audit / dept_dashboard / pro keys.
        expect(src).not.toMatch(/productKey === 'audit'\s*&&\s*env\.BILLING_CHECKOUT_ENABLED/);
        expect(src).not.toMatch(/productKey === 'pro'\s*&&\s*env\.BILLING_CHECKOUT_ENABLED/);
    });

    it('does not hardcode the $49 amount outside the env-mapping', async () => {
        const { readFileSync } = await import('node:fs');
        const { join } = await import('node:path');
        const raw = readFileSync(join(process.cwd(), 'app/api/v2/billing/checkout/route.ts'), 'utf8');
        // Strip JSDoc + line comments before scanning so docstring
        // references to "$49/month" don't trip the check. The price
        // itself must never appear in user-facing route code or in any
        // string we send to Stripe; it lives only in env.
        const src = raw
            .replace(/\/\*[\s\S]*?\*\//g, '')
            .replace(/^\s*\/\/.*$/gm, '');
        expect(src).not.toMatch(/\$49\b/);
        expect(src).not.toMatch(/49\.00\b/);
    });
});
