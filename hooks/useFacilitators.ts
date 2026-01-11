'use client';

import { useState, useEffect, useCallback } from 'react';
import { syncFacilitatorStatus } from '@/lib/actions';

export type Facilitator = {
    facilitatorId: string;
    name: string;
    type: 'Global' | 'Private';
    status: 'active' | 'inactive';
    networks: string[];
    endpoint: string;
    health: {
        status: 'healthy' | 'degraded' | 'down' | 'unknown';
        p95: number;
        successRate: number;
        lastChecked: string | null;
    };
};

export function useFacilitators() {
    const [facilitators, setFacilitators] = useState<Facilitator[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [syncing, setSyncing] = useState(false);

    const load = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const res = await fetch('/api/v1/facilitators');
            if (!res.ok) throw new Error(`HTTP ${res.status}`);
            const data = await res.json();
            setFacilitators(data.facilitators || []);
        } catch (err: any) {
            setError(err.message || 'Failed to load facilitators');
        } finally {
            setLoading(false);
        }
    }, []);

    const performSync = async () => {
        setSyncing(true);
        setError(null);
        try {
            await syncFacilitatorStatus();
            await load();
            return true;
        } catch (err: any) {
            setError(err.message || 'Sync failed');
            return false;
        } finally {
            setSyncing(false);
        }
    };

    useEffect(() => {
        load();
    }, [load]);

    return {
        facilitators,
        loading,
        error,
        syncing,
        refresh: load,
        performSync
    };
}
