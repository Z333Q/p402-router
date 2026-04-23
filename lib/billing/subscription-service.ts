import db from '@/lib/db';
import { WebhookEventPayload } from './provider';
import Stripe from 'stripe'; // Needed for type casting if payload is from Stripe
import { generateCommission } from '@/lib/partner/commissions';

/**
 * Orchestrates synchronization between external billing providers (Stripe, On-Chain)
 * and our internal `billing_subscriptions` and `tenants` DB tables.
 */
export class SubscriptionService {

    /**
     * Processes webhooks securely parsed by the BillingProvider.
     * Maps provider events to DB state mutations.
     */
    static async syncFromWebhook(event: WebhookEventPayload) {
        console.log(`[SubscriptionService] Processing webhook event: ${event.type}`);

        switch (event.type) {
            case 'checkout.session.completed':
                await this.handleCheckoutSessionCompleted(event.data);
                break;
            case 'invoice.payment_succeeded':
                await this.handleInvoicePaymentSucceeded(event.data);
                break;
            case 'customer.subscription.updated':
            case 'customer.subscription.deleted':
                await this.handleSubscriptionUpdated(event.data);
                break;
            default:
                // Ignore unhandled events
                break;
        }
    }

    private static async handleCheckoutSessionCompleted(session: any) {
        // Must tie the external session back to our internal tenant
        const tenantId = session.client_reference_id || session.metadata?.tenantId;
        const planId = session.metadata?.planId || 'pro';
        const subscriptionId = session.subscription;
        const customerId = session.customer;

        if (!tenantId || !subscriptionId) {
            console.error('[SubscriptionService] Missing tenantId or subscriptionId in session');
            return;
        }

        // 1. Upsert into billing_subscriptions
        await db.query(
            `INSERT INTO billing_subscriptions (
                tenant_id, plan_id, status, current_period_start, current_period_end,
                provider_subscription_id, provider_customer_id
            ) VALUES (
                $1, $2, 'active', NOW(), NOW() + INTERVAL '1 month', $3, $4
            ) ON CONFLICT (tenant_id) DO UPDATE SET
                plan_id = EXCLUDED.plan_id,
                status = 'active',
                provider_subscription_id = EXCLUDED.provider_subscription_id,
                provider_customer_id = EXCLUDED.provider_customer_id,
                updated_at = NOW()`,
            [tenantId, planId, subscriptionId, customerId]
        );

        // 2. Cascade plan update to tenants table
        await db.query(
            `UPDATE tenants SET plan = $2, updated_at = NOW() WHERE id = $1`,
            [tenantId, planId]
        );

        // 3. Generate commission for first-month subscription (non-blocking)
        const amountTotal = typeof session.amount_total === 'number'
            ? session.amount_total / 100  // Stripe uses cents
            : 0;
        if (amountTotal > 0) {
            generateCommission({
                tenantId,
                sourceEventType: 'checkout.session.completed',
                sourceEventId: session.id,
                invoiceAmountUsd: amountTotal,
                planId,
            }).then(result => {
                if (result.created) {
                    console.log(`[SubscriptionService] Commission created: ${result.entryId} ($${result.commissionAmount})`);
                } else if (result.skippedReason && result.skippedReason !== 'no_active_attribution') {
                    console.log(`[SubscriptionService] Commission skipped: ${result.skippedReason}`);
                }
            }).catch(err => {
                console.error('[SubscriptionService] Commission generation error (non-blocking):', err);
            });
        }
    }

    private static async handleInvoicePaymentSucceeded(invoice: any) {
        // Recurring invoice payment — find tenant via provider_subscription_id
        const providerSubId = invoice.subscription;
        if (!providerSubId) return;

        // Skip $0 invoices (trial, etc.)
        const amountPaid = typeof invoice.amount_paid === 'number' ? invoice.amount_paid / 100 : 0;
        if (amountPaid <= 0) return;

        const subRes = await db.query(
            `SELECT tenant_id, plan_id FROM billing_subscriptions WHERE provider_subscription_id = $1`,
            [providerSubId]
        ) as { rows: { tenant_id: string; plan_id: string }[] };

        const sub = subRes.rows[0];
        if (!sub) {
            console.warn(`[SubscriptionService] Invoice ${invoice.id}: subscription ${providerSubId} not found in DB`);
            return;
        }

        // Generate commission (non-blocking, idempotent)
        generateCommission({
            tenantId: sub.tenant_id,
            sourceEventType: 'invoice.payment_succeeded',
            sourceEventId: invoice.id,
            invoiceAmountUsd: amountPaid,
            planId: sub.plan_id,
        }).then(result => {
            if (result.created) {
                console.log(`[SubscriptionService] Recurring commission created: ${result.entryId} ($${result.commissionAmount})`);
            } else if (result.skippedReason && result.skippedReason !== 'no_active_attribution') {
                console.log(`[SubscriptionService] Recurring commission skipped: ${result.skippedReason}`);
            }
        }).catch(err => {
            console.error('[SubscriptionService] Commission generation error (non-blocking):', err);
        });
    }

    private static async handleSubscriptionUpdated(subscription: any) {
        // For Stripe events, the subscription object doesn't always contain the tenantId directly.
        // We look it up via provider_subscription_id.
        const providerSubId = subscription.id;
        const status = subscription.status === 'active' ? 'active' : (subscription.status === 'canceled' ? 'canceled' : 'past_due');
        const cancelAtPeriodEnd = subscription.cancel_at_period_end === true;

        // Convert unix timestamps
        const periodStart = new Date(subscription.current_period_start * 1000);
        const periodEnd = new Date(subscription.current_period_end * 1000);

        const { rows } = await db.query(
            `UPDATE billing_subscriptions 
             SET status = $2, 
                 cancel_at_period_end = $3,
                 current_period_start = $4,
                 current_period_end = $5,
                 updated_at = NOW()
             WHERE provider_subscription_id = $1
             RETURNING tenant_id`,
            [providerSubId, status, cancelAtPeriodEnd, periodStart, periodEnd]
        ) as { rows: { tenant_id: string }[] };

        if (!rows || rows.length === 0 || !rows[0]) {
            console.warn(`[SubscriptionService] Subscription ${providerSubId} not found in DB`);
            return;
        }

        const tenantId = rows[0].tenant_id;

        // If canceled or past due, we should downgrade the tenant to free immediately or at period end
        // For strictness, if it's currently 'canceled' or 'past_due', we revoke Pro access.
        if (status === 'canceled' || status === 'past_due') {
            await db.query(
                `UPDATE tenants SET plan = 'free', updated_at = NOW() WHERE id = $1`,
                [tenantId]
            );
        }
    }
}
