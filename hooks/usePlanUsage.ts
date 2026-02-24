'use client';

import { useState, useEffect } from 'react';

interface PlanUsage {
    planId: string;
    maxSpendUsd: number;
    currentUsageUsd: number;
    usagePercent: number;
    isLoading: boolean;
    error: string | null;
}

// Temporary mock for Sprint 1 until Sprint 5 Analytics Rollups are built
// In production, this will hit `app/api/v2/billing/usage/route.ts`
export function usePlanUsage(tenantId?: string): PlanUsage {
    const [data, setData] = useState<Omit<PlanUsage, 'isLoading' | 'error'>>({
        planId: 'free',
        maxSpendUsd: 5.00,
        currentUsageUsd: 0,
        usagePercent: 0,
    });
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const fetchUsage = async () => {
            try {
                setIsLoading(true);
                const res = await fetch('/api/v2/billing/usage');
                if (!res.ok) throw new Error('Failed to fetch');
                const usage = await res.json();

                setData({
                    planId: usage.planId,
                    maxSpendUsd: usage.maxSpendUsd,
                    currentUsageUsd: usage.currentUsageUsd,
                    usagePercent: usage.usagePercent,
                });
            } catch (err) {
                console.error('Usage Fetch Error:', err);
                setError('Failed to load usage data');
                // Fallback to mock if API fails during development
                setData({
                    planId: 'pro',
                    maxSpendUsd: 5000.00,
                    currentUsageUsd: 1250.50,
                    usagePercent: 25.01,
                });
            } finally {
                setIsLoading(false);
            }
        };

        fetchUsage();
    }, [tenantId]);

    return { ...data, isLoading, error };
}
