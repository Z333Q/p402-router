'use client';

import React, { useEffect, useState, Suspense } from 'react';
import { PlanUsageCard } from '../_components/PlanUsageCard';
import { AuditGateBanner } from '../_components/audit/AuditGateBanner';
import { useSearchParams } from 'next/navigation';
import { Zap, ExternalLink, CheckCircle, AlertCircle } from 'lucide-react';
import { usePlanUsage } from '@/hooks/usePlanUsage';

interface UpgradeMath {
    monthly_volume_usd: number;
    estimated_savings_usd: number;
    failed_settle_rate_pct: number;
}

function BillingContent() {
    const [upgradeMath, setUpgradeMath] = useState<UpgradeMath | null>(null);
    const searchParams = useSearchParams();
    const { planId, isLoading: planLoading } = usePlanUsage();
    const [isActionPending, setIsActionPending] = useState(false);

    const success = searchParams.get('success');
    const canceled = searchParams.get('canceled');

    useEffect(() => {
        fetch('/api/admin/revenue?days=30')
            .then(res => res.ok ? res.json() : null)
            .catch(() => null)
            .then(data => {
                if (data?.revenue?.length) {
                    const totalVolume = data.revenue.reduce((sum: number, r: any) =>
                        sum + (parseFloat(r.volume_micros || '0') / 1000000), 0);
                    setUpgradeMath({
                        monthly_volume_usd: totalVolume,
                        estimated_savings_usd: totalVolume * (0.01 - 0.0075),
                        failed_settle_rate_pct: 3.2,
                    });
                }
            });
    }, []);

    const handlePlanAction = async () => {
        setIsActionPending(true);
        const endpoint = planId === 'pro' ? '/api/v2/billing/portal' : '/api/v2/billing/checkout';
        try {
            const res = await fetch(endpoint, { method: 'POST' });
            const data = await res.json();
            if (data.url) {
                window.location.href = data.url;
            } else {
                alert('Action failed: ' + (data.error || 'Unknown error'));
                setIsActionPending(false);
            }
        } catch (err) {
            alert('Billing system unreachable');
            setIsActionPending(false);
        }
    };

    return (
        <div className="max-w-4xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
            <div className="md:flex md:items-center md:justify-between mb-8">
                <div className="flex-1 min-w-0">
                    <h2 className="text-2xl font-black uppercase tracking-tight text-[var(--neutral-900)]">
                        Billing & Usage
                    </h2>
                    <p className="mt-1 text-sm text-neutral-500 font-mono">
                        Manage your subscription, view current cycle usage, and upgrade plans.
                    </p>
                </div>
                <div className="mt-4 flex md:mt-0 md:ml-4">
                    <button
                        onClick={handlePlanAction}
                        disabled={isActionPending || planLoading}
                        className="inline-flex items-center px-4 py-2 bg-[var(--primary)] text-[var(--neutral-900)] border-2 border-black rounded-none text-sm font-bold uppercase tracking-wide hover:brightness-110 transition-all shadow-[4px_4px_0_#000] active:shadow-none active:translate-x-1 active:translate-y-1 disabled:opacity-50"
                    >
                        {isActionPending ? 'Connecting...' : (planId === 'pro' ? 'Manage Subscription' : 'Upgrade to Pro')}
                        {planId === 'pro' ? <ExternalLink className="ml-2 w-4 h-4" /> : <Zap className="ml-2 w-4 h-4" />}
                    </button>
                </div>
            </div>

            {/* Notifications */}
            {success && (
                <div className="mb-6 border-2 border-black bg-[var(--primary)] p-4 shadow-[4px_4px_0_#000] flex items-center gap-3">
                    <CheckCircle className="w-5 h-5" />
                    <div className="text-xs font-black uppercase tracking-widest">
                        Upgrade Successful! Your Pro features are now active.
                    </div>
                </div>
            )}

            {canceled && (
                <div className="mb-6 border-2 border-black bg-white p-4 shadow-[4px_4px_0_#000] flex items-center gap-3">
                    <AlertCircle className="w-5 h-5 text-red-500" />
                    <div className="text-xs font-bold uppercase tracking-widest">
                        Checkout canceled. No changes were made to your plan.
                    </div>
                </div>
            )}

            <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                {/* Usage Card */}
                <div className="md:col-span-2">
                    <PlanUsageCard />
                </div>

                {/* Audit-Driven Upgrade Math */}
                {planId === 'free' && upgradeMath && upgradeMath.estimated_savings_usd > 0 && (
                    <div className="md:col-span-2">
                        <AuditGateBanner
                            state="preview"
                            featureName="Advanced Billing Analytics"
                            prompt={{
                                target_plan: 'Pro',
                                body: `Pro saves $${upgradeMath.estimated_savings_usd.toFixed(2)} in platform fees at your volume. Pro reduces failed settles by ${(upgradeMath.failed_settle_rate_pct * 0.4).toFixed(0)}% via retry tooling.`,
                                cta_route: '/dashboard/billing',
                                math: {
                                    projected_savings_usd: upgradeMath.estimated_savings_usd,
                                    failure_rate_reduction_pct: upgradeMath.failed_settle_rate_pct * 0.4,
                                },
                            }}
                        />
                    </div>
                )}

                {/* Payment History Card (Stubbed) */}
                <div className="border-2 border-black rounded-none md:col-span-2 bg-white">
                    <div className="px-4 py-4 border-b-2 border-black bg-[var(--neutral-50)] flex justify-between items-center">
                        <h3 className="text-sm font-bold uppercase tracking-wide text-[var(--neutral-900)]">
                            Subscription Details
                        </h3>
                        <div className="flex items-center gap-2">
                            <span className="text-[10px] font-black uppercase tracking-widest text-neutral-500">Current Plan:</span>
                            <span className={`text-[10px] font-black uppercase tracking-widest px-2 py-0.5 border border-black ${planId === 'pro' ? 'bg-primary' : 'bg-neutral-100'}`}>
                                {planId?.toUpperCase() || 'FREE'}
                            </span>
                        </div>
                    </div>
                    <div className="p-4 bg-white">
                        <p className="text-xs font-mono text-neutral-600 mb-4">
                            Billing is handled exclusively through Stripe for security and transparency.
                            Use the management portal to view past invoices and update payment methods.
                        </p>
                        <button
                            onClick={handlePlanAction}
                            className="text-xs font-black uppercase tracking-widest border-b-2 border-black hover:text-primary hover:border-primary transition-all pb-0.5"
                        >
                            Access Stripe Billing Center &rarr;
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}

export default function BillingDashboardPage() {
    return (
        <Suspense fallback={<div className="p-8 font-mono animate-pulse uppercase text-xs">Initializing Billing Modules...</div>}>
            <BillingContent />
        </Suspense>
    );
}
