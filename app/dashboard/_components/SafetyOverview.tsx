'use client';

import React from 'react';
import useSWR from 'swr';
import { Card, Stat, Badge, Skeleton } from './ui';
import { ShieldAlert } from 'lucide-react';

interface QuarantineStats {
    quarantined: Array<{
        id: string;
        canonical_route_id: string;
        source_facilitator_id: string;
        facilitator_name: string | null;
        scan_result: { riskScore: number; flags: string[] };
        created_at: string;
    }>;
    total: number;
}

const fetcher = async (url: string) => {
    const res = await fetch(url);
    if (!res.ok) throw new Error('Failed to fetch');
    return res.json();
};

export function SafetyOverview() {
    const { data, isLoading } = useSWR<QuarantineStats>(
        '/api/v1/admin/quarantine?status=quarantined&limit=5',
        fetcher,
        { refreshInterval: 60000 }
    );

    if (isLoading) {
        return (
            <Card title="Safety Scanner" className="bg-white">
                <div className="space-y-4">
                    <Skeleton className="h-16 w-full" />
                    <Skeleton className="h-16 w-full" />
                </div>
            </Card>
        );
    }

    const queueCount = data?.total ?? 0;
    const items = data?.quarantined ?? [];

    return (
        <Card
            title="Safety Scanner"
            action={
                <div className="flex items-center gap-1.5">
                    <ShieldAlert size={12} className={queueCount > 0 ? 'text-amber-500' : 'text-emerald-500'} strokeWidth={3} />
                    <span className="text-[10px] font-black uppercase tracking-widest text-neutral-400">
                        {queueCount > 0 ? `${queueCount} Pending` : 'Clear'}
                    </span>
                </div>
            }
            className="bg-white"
        >
            {/* Summary Stats */}
            <div className="grid grid-cols-2 gap-4 mb-6">
                <Stat label="Quarantine Queue" value={queueCount} size="sm" />
                <Stat
                    label="Status"
                    value={queueCount === 0 ? 'All Clear' : 'Review Needed'}
                    size="sm"
                />
            </div>

            {/* Recent Quarantined Items */}
            <div className="space-y-2">
                <h3 className="text-xs font-bold uppercase tracking-wider">Quarantine Queue</h3>
                {items.length === 0 ? (
                    <p className="text-sm text-neutral-500">No resources awaiting review</p>
                ) : (
                    items.map(item => (
                        <div key={item.id} className="flex items-center justify-between py-1.5 border-b border-neutral-100 last:border-0">
                            <div className="flex-1 min-w-0">
                                <span className="text-xs font-mono font-bold block truncate">
                                    {item.canonical_route_id}
                                </span>
                                <span className="text-[10px] text-neutral-400">
                                    {item.facilitator_name || item.source_facilitator_id?.slice(0, 16)}
                                </span>
                            </div>
                            <div className="flex items-center gap-2 flex-shrink-0 ml-2">
                                <Badge variant="default" tone="warning">
                                    {item.scan_result?.riskScore ?? '?'}/10
                                </Badge>
                            </div>
                        </div>
                    ))
                )}
            </div>
        </Card>
    );
}

export function SafetyMini() {
    const { data } = useSWR<QuarantineStats>(
        '/api/v1/admin/quarantine?status=quarantined&limit=1',
        fetcher,
        { refreshInterval: 60000 }
    );

    const count = data?.total ?? 0;

    return (
        <Stat
            label="Quarantine"
            value={count}
            size="sm"
            subtext={count === 0 ? 'Clear' : 'Pending'}
        />
    );
}
