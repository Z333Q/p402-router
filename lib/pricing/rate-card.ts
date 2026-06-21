/**
 * P402 Rate Card v1 — single code-level source of truth for pricing.
 *
 * Locked from docs/internal/3AX-pricing-strategy-rate-card-and-conversion-funnel.md §4.
 * Effective on the commit date of 3AX (commit 789eb58).
 *
 * Any surface that displays a price (pricing page, homepage, trust page,
 * dashboard, sales artifacts, partner pages) MUST read from this module.
 * Changing a price requires editing this file; downstream tests assert
 * the values match here.
 *
 * Do not edit prices in this file without:
 *   - founder approval per 3AX §27.2
 *   - a versioned rate card bump (RATE_CARD_VERSION)
 *   - a corresponding edit to docs/internal/3AX-*.md
 */

export const RATE_CARD_VERSION = 'v1' as const;
export const RATE_CARD_EFFECTIVE_DATE = '2026-06-21' as const;

// ─────────────────────────────────────────────────────────────────────────────
// Plan identifiers
// ─────────────────────────────────────────────────────────────────────────────

export const PLAN_IDS = ['sandbox', 'developer', 'business', 'scale', 'enterprise'] as const;
export type PlanId = typeof PLAN_IDS[number];

export const BRIDGE_OFFER_IDS = ['proof_sprint', 'paid_pilot', 'regulated_pilot'] as const;
export type BridgeOfferId = typeof BRIDGE_OFFER_IDS[number];

// ─────────────────────────────────────────────────────────────────────────────
// Plan definitions (3AX §4.1)
// ─────────────────────────────────────────────────────────────────────────────

export interface PlanDefinition {
    readonly id: PlanId;
    readonly name: string;
    /** Public monthly price in USD when paying annual; 0 for free; null for custom. */
    readonly monthlyPriceAnnualUsd: number | null;
    /** Public monthly price in USD when paying month-to-month; null if monthly is not offered. */
    readonly monthlyPriceMonthlyUsd: number | null;
    /** Annual price in USD billed annually; null for free or custom. */
    readonly annualPriceUsd: number | null;
    /** Included metered AI events per month. null for custom commit. */
    readonly includedEventsPerMonth: number | null;
    /** Overage rate in USD per 1,000 events; null when not metered (Sandbox / Enterprise commit). */
    readonly overageUsdPer1kEvents: number | null;
    /** Retention in days; null for "custom" Enterprise. */
    readonly retentionDays: number | null;
    /** Buyer-facing one-line audience description. */
    readonly audience: string;
    /** Primary CTA label per 3AX §15.2. */
    readonly ctaLabel: string;
    /** Primary CTA href. */
    readonly ctaHref: string;
    /** Salient inclusions used by the plan card. */
    readonly inclusions: readonly string[];
    /** Sales motion classification. */
    readonly salesMotion: 'self-serve' | 'sales-assisted' | 'sales-led';
}

export const PLANS: Readonly<Record<PlanId, PlanDefinition>> = {
    sandbox: {
        id: 'sandbox',
        name: 'Sandbox',
        monthlyPriceAnnualUsd: 0,
        monthlyPriceMonthlyUsd: 0,
        annualPriceUsd: 0,
        includedEventsPerMonth: 25_000,
        overageUsdPer1kEvents: null, // hard cap
        retentionDays: 14,
        audience: 'Developers evaluating P402',
        ctaLabel: 'Start free',
        ctaHref: '/dashboard',
        inclusions: [
            'Meter and Monitor basics',
            'Basic outcomes API',
            '14-day retention',
            '2 users, 1 project, 1 tenant',
            'Community support',
        ],
        salesMotion: 'self-serve',
    },
    developer: {
        id: 'developer',
        name: 'Developer',
        monthlyPriceAnnualUsd: 249,
        monthlyPriceMonthlyUsd: 249,
        annualPriceUsd: 249 * 12,
        includedEventsPerMonth: 500_000,
        overageUsdPer1kEvents: 0.25,
        retentionDays: 90,
        audience: 'Production-ready small teams',
        // Sales-assisted today; flips to self-serve Stripe Checkout once
        // 3AY-8 billing infrastructure ships (3AY plan §11). Until then the
        // CTA routes to /contact so no surface implies paid self-serve exists.
        ctaLabel: 'Start Developer',
        ctaHref: '/get-access?intent=developer',
        inclusions: [
            'All Sandbox features',
            '90-day retention',
            'Unlimited users, projects, workflows',
            'Outcome coverage',
            'API exports',
            'Email support',
        ],
        salesMotion: 'sales-assisted',
    },
    business: {
        id: 'business',
        name: 'Business',
        monthlyPriceAnnualUsd: 2_500,
        monthlyPriceMonthlyUsd: 3_500, // 40% monthly premium (3AX §27.9)
        annualPriceUsd: 2_500 * 12,
        includedEventsPerMonth: 5_000_000,
        overageUsdPer1kEvents: 0.12,
        retentionDays: 365,
        audience: 'Department or multi-workflow team',
        ctaLabel: 'Talk to sales',
        ctaHref: '/get-access?intent=business',
        inclusions: [
            'All Developer features',
            '1-year retention',
            'Workflow attribution',
            'Shadow controls',
            'Audit exports',
            'Team roles',
            'Slack or email alerts',
            'Monthly review',
        ],
        salesMotion: 'sales-assisted',
    },
    scale: {
        id: 'scale',
        name: 'Scale',
        monthlyPriceAnnualUsd: 5_000,
        monthlyPriceMonthlyUsd: null, // monthly not offered (3AX §4.1)
        annualPriceUsd: 5_000 * 12,
        includedEventsPerMonth: 15_000_000,
        overageUsdPer1kEvents: 0.08,
        retentionDays: 730,
        audience: 'Multi-department or governance-led teams',
        ctaLabel: 'Request quote',
        ctaHref: '/get-access?intent=scale',
        inclusions: [
            'All Business features',
            'Multi-department views',
            'Advanced controls',
            'Priority support',
            'Expanded retention',
            'Procurement-ready exports',
            'Quarterly business review',
        ],
        salesMotion: 'sales-led',
    },
    enterprise: {
        id: 'enterprise',
        name: 'Enterprise',
        monthlyPriceAnnualUsd: null, // custom; floor 60k ARR per 3AX §4.1
        monthlyPriceMonthlyUsd: null,
        annualPriceUsd: null,
        includedEventsPerMonth: null, // custom commit, 25M+ floor
        overageUsdPer1kEvents: null, // custom committed rate
        retentionDays: null, // custom
        audience: 'Procurement-led or regulated buyers',
        ctaLabel: 'Request enterprise pricing',
        ctaHref: '/get-access?intent=enterprise',
        inclusions: [
            'All Scale features',
            'SSO and SAML',
            'SCIM',
            'Fine-grained RBAC',
            'Custom retention',
            'DPA',
            'SLA',
            'Procurement pack',
            'Custom support',
            'Optional private deployment design',
        ],
        salesMotion: 'sales-led',
    },
} as const;

/** Public Enterprise floor in ARR USD (3AX §1.2 + §7). */
export const ENTERPRISE_FLOOR_ARR_USD = 60_000 as const;
/** Enterprise event commit floor per year (3AX §4.1). */
export const ENTERPRISE_EVENT_COMMIT_FLOOR_PER_YEAR = 25_000_000 as const;

// ─────────────────────────────────────────────────────────────────────────────
// Bridge offers (3AX §4.2)
// ─────────────────────────────────────────────────────────────────────────────

export interface BridgeOfferDefinition {
    readonly id: BridgeOfferId;
    readonly name: string;
    /** Fixed price in USD; for regulated_pilot this is the floor. */
    readonly priceUsd: number;
    /** True if priceUsd is a floor and may be higher. */
    readonly priceIsFloor: boolean;
    /** Engagement length in days. */
    readonly durationDays: number;
    /** Buyer-facing scope summary. */
    readonly scope: string;
    /** Credit policy description. */
    readonly creditPolicy: string;
    /** Audience / vertical hint. */
    readonly audience: string;
    /** CTA label. */
    readonly ctaLabel: string;
    /** CTA href. */
    readonly ctaHref: string;
}

export const BRIDGE_OFFERS: Readonly<Record<BridgeOfferId, BridgeOfferDefinition>> = {
    proof_sprint: {
        id: 'proof_sprint',
        name: 'Proof Sprint',
        priceUsd: 15_000,
        priceIsFloor: false,
        durationDays: 14,
        scope: '1 workflow, 1 tenant, 1 provider integration path, executive readout',
        creditPolicy: '100% credited toward Paid Pilot if signed within 30 days',
        audience: 'Buyers ready to scope a paid diagnostic before committing to a Pilot',
        ctaLabel: 'Book proof sprint',
        ctaHref: '/get-access?intent=proof-sprint',
    },
    paid_pilot: {
        id: 'paid_pilot',
        name: 'Paid Pilot',
        priceUsd: 35_000,
        priceIsFloor: false,
        durationDays: 60, // 60-90 day range per 3AX §4.2; minimum surfaced
        scope: 'Up to 3 workflows, target event volume, outcome coverage goal, stakeholder map, executive readout',
        creditPolicy: '50% credited toward annual if signed within 30 days of pilot close',
        audience: 'Multi-workflow buyers with procurement involvement',
        ctaLabel: 'Design pilot',
        ctaHref: '/get-access?intent=paid-pilot',
    },
    regulated_pilot: {
        id: 'regulated_pilot',
        name: 'Regulated Pilot',
        priceUsd: 50_000,
        priceIsFloor: true,
        durationDays: 90,
        scope: 'Healthcare, finance, legal, insurance, public sector; privacy mode and evidence requirements included',
        creditPolicy: '50% credited toward annual if signed within 30 days of pilot close',
        audience: 'Buyers with security and procurement-heavy verticals',
        ctaLabel: 'Discuss regulated pilot',
        ctaHref: '/get-access?intent=regulated-pilot',
    },
} as const;

// ─────────────────────────────────────────────────────────────────────────────
// Overage warning thresholds (3AX §5.2)
// ─────────────────────────────────────────────────────────────────────────────

export const OVERAGE_WARNING_THRESHOLDS_PERCENT = [50, 80, 100, 120] as const;

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Returns the smallest plan whose included monthly event allowance is >=
 * the given event volume. Returns 'enterprise' for volumes above the Scale
 * inclusion (3AX §12.5 upgrade triggers).
 */
export function getPlanByMonthlyEvents(events: number): PlanId {
    if (!Number.isFinite(events) || events < 0) return 'sandbox';
    for (const planId of PLAN_IDS) {
        const included = PLANS[planId].includedEventsPerMonth;
        if (included === null) return 'enterprise';
        if (events <= included) return planId;
    }
    return 'enterprise';
}

/**
 * Formats a USD number for display; e.g. 2500 -> "$2,500", 60_000 -> "$60,000".
 * Returns "Custom" for null, "$0" for 0.
 */
export function formatUsd(value: number | null): string {
    if (value === null) return 'Custom';
    return `$${value.toLocaleString('en-US')}`;
}

/**
 * Compact human format for included event allowances; e.g. 500_000 -> "500k",
 * 5_000_000 -> "5M", 15_000_000 -> "15M".
 */
export function formatEventAllowance(events: number | null): string {
    if (events === null) return 'Custom commit';
    if (events >= 1_000_000) return `${(events / 1_000_000).toFixed(events % 1_000_000 === 0 ? 0 : 1)}M`;
    if (events >= 1_000) return `${(events / 1_000).toFixed(0)}k`;
    return events.toLocaleString('en-US');
}

/**
 * Computes overage cost for `events` over the plan's included allowance.
 * Returns 0 when within allowance or when overage is not applicable.
 */
export function computeOverageUsd(planId: PlanId, eventsConsumed: number): number {
    const plan = PLANS[planId];
    if (plan.includedEventsPerMonth === null) return 0;
    if (plan.overageUsdPer1kEvents === null) return 0;
    if (eventsConsumed <= plan.includedEventsPerMonth) return 0;
    const overEvents = eventsConsumed - plan.includedEventsPerMonth;
    return (overEvents / 1000) * plan.overageUsdPer1kEvents;
}

/**
 * Buyer-facing label for the monthly premium when monthly is offered alongside
 * annual; returns null when the plan is annual-only or free.
 */
export function getMonthlyPremiumPercent(planId: PlanId): number | null {
    const plan = PLANS[planId];
    if (plan.monthlyPriceAnnualUsd === null || plan.monthlyPriceMonthlyUsd === null) return null;
    if (plan.monthlyPriceAnnualUsd === 0) return null;
    const premium = (plan.monthlyPriceMonthlyUsd - plan.monthlyPriceAnnualUsd) / plan.monthlyPriceAnnualUsd;
    return Math.round(premium * 100);
}

// ─────────────────────────────────────────────────────────────────────────────
// Locked copy strings (3AX §14, §15, §17.1)
// ─────────────────────────────────────────────────────────────────────────────

/** Locked support line on the homepage hero (3AX §14.2). */
export const HOMEPAGE_PRICING_SUPPORT_LINE =
    'Start free. Production plans from $249/month. Enterprise pilots from $35k.';

/** Locked support line on the pricing page hero (3AX §15.1). */
export const PRICING_PAGE_SUPPORT_LINE =
    'Start free. Upgrade when usage and governance needs grow.';

/** Locked trust microcopy under hero CTAs (3AX §14.2). */
export const HOMEPAGE_TRUST_MICROCOPY =
    'Metadata-first. Tenant-scoped. Usage-based. Procurement-ready path.';
