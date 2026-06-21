/**
 * Pricing-intent vocabulary for /get-access.
 *
 * Drives heading, subheading, and CRM hand-off when a buyer arrives from
 * /pricing with ?intent=<value>. Every value below has a one-to-one mapping
 * with a /pricing CTA per 3AY-3.
 *
 * Source of truth for prices / scope / credit policy is lib/pricing/rate-card.ts;
 * intent copy references those constants where the buyer will see a number.
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
    'developer',
    'business',
    'scale',
    'enterprise',
    'proof-sprint',
    'paid-pilot',
    'regulated-pilot',
    'scoping-call',
] as const;
export type IntentId = typeof INTENT_IDS[number];

export const INTENT_ID_SET: ReadonlySet<string> = new Set(INTENT_IDS);

export function isKnownIntent(value: string | null | undefined): value is IntentId {
    if (typeof value !== 'string') return false;
    return INTENT_ID_SET.has(value);
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
        'Production plans, pilots, and Enterprise contracts are sales-assisted.',
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

const DEV = PLANS.developer;
const BIZ = PLANS.business;
const SCL = PLANS.scale;
const ENT = PLANS.enterprise;
const PS = BRIDGE_OFFERS.proof_sprint;
const PP = BRIDGE_OFFERS.paid_pilot;
const RP = BRIDGE_OFFERS.regulated_pilot;

/**
 * Locked intent copy. Numbers come from lib/pricing/rate-card.ts so a price
 * change requires editing one file. Source-shape tests assert that the
 * dynamic values above are reflected in the rendered output.
 */
export const INTENT_COPY: Readonly<Record<IntentId | 'unknown', IntentCopy>> = {
    unknown: UNKNOWN,
    developer: buildPlanIntent(
        'developer',
        'developer',
        `Start with ${DEV.name} — ${formatUsd(DEV.monthlyPriceAnnualUsd)}/month`,
        'Production-ready for small teams that already have AI workflows in motion.',
        'Paid self-serve checkout for Developer is in progress and will ship with our Revenue Billing Foundation (3AY-8R). Until then, we onboard Developer accounts manually so you can start without a card.',
        [
            `${(DEV.includedEventsPerMonth ?? 0).toLocaleString('en-US')} metered AI events per month included.`,
            `${DEV.retentionDays}-day retention.`,
            'Unlimited users, projects, and workflows.',
            `Overage at $${DEV.overageUsdPer1kEvents?.toFixed(2)} per 1,000 events.`,
        ],
        'Production AI workflow',
    ),
    business: buildPlanIntent(
        'business',
        'business',
        `Talk to sales about ${BIZ.name}`,
        'Workflow attribution, shadow controls, audit exports for departments running multi-workflow AI.',
        'Business is sales-assisted on annual contracts. We schedule a 30-minute scoping call within two business days.',
        [
            `${formatUsd(BIZ.monthlyPriceAnnualUsd)}/month on annual contract.`,
            `${(BIZ.includedEventsPerMonth ?? 0).toLocaleString('en-US')} metered AI events per month.`,
            '1-year retention. Workflow attribution. Shadow controls. Audit exports.',
        ],
        'Department AI accountability',
    ),
    scale: buildPlanIntent(
        'scale',
        'scale',
        `Talk to sales about ${SCL.name}`,
        'Multi-department views, advanced controls, priority support for teams with material AI footprint.',
        'Scale is annual-only and sales-led. Expect a scoping call within two business days.',
        [
            `${formatUsd(SCL.monthlyPriceAnnualUsd)}/month on annual contract.`,
            `${(SCL.includedEventsPerMonth ?? 0).toLocaleString('en-US')} metered AI events per month.`,
            '2-year retention. Multi-department views. Advanced controls. Quarterly business review.',
        ],
        'Multi-department AI governance',
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
    'proof-sprint': buildOfferIntent(
        'proof-sprint',
        'proof_sprint',
        `Book a ${PS.name} — ${formatUsd(PS.priceUsd)}`,
        `${PS.durationDays}-day paid diagnostic. Spend map, outcome capture, shadow-control review, executive readout.`,
        'Proof Sprint scoping calls are scheduled within two business days. Engagement begins after SOW signature.',
        [
            `${formatUsd(PS.priceUsd)} fixed fee, ${PS.durationDays}-day engagement.`,
            PS.scope,
            PS.creditPolicy,
        ],
        'Paid diagnostic engagement',
    ),
    'paid-pilot': buildOfferIntent(
        'paid-pilot',
        'paid_pilot',
        `Design a ${PP.name} — ${formatUsd(PP.priceUsd)}`,
        'Multi-workflow accountability pilot. Procurement-ready evidence pack and annual proposal.',
        'Paid Pilot scoping calls include a stakeholder map and milestone plan. We respond within two business days.',
        [
            `${formatUsd(PP.priceUsd)} fixed fee, ${PP.durationDays} to 90 days.`,
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
            `Starting at ${formatUsd(RP.priceUsd)} for a ${RP.durationDays}-day engagement.`,
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
            'Outcome of the call: one-line recommendation (Sandbox, Developer, Proof Sprint, Paid Pilot, or no-go).',
            `Reference pricing: Sandbox free; Developer ${formatUsd(DEV.monthlyPriceAnnualUsd)}/month; Business ${formatUsd(BIZ.monthlyPriceAnnualUsd)}/month annual; Enterprise from ${formatUsd(ENTERPRISE_FLOOR_ARR_USD)} ARR.`,
        ],
        defaultUseCase: 'Scoping call',
        planId: null,
        offerId: null,
    },
};

/** Returns intent copy for the requested intent (or the unknown fallback). */
export function getIntentCopy(value: string | null | undefined): IntentCopy {
    if (!isKnownIntent(value)) return INTENT_COPY.unknown;
    return INTENT_COPY[value];
}
