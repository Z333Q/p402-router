'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { syncFacilitatorStatus, simulatePlan } from '@/lib/actions';

export type BazaarResource = {
    resource_id: string;
    source_facilitator_id: string;
    canonical_route_id: string;
    title: string;
    description: string;
    tags: string[];
    pricing: {
        min_amount: number;
        currency: string;
    };
    health_status?: 'healthy' | 'degraded' | 'down' | 'unknown';
    last_crawled_at?: string;
    success_rate_ledger?: number;
    p95_latency_ledger?: number;
    total_calls?: number;
};

export function useBazaar() {
    const [resources, setResources] = useState<BazaarResource[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [syncing, setSyncing] = useState(false);
    const [importing, setImporting] = useState<string | null>(null);
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedTag, setSelectedTag] = useState<string | null>(null);

    const load = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const res = await fetch('/api/v1/bazaar');
            if (!res.ok) throw new Error(`HTTP ${res.status}`);
            const data = await res.json();
            setResources(data.resources || []);
        } catch (err: any) {
            setError(err.message || 'Failed to load registry');
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
            return { success: true, message: 'Registry updated successfully.' };
        } catch (err: any) {
            return { success: false, message: err.message || 'Sync failed.' };
        } finally {
            setSyncing(false);
        }
    };

    const importRoute = async (resourceId: string) => {
        setImporting(resourceId);
        try {
            const res = await fetch('/api/v1/bazaar/import-route', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ resourceId })
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error || 'Failed to import');
            return { success: true, routeId: data.routeId };
        } catch (err: any) {
            return { success: false, error: err.message };
        } finally {
            setImporting(null);
        }
    };

    const filteredResources = useMemo(() => {
        return resources.filter(r => {
            const tags = r.tags || [];
            const matchesSearch = r.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                r.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
                tags.some(t => t.toLowerCase().includes(searchTerm.toLowerCase()));
            const matchesTag = !selectedTag || tags.includes(selectedTag);
            return matchesSearch && matchesTag;
        });
    }, [resources, searchTerm, selectedTag]);

    const allTags = useMemo(() => {
        const tags = new Set<string>();
        resources.forEach(r => {
            if (r.tags) {
                r.tags.forEach(t => tags.add(t));
            }
        });
        return Array.from(tags).sort();
    }, [resources]);

    useEffect(() => {
        load();
    }, [load]);

    return {
        resources: filteredResources,
        allResources: resources,
        loading,
        error,
        syncing,
        importing,
        searchTerm,
        setSearchTerm,
        selectedTag,
        setSelectedTag,
        allTags,
        refresh: load,
        performSync,
        importRoute,
        requestSimulation: simulatePlan
    };
}
