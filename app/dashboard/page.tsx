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
        <div className="min-h-screen bg-neutral-100">
            {/* Header */}
            <header className="bg-white border-b-2 border-black">
                <div className="max-w-[1280px] mx-auto px-6 py-4">
                    <div className="flex flex-col md:flex-row items-center justify-between gap-4">
                        <div className="flex items-center gap-4">
                            <h1 className="text-2xl font-extrabold uppercase tracking-tight">
                                P402
                            </h1>
                            <span className="text-xs font-bold uppercase text-neutral-500 border-l-0 md:border-l-2 border-black pl-0 md:pl-4">
                                Cost Intelligence
                            </span>
                        </div>

                        {/* Quick Stats */}
                        <div className="flex flex-wrap justify-center gap-4">
                            <SpendMini />
                            <CacheMini />
                            <ProviderMini />
                        </div>
                    </div>
                </div>
            </header>

            {/* Main Content */}
            <main className="max-w-[1280px] mx-auto px-6 py-8">
                {/* Top Row: Spend + Alerts */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
                    <SpendOverview />
                    <OptimizationAlerts />
                </div>

                {/* Middle Row: Cache + Cost Comparison */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
                    <CacheAnalytics />
                    <div className="lg:col-span-2">
                        <CostComparison />
                    </div>
                </div>

                {/* Bottom: Provider Status (full width) */}
                <ProviderStatus />
            </main>

            {/* Footer */}
            <footer className="border-t-2 border-black bg-white mt-12">
                <div className="max-w-[1280px] mx-auto px-6 py-4">
                    <div className="flex items-center justify-between text-xs text-neutral-500">
                        <span>P402 AI Orchestration Layer</span>
                        <span>
                            <a href="/docs" className="text-[#22D3EE] hover:underline">API Docs</a>
                            {' • '}
                            <a href="/settings" className="text-[#22D3EE] hover:underline">Settings</a>
                        </span>
                    </div>
                </div>
            </footer>
        </div>
    );
}
