import { describe, it, expect } from 'vitest';
import {
    INTENT_COPY,
    INTENT_IDS,
    LEGACY_INTENT_MAP,
    getIntentCopy,
    isKnownIntent,
    resolveIntent,
    type IntentId,
} from '../intent';
import {
    BRIDGE_OFFERS,
    ENTERPRISE_FLOOR_ARR_USD,
    PLANS,
    formatUsd,
} from '../rate-card';

describe('intent module — V5-led hybrid vocabulary', () => {
    it('declares exactly the 8 required intents in the documented order', () => {
        expect([...INTENT_IDS]).toEqual([
            'build',
            'growth',
            'scale',
            'enterprise',
            'ai-spend-audit',
            'paid-pilot',
            'regulated-pilot',
            'scoping-call',
        ]);
    });

    it('isKnownIntent accepts every declared id and rejects unknown', () => {
        for (const id of INTENT_IDS) expect(isKnownIntent(id)).toBe(true);
        for (const bad of ['', 'build ', 'BUILD', 'random', null, undefined]) {
            expect(isKnownIntent(bad as string | null | undefined)).toBe(false);
        }
    });

    it('getIntentCopy returns the unknown fallback for unrecognized values', () => {
        expect(getIntentCopy(null).intent).toBe('unknown');
        expect(getIntentCopy(undefined).intent).toBe('unknown');
        expect(getIntentCopy('').intent).toBe('unknown');
        expect(getIntentCopy('made-up').intent).toBe('unknown');
    });

    it('every intent has heading, subheading, handoffBanner, details, and defaultUseCase', () => {
        for (const id of INTENT_IDS) {
            const copy = INTENT_COPY[id];
            expect(copy.heading.length, `${id} heading`).toBeGreaterThan(0);
            expect(copy.subheading.length, `${id} subheading`).toBeGreaterThan(0);
            expect(copy.handoffBanner.length, `${id} banner`).toBeGreaterThan(0);
            expect(copy.details.length, `${id} details`).toBeGreaterThan(0);
            expect(copy.defaultUseCase.length, `${id} defaultUseCase`).toBeGreaterThan(0);
        }
    });
});

describe('Legacy intent compatibility', () => {
    it('legacy `developer` resolves to `build`', () => {
        expect(resolveIntent('developer')).toBe('build');
        expect(getIntentCopy('developer').intent).toBe('build');
    });

    it('legacy `business` resolves to `scale`', () => {
        expect(resolveIntent('business')).toBe('scale');
        expect(getIntentCopy('business').intent).toBe('scale');
    });

    it('legacy `proof-sprint` resolves to `ai-spend-audit`', () => {
        expect(resolveIntent('proof-sprint')).toBe('ai-spend-audit');
        expect(getIntentCopy('proof-sprint').intent).toBe('ai-spend-audit');
    });

    it('LEGACY_INTENT_MAP covers exactly the three retired intents', () => {
        expect(Object.keys(LEGACY_INTENT_MAP).sort()).toEqual(['business', 'developer', 'proof-sprint']);
    });
});

describe('intent copy sources prices from rate-card.ts (no hardcoded numbers)', () => {
    it('build intent surfaces the rate-card monthly price', () => {
        const c = INTENT_COPY.build;
        expect(c.heading).toContain(formatUsd(PLANS.build.monthlyPriceAnnualUsd));
        expect(c.planId).toBe('build');
        expect(c.offerId).toBeNull();
    });

    it('growth intent surfaces the rate-card monthly price', () => {
        const c = INTENT_COPY.growth;
        expect(c.heading).toContain(formatUsd(PLANS.growth.monthlyPriceAnnualUsd));
        expect(c.planId).toBe('growth');
    });

    it('scale intent surfaces the rate-card monthly annual price', () => {
        const c = INTENT_COPY.scale;
        expect(c.details.some((d) => d.includes(formatUsd(PLANS.scale.monthlyPriceAnnualUsd)))).toBe(true);
        expect(c.planId).toBe('scale');
    });

    it('enterprise intent surfaces the rate-card floor ARR', () => {
        const c = INTENT_COPY.enterprise;
        const floor = formatUsd(ENTERPRISE_FLOOR_ARR_USD);
        expect(c.heading).toContain(floor);
        expect(c.details.some((d) => d.includes(floor))).toBe(true);
        expect(c.planId).toBe('enterprise');
    });

    it('ai-spend-audit intent surfaces $1,500 fixed fee, one-time, and 100% credit', () => {
        const c = INTENT_COPY['ai-spend-audit'];
        const price = formatUsd(BRIDGE_OFFERS.ai_spend_audit.priceUsd);
        expect(c.heading).toContain(price);
        expect(c.details.some((d) => d.includes(price))).toBe(true);
        expect(c.details.some((d) => d.toLowerCase().includes('one-time'))).toBe(true);
        expect(c.details.some((d) => d.toLowerCase().includes('100%'))).toBe(true);
        expect(c.offerId).toBe('ai_spend_audit');
    });

    it('paid-pilot intent surfaces the rate-card $35k price and credit policy', () => {
        const c = INTENT_COPY['paid-pilot'];
        const price = formatUsd(BRIDGE_OFFERS.paid_pilot.priceUsd);
        expect(c.heading).toContain(price);
        expect(c.details.some((d) => d.toLowerCase().includes('50%'))).toBe(true);
        expect(c.offerId).toBe('paid_pilot');
    });

    it('regulated-pilot intent shows from-$50k floor and 90-day duration', () => {
        const c = INTENT_COPY['regulated-pilot'];
        const price = formatUsd(BRIDGE_OFFERS.regulated_pilot.priceUsd);
        expect(c.heading).toContain(price);
        expect(c.details.some((d) => d.includes('90'))).toBe(true);
        expect(c.offerId).toBe('regulated_pilot');
    });

    it('scoping-call intent shows V5 reference pricing pulled from rate card', () => {
        const c = INTENT_COPY['scoping-call'];
        const all = c.details.join(' ');
        expect(all).toContain(formatUsd(PLANS.build.monthlyPriceAnnualUsd));
        expect(all).toContain(formatUsd(PLANS.growth.monthlyPriceAnnualUsd));
        expect(all).toContain(formatUsd(BRIDGE_OFFERS.ai_spend_audit.priceUsd));
        expect(all).toContain(formatUsd(ENTERPRISE_FLOOR_ARR_USD));
    });
});

describe('Build and Growth do not imply paid checkout exists yet', () => {
    it('build banner mentions the upcoming Revenue Billing Foundation', () => {
        const c = INTENT_COPY.build;
        expect(c.handoffBanner).toMatch(/3AY-8R/);
    });

    it('growth banner mentions the upcoming Revenue Billing Foundation', () => {
        const c = INTENT_COPY.growth;
        expect(c.handoffBanner).toMatch(/3AY-8R/);
    });

    it('neither mentions Stripe Checkout or "paid self-serve" as a current capability', () => {
        for (const id of ['build', 'growth'] as const) {
            const c = INTENT_COPY[id];
            const all = `${c.heading} ${c.subheading} ${c.handoffBanner} ${c.details.join(' ')}`;
            expect(all).not.toMatch(/Stripe Checkout/i);
            expect(all).not.toMatch(/paid self-serve checkout exists/i);
            expect(all).not.toMatch(/Start paid plan/i);
        }
    });
});

describe('intent copy source-shape safety', () => {
    function allText(c: typeof INTENT_COPY[IntentId | 'unknown']): string {
        return [c.heading, c.subheading, c.handoffBanner, c.defaultUseCase, ...c.details].join(' | ');
    }

    it('contains no forbidden claims across every intent', () => {
        const targets: (IntentId | 'unknown')[] = [...INTENT_IDS, 'unknown'];
        for (const id of targets) {
            const text = allText(INTENT_COPY[id]);
            expect(text, `${id}: verified savings`).not.toMatch(/verified[\s_-]+savings/i);
            expect(text, `${id}: guaranteed savings`).not.toMatch(/guaranteed savings/i);
            expect(text, `${id}: save N%`).not.toMatch(/save \d+\s*%/i);
            expect(text, `${id}: auto-apply`).not.toMatch(/auto[\s_-]?apply/i);
            expect(text, `${id}: SOC 2 compliant`).not.toMatch(/SOC ?2 compliant/i);
            expect(text, `${id}: HIPAA compliant`).not.toMatch(/HIPAA compliant/i);
            expect(text, `${id}: ISO certified`).not.toMatch(/ISO ?\d* certified/i);
            expect(text, `${id}: runtime enforcement live`).not.toMatch(/runtime enforcement (active|live|enabled)/i);
        }
    });
});
