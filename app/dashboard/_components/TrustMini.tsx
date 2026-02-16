'use client';

import React from 'react';
import useSWR from 'swr';
import { Badge } from './ui';
import { ShieldCheck } from 'lucide-react';

interface ReputationData {
    facilitators: Array<{
        facilitator_id: string;
        name: string;
        erc8004_agent_id: string | null;
        erc8004_verified: boolean;
        erc8004_reputation_cached: number | null;
    }>;
}

const fetcher = async (url: string) => {
    const res = await fetch(url);
    if (!res.ok) throw new Error('Failed to fetch');
    return res.json();
};

export function TrustMini() {
    const { data, isLoading, error } = useSWR<ReputationData>(
        '/api/v1/erc8004/reputation',
        fetcher,
        { refreshInterval: 120000 }
    );

    if (isLoading || error || !data) {
        return (
            <div className="border-2 border-black p-3 bg-white min-w-[120px]">
                <div className="animate-pulse flex flex-col gap-2">
                    <div className="h-3 w-12 bg-neutral-100" />
                    <div className="h-6 w-20 bg-neutral-100" />
                </div>
            </div>
        );
    }

    const total = data.facilitators?.length ?? 0;
    const verified = data.facilitators?.filter(f => f.erc8004_verified).length ?? 0;

    return (
        <div className="border-2 border-black p-3 bg-white flex items-center justify-between min-w-[150px]">
            <div>
                <span className="text-xs font-bold uppercase text-neutral-500">
                    TRUST LAYER
                </span>
                <span className="text-xl font-extrabold block">
                    {verified}/{total}
                </span>
            </div>
            <div className="ml-4">
                <Badge variant={verified > 0 ? 'success' : 'default'}>
                    <ShieldCheck size={10} className="inline mr-1" />
                    VERIFIED
                </Badge>
            </div>
        </div>
    );
}
