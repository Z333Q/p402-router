import Stripe from 'stripe';

// STRIPE_SECRET_KEY is validated at runtime by lib/env.ts.
// Use || (not ??) so empty string also falls back — Stripe SDK v20+ throws on ''.
export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || 'sk_placeholder_not_configured', {
    apiVersion: '2026-01-28.clover' as Stripe.LatestApiVersion,
    typescript: true,
});
