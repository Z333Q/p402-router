'use client';

import React from 'react';
import { ShieldCheck, Shield } from 'lucide-react';
import { Badge, ProgressBar } from './ui';

interface TrustBadgeProps {
    verified?: boolean;
    score?: number | null;
    agentId?: string | null;
    compact?: boolean;
    className?: string;
}

const IDENTITY_REGISTRY = '0x8004A169FB4a3325136EB29fA0ceB6D2e539a432';

function getScoreVariant(score: number): 'success' | 'warning' | 'danger' | 'default' {
    if (score >= 70) return 'success';
    if (score >= 40) return 'warning';
    if (score >= 1) return 'danger';
    return 'default';
}

export function TrustBadge({ verified, score, agentId, compact = false, className = '' }: TrustBadgeProps) {
    if (compact) {
        return (
            <span className={`inline-flex items-center gap-1 ${className}`}>
                {verified ? (
                    <ShieldCheck size={12} className="text-emerald-600" strokeWidth={3} />
                ) : (
                    <Shield size={12} className="text-neutral-400" strokeWidth={3} />
                )}
                {score != null && (
                    <span className="text-[9px] font-black uppercase tracking-tighter">
                        {Math.round(score)}
                    </span>
                )}
            </span>
        );
    }

    return (
        <div className={`space-y-2 ${className}`}>
            <div className="flex items-center gap-2">
                {verified ? (
                    <>
                        <ShieldCheck size={14} className="text-emerald-600" strokeWidth={3} />
                        <Badge className="bg-emerald-50 text-emerald-700 border-emerald-300 text-[9px]">
                            ERC-8004 VERIFIED
                        </Badge>
                    </>
                ) : (
                    <>
                        <Shield size={14} className="text-neutral-400" strokeWidth={3} />
                        <Badge className="bg-neutral-50 text-neutral-400 border-neutral-200 text-[9px]">
                            UNVERIFIED
                        </Badge>
                    </>
                )}
            </div>

            {score != null && (
                <ProgressBar
                    value={score}
                    max={100}
                    label="Trust Score"
                    variant={getScoreVariant(score)}
                />
            )}

            {agentId && (
                <a
                    href={`https://basescan.org/token/${IDENTITY_REGISTRY}?a=${agentId}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-[9px] font-mono text-neutral-400 hover:text-primary transition-colors uppercase tracking-widest"
                >
                    Agent #{agentId} →
                </a>
            )}
        </div>
    );
}
