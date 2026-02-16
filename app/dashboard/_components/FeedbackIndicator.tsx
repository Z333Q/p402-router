'use client';

import React from 'react';
import useSWR from 'swr';
import { Badge } from './ui';
import { ShieldCheck, Clock, Minus } from 'lucide-react';

interface FeedbackIndicatorProps {
    settlementId: string;
}

interface FeedbackEntry {
    id: number;
    value: number;
    status: string;
    tx_hash?: string | null;
    submitted_at?: string | null;
}

const fetcher = async (url: string) => {
    const res = await fetch(url);
    if (!res.ok) return null;
    return res.json();
};

export function FeedbackIndicator({ settlementId }: FeedbackIndicatorProps) {
    const { data, isLoading } = useSWR<{ feedback: FeedbackEntry[] } | null>(
        `/api/v1/erc8004/feedback?settlementId=${settlementId}`,
        fetcher,
        { revalidateOnFocus: false }
    );

    if (isLoading) {
        return <span className="inline-block w-3 h-3 bg-neutral-200 animate-pulse" />;
    }

    const feedback = data?.feedback?.[0];

    if (!feedback) {
        return (
            <span className="inline-flex items-center gap-1 text-neutral-400">
                <Minus size={12} />
                <span className="text-[9px] font-bold uppercase">N/A</span>
            </span>
        );
    }

    if (feedback.status === 'pending') {
        return (
            <span className="inline-flex items-center gap-1" title={`Score: ${feedback.value}/100 — Awaiting on-chain submission`}>
                <Clock size={12} className="text-amber-500 animate-pulse" />
                <Badge className="bg-amber-50 text-amber-700 border-amber-200 text-[9px]">
                    PENDING
                </Badge>
            </span>
        );
    }

    if (feedback.status === 'submitted') {
        const basescanUrl = feedback.tx_hash
            ? `https://basescan.org/tx/${feedback.tx_hash}`
            : null;

        return (
            <span className="inline-flex items-center gap-1" title={`Score: ${feedback.value}/100 — Submitted on-chain`}>
                <ShieldCheck size={12} className="text-emerald-600" strokeWidth={3} />
                {basescanUrl ? (
                    <a href={basescanUrl} target="_blank" rel="noopener noreferrer">
                        <Badge className="bg-emerald-50 text-emerald-700 border-emerald-200 text-[9px] hover:bg-emerald-100 transition-colors cursor-pointer">
                            {feedback.value}/100
                        </Badge>
                    </a>
                ) : (
                    <Badge className="bg-emerald-50 text-emerald-700 border-emerald-200 text-[9px]">
                        {feedback.value}/100
                    </Badge>
                )}
            </span>
        );
    }

    return (
        <Badge className="bg-neutral-50 text-neutral-400 border-neutral-200 text-[9px]">
            {feedback.status.toUpperCase()}
        </Badge>
    );
}
