'use client';

/**
 * Phase 1A: Read-only event meter card for the dashboard.
 *
 * Renders current plan, current month events used, included events, percent
 * used, retention window, next upgrade reason, and an empty state when no
 * events have ever been recorded.
 *
 * Read-only. No checkout. No billing writes. CTA copy is locked to
 * "Upgrade path is controlled by the billing rollout." until the billing
 * rollout opens self-serve checkout.
 */

import React from 'react';
import { Card, ProgressBar, EmptyState, Badge } from './ui';
import { usePlanEventMeter } from '@/hooks/usePlanEventMeter';
import { formatEventAllowance } from '@/lib/pricing/rate-card';

function formatNumber(n: number): string {
    return n.toLocaleString('en-US');
}

function formatDate(iso: string | null): string {
    if (!iso) return '—';
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return '—';
    return d.toISOString().slice(0, 10);
}

export function PlanEventMeter() {
    const { data, isLoading, error } = usePlanEventMeter();

    if (isLoading) {
        return (
            <Card title="Plan and Usage" body="Loading">
                <div className="h-32 bg-neutral-100 animate-pulse" />
            </Card>
        );
    }

    if (error || !data) {
        return (
            <Card title="Plan and Usage" body="Read-only">
                <p className="text-sm font-mono text-neutral-600">
                    Meter is unavailable right now. Try again in a moment.
                </p>
            </Card>
        );
    }

    const isUnlimited = data.includedEvents === null;
    const isEmpty = !data.hasAnyEvent && data.monthEventsUsed === 0;
    const includedLabel = formatEventAllowance(data.includedEvents);
    const usedLabel = formatNumber(data.monthEventsUsed);
    const percent = data.percentUsed ?? 0;

    return (
        <Card
            title="Plan and Usage"
            body="Read-only revenue visibility"
            action={<Badge variant="primary">{data.planName}</Badge>}
        >
            {isEmpty && (
                <div className="mb-6">
                    <EmptyState
                        title="No metered events yet"
                        body="Once your account sends its first metered AI event, your monthly usage will appear here. Your plan, retention, and limits are shown below."
                        icon="📊"
                    />
                </div>
            )}

            <dl className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                <div>
                    <dt className="text-[10px] font-black uppercase tracking-widest text-neutral-500">Current plan</dt>
                    <dd className="text-2xl font-extrabold mt-1">{data.planName}</dd>
                </div>
                <div>
                    <dt className="text-[10px] font-black uppercase tracking-widest text-neutral-500">Retention window</dt>
                    <dd className="text-2xl font-extrabold mt-1">
                        {data.retentionDays === null ? 'Custom' : `${data.retentionDays} days`}
                    </dd>
                </div>
                <div>
                    <dt className="text-[10px] font-black uppercase tracking-widest text-neutral-500">Month events used</dt>
                    <dd className="text-2xl font-extrabold mt-1 font-mono">{usedLabel}</dd>
                </div>
                <div>
                    <dt className="text-[10px] font-black uppercase tracking-widest text-neutral-500">Included this month</dt>
                    <dd className="text-2xl font-extrabold mt-1 font-mono">{includedLabel}</dd>
                </div>
            </dl>

            {!isUnlimited && (
                <div className="mb-6">
                    <ProgressBar
                        label={`${percent.toFixed(1)}% of plan inclusion used`}
                        value={percent}
                        max={100}
                        showValue={false}
                        variant={percent >= 100 ? 'danger' : percent >= 80 ? 'warning' : 'default'}
                    />
                </div>
            )}

            <dl className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                <div>
                    <dt className="text-[10px] font-black uppercase tracking-widest text-neutral-500">First metered event</dt>
                    <dd className="text-sm font-mono mt-1">{formatDate(data.firstEventAt)}</dd>
                </div>
                <div>
                    <dt className="text-[10px] font-black uppercase tracking-widest text-neutral-500">Last metered event</dt>
                    <dd className="text-sm font-mono mt-1">{formatDate(data.lastEventAt)}</dd>
                </div>
            </dl>

            <div className="border-t-2 border-black pt-4">
                <p className="text-[10px] font-black uppercase tracking-widest text-neutral-500 mb-1">Next upgrade reason</p>
                <p className="text-sm font-bold mb-3">{data.nextUpgradeReason}</p>
                <p className="text-xs font-mono text-neutral-600">{data.upgradeNotice}</p>
            </div>
        </Card>
    );
}
