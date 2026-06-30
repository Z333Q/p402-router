/**
 * Phase 1A: Revenue Visibility Foundation — read-only event meter helper.
 *
 * Returns the per-tenant V5-plan-ladder event-meter snapshot used by the
 * dashboard meter and the admin billing surface. Read-only. Does NOT
 * enforce limits, does NOT charge overages, does NOT call Stripe.
 *
 * Plan limits come from lib/pricing/rate-card.ts. Plan id resolution
 * normalizes legacy `free / pro / enterprise` (lib/billing/plans.ts)
 * onto the canonical V5 ladder via lib/billing/plan-compat.ts.
 */

import db from '@/lib/db';
import { PLANS, type PlanId } from '@/lib/pricing/rate-card';
import { normalizeBillingPlanId } from '@/lib/billing/plan-compat';

export interface EventMeterSnapshot {
    readonly planId: PlanId;
    readonly planName: string;
    readonly includedEvents: number | null;
    readonly retentionDays: number | null;
    readonly monthEventsUsed: number;
    readonly percentUsed: number | null;
    readonly firstEventAt: string | null;
    readonly lastEventAt: string | null;
    readonly hasAnyEvent: boolean;
    readonly nextUpgradeReason: string;
    readonly upgradeNotice: string;
}

const UPGRADE_NOTICE =
    'Upgrade path is controlled by the billing rollout.';

const NEXT_UPGRADE_REASON: Readonly<Record<PlanId, string>> = {
    sandbox: 'Build adds 250k events per month, 30-day retention, and outcome coverage.',
    build: 'Growth adds customer-level cost attribution and feature-level margin reporting.',
    growth: 'Scale adds margin floor enforcement, policy enforcement, and audit exports.',
    scale: 'Enterprise adds SSO, SCIM, fine-grained RBAC, DPA, SLA, and procurement pack.',
    enterprise: 'Renewal motion. Custom commit; review with Account team.',
};

export async function resolvePlanIdForTenant(tenantId: string): Promise<PlanId> {
    const { rows } = await db.query(
        `SELECT plan FROM tenants WHERE id = $1`,
        [tenantId],
    ) as { rows: Array<{ plan: string | null }> };
    const raw = rows[0]?.plan ?? null;
    return normalizeBillingPlanId(raw);
}

export async function getEventMeterSnapshot(tenantId: string): Promise<EventMeterSnapshot> {
    const planId = await resolvePlanIdForTenant(tenantId);
    const plan = PLANS[planId];

    const monthRes = await db.query(
        `SELECT COUNT(*)::bigint AS n
         FROM ai_economic_events
         WHERE tenant_id = $1
           AND event_time >= DATE_TRUNC('month', NOW())`,
        [tenantId],
    ) as { rows: Array<{ n: string }> };
    const monthEventsUsed = Number(monthRes.rows[0]?.n ?? '0');

    const spanRes = await db.query(
        `SELECT MIN(event_time) AS first_at,
                MAX(event_time) AS last_at,
                COUNT(*)::bigint AS total
         FROM ai_economic_events
         WHERE tenant_id = $1`,
        [tenantId],
    ) as { rows: Array<{ first_at: Date | null; last_at: Date | null; total: string }> };
    const span = spanRes.rows[0];
    const total = span ? Number(span.total) : 0;

    return buildSnapshot({
        planId,
        planName: plan.name,
        includedEvents: plan.includedEventsPerMonth,
        retentionDays: plan.retentionDays,
        monthEventsUsed,
        firstEventAt: span?.first_at ? span.first_at.toISOString() : null,
        lastEventAt: span?.last_at ? span.last_at.toISOString() : null,
        hasAnyEvent: total > 0,
    });
}

export function buildSnapshot(input: {
    planId: PlanId;
    planName: string;
    includedEvents: number | null;
    retentionDays: number | null;
    monthEventsUsed: number;
    firstEventAt: string | null;
    lastEventAt: string | null;
    hasAnyEvent: boolean;
}): EventMeterSnapshot {
    const percentUsed = input.includedEvents && input.includedEvents > 0
        ? Math.min(100, (input.monthEventsUsed / input.includedEvents) * 100)
        : null;
    return {
        planId: input.planId,
        planName: input.planName,
        includedEvents: input.includedEvents,
        retentionDays: input.retentionDays,
        monthEventsUsed: input.monthEventsUsed,
        percentUsed,
        firstEventAt: input.firstEventAt,
        lastEventAt: input.lastEventAt,
        hasAnyEvent: input.hasAnyEvent,
        nextUpgradeReason: NEXT_UPGRADE_REASON[input.planId],
        upgradeNotice: UPGRADE_NOTICE,
    };
}

export { UPGRADE_NOTICE, NEXT_UPGRADE_REASON };
