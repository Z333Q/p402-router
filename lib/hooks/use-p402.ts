/**
 * P402 Data Fetching Hooks
 * ========================
 * Custom hooks for fetching P402 API data.
 */

'use client';

import useSWR, { SWRConfiguration } from 'swr';

// Default fetcher
const fetcher = async (url: string) => {
    const res = await fetch(url);
    if (!res.ok) {
        const error = new Error('An error occurred while fetching the data.');
        throw error;
    }
    return res.json();
};

// SWR config defaults
const defaultConfig: SWRConfiguration = {
    revalidateOnFocus: false,
    revalidateOnReconnect: true,
    dedupingInterval: 5000,
};

// =============================================================================
// SPEND HOOKS
// =============================================================================

export function useSpend(period: string = '30d') {
    return useSWR(
        `/api/v2/analytics/spend?period=${period}`,
        fetcher,
        { ...defaultConfig, refreshInterval: 60000 }
    );
}

export function useRecommendations() {
    return useSWR(
        '/api/v2/analytics/recommendations',
        fetcher,
        { ...defaultConfig, refreshInterval: 300000 }
    );
}

// =============================================================================
// PROVIDER HOOKS
// =============================================================================

export function useProviders(options?: { health?: boolean; capability?: string }) {
    const params = new URLSearchParams();
    if (options?.health) params.set('health', 'true');
    if (options?.capability) params.set('capability', options.capability);
    
    const query = params.toString() ? `?${params.toString()}` : '';
    
    return useSWR(
        `/api/v2/providers${query}`,
        fetcher,
        { ...defaultConfig, refreshInterval: 60000 }
    );
}

// =============================================================================
// CACHE HOOKS
// =============================================================================

export function useCacheStats() {
    return useSWR(
        '/api/v2/cache/stats',
        fetcher,
        { ...defaultConfig, refreshInterval: 30000 }
    );
}

// =============================================================================
// SESSION HOOKS
// =============================================================================

export function useSessions(status: string = 'active') {
    return useSWR(
        `/api/v2/sessions?status=${status}`,
        fetcher,
        { ...defaultConfig, refreshInterval: 30000 }
    );
}

export function useSession(sessionId: string) {
    return useSWR(
        sessionId ? `/api/v2/sessions/${sessionId}` : null,
        fetcher,
        { ...defaultConfig, refreshInterval: 10000 }
    );
}

// =============================================================================
// COST COMPARISON
// =============================================================================

export function useCompareCosts(inputTokens: number, outputTokens: number, capabilities?: string[]) {
    return useSWR(
        ['compare-costs', inputTokens, outputTokens, capabilities],
        async () => {
            const res = await fetch('/api/v2/providers', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    input_tokens: inputTokens,
                    output_tokens: outputTokens,
                    capabilities
                })
            });
            if (!res.ok) throw new Error('Failed to compare costs');
            return res.json();
        },
        defaultConfig
    );
}
