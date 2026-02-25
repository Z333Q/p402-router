import { NextRequest } from 'next/server';
import { stripe } from '@/lib/stripe';
import { env } from '@/lib/env';
import { BillingProvider, CreateSubscriptionResult, VerifyWebhookResult } from '../provider';

export class StripeProvider implements BillingProvider {

    private getPriceIdForPlan(planId: string): string {
        const productMap: Record<string, string> = {
            'pro': env.STRIPE_PRICE_ID_PRO,
            'enterprise': env.STRIPE_PRICE_ID_ENTERPRISE,
        };

        const priceId = productMap[planId];
        if (!priceId) {
            throw new Error(`No Stripe price ID configured for plan: ${planId}`);
        }
        return priceId;
    }

    async createSubscription(tenantId: string, planId: string, returnUrl: string): Promise<CreateSubscriptionResult> {
        try {
            const priceId = this.getPriceIdForPlan(planId);

            const session = await stripe.checkout.sessions.create({
                payment_method_types: ['card'],
                line_items: [{ price: priceId, quantity: 1 }],
                mode: 'subscription',
                success_url: `${returnUrl}?session_id={CHECKOUT_SESSION_ID}&status=success`,
                cancel_url: `${returnUrl}?status=canceled`,
                client_reference_id: tenantId,
                metadata: { tenantId, planId }
            });

            return {
                checkoutUrl: session.url || undefined,
                status: 'pending_payment'
            };

        } catch (error: any) {
            console.error('[StripeProvider] createSubscription error:', error);
            throw new Error(`Failed to create Stripe subscription: ${error.message}`);
        }
    }

    async cancelSubscription(providerSubId: string, immediately: boolean = false): Promise<boolean> {
        try {
            if (immediately) {
                await stripe.subscriptions.cancel(providerSubId);
            } else {
                await stripe.subscriptions.update(providerSubId, { cancel_at_period_end: true });
            }
            return true;
        } catch (error) {
            console.error('[StripeProvider] cancelSubscription error:', error);
            return false;
        }
    }

    async verifyWebhookSignature(req: NextRequest, rawBody: string): Promise<VerifyWebhookResult> {
        const signature = req.headers.get('stripe-signature');
        const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

        if (!signature || !webhookSecret) {
            return {
                isValid: false,
                errorReason: 'Missing stripe-signature header or webhook secret'
            };
        }

        try {
            const event = stripe.webhooks.constructEvent(rawBody, signature, webhookSecret);

            return {
                isValid: true,
                event: {
                    type: event.type,
                    data: event.data.object
                }
            };
        } catch (err: any) {
            console.error('[StripeProvider] Webhook signature verification failed:', err.message);
            return {
                isValid: false,
                errorReason: err.message
            };
        }
    }
}

export const stripeProvider = new StripeProvider();
