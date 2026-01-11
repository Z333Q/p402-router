'use client';

import { useState, useEffect, useMemo } from 'react';

export type DashboardEvent = {
    eventId: string;
    at: string;
    routeId: string;
    outcome: 'settled' | 'deny' | 'error' | string;
    network: string;
    scheme: string;
    amount: string;
    steps: { type: string; at: string }[];
}

export type DashboardStats = {
    totalEvents: number;
    settled: number;
    denied: number;
    volume: string;
}

export function useDashboardStats() {
    const [events, setEvents] = useState<DashboardEvent[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [convStats, setConvStats] = useState<any[]>([]);

    const fetchData = async () => {
        setLoading(true);
        setError(null);
        try {
            const [eventsRes, analyticsRes] = await Promise.all([
                fetch('/api/v1/events?limit=20'),
                fetch('/api/v1/analytics/conversion')
            ]);

            if (!eventsRes.ok || !analyticsRes.ok) {
                throw new Error('Failed to fetch dashboard data');
            }

            const eventsData = await eventsRes.json();
            const analyticsData = await analyticsRes.json();

            setEvents(eventsData.events || []);
            setConvStats(analyticsData.stats || []);
        } catch (err: any) {
            console.error('Dashboard fetch error:', err);
            setError(err.message || 'An unexpected error occurred');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
        // Set up polling every 30 seconds for live updates
        const interval = setInterval(fetchData, 30000);
        return () => clearInterval(interval);
    }, []);

    const stats = useMemo<DashboardStats>(() => {
        const settledCount = events.filter((e) => e.outcome === 'settled').length;
        const deniedCount = events.filter((e) => e.outcome === 'deny' || e.outcome === 'error').length;
        const totalVolume = events.reduce((sum, e) => sum + parseFloat(e.amount || '0'), 0);

        return {
            totalEvents: events.length,
            settled: settledCount,
            denied: deniedCount,
            volume: totalVolume.toFixed(2)
        };
    }, [events]);

    return {
        events,
        loading,
        error,
        stats,
        convStats,
        refresh: fetchData
    };
}
