/**
 * P402 Dashboard
 * ===============
 * Main Cost Intelligence dashboard.
 * "Show the money, hide the complexity"
 */

'use client';

import React from 'react';
import Link from 'next/link';
import { SpendOverview, SpendMini } from './_components/SpendOverview';
import { OptimizationAlerts } from './_components/OptimizationAlerts';
import { CacheAnalytics, CacheMini } from './_components/CacheAnalytics';
import { ProviderStatus, ProviderMini } from './_components/ProviderStatus';
import { CostComparison } from './_components/CostComparison';
import { TrustMini } from './_components/TrustMini';
import { TrustOverview } from './_components/TrustOverview';
import { SafetyOverview, SafetyMini } from './_components/SafetyOverview';
import { OnboardingChecklist } from './_components/OnboardingChecklist';

import { useSWRConfig } from 'swr';
import { useEffect, useState } from 'react';

export default function DashboardPage() {
    const { mutate } = useSWRConfig();
    const [skillBannerDismissed, setSkillBannerDismissed] = useState(true);

    useEffect(() => {
        setSkillBannerDismissed(localStorage.getItem('skill-banner-dismissed') === '1');
    }, []);

    const dismissSkillBanner = () => {
        localStorage.setItem('skill-banner-dismissed', '1');
        setSkillBannerDismissed(true);
    };

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
            {/* Activation Checklist — visible until dismissed or completed */}
            <OnboardingChecklist />

            {/* Claude Skill Banner */}
            {!skillBannerDismissed && (
                <div className="border-2 border-black bg-primary flex items-center justify-between gap-4 px-5 py-3">
                    <div className="flex items-center gap-3 min-w-0">
                        <span className="shrink-0 font-black uppercase text-[10px] tracking-widest bg-black text-primary px-2 py-0.5">New</span>
                        <p className="font-bold text-sm text-black truncate">
                            Install the{' '}
                            <Link href="/docs/skill" className="underline font-black hover:no-underline">P402 Claude Skill</Link>
                            {' '}— Claude gains deep knowledge of your routing API, billing guard, and payment flows.{' '}
                            <Link href="/docs/skill" className="underline font-black hover:no-underline">Learn more →</Link>
                        </p>
                    </div>
                    <button
                        onClick={dismissSkillBanner}
                        aria-label="Dismiss"
                        className="shrink-0 font-black text-[10px] uppercase border-2 border-black px-2 py-1 hover:bg-black hover:text-primary transition-colors"
                    >
                        Dismiss
                    </button>
                </div>
            )}

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
                    <TrustMini />
                    <SafetyMini />
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

            {/* Bottom Row: Provider Status + Trust Overview */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                <div className="lg:col-span-2">
                    <ProviderStatus />
                </div>
                <TrustOverview />
            </div>

            {/* Safety Row */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                <SafetyOverview />
            </div>
        </div>
    );
}
