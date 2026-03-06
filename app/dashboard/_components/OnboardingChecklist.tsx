'use client';
import React, { useEffect, useState } from 'react';
import { Card, Button } from './ui';
import { CheckCircle2, Circle, X } from 'lucide-react';
import { useAccount } from 'wagmi';
import dynamic from 'next/dynamic';
import clsx from 'clsx';
import Link from 'next/link';
import { useAuthState } from '@/lib/hooks/useAuthState';

const CustomConnectButton = dynamic(() => import('./CustomConnectButton'), { ssr: false });

interface Step {
    id: string;
    label: string;
    description: string;
    completed: boolean;
    action?: React.ReactNode;
}

export function OnboardingChecklist() {
    const { isConnected } = useAccount();
    const { walletAddress } = useAuthState();
    const [dismissed, setDismissed] = useState(false);
    const [hasApiKey, setHasApiKey] = useState(false);
    const [hasFirstCall, setHasFirstCall] = useState(false);
    const [hasMounted, setHasMounted] = useState(false);

    // Only show after hydration to avoid SSR mismatch
    useEffect(() => {
        setHasMounted(true);
        const d = localStorage.getItem('onboarding_checklist_dismissed');
        if (d) setDismissed(true);
        // Flags set by onboarding wizard and first-call detection
        if (localStorage.getItem('api_key_generated') === '1') setHasApiKey(true);
        if (localStorage.getItem('first_api_call') === '1') setHasFirstCall(true);
    }, []);

    // Detect first API call from traffic_events via dashboard stats
    useEffect(() => {
        if (hasFirstCall) return;
        fetch('/api/admin/stats')
            .then(r => r.ok ? r.json() : null)
            .then(data => {
                if (data?.totalRequests > 0) {
                    localStorage.setItem('first_api_call', '1');
                    setHasFirstCall(true);
                }
            })
            .catch(() => {});
    }, [hasFirstCall]);

    const steps: Step[] = [
        {
            id: 'account',
            label: 'Account created',
            description: 'You\'re in.',
            completed: true,
        },
        {
            id: 'api_key',
            label: 'Get your API key',
            description: 'From Settings → API Keys.',
            completed: hasApiKey,
            action: (
                <Link href="/dashboard/settings">
                    <Button variant="secondary" className="text-[10px] py-1 px-3 border-2 border-black hover:bg-neutral-100">
                        Settings
                    </Button>
                </Link>
            ),
        },
        {
            id: 'first_call',
            label: 'Make your first API call',
            description: 'Swap your base URL and route a request.',
            completed: hasFirstCall,
            action: (
                <Link href="/dashboard/playground">
                    <Button variant="secondary" className="text-[10px] py-1 px-3 border-2 border-black hover:bg-neutral-100">
                        Playground
                    </Button>
                </Link>
            ),
        },
        {
            id: 'wallet',
            label: 'Connect wallet for payments',
            description: 'Required for x402 settlement on Base.',
            // CDP email users have a session wallet even when wagmi is not connected
            completed: isConnected || !!walletAddress,
            action: !isConnected && !walletAddress ? <CustomConnectButton /> : undefined,
        },
        {
            id: 'policy',
            label: 'Set a spending limit',
            description: 'Protect your budget with a routing policy.',
            completed: false,
            action: (
                <Link href="/dashboard/policies">
                    <Button variant="secondary" className="text-[10px] py-1 px-3 border-2 border-black hover:bg-neutral-100">
                        Policies
                    </Button>
                </Link>
            ),
        },
    ];

    const completedCount = steps.filter(s => s.completed).length;
    const allCompleted = completedCount === steps.length;

    // Don't render until hydrated (avoids localStorage flash)
    if (!hasMounted) return null;
    if (dismissed) return null;

    return (
        <Card className="bg-white border-2 border-black p-0 overflow-hidden mb-8 shadow-none">
            {/* Header */}
            <div className="bg-primary border-b-2 border-black px-5 py-3 flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <span className="font-black text-[10px] uppercase tracking-widest bg-black text-primary px-2 py-0.5">
                        {completedCount}/{steps.length}
                    </span>
                    <h2 className="font-extrabold uppercase tracking-tight text-sm text-black">
                        Get started
                    </h2>
                </div>
                <button
                    onClick={() => {
                        localStorage.setItem('onboarding_checklist_dismissed', '1');
                        setDismissed(true);
                    }}
                    className="text-black/40 hover:text-black transition-colors"
                    aria-label="Dismiss"
                >
                    <X size={16} strokeWidth={3} />
                </button>
            </div>

            {/* Steps */}
            <div className="divide-y-2 divide-black/5 bg-white">
                {steps.map((step) => (
                    <div
                        key={step.id}
                        className={clsx(
                            'px-5 py-4 flex items-center gap-4 transition-colors',
                            step.completed ? 'bg-primary/10' : 'bg-white hover:bg-neutral-50'
                        )}
                    >
                        <div className={clsx(
                            'flex-shrink-0',
                            step.completed ? 'text-black' : 'text-neutral-300'
                        )}>
                            {step.completed
                                ? <CheckCircle2 size={22} strokeWidth={3} />
                                : <Circle size={22} strokeWidth={3} />
                            }
                        </div>
                        <div className="flex-1 min-w-0">
                            <div className={clsx(
                                'font-extrabold uppercase text-xs tracking-tight',
                                step.completed ? 'text-neutral-400 line-through' : 'text-black'
                            )}>
                                {step.label}
                            </div>
                            <div className="text-[10px] text-neutral-500 font-medium font-mono mt-0.5">
                                {step.completed ? 'Done' : step.description}
                            </div>
                        </div>
                        {!step.completed && step.action && (
                            <div className="shrink-0">{step.action}</div>
                        )}
                    </div>
                ))}
            </div>

            {/* Completion footer */}
            {allCompleted && (
                <div className="px-5 py-3 bg-black text-primary text-center font-black uppercase text-[10px] tracking-[0.2em] flex items-center justify-center gap-2">
                    <CheckCircle2 size={12} />
                    Setup complete — you're routing
                </div>
            )}
        </Card>
    );
}
