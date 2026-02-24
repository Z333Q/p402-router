import { getPlan, type PlanTier } from './plans';

export interface EntitlementAssertion {
    allowed: boolean;
    reason?: string;
    requiredPlan?: PlanTier;
}

export function assertFeatureEntitlement(planId: string, feature: 'semanticCache' | 'safetyPack' | 'advancedAnalytics'): EntitlementAssertion {
    const plan = getPlan(planId);

    switch (feature) {
        case 'semanticCache':
            if (!plan.semanticCacheAllowed) return { allowed: false, reason: 'Semantic cache requires Pro or Enterprise', requiredPlan: 'pro' };
            break;
        case 'safetyPack':
            if (!plan.safetyPackAllowed) return { allowed: false, reason: 'Safety pack features require Pro or Enterprise', requiredPlan: 'pro' };
            break;
        case 'advancedAnalytics':
            if (!plan.advancedAnalyticsAllowed) return { allowed: false, reason: 'Advanced analytics requires Pro or Enterprise', requiredPlan: 'pro' };
            break;
    }

    return { allowed: true };
}

export function computePlatformFeeUsd(planId: string, transactionAmountUsd: number): number {
    const plan = getPlan(planId);
    // basis points: 100 bps = 1%
    return transactionAmountUsd * (plan.platformFeeBps / 10000);
}
