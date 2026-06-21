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
    RATE_CARD_VERSION,
    computeOverageUsd,
    formatEventAllowance,
    formatUsd,
    getMonthlyPremiumPercent,
    getPlanByMonthlyEvents,
} from '../rate-card';

describe('Rate card v1 — invariants from 3AX §4', () => {
    it('declares version v1', () => {
        expect(RATE_CARD_VERSION).toBe('v1');
    });

    it('Sandbox is $0 with 25k events and 14-day retention', () => {
        const p = PLANS.sandbox;
        expect(p.annualPriceUsd).toBe(0);
        expect(p.monthlyPriceAnnualUsd).toBe(0);
        expect(p.includedEventsPerMonth).toBe(25_000);
        expect(p.retentionDays).toBe(14);
        expect(p.overageUsdPer1kEvents).toBeNull(); // hard cap
        expect(p.salesMotion).toBe('self-serve');
        expect(p.ctaLabel).toBe('Start free');
    });

    it('Developer is $249/mo with 500k events and 90-day retention', () => {
        const p = PLANS.developer;
        expect(p.monthlyPriceAnnualUsd).toBe(249);
        expect(p.includedEventsPerMonth).toBe(500_000);
        expect(p.retentionDays).toBe(90);
        expect(p.overageUsdPer1kEvents).toBe(0.25);
        expect(p.ctaLabel).toBe('Start Developer');
    });

    it('Developer is sales-assisted (not self-serve) until 3AY-8 billing ships', () => {
        // Until paid self-serve checkout exists, Developer routes through
        // /contact so no surface implies paid card-on-file is wired.
        expect(PLANS.developer.salesMotion).toBe('sales-assisted');
        expect(PLANS.developer.ctaHref).toBe('/contact?intent=developer');
    });

    it('Business is $2,500/mo annual with 5M events and 1-year retention', () => {
        const p = PLANS.business;
        expect(p.monthlyPriceAnnualUsd).toBe(2_500);
        expect(p.includedEventsPerMonth).toBe(5_000_000);
        expect(p.retentionDays).toBe(365);
        expect(p.overageUsdPer1kEvents).toBe(0.12);
        expect(p.salesMotion).toBe('sales-assisted');
        expect(p.ctaLabel).toBe('Talk to sales');
    });

    it('Business monthly carries the 30-40% premium per 3AX §3 and §27.9', () => {
        const premium = getMonthlyPremiumPercent('business');
        expect(premium).not.toBeNull();
        expect(premium!).toBeGreaterThanOrEqual(30);
        expect(premium!).toBeLessThanOrEqual(40);
    });

    it('Scale is $5,000/mo annual with 15M events, monthly not offered', () => {
        const p = PLANS.scale;
        expect(p.monthlyPriceAnnualUsd).toBe(5_000);
        expect(p.monthlyPriceMonthlyUsd).toBeNull();
        expect(p.includedEventsPerMonth).toBe(15_000_000);
        expect(p.retentionDays).toBe(730);
        expect(p.overageUsdPer1kEvents).toBe(0.08);
        expect(p.salesMotion).toBe('sales-led');
    });

    it('Enterprise is custom with no public floor on per-month price', () => {
        const p = PLANS.enterprise;
        expect(p.monthlyPriceAnnualUsd).toBeNull();
        expect(p.annualPriceUsd).toBeNull();
        expect(p.includedEventsPerMonth).toBeNull();
        expect(p.overageUsdPer1kEvents).toBeNull();
        expect(p.retentionDays).toBeNull();
        expect(p.salesMotion).toBe('sales-led');
        expect(p.ctaLabel).toBe('Request enterprise pricing');
    });

    it('Enterprise floor is $60,000 ARR with 25M+ annual event commit', () => {
        expect(ENTERPRISE_FLOOR_ARR_USD).toBe(60_000);
        expect(ENTERPRISE_EVENT_COMMIT_FLOOR_PER_YEAR).toBe(25_000_000);
    });

    it('PLAN_IDS list is in increasing tier order', () => {
        expect([...PLAN_IDS]).toEqual(['sandbox', 'developer', 'business', 'scale', 'enterprise']);
    });
});

describe('Bridge offers (3AX §4.2)', () => {
    it('Proof Sprint is $15,000, 14 days, with 100% credit policy', () => {
        const o = BRIDGE_OFFERS.proof_sprint;
        expect(o.priceUsd).toBe(15_000);
        expect(o.priceIsFloor).toBe(false);
        expect(o.durationDays).toBe(14);
        expect(o.creditPolicy).toMatch(/100%/);
    });

    it('Paid Pilot is $35,000 with 50% credit policy', () => {
        const o = BRIDGE_OFFERS.paid_pilot;
        expect(o.priceUsd).toBe(35_000);
        expect(o.priceIsFloor).toBe(false);
        expect(o.creditPolicy).toMatch(/50%/);
    });

    it('Regulated Pilot floor is $50,000 with 90-day duration', () => {
        const o = BRIDGE_OFFERS.regulated_pilot;
        expect(o.priceUsd).toBe(50_000);
        expect(o.priceIsFloor).toBe(true);
        expect(o.durationDays).toBe(90);
    });

    it('all bridge offers have CTA href and label', () => {
        for (const id of BRIDGE_OFFER_IDS) {
            const o = BRIDGE_OFFERS[id];
            expect(o.ctaHref.length).toBeGreaterThan(0);
            expect(o.ctaLabel.length).toBeGreaterThan(0);
        }
    });
});

describe('Overage thresholds (3AX §5.2)', () => {
    it('warns at 50, 80, 100, 120%', () => {
        expect([...OVERAGE_WARNING_THRESHOLDS_PERCENT]).toEqual([50, 80, 100, 120]);
    });
});

describe('computeOverageUsd', () => {
    it('returns 0 within plan allowance', () => {
        expect(computeOverageUsd('developer', 400_000)).toBe(0);
        expect(computeOverageUsd('developer', 500_000)).toBe(0);
    });

    it('computes overage above plan allowance', () => {
        // Developer: $0.25 per 1k events
        // 100k over allowance → 100 × $0.25 = $25
        expect(computeOverageUsd('developer', 600_000)).toBeCloseTo(25, 6);
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

    it('routes Developer in 25k–500k', () => {
        expect(getPlanByMonthlyEvents(25_001)).toBe('developer');
        expect(getPlanByMonthlyEvents(500_000)).toBe('developer');
    });

    it('routes Business in 500k–5M', () => {
        expect(getPlanByMonthlyEvents(500_001)).toBe('business');
        expect(getPlanByMonthlyEvents(5_000_000)).toBe('business');
    });

    it('routes Scale in 5M–15M', () => {
        expect(getPlanByMonthlyEvents(5_000_001)).toBe('scale');
        expect(getPlanByMonthlyEvents(15_000_000)).toBe('scale');
    });

    it('routes Enterprise above 15M', () => {
        expect(getPlanByMonthlyEvents(15_000_001)).toBe('enterprise');
        expect(getPlanByMonthlyEvents(50_000_000)).toBe('enterprise');
    });

    it('handles invalid input gracefully', () => {
        expect(getPlanByMonthlyEvents(Number.NaN)).toBe('sandbox');
        expect(getPlanByMonthlyEvents(-1)).toBe('sandbox');
    });
});

describe('formatUsd', () => {
    it('formats integer dollars with commas', () => {
        expect(formatUsd(0)).toBe('$0');
        expect(formatUsd(249)).toBe('$249');
        expect(formatUsd(2_500)).toBe('$2,500');
        expect(formatUsd(60_000)).toBe('$60,000');
    });

    it('returns Custom for null', () => {
        expect(formatUsd(null)).toBe('Custom');
    });
});

describe('formatEventAllowance', () => {
    it('uses M and k suffixes', () => {
        expect(formatEventAllowance(25_000)).toBe('25k');
        expect(formatEventAllowance(500_000)).toBe('500k');
        expect(formatEventAllowance(5_000_000)).toBe('5M');
        expect(formatEventAllowance(15_000_000)).toBe('15M');
    });

    it('returns Custom commit for null', () => {
        expect(formatEventAllowance(null)).toBe('Custom commit');
    });
});

describe('Locked copy strings (3AX §14, §15)', () => {
    it('homepage pricing support line matches 3AX §14.2 exactly', () => {
        expect(HOMEPAGE_PRICING_SUPPORT_LINE).toBe(
            'Start free. Production plans from $249/month. Enterprise pilots from $35k.'
        );
    });

    it('pricing page support line matches 3AX §15.1 exactly', () => {
        expect(PRICING_PAGE_SUPPORT_LINE).toBe(
            'Start free. Upgrade when usage and governance needs grow.'
        );
    });

    it('homepage trust microcopy matches 3AX §14.2 exactly', () => {
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
        expect(src).not.toMatch(/verified[_-]?savings/i);
        expect(src).not.toMatch(/policy[_-]?auto[_-]?apply/i);
        expect(src).not.toMatch(/automatically optimize/i);
        expect(src).not.toMatch(/runtime enforcement (active|live|enabled)/i);
        expect(src).not.toMatch(/\bSOC ?2 compliant\b/i);
        expect(src).not.toMatch(/\bHIPAA compliant\b/i);
        expect(src).not.toMatch(/\bISO ?27001 certified\b/i);
        expect(src).not.toMatch(/save \d+%/i);
    });
});
