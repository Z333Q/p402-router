import Stripe from 'stripe';

// STRIPE_SECRET_KEY is validated at runtime by lib/env.ts.
// The empty-string fallback prevents build-time failures only;
// Stripe will reject requests with a clear 401 if the key is wrong.
export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY ?? '', {
    apiVersion: '2026-01-28.clover' as Stripe.LatestApiVersion,
    typescript: true,
});
