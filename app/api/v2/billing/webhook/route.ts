import { NextResponse } from 'next/server';
import { stripe } from '@/lib/stripe';
import db from '@/lib/db';
import Stripe from 'stripe';

export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
    const body = await req.text();
    const signature = req.headers.get('stripe-signature') as string;

    let event: Stripe.Event;

    try {
        event = stripe.webhooks.constructEvent(
            body,
            signature,
            process.env.STRIPE_WEBHOOK_SECRET!
        );
    } catch (err: any) {
        console.error(`Webhook signature verification failed: ${err.message}`);
        return NextResponse.json({ error: 'Invalid signature' }, { status: 400 });
    }

    try {
        switch (event.type) {
            case 'checkout.session.completed': {
                const session = event.data.object as Stripe.Checkout.Session;
                const tenantId = session.metadata?.tenantId;
                const subscriptionId = session.subscription as string;
                const customerId = session.customer as string;

                if (tenantId) {
                    await db.query(
                        'UPDATE tenants SET plan = $1, stripe_subscription_id = $2, stripe_customer_id = $3 WHERE id = $4',
                        ['pro', subscriptionId, customerId, tenantId]
                    );
                    console.log(`Tenant ${tenantId} upgraded to PRO via Checkout`);
                }
                break;
            }

            case 'customer.subscription.deleted': {
                const subscription = event.data.object as Stripe.Subscription;
                const tenantId = subscription.metadata?.tenantId;

                if (tenantId) {
                    await db.query(
                        "UPDATE tenants SET plan = 'free', stripe_subscription_id = NULL WHERE id = $1",
                        [tenantId]
                    );
                    console.log(`Tenant ${tenantId} downgraded to FREE (subscription deleted)`);
                }
                break;
            }

            case 'customer.subscription.updated': {
                const subscription = event.data.object as Stripe.Subscription;
                const tenantId = subscription.metadata?.tenantId;
                const status = subscription.status;

                if (tenantId) {
                    // If subscription is incomplete, past_due, or canceled, we might want to downgrade
                    const isActive = ['active', 'trialing'].includes(status);
                    const plan = isActive ? 'pro' : 'free';

                    await db.query(
                        'UPDATE tenants SET plan = $1 WHERE id = $2',
                        [plan, tenantId]
                    );
                    console.log(`Tenant ${tenantId} plan status updated to ${plan} (${status})`);
                }
                break;
            }

            default:
                console.log(`Unhandled event type ${event.type}`);
        }

        return NextResponse.json({ received: true });
    } catch (error: any) {
        console.error('Webhook processing error:', error);
        return NextResponse.json({ error: 'Webhook handler failed' }, { status: 500 });
    }
}
