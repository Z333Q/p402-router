// P402 Billing Plans - Source of Truth
// Defined in code rather than DB to ensure strict typing across the app.

export type PlanTier = 'free' | 'pro' | 'enterprise';

export interface PlanDefinition {
    id: PlanTier;
    name: string;
    monthlyFeeUsd: number;
    monthlyFeeMicros: bigint; // Used for Ethers v6 BigInt calculations

    // Usage limits and costs
    platformFeeBps: number; // Basis points (100 = 1%)
    maxMonthlySpendUsd: number; // Hard cap on usage

    // A2A Protocol Entitlements
    maxConcurrentAgencies: number;
    maxSseStreams: number;
    semanticCacheAllowed: boolean;

    // Dashboard & Trust Features
    safetyPackAllowed: boolean;
    advancedAnalyticsAllowed: boolean;
}

export const PLANS: Record<PlanTier, PlanDefinition> = {
    free: {
        id: 'free',
        name: 'Free Tier',
        monthlyFeeUsd: 0,
        monthlyFeeMicros: BigInt(0),
        platformFeeBps: 100, // 1% fee on free tier
        maxMonthlySpendUsd: 5.00, // Strict $5 cap
        maxConcurrentAgencies: 1,
        maxSseStreams: 1,
        semanticCacheAllowed: false,
        safetyPackAllowed: false,
        advancedAnalyticsAllowed: false,
    },
    pro: {
        id: 'pro',
        name: 'Pro',
        monthlyFeeUsd: 499.00,
        monthlyFeeMicros: BigInt(499_000_000), // $499.00
        platformFeeBps: 75, // 0.75% fee on Pro tier
        maxMonthlySpendUsd: 5000.00, // Higher hard cap
        maxConcurrentAgencies: 10,
        maxSseStreams: 20,
        semanticCacheAllowed: true,
        safetyPackAllowed: true,
        advancedAnalyticsAllowed: true,
    },
    enterprise: {
        id: 'enterprise',
        name: 'Enterprise',
        monthlyFeeUsd: 999.00,
        monthlyFeeMicros: BigInt(999_000_000),
        platformFeeBps: 40, // 0.4% fee - high volume model
        maxMonthlySpendUsd: 999999.00, // Effectively infinite
        maxConcurrentAgencies: 100,
        maxSseStreams: 1000,
        semanticCacheAllowed: true,
        safetyPackAllowed: true,
        advancedAnalyticsAllowed: true,
    }
};

export const DEFAULT_PLAN = PLANS.free;

export function getPlan(id: string | null | undefined): PlanDefinition {
    if (!id) return DEFAULT_PLAN;

    const plan = PLANS[id as PlanTier];
    return plan || DEFAULT_PLAN;
}
