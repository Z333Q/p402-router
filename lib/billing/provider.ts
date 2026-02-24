import { NextRequest } from "next/server";

export interface CreateSubscriptionResult {
    checkoutUrl?: string; // e.g. Stripe Checkout session URL
    subscriptionId?: string;
    status: 'active' | 'pending_payment';
}

export interface WebhookEventPayload {
    type: string;
    data: any;
}

export interface VerifyWebhookResult {
    isValid: boolean;
    event?: WebhookEventPayload;
    errorReason?: string;
}

/**
 * The standard interface for all P402 Billing Providers (Stripe, OnChain, etc.)
 */
export interface BillingProvider {
    /**
     * Set up a new subscription workflow for the tenant.
     * Often returns a redirect URL to a hosted checkout.
     */
    createSubscription(tenantId: string, planId: string, returnUrl: string): Promise<CreateSubscriptionResult>;

    /**
     * Terminate the subscription at the provider level.
     */
    cancelSubscription(providerSubId: string, immediately: boolean): Promise<boolean>;

    /**
     * Securely parse and validate the signature of an incoming webhook.
     */
    verifyWebhookSignature(req: NextRequest, rawBody: string): Promise<VerifyWebhookResult>;
}
