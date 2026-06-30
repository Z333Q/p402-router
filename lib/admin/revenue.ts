/**
 * Phase 1A: Revenue Visibility Foundation — admin-side data helpers.
 *
 * Read-only. No PATCH. No tenant plan edits. No billing status edits.
 * No Stripe API calls. No payout or commission changes. No SQL mutation.
 *
 * Surfaces:
 *   - listBillingTenants         — tenant + plan + Stripe ids + subscription
 *                                  status + month events + access-intent fields
 *   - getAccessIntentReport      — aggregates over access_requests
 *   - getFunnelVisibility        — signup → first metered event funnel rollup
 *   - listPaidIntentQueue        — paid-intent leads with suggested next action
 */

import db from '@/lib/db';
import { INTENT_IDS, type IntentId } from '@/lib/pricing/intent';

export interface BillingTenantRow {
    readonly tenantId: string;
    readonly name: string | null;
    readonly ownerEmail: string | null;
    readonly plan: string | null;
    readonly stripeCustomerId: string | null;
    readonly stripeSubscriptionId: string | null;
    readonly subscriptionStatus: string | null;
    readonly subscriptionProvider: string | null;
    readonly subscriptionPlanId: string | null;
    readonly subscriptionCurrentPeriodEnd: string | null;
    readonly monthEventCount: number;
    readonly lastEventAt: string | null;
    readonly accessRequestIntent: string | null;
    readonly accessRequestResolvedIntent: string | null;
    readonly accessRequestPlanId: string | null;
    readonly accessRequestOfferId: string | null;
    readonly accessRequestCreatedAt: string | null;
    readonly tenantCreatedAt: string | null;
}

export async function listBillingTenants(limit = 100): Promise<BillingTenantRow[]> {
    const safeLimit = Math.max(1, Math.min(500, Math.trunc(limit)));
    const { rows } = await db.query(
        `
        SELECT
            t.id                                        AS tenant_id,
            t.name                                      AS name,
            t.owner_email                               AS owner_email,
            t.plan                                      AS plan,
            t.stripe_customer_id                        AS stripe_customer_id,
            t.stripe_subscription_id                    AS stripe_subscription_id,
            t.created_at                                AS tenant_created_at,
            bs.status                                   AS subscription_status,
            bs.provider                                 AS subscription_provider,
            bs.plan_id                                  AS subscription_plan_id,
            bs.current_period_end                       AS subscription_current_period_end,
            ev.month_event_count                        AS month_event_count,
            ev.last_event_at                            AS last_event_at,
            ar.intent                                   AS ar_intent,
            ar.resolved_intent                          AS ar_resolved_intent,
            ar.plan_id                                  AS ar_plan_id,
            ar.offer_id                                 AS ar_offer_id,
            ar.created_at                               AS ar_created_at
        FROM tenants t
        LEFT JOIN LATERAL (
            SELECT status, provider, plan_id, current_period_end
            FROM billing_subscriptions
            WHERE tenant_id = t.id
            ORDER BY created_at DESC
            LIMIT 1
        ) bs ON TRUE
        LEFT JOIN LATERAL (
            SELECT
                COUNT(*) FILTER (WHERE event_time >= DATE_TRUNC('month', NOW()))::bigint AS month_event_count,
                MAX(event_time) AS last_event_at
            FROM ai_economic_events
            WHERE tenant_id = t.id
        ) ev ON TRUE
        LEFT JOIN LATERAL (
            SELECT intent, resolved_intent, plan_id, offer_id, created_at
            FROM access_requests
            WHERE email IS NOT NULL AND email = t.owner_email
            ORDER BY created_at DESC
            LIMIT 1
        ) ar ON TRUE
        ORDER BY t.created_at DESC NULLS LAST
        LIMIT $1
        `,
        [safeLimit],
    ) as { rows: Array<Record<string, unknown>> };

    return rows.map((r) => ({
        tenantId: String(r.tenant_id),
        name: r.name == null ? null : String(r.name),
        ownerEmail: r.owner_email == null ? null : String(r.owner_email),
        plan: r.plan == null ? null : String(r.plan),
        stripeCustomerId: r.stripe_customer_id == null ? null : String(r.stripe_customer_id),
        stripeSubscriptionId: r.stripe_subscription_id == null ? null : String(r.stripe_subscription_id),
        subscriptionStatus: r.subscription_status == null ? null : String(r.subscription_status),
        subscriptionProvider: r.subscription_provider == null ? null : String(r.subscription_provider),
        subscriptionPlanId: r.subscription_plan_id == null ? null : String(r.subscription_plan_id),
        subscriptionCurrentPeriodEnd: r.subscription_current_period_end == null
            ? null
            : new Date(r.subscription_current_period_end as string | Date).toISOString(),
        monthEventCount: Number(r.month_event_count ?? 0),
        lastEventAt: r.last_event_at == null ? null : new Date(r.last_event_at as string | Date).toISOString(),
        accessRequestIntent: r.ar_intent == null ? null : String(r.ar_intent),
        accessRequestResolvedIntent: r.ar_resolved_intent == null ? null : String(r.ar_resolved_intent),
        accessRequestPlanId: r.ar_plan_id == null ? null : String(r.ar_plan_id),
        accessRequestOfferId: r.ar_offer_id == null ? null : String(r.ar_offer_id),
        accessRequestCreatedAt: r.ar_created_at == null
            ? null
            : new Date(r.ar_created_at as string | Date).toISOString(),
        tenantCreatedAt: r.tenant_created_at == null
            ? null
            : new Date(r.tenant_created_at as string | Date).toISOString(),
    }));
}

export interface AccessIntentRecentRow {
    readonly email: string | null;
    readonly company: string | null;
    readonly role: string | null;
    readonly rpd: string | null;
    readonly intent: string | null;
    readonly resolvedIntent: string | null;
    readonly planId: string | null;
    readonly offerId: string | null;
    readonly createdAt: string | null;
}

export interface AccessIntentReport {
    readonly total: number;
    readonly unknownIntentCount: number;
    readonly byResolvedIntent: ReadonlyArray<{ resolvedIntent: string | null; count: number }>;
    readonly byPlanId: ReadonlyArray<{ planId: string | null; count: number }>;
    readonly byOfferId: ReadonlyArray<{ offerId: string | null; count: number }>;
    readonly recent: ReadonlyArray<AccessIntentRecentRow>;
}

export async function getAccessIntentReport(recentLimit = 50): Promise<AccessIntentReport> {
    const safeLimit = Math.max(1, Math.min(200, Math.trunc(recentLimit)));

    const totalsRes = await db.query(
        `
        SELECT
            COUNT(*)::bigint AS total,
            COUNT(*) FILTER (WHERE resolved_intent IS NULL)::bigint AS unknown
        FROM access_requests
        `,
    ) as { rows: Array<{ total: string; unknown: string }> };
    const total = Number(totalsRes.rows[0]?.total ?? '0');
    const unknown = Number(totalsRes.rows[0]?.unknown ?? '0');

    const byResolvedRes = await db.query(
        `
        SELECT resolved_intent AS k, COUNT(*)::bigint AS n
        FROM access_requests
        GROUP BY resolved_intent
        ORDER BY n DESC, k ASC NULLS LAST
        `,
    ) as { rows: Array<{ k: string | null; n: string }> };

    const byPlanRes = await db.query(
        `
        SELECT plan_id AS k, COUNT(*)::bigint AS n
        FROM access_requests
        GROUP BY plan_id
        ORDER BY n DESC, k ASC NULLS LAST
        `,
    ) as { rows: Array<{ k: string | null; n: string }> };

    const byOfferRes = await db.query(
        `
        SELECT offer_id AS k, COUNT(*)::bigint AS n
        FROM access_requests
        GROUP BY offer_id
        ORDER BY n DESC, k ASC NULLS LAST
        `,
    ) as { rows: Array<{ k: string | null; n: string }> };

    const recentRes = await db.query(
        `
        SELECT email, company, role, rpd, intent, resolved_intent, plan_id, offer_id, created_at
        FROM access_requests
        ORDER BY created_at DESC NULLS LAST
        LIMIT $1
        `,
        [safeLimit],
    ) as { rows: Array<Record<string, unknown>> };

    return {
        total,
        unknownIntentCount: unknown,
        byResolvedIntent: byResolvedRes.rows.map((r) => ({
            resolvedIntent: r.k == null ? null : String(r.k),
            count: Number(r.n),
        })),
        byPlanId: byPlanRes.rows.map((r) => ({
            planId: r.k == null ? null : String(r.k),
            count: Number(r.n),
        })),
        byOfferId: byOfferRes.rows.map((r) => ({
            offerId: r.k == null ? null : String(r.k),
            count: Number(r.n),
        })),
        recent: recentRes.rows.map((r) => ({
            email: r.email == null ? null : String(r.email),
            company: r.company == null ? null : String(r.company),
            role: r.role == null ? null : String(r.role),
            rpd: r.rpd == null ? null : String(r.rpd),
            intent: r.intent == null ? null : String(r.intent),
            resolvedIntent: r.resolved_intent == null ? null : String(r.resolved_intent),
            planId: r.plan_id == null ? null : String(r.plan_id),
            offerId: r.offer_id == null ? null : String(r.offer_id),
            createdAt: r.created_at == null ? null : new Date(r.created_at as string | Date).toISOString(),
        })),
    };
}

export interface FunnelStep {
    readonly key: string;
    readonly label: string;
    readonly count: number | null;
    readonly status: 'tracked' | 'not_tracked_yet';
    readonly note: string;
}

export interface FunnelVisibility {
    readonly steps: ReadonlyArray<FunnelStep>;
    readonly missingSchema: ReadonlyArray<string>;
}

async function safeCount(sql: string, params: unknown[] = []): Promise<number | null> {
    try {
        const res = await db.query(sql, params) as { rows: Array<{ n: string }> };
        return Number(res.rows[0]?.n ?? '0');
    } catch {
        return null;
    }
}

async function tableExists(table: string): Promise<boolean> {
    try {
        const res = await db.query(
            `SELECT 1 FROM information_schema.tables WHERE table_name = $1 LIMIT 1`,
            [table],
        ) as { rows: unknown[] };
        return res.rows.length > 0;
    } catch {
        return false;
    }
}

export async function getFunnelVisibility(): Promise<FunnelVisibility> {
    const missing: string[] = [];

    const accessRequestsCount = await safeCount(`SELECT COUNT(*)::bigint AS n FROM access_requests`);
    const tenantsCount = await safeCount(`SELECT COUNT(*)::bigint AS n FROM tenants`);

    const hasApiKeys = await tableExists('api_keys');
    const apiKeyCount = hasApiKeys ? await safeCount(`SELECT COUNT(*)::bigint AS n FROM api_keys`) : null;
    if (!hasApiKeys) missing.push('api_keys (column or table not found; API-key step not tracked yet)');

    const distinctEmittersCount = await safeCount(
        `SELECT COUNT(DISTINCT tenant_id)::bigint AS n FROM ai_economic_events WHERE tenant_id IS NOT NULL`,
    );

    let firstAttributionCount: number | null = null;
    let firstAttributionNote = 'tracked via ai_economic_events.customer_id IS NOT NULL';
    try {
        const res = await db.query(
            `SELECT COUNT(DISTINCT tenant_id)::bigint AS n
             FROM ai_economic_events
             WHERE customer_id IS NOT NULL`,
        ) as { rows: Array<{ n: string }> };
        firstAttributionCount = Number(res.rows[0]?.n ?? '0');
    } catch {
        firstAttributionCount = null;
        firstAttributionNote = 'ai_economic_events.customer_id not present; attribution step not tracked yet';
        missing.push('ai_economic_events.customer_id (attribution column not present)');
    }

    const hasFunnelEvents = await tableExists('funnel_events');
    let dashboardViewCount: number | null = null;
    let dashboardViewNote = 'tracked via funnel_events.event_name LIKE \'%dashboard_view%\'';
    if (hasFunnelEvents) {
        dashboardViewCount = await safeCount(
            `SELECT COUNT(DISTINCT COALESCE(tenant_id::text, anonymous_id))::bigint AS n
             FROM funnel_events
             WHERE event_name ILIKE '%dashboard%view%'`,
        );
    } else {
        dashboardViewNote = 'funnel_events table not present; dashboard view step not tracked yet';
        missing.push('funnel_events table not present');
    }

    const steps: FunnelStep[] = [
        {
            key: 'access_request_submitted',
            label: 'Access request submitted',
            count: accessRequestsCount,
            status: accessRequestsCount === null ? 'not_tracked_yet' : 'tracked',
            note: 'COUNT(*) FROM access_requests',
        },
        {
            key: 'tenant_created',
            label: 'Tenant created',
            count: tenantsCount,
            status: tenantsCount === null ? 'not_tracked_yet' : 'tracked',
            note: 'COUNT(*) FROM tenants',
        },
        {
            key: 'api_key_created',
            label: 'API key created',
            count: apiKeyCount,
            status: hasApiKeys && apiKeyCount !== null ? 'tracked' : 'not_tracked_yet',
            note: hasApiKeys ? 'COUNT(*) FROM api_keys' : 'api_keys table not found',
        },
        {
            key: 'first_metered_event',
            label: 'First metered event (distinct tenants)',
            count: distinctEmittersCount,
            status: distinctEmittersCount === null ? 'not_tracked_yet' : 'tracked',
            note: 'COUNT(DISTINCT tenant_id) FROM ai_economic_events',
        },
        {
            key: 'first_attribution',
            label: 'First attribution present (distinct tenants)',
            count: firstAttributionCount,
            status: firstAttributionCount === null ? 'not_tracked_yet' : 'tracked',
            note: firstAttributionNote,
        },
        {
            key: 'first_dashboard_view',
            label: 'First dashboard view',
            count: dashboardViewCount,
            status: hasFunnelEvents && dashboardViewCount !== null ? 'tracked' : 'not_tracked_yet',
            note: dashboardViewNote,
        },
    ];

    return { steps, missingSchema: missing };
}

export const PAID_INTENT_IDS = [
    'build',
    'growth',
    'scale',
    'enterprise',
    'ai-spend-audit',
    'paid-pilot',
    'regulated-pilot',
] as const;
export type PaidIntentId = typeof PAID_INTENT_IDS[number];

const PAID_INTENT_SET: ReadonlySet<string> = new Set<string>(PAID_INTENT_IDS);

export function isPaidIntent(value: string | null | undefined): value is PaidIntentId {
    return typeof value === 'string' && PAID_INTENT_SET.has(value);
}

const NEXT_ACTION_BY_INTENT: Readonly<Record<PaidIntentId, string>> = {
    build: 'Follow up when checkout is enabled.',
    growth: 'Qualify product margin use case.',
    scale: 'Book scoping call with sales.',
    enterprise: 'Book discovery and procurement intro.',
    'ai-spend-audit': 'Request usage export or send invoice.',
    'paid-pilot': 'Design pilot scope and milestone plan.',
    'regulated-pilot': 'Route to security review and BAA path.',
};

export function suggestedNextAction(resolvedIntent: string | null | undefined): string {
    if (isPaidIntent(resolvedIntent)) return NEXT_ACTION_BY_INTENT[resolvedIntent];
    return 'Not a paid intent. No action required.';
}

export interface PaidIntentRow {
    readonly email: string | null;
    readonly company: string | null;
    readonly role: string | null;
    readonly resolvedIntent: string | null;
    readonly planId: string | null;
    readonly offerId: string | null;
    readonly rpd: string | null;
    readonly createdAt: string | null;
    readonly suggestedNextAction: string;
}

export async function listPaidIntentQueue(limit = 100): Promise<PaidIntentRow[]> {
    const safeLimit = Math.max(1, Math.min(500, Math.trunc(limit)));
    const { rows } = await db.query(
        `
        SELECT email, company, role, resolved_intent, plan_id, offer_id, rpd, created_at
        FROM access_requests
        WHERE resolved_intent = ANY($1::text[])
        ORDER BY created_at DESC NULLS LAST
        LIMIT $2
        `,
        [PAID_INTENT_IDS as unknown as string[], safeLimit],
    ) as { rows: Array<Record<string, unknown>> };

    return rows.map((r) => ({
        email: r.email == null ? null : String(r.email),
        company: r.company == null ? null : String(r.company),
        role: r.role == null ? null : String(r.role),
        resolvedIntent: r.resolved_intent == null ? null : String(r.resolved_intent),
        planId: r.plan_id == null ? null : String(r.plan_id),
        offerId: r.offer_id == null ? null : String(r.offer_id),
        rpd: r.rpd == null ? null : String(r.rpd),
        createdAt: r.created_at == null ? null : new Date(r.created_at as string | Date).toISOString(),
        suggestedNextAction: suggestedNextAction(r.resolved_intent == null ? null : String(r.resolved_intent)),
    }));
}

export { INTENT_IDS };
export type { IntentId };
