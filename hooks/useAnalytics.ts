'use client';

import { useState, useEffect } from 'react';

export type SpendSummary = {
    total: number;
    today: number;
    projected: number;
};

export type ProviderSpend = {
    name: string;
    value: number;
    count: number;
};

export type SpendHistory = {
    date: string;
    amount: number;
};

export type AnalyticsAlert = {
    id: string;
    type: 'cost' | 'cache' | 'health';
    severity: 'low' | 'medium' | 'high';
    title: string;
    message: string;
    action: string;
};

export type RoutingDecision = {
    id: string;
    request_id: string;
    task: string;
    requested_mode: string;
    selected_provider_id: string;
    selected_model: string;
    success: boolean;
    cost_usd: number;
    timestamp: string;
};

export function useAnalytics() {
    const [data, setData] = useState<{
        summary: SpendSummary;
        byProvider: ProviderSpend[];
        history: SpendHistory[];
        decisions: RoutingDecision[];
    } | null>(null);
    const [alerts, setAlerts] = useState<AnalyticsAlert[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const fetchAnalytics = async () => {
        setLoading(true);
        try {
            const [spendRes, alertsRes, decisionsRes] = await Promise.all([
                fetch('/api/v1/analytics/spend'),
                fetch('/api/v1/analytics/alerts'),
                fetch('/api/v1/analytics/decisions?limit=15')
            ]);

            if (!spendRes.ok || !alertsRes.ok || !decisionsRes.ok) throw new Error('Failed to fetch analytics');

            const spendData = await spendRes.json();
            const alertsData = await alertsRes.json();
            const decisionsData = await decisionsRes.json();

            setData({
                ...spendData,
                decisions: decisionsData.decisions || []
            });
            setAlerts(alertsData.alerts || []);
        } catch (err: any) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchAnalytics();
        const interval = setInterval(fetchAnalytics, 60000); // Poll every minute
        return () => clearInterval(interval);
    }, []);

    return { data, alerts, loading, error, refresh: fetchAnalytics };
}
