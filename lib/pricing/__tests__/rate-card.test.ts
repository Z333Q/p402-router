import { describe, it, expect } from 'vitest';
import {
    BRIDGE_OFFERS,
    BRIDGE_OFFER_IDS,
    ENTERPRISE_EVENT_COMMIT_FLOOR_PER_YEAR,
    ENTERPRISE_FLOOR_ARR_USD,
    HOMEPAGE_PRICING_SUPPORT_LINE,
    HOMEPAGE_TRUST_MICROCOPY,
    OVERAGE_WARNING_THRESHOLDS_PERCENT,
    PLANS,
    PLAN_IDS,
    PRICING_PAGE_SUPPORT_LINE,
    PUBLIC_BRIDGE_OFFER_IDS,
    RATE_CARD_VERSION,
    computeOverageUsd,
    formatEventAllowance,
    formatUsd,
    getMonthlyPremiumPercent,
    getPlanByMonthlyEvents,
} from '../rate-card';

describe('Rate card v2 — V5-led hybrid ladder', () => {
    it('declares version v2', () => {
        expect(RATE_CARD_VERSION).toBe('v2');
    });

    it('Sandbox is $0 with 25k events and 14-day retention', () => {
        const p = PLANS.sandbox;
        expect(p.annualPriceUsd).toBe(0);
        expect(p.monthlyPriceAnnualUsd).toBe(0);
        expect(p.includedEventsPerMonth).toBe(25_000);
        expect(p.retentionDays).toBe(14);
        expect(p.overageUsdPer1kEvents).toBeNull();
        expect(p.salesMotion).toBe('self-serve');
        expect(p.ctaLabel).toBe('Start free');
    });

    it('Build is $49/mo with 250k events and 30-day retention', () => {
        const p = PLANS.build;
        expect(p.monthlyPriceAnnualUsd).toBe(49);
        expect(p.includedEventsPerMonth).toBe(250_000);
        expect(p.retentionDays).toBe(30);
        expect(p.overageUsdPer1kEvents).toBe(0.25);
        expect(p.ctaLabel).toBe('Start Build');
        expect(p.salesMotion).toBe('sales-assisted');
        expect(p.ctaHref).toBe('/get-access?intent=build');
    });

    it('Growth is $199/mo with 2M events and 90-day retention', () => {
        const p = PLANS.growth;
        expect(p.monthlyPriceAnnualUsd).toBe(199);
        expect(p.includedEventsPerMonth).toBe(2_000_000);
        expect(p.retentionDays).toBe(90);
        expect(p.overageUsdPer1kEvents).toBe(0.15);
        expect(p.ctaLabel).toBe('Start Growth');
        expect(p.salesMotion).toBe('sales-assisted');
        expect(p.ctaHref).toBe('/get-access?intent=growth');
    });

    it('Scale is $799/mo annual with 20M events and 1-year retention', () => {
        const p = PLANS.scale;
        expect(p.monthlyPriceAnnualUsd).toBe(799);
        expect(p.monthlyPriceMonthlyUsd).toBeNull();
        expect(p.includedEventsPerMonth).toBe(20_000_000);
        expect(p.retentionDays).toBe(365);
        expect(p.overageUsdPer1kEvents).toBe(0.08);
        expect(p.salesMotion).toBe('sales-led');
    });

    it('Enterprise is custom with the $60k ARR floor', () => {
        const p = PLANS.enterprise;
        expect(p.monthlyPriceAnnualUsd).toBeNull();
        expect(p.annualPriceUsd).toBeNull();
        expect(p.includedEventsPerMonth).toBeNull();
        expect(p.salesMotion).toBe('sales-led');
        expect(p.ctaLabel).toBe('Request enterprise pricing');
        expect(ENTERPRISE_FLOOR_ARR_USD).toBe(60_000);
        expect(ENTERPRISE_EVENT_COMMIT_FLOOR_PER_YEAR).toBe(25_000_000);
    });

    it('PLAN_IDS is the V5 ladder in tier order', () => {
        expect([...PLAN_IDS]).toEqual(['sandbox', 'build', 'growth', 'scale', 'enterprise']);
    });

    it('does not expose a public Developer or Business plan id', () => {
        const ids = [...PLAN_IDS];
        expect(ids).not.toContain('developer');
        expect(ids).not.toContain('business');
    });
});

describe('Bridge offers (V5-led hybrid)', () => {
    it('AI Spend Audit is $1,500 one-time with 100% credit policy and is public', () => {
        const o = BRIDGE_OFFERS.ai_spend_audit;
        expect(o.priceUsd).toBe(1_500);
        expect(o.priceIsFloor).toBe(false);
        expect(o.durationDays).toBeNull();
        expect(o.creditPolicy).toMatch(/100%/);
        expect(o.visibility).toBe('public');
        expect(o.ctaHref).toBe('/get-access?intent=ai-spend-audit');
    });

    it('Paid Pilot is $35,000 with 50% credit policy and is public', () => {
        const o = BRIDGE_OFFERS.paid_pilot;
        expect(o.priceUsd).toBe(35_000);
        expect(o.priceIsFloor).toBe(false);
        expect(o.creditPolicy).toMatch(/50%/);
        expect(o.visibility).toBe('public');
    });

    it('Regulated Pilot floor is $50,000 with 90-day duration and is public', () => {
        const o = BRIDGE_OFFERS.regulated_pilot;
        expect(o.priceUsd).toBe(50_000);
        expect(o.priceIsFloor).toBe(true);
        expect(o.durationDays).toBe(90);
        expect(o.visibility).toBe('public');
    });

    it('Proof Sprint is preserved at $15,000 but marked internal-only', () => {
        const o = BRIDGE_OFFERS.proof_sprint;
        expect(o.priceUsd).toBe(15_000);
        expect(o.visibility).toBe('internal');
    });

    it('PUBLIC_BRIDGE_OFFER_IDS contains exactly AI Spend Audit, Paid Pilot, Regulated Pilot', () => {
        expect([...PUBLIC_BRIDGE_OFFER_IDS]).toEqual([
            'ai_spend_audit',
            'paid_pilot',
            'regulated_pilot',
        ]);
        expect(PUBLIC_BRIDGE_OFFER_IDS).not.toContain('proof_sprint');
    });

    it('every bridge offer has CTA href and label', () => {
        for (const id of BRIDGE_OFFER_IDS) {
            const o = BRIDGE_OFFERS[id];
            expect(o.ctaHref.length).toBeGreaterThan(0);
            expect(o.ctaLabel.length).toBeGreaterThan(0);
        }
    });
});

describe('Overage thresholds', () => {
    it('warns at 50, 80, 100, 120%', () => {
        expect([...OVERAGE_WARNING_THRESHOLDS_PERCENT]).toEqual([50, 80, 100, 120]);
    });
});

describe('computeOverageUsd', () => {
    it('returns 0 within plan allowance', () => {
        expect(computeOverageUsd('build', 200_000)).toBe(0);
        expect(computeOverageUsd('build', 250_000)).toBe(0);
    });

    it('computes overage above plan allowance for Build at $0.25/1k', () => {
        // 100k over allowance × $0.25/1k = $25
        expect(computeOverageUsd('build', 350_000)).toBeCloseTo(25, 6);
    });

    it('computes overage for Growth at $0.15/1k', () => {
        // 1M over 2M allowance × $0.15/1k = $150
        expect(computeOverageUsd('growth', 3_000_000)).toBeCloseTo(150, 6);
    });

    it('returns 0 for Sandbox (hard cap, no overage)', () => {
        expect(computeOverageUsd('sandbox', 100_000)).toBe(0);
    });

    it('returns 0 for Enterprise (custom committed rate)', () => {
        expect(computeOverageUsd('enterprise', 100_000_000)).toBe(0);
    });
});

describe('getPlanByMonthlyEvents', () => {
    it('routes Sandbox at very low volume', () => {
        expect(getPlanByMonthlyEvents(0)).toBe('sandbox');
        expect(getPlanByMonthlyEvents(25_000)).toBe('sandbox');
    });

    it('routes Build in 25k–250k', () => {
        expect(getPlanByMonthlyEvents(25_001)).toBe('build');
        expect(getPlanByMonthlyEvents(250_000)).toBe('build');
    });

    it('routes Growth in 250k–2M', () => {
        expect(getPlanByMonthlyEvents(250_001)).toBe('growth');
        expect(getPlanByMonthlyEvents(2_000_000)).toBe('growth');
    });

    it('routes Scale in 2M–20M', () => {
        expect(getPlanByMonthlyEvents(2_000_001)).toBe('scale');
        expect(getPlanByMonthlyEvents(20_000_000)).toBe('scale');
    });

    it('routes Enterprise above 20M', () => {
        expect(getPlanByMonthlyEvents(20_000_001)).toBe('enterprise');
        expect(getPlanByMonthlyEvents(100_000_000)).toBe('enterprise');
    });

    it('handles invalid input gracefully', () => {
        expect(getPlanByMonthlyEvents(Number.NaN)).toBe('sandbox');
        expect(getPlanByMonthlyEvents(-1)).toBe('sandbox');
    });
});

describe('formatUsd', () => {
    it('formats integer dollars with commas', () => {
        expect(formatUsd(0)).toBe('$0');
        expect(formatUsd(49)).toBe('$49');
        expect(formatUsd(199)).toBe('$199');
        expect(formatUsd(799)).toBe('$799');
        expect(formatUsd(1_500)).toBe('$1,500');
        expect(formatUsd(60_000)).toBe('$60,000');
    });

    it('returns Custom for null', () => {
        expect(formatUsd(null)).toBe('Custom');
    });
});

describe('formatEventAllowance', () => {
    it('uses M and k suffixes', () => {
        expect(formatEventAllowance(25_000)).toBe('25k');
        expect(formatEventAllowance(250_000)).toBe('250k');
        expect(formatEventAllowance(2_000_000)).toBe('2M');
        expect(formatEventAllowance(20_000_000)).toBe('20M');
    });

    it('returns Custom commit for null', () => {
        expect(formatEventAllowance(null)).toBe('Custom commit');
    });
});

describe('Locked copy strings', () => {
    it('homepage pricing support line reflects the V5 ladder', () => {
        expect(HOMEPAGE_PRICING_SUPPORT_LINE).toBe(
            'Start free. Production plans from $49/month. Enterprise audits from $1.5k.'
        );
    });

    it('pricing page support line unchanged', () => {
        expect(PRICING_PAGE_SUPPORT_LINE).toBe(
            'Start free. Upgrade when usage and governance needs grow.'
        );
    });

    it('homepage trust microcopy unchanged', () => {
        expect(HOMEPAGE_TRUST_MICROCOPY).toBe(
            'Metadata-first. Tenant-scoped. Usage-based. Procurement-ready path.'
        );
    });
});

describe('Rate card source-shape safety', () => {
    it('contains no forbidden phrases', async () => {
        const { readFileSync } = await import('node:fs');
        const { join } = await import('node:path');
        const src = readFileSync(join(__dirname, '..', 'rate-card.ts'), 'utf8');
        expect(src).not.toMatch(/verified[\s_-]+savings/i);
        expect(src).not.toMatch(/policy[_-]?auto[_-]?apply/i);
        expect(src).not.toMatch(/automatically optimize/i);
        expect(src).not.toMatch(/runtime enforcement (active|live|enabled)/i);
        expect(src).not.toMatch(/\bSOC ?2 compliant\b/i);
        expect(src).not.toMatch(/\bHIPAA compliant\b/i);
        expect(src).not.toMatch(/\bISO ?27001 certified\b/i);
        expect(src).not.toMatch(/save \d+%/i);
    });
});

describe('Premium calculation does not crash for V5 monthly-only plans', () => {
    it('returns null for Sandbox (free)', () => {
        expect(getMonthlyPremiumPercent('sandbox')).toBeNull();
    });

    it('returns null for Scale (annual-only)', () => {
        expect(getMonthlyPremiumPercent('scale')).toBeNull();
    });
});
