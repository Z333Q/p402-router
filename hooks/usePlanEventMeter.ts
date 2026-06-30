'use client';

import { useEffect, useState } from 'react';

export interface PlanEventMeterData {
    planId: string;
    planName: string;
    includedEvents: number | null;
    retentionDays: number | null;
    monthEventsUsed: number;
    percentUsed: number | null;
    firstEventAt: string | null;
    lastEventAt: string | null;
    hasAnyEvent: boolean;
    nextUpgradeReason: string;
    upgradeNotice: string;
}

interface State {
    data: PlanEventMeterData | null;
    isLoading: boolean;
    error: string | null;
}

export function usePlanEventMeter(): State {
    const [state, setState] = useState<State>({ data: null, isLoading: true, error: null });

    useEffect(() => {
        let cancelled = false;
        (async () => {
            try {
                const res = await fetch('/api/v2/billing/event-meter');
                if (!res.ok) throw new Error(`HTTP ${res.status}`);
                const data = await res.json() as PlanEventMeterData;
                if (!cancelled) setState({ data, isLoading: false, error: null });
            } catch (e) {
                if (!cancelled) setState({ data: null, isLoading: false, error: e instanceof Error ? e.message : 'Failed to load meter' });
            }
        })();
        return () => { cancelled = true; };
    }, []);

    return state;
}
