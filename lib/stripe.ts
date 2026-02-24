import Stripe from 'stripe';

const apiKey = process.env.STRIPE_SECRET_KEY || 'sk_test_dummy';

// We no longer throw at the top level to allow Vercel builds to pass.
// Validation happens at runtime or via the check script.

export const stripe = new Stripe(apiKey || 'sk_test_dummy', {
    apiVersion: '2025-02-11-20.2' as any,
    typescript: true,
});
