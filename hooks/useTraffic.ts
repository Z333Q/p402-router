'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import { TraceStep } from '@/app/dashboard/_components/trace';

export type EventRow = {
    eventId: string;
    at: string;
    routeId: string;
    method: string;
    path: string;
    network: string;
    scheme: string;
    outcome: 'allow' | 'deny' | 'error' | 'settled';
    denyCode?: string;
    amount?: string;
    headers: {
        paymentRequiredPresent: boolean;
        paymentSignaturePresent: boolean;
        paymentResponsePresent: boolean;
        legacyXPaymentPresent?: boolean;
        raw?: any;
    };
    steps: TraceStep[];
    raw: unknown;
};

export function useTraffic() {
    const [rows, setRows] = useState<EventRow[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [selected, setSelected] = useState<EventRow | null>(null);
    const [searchQuery, setSearchQuery] = useState('');
    const [outcomeFilter, setOutcomeFilter] = useState<'all' | 'allow' | 'deny' | 'error' | 'settled'>('all');

    const load = useCallback(async (isInitial = false) => {
        if (isInitial) setLoading(true);
        setError(null);
        try {
            const res = await fetch('/api/v1/events', { cache: 'no-store' });
            if (!res.ok) throw new Error(`HTTP ${res.status}`);
            const data = await res.json();
            const events = (data.events || []) as EventRow[];
            setRows(events);

            // Auto-select first if none selected
            if (isInitial && events.length > 0) {
                const first = events[0];
                if (first) setSelected(first);
            }
        } catch (e: any) {
            setError(e?.message || 'Failed to load traffic data');
        } finally {
            if (isInitial) setLoading(false);
        }
    }, []);

    useEffect(() => {
        load(true);
        const interval = setInterval(() => load(false), 5000);
        return () => clearInterval(interval);
    }, [load]);

    const filtered = useMemo(() => {
        return rows.filter((r) => {
            if (outcomeFilter !== 'all' && r.outcome !== outcomeFilter) return false;
            if (!searchQuery) return true;
            const term = searchQuery.toLowerCase();
            return (
                r.routeId?.toLowerCase().includes(term) ||
                r.path?.toLowerCase().includes(term) ||
                r.denyCode?.toLowerCase().includes(term) ||
                r.eventId?.toLowerCase().includes(term)
            );
        });
    }, [rows, searchQuery, outcomeFilter]);

    return {
        rows,
        filtered,
        loading,
        error,
        selected,
        setSelected,
        searchQuery,
        setSearchQuery,
        outcomeFilter,
        setOutcomeFilter,
        refresh: () => load(true)
    };
}
