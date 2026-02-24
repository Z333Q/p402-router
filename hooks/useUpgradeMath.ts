'use client';

import { useQuery } from '@tanstack/react-query';

export interface UpgradeMathData {
    authenticated: boolean;
    tenant_id?: string;
    trailing_30d: {
        volume_usd: number;
        failed_count: number;
        estimated_issue_cost_usd: number;
    };
    fees: {
        current_1pct: number;
        pro_075pct: number;
        enterprise_040pct: number;
    };
    potential_savings: {
        pro_monthly: number;
        enterprise_monthly: number;
        pro_yearly: number;
    };
}

/**
 * useUpgradeMath
 * 
 * Fetches personalized billing savings calculations for the current tenant.
 */
export function useUpgradeMath() {
    return useQuery<UpgradeMathData>({
        queryKey: ['billing', 'upgrade-math'],
        queryFn: async () => {
            const res = await fetch('/api/v1/billing/upgrade-math');
            if (!res.ok) {
                const error = await res.json().catch(() => ({}));
                throw new Error(error.message || 'Failed to fetch upgrade math');
            }
            return res.json();
        },
        staleTime: 1000 * 60 * 30, // 30 minutes cache
        gcTime: 1000 * 60 * 60,    // 1 hour garbage collection
    });
}
