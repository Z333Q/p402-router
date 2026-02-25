import { NextRequest, NextResponse } from 'next/server';
import db from '@/lib/db';
import { stripe } from '@/lib/stripe';
import { SubscriptionService } from '@/lib/billing/subscription-service';

export const dynamic = 'force-dynamic';

// Basic security: require a CRON_SECRET to execute
// In Vercel, this is triggered by vercel.json cron definitions
export async function POST(req: NextRequest) {
    const authHeader = req.headers.get('authorization');
    if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    try {
        // Find subscriptions that are managed by an external provider (Stripe)
        // We do this in batches of 100 to avoid DB connection exhaustion
        const { rows } = await db.query(
            `SELECT provider_subscription_id 
             FROM billing_subscriptions 
             WHERE provider_subscription_id IS NOT NULL 
             LIMIT 100`
        ) as { rows: { provider_subscription_id: string }[] };

        const syncResults = {
            success: 0,
            failed: 0,
            total: rows.length
        };

        // Process SEQUENTIALLY to prevent connection spikes per S3-004 guidelines
        for (const row of rows) {
            try {
                // Fetch canonical truth from Stripe
                const subscription = await stripe.subscriptions.retrieve(row.provider_subscription_id);

                // Route through the existing orchestration mechanism
                await SubscriptionService.syncFromWebhook({
                    type: 'customer.subscription.updated',
                    data: subscription
                });

                syncResults.success++;
            } catch (err: any) {
                console.error(`[Cron Sync] Failed to sync ${row.provider_subscription_id}:`, err.message);
                syncResults.failed++;
            }
        }

        return NextResponse.json({
            message: 'Sync completed',
            results: syncResults
        });

    } catch (error: any) {
        console.error('[Cron Sync] Fatal error:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
