import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import db from '@/lib/db';
import { stripe } from '@/lib/stripe';
import { env } from '@/lib/env';
import { toApiErrorResponse } from '@/lib/errors';

export const dynamic = 'force-dynamic';

/**
 * V5 §17 product catalog. The client passes a stable `productKey`; this
 * server-side map resolves it to a Stripe price ID + checkout mode. Never
 * accept a raw price ID from the client; that would let a caller select
 * any price in the Stripe account.
 *
 * If a price is not provisioned in Stripe yet, the entry returns priceId =
 * null. The route then responds with `{ ok: false, code: 'CONTACT_SALES' }`
 * and the UI surfaces a "Talk to us" link instead of a broken checkout.
 *
 * Unknown productKey values fail closed with 400 INVALID_PRODUCT_KEY. The
 * back-compat default to 'pro' only applies when the field is absent (e.g.
 * the sidebar upgrade button posts an empty body); an explicit invalid
 * value must never silently become a paid Pro checkout.
 */
const PRODUCT_KEYS = ['pro', 'audit', 'dept_dashboard'] as const;
type ProductKey = typeof PRODUCT_KEYS[number];

interface ResolvedProduct {
    priceId: string | null;
    mode: 'subscription' | 'payment';
    label: string;
}

function resolveProduct(key: ProductKey): ResolvedProduct {
    switch (key) {
        case 'audit':
            return { priceId: env.STRIPE_PRICE_ID_AUDIT ?? null,            mode: 'payment',      label: 'AI Spend Audit' };
        case 'dept_dashboard':
            return { priceId: env.STRIPE_PRICE_ID_DEPT_DASHBOARD ?? null,   mode: 'subscription', label: 'Department Dashboard' };
        case 'pro':
            return { priceId: env.STRIPE_PRICE_ID_PRO,                      mode: 'subscription', label: 'Pro' };
    }
}

type ProductKeyParse =
    | { ok: true; key: ProductKey }
    | { ok: false; raw: unknown };

function parseProductKey(raw: unknown): ProductKeyParse {
    // Field absent / explicit null: back-compat default to 'pro'.
    if (raw === undefined || raw === null) return { ok: true, key: 'pro' };
    if (typeof raw === 'string' && (PRODUCT_KEYS as readonly string[]).includes(raw)) {
        return { ok: true, key: raw as ProductKey };
    }
    return { ok: false, raw };
}

export async function POST(req: Request) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const tenantId = session.user.tenantId;

        let body: { productKey?: unknown } = {};
        try {
            body = await req.json() as { productKey?: unknown };
        } catch {
            // Empty body defaults to 'pro' (back-compat: existing sidebar
            // upgrade button does not send a body).
        }
        const parsed = parseProductKey(body.productKey);
        if (!parsed.ok) {
            return NextResponse.json({
                ok: false,
                code: 'INVALID_PRODUCT_KEY',
                error: 'Unknown productKey. Must be one of: pro, audit, dept_dashboard.',
            }, { status: 400 });
        }
        const productKey = parsed.key;
        const product = resolveProduct(productKey);

        // Price not provisioned in Stripe yet; surface a sales path rather
        // than create a broken checkout session.
        if (!product.priceId) {
            return NextResponse.json({
                ok: false,
                code: 'CONTACT_SALES',
                product: product.label,
                contactUrl: '/get-access?product=' + encodeURIComponent(productKey),
            }, { status: 200 });
        }

        // 1. Fetch tenant to check for existing stripe_customer_id
        const res = await db.query(
            'SELECT id, name, owner_email, stripe_customer_id FROM tenants WHERE id = $1',
            [tenantId]
        );
        const tenant = res.rows[0];

        if (!tenant) {
            return NextResponse.json({ error: 'Tenant not found' }, { status: 404 });
        }

        let customerId = tenant.stripe_customer_id;

        // 2. Create Stripe Customer if not exists
        if (!customerId) {
            const customer = await stripe.customers.create({
                email: tenant.owner_email || session.user.email,
                name: tenant.name,
                metadata: {
                    tenantId: tenant.id
                }
            });
            customerId = customer.id;

            await db.query(
                'UPDATE tenants SET stripe_customer_id = $1 WHERE id = $2',
                [customerId, tenantId]
            );
        }

        // 3. Create Checkout Session
        const isSubscription = product.mode === 'subscription';
        const checkoutSession = await stripe.checkout.sessions.create({
            customer: customerId,
            line_items: [
                {
                    price: product.priceId,
                    quantity: 1,
                },
            ],
            mode: product.mode,
            success_url: `${process.env.NEXTAUTH_URL}/dashboard/billing?success=true&product=${productKey}&session_id={CHECKOUT_SESSION_ID}`,
            cancel_url: `${process.env.NEXTAUTH_URL}/dashboard/billing?canceled=true`,
            metadata: {
                tenantId: tenant.id,
                productKey,
            },
            ...(isSubscription ? {
                subscription_data: {
                    metadata: {
                        tenantId: tenant.id,
                        productKey,
                    },
                },
            } : {
                payment_intent_data: {
                    metadata: {
                        tenantId: tenant.id,
                        productKey,
                    },
                },
            }),
        });

        return NextResponse.json({ ok: true, url: checkoutSession.url, product: product.label });
    } catch (error: unknown) {
        console.error('Stripe Checkout Error:', error);
        return toApiErrorResponse(error, crypto.randomUUID());
    }
}
