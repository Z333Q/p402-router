import { NextRequest, NextResponse } from "next/server";
import { executeFirstSubscriptionCharge } from "@/lib/billing/providers/onchain";
import { requireTenantAccess } from "@/lib/auth";
import db from "@/lib/db";

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
    try {
        const access = await requireTenantAccess(req);
        if (access.error) {
            return NextResponse.json({ error: access.error }, { status: access.status || 401 });
        }

        const tenantId = access.tenantId;

        const body = await req.json();
        const { walletAddress, amount, deadline, signature } = body;

        if (!walletAddress || !amount || !deadline || !signature) {
            return NextResponse.json({ error: 'Missing required parameters' }, { status: 400 });
        }

        // 1. Dispatch the Ethers transaction
        const txHash = await executeFirstSubscriptionCharge(
            walletAddress,
            BigInt(amount),
            BigInt(deadline),
            signature
        );

        // 2. Transact state safely in the database
        await db.query('BEGIN');

        try {
            // Insert/Updsert subscription
            await db.query(`
                INSERT INTO billing_subscriptions (
                    tenant_id, plan_id, status, provider, current_period_start, current_period_end, wallet_address
                ) VALUES (
                    $1, 'pro', 'active', 'onchain', NOW(), NOW() + INTERVAL '1 month', $2
                ) ON CONFLICT (tenant_id) DO UPDATE SET 
                    plan_id = 'pro',
                    status = 'active',
                    provider = 'onchain',
                    wallet_address = EXCLUDED.wallet_address,
                    current_period_start = NOW(),
                    current_period_end = NOW() + INTERVAL '1 month',
                    updated_at = NOW()
            `, [tenantId, walletAddress]);

            // Sync the tenant plan
            await db.query(`
                UPDATE tenants SET plan = 'pro', updated_at = NOW() WHERE id = $1
            `, [tenantId]);

            // Record initial payment in the ledger
            await db.query(`
                INSERT INTO onchain_subscription_payments (
                    tenant_id, subscription_id, billing_period_start, amount_usd_micros, status, tx_hash
                ) 
                SELECT $1, id, NOW(), $2, 'settled', $3 
                FROM billing_subscriptions WHERE tenant_id = $1
            `, [tenantId, amount, txHash]);

            await db.query('COMMIT');

        } catch (dbError) {
            await db.query('ROLLBACK');
            throw dbError; // rethrow to be caught by outer catch
        }

        return NextResponse.json({ success: true, txHash });

    } catch (error: any) {
        console.error("Onchain subscription failed:", error);
        return NextResponse.json(
            { error: error.message || 'Server error processing subscription' },
            { status: 500 }
        );
    }
}
