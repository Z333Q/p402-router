'use client';

import React from 'react';
import { usePlanUsage } from '@/hooks/usePlanUsage';
import { Zap, TrendingUp, AlertTriangle } from 'lucide-react';

interface PlanUsageCardProps {
    tenantId?: string;
}

export function PlanUsageCard({ tenantId }: PlanUsageCardProps) {
    const { planId, maxSpendUsd, currentUsageUsd, usagePercent, isLoading, error } = usePlanUsage(tenantId);

    if (isLoading) {
        return (
            <div className="p-8 border-2 border-black bg-white shadow-[4px_4px_0px_#000] animate-pulse">
                <div className="h-4 bg-neutral-200 w-1/4 mb-4"></div>
                <div className="h-8 bg-neutral-100 w-full"></div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="p-6 border-2 border-black bg-red-50 shadow-[4px_4px_0px_#000] flex items-center gap-3">
                <AlertTriangle className="text-red-600 w-6 h-6" />
                <div className="font-bold uppercase text-red-600 text-sm">{error}</div>
            </div>
        );
    }

    const isNearLimit = usagePercent > 80;
    const isOverLimit = usagePercent >= 100;

    const progressColor = isOverLimit
        ? 'bg-red-500'
        : isNearLimit
            ? 'bg-[var(--warning)]'
            : 'bg-[var(--primary)]';

    return (
        <div className="border-2 border-black bg-white shadow-[8px_8px_0px_#000] overflow-hidden">
            <div className="p-6">
                <div className="flex justify-between items-start mb-6">
                    <div>
                        <div className="flex items-center gap-2 mb-1 text-[var(--neutral-400)]">
                            <TrendingUp className="w-4 h-4" />
                            <span className="text-[10px] font-black uppercase tracking-[0.2em]">Monthly Throughput</span>
                        </div>
                        <h3 className="text-2xl font-black uppercase tracking-tighter flex items-center gap-2">
                            {planId} Tier
                            {planId === 'pro' && <Zap className="w-5 h-5 text-[var(--primary)] fill-current" />}
                        </h3>
                    </div>
                    <div className="text-right">
                        <div className="text-3xl font-black tracking-tighter text-black">
                            ${currentUsageUsd.toFixed(2)}
                        </div>
                        <div className="text-[10px] font-bold uppercase text-[var(--neutral-500)] tracking-widest">
                            limit: ${maxSpendUsd.toFixed(0)}
                        </div>
                    </div>
                </div>

                <div className="relative h-6 border-2 border-black bg-neutral-50 mb-4">
                    <div
                        className={`absolute top-0 left-0 h-full border-r-2 border-black transition-all duration-500 ${progressColor}`}
                        style={{ width: `${Math.min(usagePercent, 100)}%` }}
                    />
                    <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                        <span className="text-[10px] font-black uppercase tracking-widest mix-blend-difference text-white">
                            {usagePercent.toFixed(1)}% Consumed
                        </span>
                    </div>
                </div>

                <div className="flex justify-between items-center bg-[var(--neutral-50)] border-t-2 border-black -mx-6 -mb-6 p-4">
                    <p className="text-[10px] font-mono font-bold uppercase text-[var(--neutral-500)]">
                        {isOverLimit ? 'Limit reached. Upgrade for more bandwidth.' : 'Resets on the 1st of next month.'}
                    </p>
                    {planId === 'free' && (
                        <a
                            href="/dashboard/billing"
                            className="text-[10px] font-black uppercase tracking-widest bg-black text-white px-3 py-1.5 hover:bg-[var(--primary)] hover:text-black transition-colors"
                        >
                            Unlock Limits &rarr;
                        </a>
                    )}
                </div>
            </div>
        </div>
    );
}
