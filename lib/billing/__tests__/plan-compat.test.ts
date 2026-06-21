import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import {
    isCanonicalBillingPlanId,
    isLegacyBillingPlanId,
    normalizeBillingPlanId,
    toLegacyBillingPlanId,
} from '../plan-compat';
import { getPlan } from '../plans';

describe('normalizeBillingPlanId — legacy -> canonical', () => {
    it('free normalizes to sandbox', () => {
        expect(normalizeBillingPlanId('free')).toBe('sandbox');
    });

    it('pro normalizes to growth (3AY-8R-1 operator-approved mapping)', () => {
        expect(normalizeBillingPlanId('pro')).toBe('growth');
    });

    it('enterprise normalizes to enterprise', () => {
        expect(normalizeBillingPlanId('enterprise')).toBe('enterprise');
    });
});

describe('normalizeBillingPlanId — canonical -> canonical (identity)', () => {
    it('sandbox returns sandbox', () => {
        expect(normalizeBillingPlanId('sandbox')).toBe('sandbox');
    });

    it('build returns build', () => {
        expect(normalizeBillingPlanId('build')).toBe('build');
    });

    it('growth returns growth', () => {
        expect(normalizeBillingPlanId('growth')).toBe('growth');
    });

    it('scale returns scale', () => {
        expect(normalizeBillingPlanId('scale')).toBe('scale');
    });

    it('enterprise returns enterprise', () => {
        expect(normalizeBillingPlanId('enterprise')).toBe('enterprise');
    });
});

describe('normalizeBillingPlanId — unknown / non-string values', () => {
    it('unknown string falls back to sandbox (least-privileged)', () => {
        expect(normalizeBillingPlanId('developer')).toBe('sandbox');
        expect(normalizeBillingPlanId('business')).toBe('sandbox');
        expect(normalizeBillingPlanId('mystery-tier')).toBe('sandbox');
    });

    it('empty string falls back to sandbox', () => {
        expect(normalizeBillingPlanId('')).toBe('sandbox');
    });

    it('null / undefined fall back to sandbox', () => {
        expect(normalizeBillingPlanId(null)).toBe('sandbox');
        expect(normalizeBillingPlanId(undefined)).toBe('sandbox');
    });

    it('non-string values fall back to sandbox', () => {
        expect(normalizeBillingPlanId(0)).toBe('sandbox');
        expect(normalizeBillingPlanId(42)).toBe('sandbox');
        expect(normalizeBillingPlanId({ id: 'pro' })).toBe('sandbox');
    });

    it('is case-sensitive: PRO does not normalize to growth', () => {
        expect(normalizeBillingPlanId('PRO')).toBe('sandbox');
        expect(normalizeBillingPlanId('Free')).toBe('sandbox');
    });
});

describe('toLegacyBillingPlanId — canonical -> legacy (entitlement matrix bridge)', () => {
    it('sandbox -> free', () => {
        expect(toLegacyBillingPlanId('sandbox')).toBe('free');
    });

    it('build -> pro (closest paid legacy tier)', () => {
        expect(toLegacyBillingPlanId('build')).toBe('pro');
    });

    it('growth -> pro', () => {
        expect(toLegacyBillingPlanId('growth')).toBe('pro');
    });

    it('scale -> pro', () => {
        expect(toLegacyBillingPlanId('scale')).toBe('pro');
    });

    it('enterprise -> enterprise', () => {
        expect(toLegacyBillingPlanId('enterprise')).toBe('enterprise');
    });

    it('legacy ids pass through', () => {
        expect(toLegacyBillingPlanId('free')).toBe('free');
        expect(toLegacyBillingPlanId('pro')).toBe('pro');
    });

    it('unknown / null / undefined fall back to free', () => {
        expect(toLegacyBillingPlanId('totally-unknown')).toBe('free');
        expect(toLegacyBillingPlanId(null)).toBe('free');
        expect(toLegacyBillingPlanId(undefined)).toBe('free');
    });
});

describe('isLegacyBillingPlanId / isCanonicalBillingPlanId predicates', () => {
    it('isLegacyBillingPlanId accepts only legacy ids', () => {
        expect(isLegacyBillingPlanId('free')).toBe(true);
        expect(isLegacyBillingPlanId('pro')).toBe(true);
        expect(isLegacyBillingPlanId('enterprise')).toBe(true);
        expect(isLegacyBillingPlanId('sandbox')).toBe(false);
        expect(isLegacyBillingPlanId('build')).toBe(false);
        expect(isLegacyBillingPlanId('growth')).toBe(false);
        expect(isLegacyBillingPlanId('scale')).toBe(false);
        expect(isLegacyBillingPlanId(null)).toBe(false);
        expect(isLegacyBillingPlanId(undefined)).toBe(false);
    });

    it('isCanonicalBillingPlanId accepts only canonical ids', () => {
        expect(isCanonicalBillingPlanId('sandbox')).toBe(true);
        expect(isCanonicalBillingPlanId('build')).toBe(true);
        expect(isCanonicalBillingPlanId('growth')).toBe(true);
        expect(isCanonicalBillingPlanId('scale')).toBe(true);
        expect(isCanonicalBillingPlanId('enterprise')).toBe(true);
        expect(isCanonicalBillingPlanId('free')).toBe(false);
        expect(isCanonicalBillingPlanId('pro')).toBe(false);
        expect(isCanonicalBillingPlanId(null)).toBe(false);
        expect(isCanonicalBillingPlanId(undefined)).toBe(false);
    });

    it('enterprise is recognized as both legacy and canonical (intentional overlap)', () => {
        expect(isLegacyBillingPlanId('enterprise')).toBe(true);
        expect(isCanonicalBillingPlanId('enterprise')).toBe(true);
    });
});

describe('getPlan tolerates both vocabularies (read-side compatibility)', () => {
    it('canonical sandbox resolves to the same plan as legacy free', () => {
        expect(getPlan('sandbox')).toBe(getPlan('free'));
    });

    it('canonical growth resolves to the same plan as legacy pro', () => {
        expect(getPlan('growth')).toBe(getPlan('pro'));
    });

    it('canonical build resolves to a paid plan (currently legacy pro matrix)', () => {
        expect(getPlan('build').monthlyFeeUsd).toBeGreaterThan(0);
    });

    it('canonical scale resolves to a paid plan (currently legacy pro matrix)', () => {
        expect(getPlan('scale').monthlyFeeUsd).toBeGreaterThan(0);
    });

    it('canonical enterprise resolves to enterprise', () => {
        expect(getPlan('enterprise').id).toBe('enterprise');
    });

    it('unknown id resolves to the free default plan', () => {
        expect(getPlan('totally-not-a-plan').id).toBe('free');
        expect(getPlan(null).id).toBe('free');
        expect(getPlan(undefined).id).toBe('free');
    });
});

describe('Compat slice source-shape — no scope creep', () => {
    const COMPAT_SRC = readFileSync(
        join(__dirname, '..', 'plan-compat.ts'),
        'utf8'
    );

    it('plan-compat.ts does not call into Stripe SDK', () => {
        expect(COMPAT_SRC).not.toMatch(/from\s+['"]stripe['"]/);
        expect(COMPAT_SRC).not.toMatch(/stripe\.(checkout|subscriptions|webhooks|billingPortal|customers)/i);
    });

    it('plan-compat.ts does not write to the database', () => {
        expect(COMPAT_SRC).not.toMatch(/\bUPDATE\b|\bINSERT\b|\bDELETE\b/);
        expect(COMPAT_SRC).not.toMatch(/db\.query/);
    });

    it('plan-compat.ts does not reference Build checkout env vars', () => {
        expect(COMPAT_SRC).not.toMatch(/STRIPE_PRICE_ID_BUILD/);
        expect(COMPAT_SRC).not.toMatch(/BILLING_CHECKOUT_ENABLED/);
    });

    it('plan-compat.ts contains no unsupported public claims', () => {
        expect(COMPAT_SRC).not.toMatch(/verified[\s_-]+savings/i);
        expect(COMPAT_SRC).not.toMatch(/guaranteed savings/i);
        expect(COMPAT_SRC).not.toMatch(/auto[\s_-]?apply/i);
        expect(COMPAT_SRC).not.toMatch(/SOC ?2 compliant/i);
        expect(COMPAT_SRC).not.toMatch(/HIPAA compliant/i);
        expect(COMPAT_SRC).not.toMatch(/ISO ?\d+ certified/i);
    });
});
