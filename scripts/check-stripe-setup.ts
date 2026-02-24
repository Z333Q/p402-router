import { stripe } from '../lib/stripe';

async function checkStripe() {
    console.log('--- Stripe Configuration Check ---');

    const secretKey = process.env.STRIPE_SECRET_KEY;
    const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
    const priceId = process.env.STRIPE_PRO_PRICE_ID;
    const nextAuthUrl = process.env.NEXTAUTH_URL;

    let allOk = true;

    if (!secretKey) {
        console.error('❌ STRIPE_SECRET_KEY is missing');
        allOk = false;
    } else {
        console.log('✅ STRIPE_SECRET_KEY is present');
    }

    if (!webhookSecret) {
        console.error('❌ STRIPE_WEBHOOK_SECRET is missing');
        allOk = false;
    } else {
        console.log('✅ STRIPE_WEBHOOK_SECRET is present');
    }

    if (!priceId) {
        console.error('❌ STRIPE_PRO_PRICE_ID is missing');
        allOk = false;
    } else {
        console.log('✅ STRIPE_PRO_PRICE_ID is present');
    }

    if (!nextAuthUrl) {
        console.error('❌ NEXTAUTH_URL is missing');
        allOk = false;
    } else {
        console.log('✅ NEXTAUTH_URL is present');
    }

    if (!allOk) {
        console.log('\n--- Action Required ---');
        console.log('Please populate the missing variables in your .env.local file.');
        process.exit(1);
    }

    console.log('\n--- Validating with Stripe API ---');
    try {
        const product = await stripe.prices.retrieve(priceId!);
        console.log(`✅ STRIPE_PRO_PRICE_ID is valid. Product: ${product.nickname || product.id}`);

        const account = await stripe.accounts.retrieve();
        console.log(`✅ STRIPE_SECRET_KEY is valid. Connected to: ${account.business_profile?.name || account.id}`);

        console.log('\n🚀 Stripe is COMPLETELY set up and ready!');
    } catch (err: any) {
        console.error(`\n❌ Stripe API Validation failed: ${err.message}`);
        process.exit(1);
    }
}

checkStripe();
