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
    // Stripe
    STRIPE_SECRET_KEY: z.string().optional(),
    STRIPE_WEBHOOK_SECRET: z.string().optional(),
    STRIPE_PRO_PRICE_ID: z.string().optional(),
    // Facilitator — required for settlement to function
    P402_SIGNER_ADDRESS: z.string().min(1),
    P402_FACILITATOR_PRIVATE_KEY: z.string().min(1),
});

/**
 * Validates that all required environment variables are set.
 * In a "Top 1%" project, we call this on app init.
 */
export function validateEnv() {
    const parsed = envSchema.safeParse(process.env);

    if (!parsed.success) {
        console.error('❌ Invalid environment variables:', parsed.error.flatten().fieldErrors);
        // In a strict production environment, we might throw here to prevent boot
        // throw new Error('Invalid environment variables');
        return false;
    }

    return parsed.data;
}

export const env = process.env as unknown as z.infer<typeof envSchema>;

export const P402_FACILITATOR_PRIVATE_KEY = process.env.P402_FACILITATOR_PRIVATE_KEY;

const envOk = validateEnv();
if (!envOk) {
  throw new Error('Environment validation failed');
}
