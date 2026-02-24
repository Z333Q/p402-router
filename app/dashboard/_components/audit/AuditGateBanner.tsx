import Link from 'next/link';
import type { AuditUpgradePrompt, GateState } from '@/lib/types/audit';
import { Lock, ArrowRight } from 'lucide-react';

interface Props {
    state: GateState;
    featureName: string;
    prompt?: AuditUpgradePrompt;
    children?: React.ReactNode; // The content being gated (for preview state)
}

export function AuditGateBanner({ state, featureName, prompt, children }: Props) {
    if (state === 'allowed') {
        return <>{children}</>;
    }

    // Common Neo-brutalist styling rules
    const baseCardStyle = "border-2 border-black p-6 flex flex-col gap-4";

    if (state === 'preview') {
        return (
            <div className="relative border-2 border-black group">
                <div className="opacity-40 pointer-events-none select-none filter blur-[2px] transition-all duration-300">
                    {children}
                </div>

                {/* Absolute center overlay */}
                <div className="absolute inset-0 flex items-center justify-center p-4">
                    <div className="bg-[var(--primary)] border-2 border-black p-6 shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] max-w-md w-full">
                        <div className="flex items-center gap-2 mb-2">
                            <Lock className="w-5 h-5" />
                            <h3 className="font-bold uppercase tracking-wide">{featureName} Preview</h3>
                        </div>
                        <p className="text-sm font-mono mb-4 text-[var(--neutral-900)]">
                            {prompt?.body || `Upgrade to ${prompt?.target_plan || 'Pro'} to unlock full ${featureName} capabilities.`}
                        </p>
                        <Link
                            href={prompt?.cta_route || "/dashboard/billing"}
                            className="btn bg-black text-white hover:bg-[var(--neutral-800)] font-bold uppercase w-full flex justify-between items-center px-4 py-3 border-2 border-black transition-transform active:translate-y-1 active:translate-x-1"
                            style={{ borderRadius: 'var(--radius)' }}
                        >
                            <span>{prompt?.cta_label || 'Upgrade Plan'}</span>
                            <ArrowRight className="w-4 h-4" />
                        </Link>
                    </div>
                </div>
            </div>
        );
    }

    // Locked State (Hard block, replaces content entirely)
    return (
        <div className={`${baseCardStyle} bg-[var(--warning)]`}>
            <div className="flex items-start justify-between">
                <div>
                    <div className="flex items-center gap-2 mb-1">
                        <Lock className="w-5 h-5 text-black" />
                        <h3 className="font-bold text-xl uppercase tracking-wider text-black">{featureName} Locked</h3>
                    </div>
                    <p className="font-mono text-sm text-black/80 max-w-xl">
                        {prompt?.headline || `Your current plan does not include ${featureName}.`}
                    </p>
                </div>
                <span className="badge bg-black text-white px-3 py-1 font-bold text-xs border-2 border-transparent">
                    Requires {prompt?.target_plan.toUpperCase() || 'PRO'}
                </span>
            </div>

            {/* The Upgrade Math (Crucial PLG conversion driver) */}
            {prompt?.math && (
                <div className="bg-white border-2 border-black p-4 mt-2">
                    <p className="font-bold uppercase text-xs text-[var(--neutral-400)] mb-2">Estimated Impact at your volume</p>
                    <div className="flex flex-col gap-1 font-mono text-sm">
                        {prompt.math.projected_savings_usd && (
                            <div className="flex justify-between">
                                <span>Platform Fee Savings:</span>
                                <span className="text-[var(--success)] font-black">${prompt.math.projected_savings_usd.toFixed(2)} / mo</span>
                            </div>
                        )}
                        <div className="flex justify-between border-t-2 border-dashed border-[var(--neutral-300)] mt-2 pt-2">
                            <span className="font-bold">Estimated ROI:</span>
                            <span className="font-bold text-black">Instant</span>
                        </div>
                    </div>
                </div>
            )}

            <div className="mt-2 flex justify-end">
                <Link
                    href={prompt?.cta_route || "/dashboard/billing"}
                    className="bg-black text-white px-6 py-3 font-bold uppercase border-2 border-black hover:bg-[var(--neutral-800)] transition-colors"
                >
                    {prompt?.cta_label || 'Review Upgrade Options'}
                </Link>
            </div>
        </div>
    );
}
