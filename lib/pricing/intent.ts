/**
 * Pricing-intent vocabulary for /get-access.
 *
 * Drives heading, subheading, and CRM hand-off when a buyer arrives from
 * /pricing with ?intent=<value>. Every value below has a one-to-one mapping
 * with a /pricing CTA per the V5-led hybrid ladder (3AY-Pricing-Realign).
 *
 * Source of truth for prices / scope / credit policy is lib/pricing/rate-card.ts;
 * intent copy references those constants where the buyer will see a number.
 *
 * Legacy intents from the prior 3AX ladder (`developer`, `business`,
 * `proof-sprint`) are not removed — they continue to resolve via a legacy map
 * so existing inbound links and bookmarks keep working. See LEGACY_INTENT_MAP.
 */

import {
    BRIDGE_OFFERS,
    ENTERPRISE_FLOOR_ARR_USD,
    PLANS,
    formatUsd,
    type BridgeOfferId,
    type PlanId,
} from './rate-card';

export const INTENT_IDS = [
    'build',
    'growth',
    'scale',
    'enterprise',
    'ai-spend-audit',
    'paid-pilot',
    'regulated-pilot',
    'scoping-call',
] as const;
export type IntentId = typeof INTENT_IDS[number];

export const INTENT_ID_SET: ReadonlySet<string> = new Set(INTENT_IDS);

/**
 * Legacy intent values that no longer correspond to a public SKU but should
 * keep working for existing inbound links. Each maps to a current intent.
 *
 * - `developer` (3AX, $249/mo) → `build` (V5, $49/mo)
 * - `business` (3AX, $2,500/mo) → `scale` (V5, $799/mo)
 * - `proof-sprint` (3AX, $15k) → `ai-spend-audit` (V5, $1,500)
 */
export const LEGACY_INTENT_MAP: Readonly<Record<string, IntentId>> = {
    developer: 'build',
    business: 'scale',
    'proof-sprint': 'ai-spend-audit',
};

export function resolveIntent(value: string | null | undefined): IntentId | null {
    if (typeof value !== 'string') return null;
    if (INTENT_ID_SET.has(value)) return value as IntentId;
    if (value in LEGACY_INTENT_MAP) return LEGACY_INTENT_MAP[value]!;
    return null;
}

export function isKnownIntent(value: string | null | undefined): value is IntentId {
    return resolveIntent(value) !== null;
}

export interface IntentCopy {
    readonly intent: IntentId | 'unknown';
    /** Page H1 / hero heading. */
    readonly heading: string;
    /** Subheading under the hero. */
    readonly subheading: string;
    /** One-line banner above the form explaining what happens after submit. */
    readonly handoffBanner: string;
    /** Buyer-facing scope / inclusions tied to rate-card values. */
    readonly details: readonly string[];
    /** Pre-selected useCase value on the form. */
    readonly defaultUseCase: string;
    /** Plan id when the intent maps directly to a plan; null for bridge offers / scoping. */
    readonly planId: PlanId | null;
    /** Bridge offer id when the intent maps to a bridge offer; null otherwise. */
    readonly offerId: BridgeOfferId | null;
}

const UNKNOWN: IntentCopy = {
    intent: 'unknown',
    heading: 'Request access to P402',
    subheading: 'Tell us about your AI workflow. We respond within 24 hours.',
    handoffBanner:
        'Our team routes inbound requests based on the workflow you describe. No card required.',
    details: [
        'Free Sandbox available for builders evaluating P402.',
        'Production plans, audits, pilots, and Enterprise contracts are sales-assisted.',
    ],
    defaultUseCase: 'Other',
    planId: null,
    offerId: null,
};

function buildPlanIntent(
    intent: IntentId,
    planId: PlanId,
    heading: string,
    subheading: string,
    handoffBanner: string,
    details: string[],
    defaultUseCase: string,
): IntentCopy {
    return { intent, heading, subheading, handoffBanner, details, defaultUseCase, planId, offerId: null };
}

function buildOfferIntent(
    intent: IntentId,
    offerId: BridgeOfferId,
    heading: string,
    subheading: string,
    handoffBanner: string,
    details: string[],
    defaultUseCase: string,
): IntentCopy {
    return { intent, heading, subheading, handoffBanner, details, defaultUseCase, planId: null, offerId };
}

const BUILD = PLANS.build;
const GROWTH = PLANS.growth;
const SCL = PLANS.scale;
const ASA = BRIDGE_OFFERS.ai_spend_audit;
const PP = BRIDGE_OFFERS.paid_pilot;
const RP = BRIDGE_OFFERS.regulated_pilot;

/**
 * Locked intent copy. Numbers come from lib/pricing/rate-card.ts so a price
 * change requires editing one file. Source-shape tests assert that the
 * dynamic values above are reflected in the rendered output.
 */
export const INTENT_COPY: Readonly<Record<IntentId | 'unknown', IntentCopy>> = {
    unknown: UNKNOWN,
    build: buildPlanIntent(
        'build',
        'build',
        `Start with ${BUILD.name} — ${formatUsd(BUILD.monthlyPriceAnnualUsd)}/month`,
        'Production-ready for small teams that already have AI workflows in motion.',
        'Paid self-serve checkout for Build and Growth will ship with our Revenue Billing Foundation (3AY-8R). Until then, we onboard accounts manually so you can start without a card.',
        [
            `${(BUILD.includedEventsPerMonth ?? 0).toLocaleString('en-US')} metered AI events per month included.`,
            `${BUILD.retentionDays}-day retention.`,
            'Unlimited users, projects, and workflows.',
            `Overage at $${BUILD.overageUsdPer1kEvents?.toFixed(2)} per 1,000 events.`,
        ],
        'Production AI workflow',
    ),
    growth: buildPlanIntent(
        'growth',
        'growth',
        `Start with ${GROWTH.name} — ${formatUsd(GROWTH.monthlyPriceAnnualUsd)}/month`,
        'Production AI products with paying customers, customer-level margin, retry and context waste detection.',
        'Paid self-serve checkout for Build and Growth will ship with our Revenue Billing Foundation (3AY-8R). Until then, we onboard accounts manually so you can start without a card.',
        [
            `${(GROWTH.includedEventsPerMonth ?? 0).toLocaleString('en-US')} metered AI events per month included.`,
            `${GROWTH.retentionDays}-day retention.`,
            'Customer-level cost attribution. Feature-level margin reporting.',
            `Overage at $${GROWTH.overageUsdPer1kEvents?.toFixed(2)} per 1,000 events.`,
        ],
        'Embedded AI margin control',
    ),
    scale: buildPlanIntent(
        'scale',
        'scale',
        `Talk to sales about ${SCL.name}`,
        'High-volume AI products and platform teams with material AI footprint.',
        'Scale is annual-only and sales-led. Expect a scoping call within two business days.',
        [
            `${formatUsd(SCL.monthlyPriceAnnualUsd)}/month on annual contract.`,
            `${(SCL.includedEventsPerMonth ?? 0).toLocaleString('en-US')} metered AI events per month.`,
            '1-year retention. Advanced controls. Customer budgets. Margin floor enforcement. Audit exports.',
        ],
        'High-volume AI platform',
    ),
    enterprise: buildPlanIntent(
        'enterprise',
        'enterprise',
        `Request Enterprise pricing — from ${formatUsd(ENTERPRISE_FLOOR_ARR_USD)} ARR`,
        'SSO, SCIM, fine-grained RBAC, DPA, SLA, procurement-ready evidence. Typically 1 to 3 percent of governed annual AI spend.',
        'Enterprise contracts are sales-led with procurement support. Our team responds within 24 hours to schedule a discovery call.',
        [
            `From ${formatUsd(ENTERPRISE_FLOOR_ARR_USD)} ARR (annual only).`,
            'SSO / SAML, SCIM, fine-grained RBAC, custom retention, DPA, SLA, procurement pack.',
            'Custom support and optional private deployment design.',
        ],
        'Enterprise AI spend governance',
    ),
    'ai-spend-audit': buildOfferIntent(
        'ai-spend-audit',
        'ai_spend_audit',
        `Book an ${ASA.name} — ${formatUsd(ASA.priceUsd)}`,
        'One-time enterprise diagnostic. Vendor invoice review, usage import, workflow-level cost analysis, executive report.',
        'AI Spend Audit scoping calls are scheduled within two business days. Engagement begins after invoice signature and executive sponsor confirmation.',
        [
            `${formatUsd(ASA.priceUsd)} fixed fee, one-time engagement.`,
            ASA.scope,
            ASA.creditPolicy,
        ],
        'Enterprise AI spend governance',
    ),
    'paid-pilot': buildOfferIntent(
        'paid-pilot',
        'paid_pilot',
        `Design a ${PP.name} — ${formatUsd(PP.priceUsd)}`,
        'Multi-workflow accountability pilot. Procurement-ready evidence pack and annual proposal.',
        'Paid Pilot scoping calls include a stakeholder map and milestone plan. We respond within two business days.',
        [
            `${formatUsd(PP.priceUsd)} fixed fee, ${PP.durationDays ?? 60} to 90 days.`,
            PP.scope,
            PP.creditPolicy,
        ],
        'Multi-workflow pilot',
    ),
    'regulated-pilot': buildOfferIntent(
        'regulated-pilot',
        'regulated_pilot',
        `Discuss a ${RP.name} — from ${formatUsd(RP.priceUsd)}`,
        'Healthcare, finance, legal, insurance, public sector. Privacy mode and evidence requirements included.',
        'Regulated Pilots require a security and procurement review before SOW signature. BAA path available after security and contracting review.',
        [
            `Starting at ${formatUsd(RP.priceUsd)} for a ${RP.durationDays ?? 90}-day engagement.`,
            RP.scope,
            RP.creditPolicy,
        ],
        'Regulated industry pilot',
    ),
    'scoping-call': {
        intent: 'scoping-call',
        heading: 'Book a 20-minute scoping call',
        subheading: 'Tell us about the AI workflow you want to make accountable. We come back with a recommendation.',
        handoffBanner:
            'Scoping calls are non-binding and free. We respond within one business day to find a time.',
        details: [
            'No card required. No commitment.',
            'Outcome of the call: one-line recommendation (Sandbox, Build, AI Spend Audit, Paid Pilot, or no-go).',
            `Reference pricing: Sandbox free; Build ${formatUsd(BUILD.monthlyPriceAnnualUsd)}/month; Growth ${formatUsd(GROWTH.monthlyPriceAnnualUsd)}/month; AI Spend Audit ${formatUsd(ASA.priceUsd)} one-time; Enterprise from ${formatUsd(ENTERPRISE_FLOOR_ARR_USD)} ARR.`,
        ],
        defaultUseCase: 'Scoping call',
        planId: null,
        offerId: null,
    },
};

/** Returns intent copy for the requested intent (or the unknown fallback). */
export function getIntentCopy(value: string | null | undefined): IntentCopy {
    const resolved = resolveIntent(value);
    if (resolved === null) return INTENT_COPY.unknown;
    return INTENT_COPY[resolved];
}
