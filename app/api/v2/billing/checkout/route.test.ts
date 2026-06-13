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
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

const { sessionsCreate } = vi.hoisted(() => ({ sessionsCreate: vi.fn() }));

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
    env: {
        STRIPE_PRICE_ID_PRO: 'price_pro_test',
        STRIPE_PRICE_ID_ENTERPRISE: 'price_enterprise_test',
        STRIPE_PRICE_ID_AUDIT: 'price_audit_test',
        STRIPE_PRICE_ID_DEPT_DASHBOARD: undefined,  // intentionally unset; exercises CONTACT_SALES path
    },
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
