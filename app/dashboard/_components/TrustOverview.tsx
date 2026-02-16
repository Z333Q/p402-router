'use client';

import React from 'react';
import useSWR from 'swr';
import { Card, Stat, ProgressBar, Skeleton, Badge } from './ui';
import { ShieldCheck } from 'lucide-react';
import Link from 'next/link';

interface ReputationData {
    facilitators: Array<{
        facilitator_id: string;
        name: string;
        erc8004_agent_id: string | null;
        erc8004_verified: boolean;
        erc8004_reputation_cached: number | null;
    }>;
}

interface FeedbackData {
    feedback: Array<{
        id: number;
        status: string;
    }>;
}

const fetcher = async (url: string) => {
    const res = await fetch(url);
    if (!res.ok) throw new Error('Failed to fetch');
    return res.json();
};

export function TrustOverview() {
    const { data: repData, isLoading: repLoading } = useSWR<ReputationData>(
        '/api/v1/erc8004/reputation',
        fetcher,
        { refreshInterval: 120000 }
    );

    const { data: fbData } = useSWR<FeedbackData>(
        '/api/v1/erc8004/feedback',
        fetcher,
        { refreshInterval: 120000 }
    );

    if (repLoading) {
        return (
            <Card title="Trustless Agents" className="bg-white">
                <div className="space-y-4">
                    <Skeleton className="h-16 w-full" />
                    <Skeleton className="h-16 w-full" />
                    <Skeleton className="h-16 w-full" />
                </div>
            </Card>
        );
    }

    const facilitators = repData?.facilitators ?? [];
    const verified = facilitators.filter(f => f.erc8004_verified);
    const avgReputation = verified.length > 0
        ? verified.reduce((acc, f) => acc + (f.erc8004_reputation_cached ?? 0), 0) / verified.length
        : 0;
    const pendingFeedback = fbData?.feedback?.filter(f => f.status === 'pending').length ?? 0;

    return (
        <Card
            title="Trustless Agents"
            action={
                <Link href="/dashboard/trust" className="text-[10px] font-black uppercase tracking-widest text-neutral-400 hover:text-black transition-colors">
                    View All →
                </Link>
            }
            className="bg-white"
        >
            {/* Summary Stats */}
            <div className="grid grid-cols-3 gap-4 mb-6">
                <Stat label="Verified" value={verified.length} suffix={`/${facilitators.length}`} size="sm" />
                <Stat label="Avg Trust" value={Math.round(avgReputation)} suffix="/100" size="sm" />
                <Stat label="Pending" value={pendingFeedback} size="sm" subtext="Feedback Queue" />
            </div>

            {/* Facilitator Trust Bars */}
            <div className="space-y-3">
                <h3 className="text-xs font-bold uppercase tracking-wider">Agent Reputation</h3>
                {facilitators.length === 0 ? (
                    <p className="text-sm text-neutral-500">No ERC-8004 facilitators registered</p>
                ) : (
                    facilitators.slice(0, 5).map(f => (
                        <div key={f.facilitator_id} className="flex items-center gap-3">
                            <div className="w-24 flex-shrink-0">
                                <div className="flex items-center gap-1">
                                    {f.erc8004_verified && (
                                        <ShieldCheck size={10} className="text-emerald-600 flex-shrink-0" strokeWidth={3} />
                                    )}
                                    <span className="text-[10px] font-bold uppercase truncate">
                                        {f.name || f.facilitator_id.slice(0, 12)}
                                    </span>
                                </div>
                            </div>
                            <div className="flex-1">
                                <ProgressBar
                                    value={f.erc8004_reputation_cached ?? 0}
                                    max={100}
                                    showValue={false}
                                    variant={
                                        (f.erc8004_reputation_cached ?? 0) >= 70 ? 'success' :
                                        (f.erc8004_reputation_cached ?? 0) >= 40 ? 'warning' : 'default'
                                    }
                                />
                            </div>
                            <span className="text-[10px] font-mono font-bold w-8 text-right">
                                {f.erc8004_reputation_cached != null ? Math.round(f.erc8004_reputation_cached) : '---'}
                            </span>
                        </div>
                    ))
                )}
            </div>
        </Card>
    );
}
