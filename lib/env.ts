import { z } from 'zod';

const envSchema = z.object({
    DATABASE_URL: z.string().url(),
    NEXTAUTH_SECRET: z.string().min(1),
    NEXTAUTH_URL: z.string().url().optional(),
    GOOGLE_CLIENT_ID: z.string().min(1),
    GOOGLE_CLIENT_SECRET: z.string().min(1),
    ADMIN_EMAILS: z.string().optional(),
    RESEND_API_KEY: z.string().optional(),
    NEXT_PUBLIC_APP_URL: z.string().url().optional().default('http://localhost:3000'),
    POLL_SECRET: z.string().optional(),
    CRON_SECRET: z.string().optional(),
    // Stripe — required for billing to function
    STRIPE_SECRET_KEY: z.string().min(1),
    STRIPE_WEBHOOK_SECRET: z.string().min(1),
    STRIPE_PRICE_ID_PRO: z.string().min(1),
    STRIPE_PRICE_ID_ENTERPRISE: z.string().min(1),
    // Facilitator — P402_SIGNER_ADDRESS always required.
    // P402_FACILITATOR_PRIVATE_KEY only required when CDP_SERVER_WALLET_ENABLED != 'true'.
    // When CDP mode is active, the private key lives in CDP's TEE and is never set here.
    P402_SIGNER_ADDRESS: z.string().min(1),
    P402_FACILITATOR_PRIVATE_KEY: z.string().optional(),
    CDP_SERVER_WALLET_ENABLED: z.string().optional(),
    // Receipt signing — required so receipt signatures are always verifiable.
    // Must be at least 32 chars. Generate with: openssl rand -hex 32
    P402_RECEIPT_SECRET: z.string().min(32),
});

/**
 * Validates that all required environment variables are set.
 * In a "Top 1%" project, we call this on app init.
 */
export function validateEnv() {
    const parsed = envSchema.safeParse(process.env);

    if (!parsed.success) {
        console.error('❌ Invalid environment variables:', parsed.error.flatten().fieldErrors);
        return false;
    }

    return parsed.data;
}

export const env = process.env as unknown as z.infer<typeof envSchema>;

export const P402_FACILITATOR_PRIVATE_KEY = process.env.P402_FACILITATOR_PRIVATE_KEY;

const envOk = validateEnv();
if (!envOk) {
    // During Next.js production build, runtime secrets (Stripe keys, private keys)
    // are intentionally absent — they live in Vercel's runtime environment, not the
    // build environment. Suppress the throw so static analysis completes cleanly.
    // Any real misconfiguration surfaces at request time when the code actually runs.
    if (process.env.NEXT_PHASE !== 'phase-production-build') {
        throw new Error('Environment validation failed');
    }
}
