/**
 * P402 Dashboard
 * ===============
 * Main Cost Intelligence dashboard.
 * "Show the money, hide the complexity"
 */

'use client';

import React from 'react';
import { SpendOverview, SpendMini } from './_components/SpendOverview';
import { OptimizationAlerts } from './_components/OptimizationAlerts';
import { CacheAnalytics, CacheMini } from './_components/CacheAnalytics';
import { ProviderStatus, ProviderMini } from './_components/ProviderStatus';
import { CostComparison } from './_components/CostComparison';

import { useSWRConfig } from 'swr';
import { useEffect } from 'react';

export default function DashboardPage() {
    const { mutate } = useSWRConfig();

    // Keyboard Shortcuts
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            // 'r' to refresh
            if (e.key.toLowerCase() === 'r' && !['INPUT', 'TEXTAREA'].includes((e.target as HTMLElement).tagName)) {
                e.preventDefault();
                mutate(() => true, undefined, { revalidate: true });
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [mutate]);

    return (
        <div className="space-y-8">
            {/* Quick Stats Summary Bar */}
            <div className="flex flex-wrap items-center justify-between gap-6 border-b-2 border-black/5 pb-8">
                <div className="space-y-1">
                    <h1 className="text-4xl font-black uppercase tracking-tighter text-black">Mission Control</h1>
                    <p className="text-neutral-500 font-medium">Global AI spend intelligence & routing optimization.</p>
                </div>
                <div className="flex flex-wrap gap-4">
                    <SpendMini />
                    <CacheMini />
                    <ProviderMini />
                </div>
            </div>

            {/* Top Row: Spend + Alerts */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                <SpendOverview />
                <OptimizationAlerts />
            </div>

            {/* Middle Row: Cache + Cost Comparison */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                <CacheAnalytics />
                <div className="lg:col-span-2">
                    <CostComparison />
                </div>
            </div>

            {/* Bottom: Provider Status (full width) */}
            <ProviderStatus />
        </div>
    );
}
