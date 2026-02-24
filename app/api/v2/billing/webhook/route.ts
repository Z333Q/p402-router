import { stripe } from '@/lib/stripe';
import db from '@/lib/db';
import Stripe from 'stripe';
import { SubscriptionService } from '@/lib/billing/subscription-service';

export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
    const sig = req.headers.get('stripe-signature');
    if (!sig) {
        return new Response('Missing stripe-signature header', { status: 400 });
    }

    const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
    if (!webhookSecret) {
        return new Response('Missing STRIPE_WEBHOOK_SECRET', { status: 500 });
    }

    const body = await req.text();

    let event: Stripe.Event;
    try {
        event = stripe.webhooks.constructEvent(body, sig, webhookSecret);
    } catch (err: any) {
        console.error('Stripe webhook signature verification failed:', err.message);
        return new Response('Invalid signature', { status: 400 });
    }

    // Idempotency guard — silently ack replays
    const { rows } = await db.query(
        `INSERT INTO processed_webhook_events (provider, event_id)
         VALUES ('stripe', $1)
         ON CONFLICT (provider, event_id) DO NOTHING
         RETURNING event_id`,
        [event.id]
    ) as { rows: { event_id: string }[] };

    if (!rows.length) {
        return new Response('Already processed', { status: 200 });
    }

    await SubscriptionService.syncFromWebhook({
        type: event.type,
        data: event.data.object,
    });

    return new Response('ok', { status: 200 });
}
