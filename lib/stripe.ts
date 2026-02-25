import Stripe from 'stripe';

let _stripe: Stripe | null = null;

/**
 * Returns the Stripe singleton, initializing it on first call.
 * Throws a clear error if STRIPE_SECRET_KEY is missing or is a placeholder,
 * so misconfiguration is caught at request time — not at build time.
 */
export function getStripe(): Stripe {
    const key = process.env.STRIPE_SECRET_KEY;
    if (!key || key.includes('placeholder')) {
        throw new Error('Missing or unconfigured STRIPE_SECRET_KEY');
    }

    if (!_stripe) {
        _stripe = new Stripe(key, {
            apiVersion: '2026-01-28.clover' as Stripe.LatestApiVersion,
            typescript: true,
        });
    }

    return _stripe;
}

// Legacy named export for modules that haven't migrated yet.
// Do not use in new code — prefer getStripe().
export const stripe = {
    get subscriptions() { return getStripe().subscriptions; },
    get webhooks() { return getStripe().webhooks; },
    get customers() { return getStripe().customers; },
    get checkout() { return getStripe().checkout; },
    get billingPortal() { return getStripe().billingPortal; },
};
