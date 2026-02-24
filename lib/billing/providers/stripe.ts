import Stripe from 'stripe';
import { NextRequest } from 'next/server';
import { BillingProvider, CreateSubscriptionResult, VerifyWebhookResult } from '../provider';

// Initialize the Stripe SDK.
// We use the '2023-10-16' api version (or newest), but Stripe SDK requires it as an explicit string.
const stripe = new Stripe(process.env.P402_STRIPE_SECRET_KEY || 'sk_test_placeholder', {
    apiVersion: '2026-01-28.clover', // Or your specific version
    appInfo: {
        name: 'P402',
        version: '2.0.0'
    }
});

export class StripeProvider implements BillingProvider {

    // Map internal sprint 1 plan IDs to Stripe Price IDs configured in the dashboard
    private getPriceIdForPlan(planId: string): string {
        const proPrice = process.env.STRIPE_PRICE_ID_PRO || 'price_123';
        const enterprisePrice = process.env.STRIPE_PRICE_ID_ENTERPRISE || 'price_456';

        const productMap: Record<string, string> = {
            'pro': proPrice,
            'enterprise': enterprisePrice
        };

        return productMap[planId] ?? proPrice;
    }

    async createSubscription(tenantId: string, planId: string, returnUrl: string): Promise<CreateSubscriptionResult> {
        try {
            const priceId = this.getPriceIdForPlan(planId);

            // Generate a checkout session for the user
            const session = await stripe.checkout.sessions.create({
                payment_method_types: ['card'],
                line_items: [
                    {
                        price: priceId,
                        quantity: 1,
                    },
                ],
                mode: 'subscription',
                success_url: `${returnUrl}?session_id={CHECKOUT_SESSION_ID}&status=success`,
                cancel_url: `${returnUrl}?status=canceled`,
                client_reference_id: tenantId, // Crucial: Ties Stripe session back to our DB
                metadata: {
                    tenantId,
                    planId
                }
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
                await stripe.subscriptions.update(providerSubId, {
                    cancel_at_period_end: true
                });
            }
            return true;
        } catch (error) {
            console.error('[StripeProvider] cancelSubscription error:', error);
            return false;
        }
    }

    async verifyWebhookSignature(req: NextRequest, rawBody: string): Promise<VerifyWebhookResult> {
        const signature = req.headers.get('stripe-signature');
        const webhookSecret = process.env.P402_STRIPE_WEBHOOK_SECRET;

        if (!signature || !webhookSecret) {
            return {
                isValid: false,
                errorReason: 'Missing stripe-signature header or webhook secret'
            };
        }

        try {
            const event = stripe.webhooks.constructEvent(
                rawBody,
                signature,
                webhookSecret
            );

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
