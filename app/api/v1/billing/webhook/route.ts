import { NextRequest, NextResponse } from 'next/server';
import { stripeProvider } from '@/lib/billing/providers/stripe';
import { SubscriptionService } from '@/lib/billing/subscription-service';

// Critical Next.js App Router config for webhooks
// Forces dynamic execution and prevents raw body from being automatically JSON parsed,
// which is required for Stripe signature verification.
export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
    try {
        // Read the pure raw string body from the request stream
        const rawBody = await req.text();

        // Pass to the provider to cryptographically verify the signature
        const verifyResult = await stripeProvider.verifyWebhookSignature(req, rawBody);

        if (!verifyResult.isValid || !verifyResult.event) {
            console.error('[Webhook] Invalid signature:', verifyResult.errorReason);
            return NextResponse.json(
                { error: 'Webhook signature verification failed' },
                { status: 400 }
            );
        }

        // Send the verified, standardized event to the orchestration service
        await SubscriptionService.syncFromWebhook(verifyResult.event);

        // Acknowledge receipt to the provider quickly to prevent retries
        return NextResponse.json({ received: true }, { status: 200 });

    } catch (error: any) {
        console.error('[Webhook] Unhandled exception:', error.message);
        return NextResponse.json(
            { error: 'Internal Webhook Error' },
            { status: 500 }
        );
    }
}
