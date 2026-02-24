import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import db from '@/lib/db';
import { stripe } from '@/lib/stripe';
import { env } from '@/lib/env';

export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const tenantId = session.user.tenantId;

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
        const priceId = env.STRIPE_PRO_PRICE_ID;

        const checkoutSession = await stripe.checkout.sessions.create({
            customer: customerId,
            line_items: [
                {
                    price: priceId,
                    quantity: 1,
                },
            ],
            mode: 'subscription',
            success_url: `${process.env.NEXTAUTH_URL}/dashboard/billing?success=true&session_id={CHECKOUT_SESSION_ID}`,
            cancel_url: `${process.env.NEXTAUTH_URL}/dashboard/billing?canceled=true`,
            metadata: {
                tenantId: tenant.id
            },
            subscription_data: {
                metadata: {
                    tenantId: tenant.id
                }
            }
        });

        return NextResponse.json({ url: checkoutSession.url });
    } catch (error: any) {
        console.error('Stripe Checkout Error:', error);
        return NextResponse.json(
            { error: error.message || 'Internal Server Error' },
            { status: 500 }
        );
    }
}
