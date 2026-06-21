/**
 * Billing plan vocabulary compatibility layer (3AY-8R-2).
 *
 * Public pricing (`lib/pricing/rate-card.ts`, RATE_CARD_VERSION v2) uses the
 * V5-led canonical ladder: `sandbox / build / growth / scale / enterprise`.
 *
 * Billing runtime (`lib/billing/plans.ts`, `tenants.plan`,
 * `billing_subscriptions.plan_id`, Stripe Price catalog) still uses the
 * legacy ladder: `free / pro / enterprise`.
 *
 * This module is a *read-side* adapter. It lets billing code reason in
 * canonical ids while old rows, webhook payloads, and Stripe metadata
 * continue to use legacy ids. It does **not** rewrite database state, mutate
 * Stripe objects, or change write sites.
 *
 * Transitional mapping (operator-approved in 3AY-8R-1):
 *   free       <-> sandbox
 *   pro        <-> growth
 *   enterprise <-> enterprise
 *
 * `build` and `scale` are new canonical ids with no legacy equivalent. When
 * the reverse adapter is asked to coerce them back to a legacy id for the
 * existing entitlement matrix, `build` maps to `pro` (the closest paid
 * tier in the legacy matrix) and `scale` also maps to `pro`. This keeps
 * downstream entitlement reads working until the V5 plan matrix lands in a
 * later slice. Enterprise stays enterprise.
 *
 * Unknown values resolve to `sandbox` (the most restrictive plan). The
 * fallback is deliberate: a corrupt or missing plan id must never silently
 * grant a paid entitlement.
 */

export type LegacyBillingPlanId = 'free' | 'pro' | 'enterprise';

export type CanonicalBillingPlanId =
    | 'sandbox'
    | 'build'
    | 'growth'
    | 'scale'
    | 'enterprise';

const LEGACY_IDS: ReadonlySet<string> = new Set<LegacyBillingPlanId>([
    'free',
    'pro',
    'enterprise',
]);

const CANONICAL_IDS: ReadonlySet<string> = new Set<CanonicalBillingPlanId>([
    'sandbox',
    'build',
    'growth',
    'scale',
    'enterprise',
]);

const LEGACY_TO_CANONICAL: Record<LegacyBillingPlanId, CanonicalBillingPlanId> = {
    free: 'sandbox',
    pro: 'growth',
    enterprise: 'enterprise',
};

const CANONICAL_TO_LEGACY: Record<CanonicalBillingPlanId, LegacyBillingPlanId> = {
    sandbox: 'free',
    build: 'pro',
    growth: 'pro',
    scale: 'pro',
    enterprise: 'enterprise',
};

export function isLegacyBillingPlanId(value: unknown): value is LegacyBillingPlanId {
    return typeof value === 'string' && LEGACY_IDS.has(value);
}

export function isCanonicalBillingPlanId(value: unknown): value is CanonicalBillingPlanId {
    return typeof value === 'string' && CANONICAL_IDS.has(value);
}

/**
 * Coerce any plan id (legacy or canonical) to its canonical V5 form.
 *
 * Unknown / null / undefined / non-string values resolve to `sandbox` — the
 * most restrictive plan — to prevent silent privilege escalation from
 * corrupt data.
 */
export function normalizeBillingPlanId(value: unknown): CanonicalBillingPlanId {
    if (typeof value !== 'string') return 'sandbox';
    if (isCanonicalBillingPlanId(value)) return value;
    if (isLegacyBillingPlanId(value)) return LEGACY_TO_CANONICAL[value];
    return 'sandbox';
}

/**
 * Coerce any plan id (legacy or canonical) to its legacy form, used only
 * while the existing entitlement matrix in `lib/billing/plans.ts` is still
 * keyed on `free / pro / enterprise`. Remove once that matrix is rewritten
 * to canonical keys.
 *
 * Unknown values resolve to `free` (the least-privileged legacy tier),
 * matching the documented `DEFAULT_PLAN` in `plans.ts`.
 */
export function toLegacyBillingPlanId(value: unknown): LegacyBillingPlanId {
    if (typeof value !== 'string') return 'free';
    if (isLegacyBillingPlanId(value)) return value;
    if (isCanonicalBillingPlanId(value)) return CANONICAL_TO_LEGACY[value];
    return 'free';
}
