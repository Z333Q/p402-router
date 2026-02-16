'use client';

import React from 'react';
import useSWR from 'swr';
import { Card, Badge, Button, MetricBox, ProgressBar, EmptyState, Skeleton } from '../_components/ui';
import { TrustBadge } from '../_components/TrustBadge';
import { TrustOnboardingBanner } from '../_components/TrustOnboardingBanner';
import { ShieldCheck, Shield, ExternalLink } from 'lucide-react';
import Link from 'next/link';

interface FacilitatorTrust {
    facilitator_id: string;
    name: string;
    erc8004_agent_id: string | null;
    erc8004_verified: boolean;
    erc8004_reputation_cached: number | null;
}

interface FeedbackEntry {
    id: number;
    facilitator_id: string;
    value: number;
    status: string;
    tx_hash?: string | null;
    created_at: string;
    submitted_at?: string | null;
}

const fetcher = async (url: string) => {
    const res = await fetch(url);
    if (!res.ok) throw new Error('Failed to fetch');
    return res.json();
};

export default function TrustLayerPage() {
    const { data: repData, isLoading: repLoading } = useSWR<{ facilitators: FacilitatorTrust[] }>(
        '/api/v1/erc8004/reputation',
        fetcher,
        { refreshInterval: 60000 }
    );

    const { data: fbData, isLoading: fbLoading } = useSWR<{ feedback: FeedbackEntry[] }>(
        '/api/v1/erc8004/feedback',
        fetcher,
        { refreshInterval: 60000 }
    );

    const facilitators = repData?.facilitators ?? [];
    const feedback = fbData?.feedback ?? [];
    const verified = facilitators.filter(f => f.erc8004_verified);
    const avgReputation = verified.length > 0
        ? verified.reduce((acc, f) => acc + (f.erc8004_reputation_cached ?? 0), 0) / verified.length
        : 0;
    const pendingFeedback = feedback.filter(f => f.status === 'pending').length;
    const submittedFeedback = feedback.filter(f => f.status === 'submitted').length;

    return (
        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
            {/* Page Header */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-6">
                <div className="space-y-1">
                    <h1 className="text-4xl font-black uppercase tracking-tighter text-black italic">Trust Layer</h1>
                    <p className="text-neutral-500 font-medium">ERC-8004 on-chain identity, reputation, and validation status.</p>
                </div>
                <Link href="/docs/erc8004">
                    <Button variant="dark" className="text-[10px] tracking-widest px-6">
                        ERC-8004 DOCS
                    </Button>
                </Link>
            </div>

            {/* Onboarding Banner */}
            <TrustOnboardingBanner />

            {/* Stats Row */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                <MetricBox
                    label="Verified Agents"
                    value={repLoading ? '...' : `${verified.length}`}
                    subtext={`of ${facilitators.length} Total`}
                    helpText="Number of facilitators with verified ERC-8004 on-chain identity"
                    accent={verified.length > 0}
                />
                <MetricBox
                    label="Avg Reputation"
                    value={repLoading ? '...' : `${Math.round(avgReputation)}`}
                    subtext="Out of 100"
                    helpText="Average on-chain reputation score across verified facilitators"
                />
                <MetricBox
                    label="Feedback Queued"
                    value={fbLoading ? '...' : `${pendingFeedback}`}
                    subtext="Pending Submission"
                    helpText="Reputation feedback awaiting batch on-chain submission"
                />
                <MetricBox
                    label="Feedback Submitted"
                    value={fbLoading ? '...' : `${submittedFeedback}`}
                    subtext="On-Chain"
                    helpText="Total reputation feedback successfully submitted on-chain"
                />
            </div>

            {/* Facilitator Trust Table */}
            <Card title="Agent Registry" className="p-0">
                {repLoading ? (
                    <div className="p-6 space-y-4">
                        <Skeleton className="h-12 w-full" />
                        <Skeleton className="h-12 w-full" />
                        <Skeleton className="h-12 w-full" />
                    </div>
                ) : facilitators.length === 0 ? (
                    <div className="p-6">
                        <EmptyState
                            title="No Agents Registered"
                            body="No facilitators have ERC-8004 agent identities. Register your first agent to begin building on-chain trust."
                            action={
                                <Link href="/docs/erc8004">
                                    <Button>View Setup Guide</Button>
                                </Link>
                            }
                        />
                    </div>
                ) : (
                    <div className="overflow-hidden">
                        <table className="min-w-full divide-y divide-neutral-200">
                            <thead className="bg-neutral-50">
                                <tr>
                                    <th className="px-6 py-3 text-left text-xs font-bold text-neutral-900 uppercase tracking-wider">Agent</th>
                                    <th className="px-6 py-3 text-left text-xs font-bold text-neutral-900 uppercase tracking-wider">Status</th>
                                    <th className="px-6 py-3 text-left text-xs font-bold text-neutral-900 uppercase tracking-wider">Reputation</th>
                                    <th className="px-6 py-3 text-left text-xs font-bold text-neutral-900 uppercase tracking-wider">Agent ID</th>
                                </tr>
                            </thead>
                            <tbody className="bg-white divide-y divide-neutral-200">
                                {facilitators.map(f => (
                                    <tr key={f.facilitator_id} className="hover:bg-neutral-50">
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-2">
                                                {f.erc8004_verified ? (
                                                    <ShieldCheck size={14} className="text-emerald-600 flex-shrink-0" strokeWidth={3} />
                                                ) : (
                                                    <Shield size={14} className="text-neutral-300 flex-shrink-0" strokeWidth={3} />
                                                )}
                                                <span className="text-sm font-bold">{f.name || f.facilitator_id}</span>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            {f.erc8004_verified ? (
                                                <Badge className="bg-emerald-50 text-emerald-700 border-emerald-300 text-[9px]">VERIFIED</Badge>
                                            ) : (
                                                <Badge className="bg-neutral-50 text-neutral-400 border-neutral-200 text-[9px]">UNVERIFIED</Badge>
                                            )}
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-3 w-48">
                                                <ProgressBar
                                                    value={f.erc8004_reputation_cached ?? 0}
                                                    max={100}
                                                    showValue={false}
                                                    variant={
                                                        (f.erc8004_reputation_cached ?? 0) >= 70 ? 'success' :
                                                        (f.erc8004_reputation_cached ?? 0) >= 40 ? 'warning' : 'default'
                                                    }
                                                    className="flex-1"
                                                />
                                                <span className="text-xs font-mono font-bold w-8 text-right">
                                                    {f.erc8004_reputation_cached != null ? Math.round(f.erc8004_reputation_cached) : '---'}
                                                </span>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            {f.erc8004_agent_id ? (
                                                <a
                                                    href={`https://basescan.org/token/0x8004A169FB4a3325136EB29fA0ceB6D2e539a432?a=${f.erc8004_agent_id}`}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    className="inline-flex items-center gap-1 text-xs font-mono text-blue-600 hover:text-blue-800"
                                                >
                                                    #{f.erc8004_agent_id}
                                                    <ExternalLink size={10} />
                                                </a>
                                            ) : (
                                                <span className="text-xs text-neutral-400">---</span>
                                            )}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </Card>

            {/* Feedback History */}
            <Card title="Feedback History" className="p-0">
                {fbLoading ? (
                    <div className="p-6 space-y-4">
                        <Skeleton className="h-10 w-full" />
                        <Skeleton className="h-10 w-full" />
                    </div>
                ) : feedback.length === 0 ? (
                    <div className="p-6">
                        <EmptyState
                            title="No Feedback Yet"
                            body="Reputation feedback is automatically queued after successful settlements when ERC8004_ENABLE_REPUTATION is enabled."
                        />
                    </div>
                ) : (
                    <div className="overflow-hidden">
                        <table className="min-w-full divide-y divide-neutral-200">
                            <thead className="bg-neutral-50">
                                <tr>
                                    <th className="px-6 py-3 text-left text-xs font-bold text-neutral-900 uppercase tracking-wider">Facilitator</th>
                                    <th className="px-6 py-3 text-left text-xs font-bold text-neutral-900 uppercase tracking-wider">Score</th>
                                    <th className="px-6 py-3 text-left text-xs font-bold text-neutral-900 uppercase tracking-wider">Status</th>
                                    <th className="px-6 py-3 text-left text-xs font-bold text-neutral-900 uppercase tracking-wider">Created</th>
                                </tr>
                            </thead>
                            <tbody className="bg-white divide-y divide-neutral-200">
                                {feedback.slice(0, 20).map(fb => (
                                    <tr key={fb.id} className="hover:bg-neutral-50">
                                        <td className="px-6 py-3 text-sm font-mono">
                                            {fb.facilitator_id.slice(0, 16)}...
                                        </td>
                                        <td className="px-6 py-3">
                                            <span className="text-sm font-bold">{fb.value}/100</span>
                                        </td>
                                        <td className="px-6 py-3">
                                            <Badge className={
                                                fb.status === 'submitted'
                                                    ? 'bg-emerald-50 text-emerald-700 border-emerald-200 text-[9px]'
                                                    : fb.status === 'pending'
                                                    ? 'bg-amber-50 text-amber-700 border-amber-200 text-[9px]'
                                                    : 'bg-neutral-50 text-neutral-400 border-neutral-200 text-[9px]'
                                            }>
                                                {fb.status.toUpperCase()}
                                            </Badge>
                                        </td>
                                        <td className="px-6 py-3 text-xs text-neutral-500">
                                            {new Date(fb.created_at).toLocaleDateString()}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </Card>
        </div>
    );
}
