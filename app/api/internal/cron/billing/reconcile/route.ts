import { NextResponse } from 'next/server';
import db from '@/lib/db'; // STRICT RULE: Default export
import { executeRecurringCharge } from '@/lib/billing/providers/onchain';

// Force dynamic execution for chron jobs
export const dynamic = 'force-dynamic';
// Extend max duration if deploying to Vercel (Pro tier allows up to 300s)
export const maxDuration = 300;

const BATCH_SIZE = 50;

interface DueSubscription {
    id: string;
    tenant_id: string;
    wallet_address: string;
    monthly_fee_micros: bigint;
    current_period_end: Date;
}

export async function POST(req: Request) {
    // 1. Authenticate the cron request (Vercel Cron Secret or internal token)
    const authHeader = req.headers.get('authorization');
    if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    let processedCount = 0;
    let failedCount = 0;
    let lastId = '00000000-0000-0000-0000-000000000000'; // Starting UUID cursor
    let hasMore = true;

    console.log('[CRON] Starting sequential subscription renewal sweep...');

    // 2. Cursor-based batching loop
    while (hasMore) {
        // Fetch a tiny batch, strictly ordered by ID to prevent infinite loops
        const query = `
      SELECT id, tenant_id, wallet_address, monthly_fee_micros, current_period_end
      FROM billing_subscriptions
      WHERE status = 'active'
        AND provider = 'onchain'
        AND current_period_end <= NOW()
        AND id > $1
      ORDER BY id ASC
      LIMIT $2;
    `;

        const { rows } = await db.query(query, [lastId, BATCH_SIZE]) as { rows: DueSubscription[] };

        if (!rows || rows.length === 0) {
            hasMore = false;
            break;
        }

        // 3. Process the batch SEQUENTIALLY. 
        // DO NOT USE Promise.all() HERE. It will exhaust the DB pool and RPC rate limits.
        for (const sub of rows) {
            try {
                // Step A: Attempt to insert the pending ledger row.
                // If the unique constraint (tenant + period) trips, this safely throws,
                // preventing a double-charge if the cron restarted mid-batch.
                const nextPeriodStart = sub.current_period_end;
                await db.query(`
          INSERT INTO onchain_subscription_payments 
            (tenant_id, subscription_id, billing_period_start, amount_usd_micros, status, tx_hash)
          VALUES ($1, $2, $3, $4, 'pending', 'pending_' || gen_random_uuid())
        `, [sub.tenant_id, sub.id, nextPeriodStart, sub.monthly_fee_micros]);

                // Step B: Execute the Ethers v6 Smart Contract call.
                // chargeSubscription() uses the EIP-2612 allowance set during month 1.
                // No permit signature needed — the allowance is already on-chain.
                const txHash = await executeRecurringCharge(
                    sub.wallet_address,
                    sub.monthly_fee_micros
                );

                // Step C: Confirm the charge and advance the subscription date
                await db.query(`
          BEGIN;
          
          UPDATE onchain_subscription_payments 
          SET status = 'settled', tx_hash = $1 
          WHERE subscription_id = $2 AND billing_period_start = $3;
          
          UPDATE billing_subscriptions 
          SET current_period_start = current_period_end,
              current_period_end = current_period_end + INTERVAL '1 month'
          WHERE id = $2;
          
          COMMIT;
        `, [txHash, sub.id, nextPeriodStart]);

                processedCount++;

            } catch (error: unknown) {
                failedCount++;
                const errorMessage = error instanceof Error ? error.message : 'Unknown error';

                // Log the failure for the admin console, but DO NOT crash the loop.
                // We must continue processing the rest of the batch.
                console.error(`[CRON] Failed to renew sub ${sub.id}:`, errorMessage);

                // Optional: transition subscription to 'past_due' if error indicates insufficient allowance
                if (errorMessage.includes('Transfer failed') || errorMessage.includes('allowance')) {
                    await db.query(`
                        BEGIN;
                        UPDATE billing_subscriptions SET status = 'past_due', updated_at = NOW() WHERE id = $1;
                        UPDATE tenants SET plan = 'free', updated_at = NOW() WHERE id = $2;
                        COMMIT;
                    `, [sub.id, sub.tenant_id]);
                }
            }
        }

        // 4. Update the cursor for the next batch
        const lastRow = rows[rows.length - 1];
        if (lastRow?.id) {
            lastId = lastRow.id;
        } else {
            hasMore = false; // Safety fallback
        }
    }

    // 5. Write the reconciliation report for the Admin KPI dashboard
    await db.query(`
    INSERT INTO billing_reconciliation_runs (run_type, processed, failed, completed_at)
    VALUES ('onchain_renewal', $1, $2, NOW())
  `, [processedCount, failedCount]);

    return NextResponse.json({
        success: true,
        processed: processedCount,
        failed: failedCount
    });
}
