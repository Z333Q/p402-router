import db from '@/lib/db';
import { assertFeatureEntitlement } from './entitlements';
import { getTenantPlan } from './plan-guard';

export interface UsageEvent {
    tenantId: string;
    sessionId?: string;
    eventType: 'model_inference' | 'cache_hit' | 'api_call' | 'platform_fee';
    costUsd: number;
}

export async function recordUsage(event: UsageEvent): Promise<void> {
    const { tenantId, sessionId, eventType, costUsd } = event;

    // Product Logic Exception: Semantic Cache Hits
    // We do not bill the customer if they hit the semantic cache, BUT we do 
    // want to record the "0-cost" event for Analytics value demonstration.
    let finalCostMicros = BigInt(Math.floor(costUsd * 1_000_000));

    if (eventType === 'cache_hit') {
        const planId = await getTenantPlan(tenantId);
        const cacheEntitlement = assertFeatureEntitlement(planId, 'semanticCache');

        if (cacheEntitlement.allowed) {
            // Give it to them for free
            finalCostMicros = BigInt(0);
        } else {
            // This should ideally never happen as the router should fail before this,
            // but if they aren't entitled to the cache, we charge standard passthrough
            // Note: In reality they wouldn't hit the cache at all, so this is just defensive
        }
    }

    // Insert the ledger row
    await db.query(`
        INSERT INTO billing_usage_events (
            tenant_id, 
            session_id, 
            event_type, 
            billing_period_start, 
            cost_usd_micros
        )
        VALUES ($1, $2, $3, DATE_TRUNC('month', NOW()), $4)
    `, [tenantId, sessionId || null, eventType, finalCostMicros.toString()]);
}
