import { describe, it, expect, vi, beforeEach } from 'vitest';

// Pre-import environment setup
process.env.STRIPE_SECRET_KEY = 'sk_test_dummy';
process.env.STRIPE_WEBHOOK_SECRET = 'whsec_test_dummy';

import { POST as checkoutHandler } from '@/app/api/v2/billing/checkout/route';
import { POST as webhookHandler } from '@/app/api/v2/billing/webhook/route';
// Import portal handler dynamically inside tests to ensure env vars are set
import { stripe } from '@/lib/stripe';
import db from '@/lib/db';
import { getServerSession } from 'next-auth';

vi.mock('next-auth');
vi.mock('@/lib/stripe', () => ({
    stripe: {
        checkout: {
            sessions: {
                create: vi.fn(),
            },
        },
        customers: {
            create: vi.fn(),
        },
        webhooks: {
            constructEvent: vi.fn(),
        },
        billingPortal: {
            sessions: {
                create: vi.fn(),
            }
        }
    },
}));
vi.mock('@/lib/db');

describe('Stripe Billing Integration', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    describe('POST /api/v2/billing/checkout', () => {
        it('should return 401 if not authenticated', async () => {
            (getServerSession as any).mockResolvedValue(null);
            const req = new Request('http://localhost/api/v2/billing/checkout', { method: 'POST' });
            const res = await checkoutHandler(req);
            expect(res.status).toBe(401);
        });

        it('should create a checkout session and return the URL', async () => {
            (getServerSession as any).mockResolvedValue({
                user: { tenantId: 'tenant-123', email: 'test@example.com' }
            });
            (db.query as any).mockResolvedValue({
                rows: [{ id: 'tenant-123', name: 'Test Tenant', stripe_customer_id: 'cus_123' }]
            });
            (stripe.checkout.sessions.create as any).mockResolvedValue({ url: 'https://stripe.com/checkout' });

            const req = new Request('http://localhost/api/v2/billing/checkout', { method: 'POST' });
            const res = await checkoutHandler(req);
            const data = await res.json();

            expect(res.status).toBe(200);
            expect(data.url).toBe('https://stripe.com/checkout');
            expect(stripe.checkout.sessions.create).toHaveBeenCalledWith(expect.objectContaining({
                customer: 'cus_123',
                mode: 'subscription'
            }));
        });
    });

    describe('POST /api/v2/billing/webhook', () => {
        it('should update tenant plan on checkout.session.completed', async () => {
            const mockEvent = {
                id: 'evt_checkout_123',
                type: 'checkout.session.completed',
                data: {
                    object: {
                        metadata: { tenantId: 'tenant-123' },
                        subscription: 'sub_456',
                        customer: 'cus_123'
                    }
                }
            };

            (stripe.webhooks.constructEvent as any).mockReturnValue(mockEvent);
            // First db.query is the idempotency INSERT — return a row to signal
            // new event (ON CONFLICT DO NOTHING RETURNING returns empty on dup).
            (db.query as any)
                .mockResolvedValueOnce({ rows: [{ event_id: 'evt_checkout_123' }] })
                .mockResolvedValue({ rows: [] });

            const req = new Request('http://localhost/api/v2/billing/webhook', {
                method: 'POST',
                headers: { 'stripe-signature': 'sig_123' }
            });
            vi.spyOn(req, 'text').mockResolvedValue('{}');

            const res = await webhookHandler(req);
            expect(res.status).toBe(200);
            // Verify idempotency check ran with the event id
            expect(db.query).toHaveBeenCalledWith(
                expect.stringContaining('processed_webhook_events'),
                ['evt_checkout_123']
            );
        });

        it('should downgrade tenant to free on customer.subscription.deleted', async () => {
            const mockEvent = {
                id: 'evt_deleted_123',
                type: 'customer.subscription.deleted',
                data: {
                    object: {
                        id: 'sub_456',
                        metadata: { tenantId: 'tenant-123' }
                    }
                }
            };

            (stripe.webhooks.constructEvent as any).mockReturnValue(mockEvent);
            // First db.query is the idempotency INSERT — return a row to pass through.
            (db.query as any)
                .mockResolvedValueOnce({ rows: [{ event_id: 'evt_deleted_123' }] })
                .mockResolvedValue({ rows: [{ tenant_id: 'tenant-123' }] });

            const req = new Request('http://localhost/api/v2/billing/webhook', {
                method: 'POST',
                headers: { 'stripe-signature': 'sig_123' }
            });
            vi.spyOn(req, 'text').mockResolvedValue('{}');

            const res = await webhookHandler(req);
            expect(res.status).toBe(200);
            expect(db.query).toHaveBeenCalledWith(
                expect.stringContaining('processed_webhook_events'),
                ['evt_deleted_123']
            );
        });
    });

    describe('POST /api/v2/billing/portal', () => {
        it('should return 400 if no stripe_customer_id', async () => {
            (getServerSession as any).mockResolvedValue({ user: { tenantId: 'tenant-123' } });
            (db.query as any).mockResolvedValue({ rows: [{ stripe_customer_id: null }] });

            const { POST: portalHandler } = await import('@/app/api/v2/billing/portal/route');
            const req = new Request('http://localhost/api/v2/billing/portal', { method: 'POST' });
            const res = await portalHandler(req);

            expect(res.status).toBe(400);
        });

        it('should create a portal session and return the URL', async () => {
            (getServerSession as any).mockResolvedValue({ user: { tenantId: 'tenant-123' } });
            (db.query as any).mockResolvedValue({ rows: [{ stripe_customer_id: 'cus_123' }] });

            (stripe.billingPortal.sessions.create as any).mockResolvedValue({ url: 'https://billing.stripe.com/p/session/123' });

            const { POST: portalHandler } = await import('@/app/api/v2/billing/portal/route');
            const req = new Request('http://localhost/api/v2/billing/portal', { method: 'POST' });
            const res = await portalHandler(req);
            const data = await res.json();

            expect(res.status).toBe(200);
            expect(data.url).toBe('https://billing.stripe.com/p/session/123');
        });
    });
});
