'use client';

import { useState, useTransition } from 'react';
import { updateEscrowEnabledAction } from '@/lib/actions/settings';
import { ShieldCheck, Zap, Info } from 'lucide-react';

export function EscrowToggle({ initialEnabled }: { initialEnabled: boolean }) {
    const [enabled, setEnabled] = useState(initialEnabled);
    const [isPending, startTransition] = useTransition();
    const [error, setError] = useState<string | null>(null);
    const [saved, setSaved] = useState(false);

    const toggle = () => {
        const next = !enabled;
        setEnabled(next);
        setSaved(false);
        setError(null);
        startTransition(async () => {
            const result = await updateEscrowEnabledAction(next);
            if (!result.success) {
                setEnabled(!next); // revert
                setError(result.error ?? 'Update failed.');
            } else {
                setSaved(true);
                setTimeout(() => setSaved(false), 2000);
            }
        });
    };

    return (
        <div className="card border-2 border-black bg-[var(--neutral-50)] text-black p-6">
            <div className="flex items-center gap-2 mb-4 border-b-2 border-black pb-4">
                <ShieldCheck className="w-6 h-6" />
                <h2 className="text-xl font-bold uppercase tracking-wide">Escrow Protection</h2>
            </div>

            <p className="text-[var(--neutral-600)] mb-6 text-sm font-mono">
                When enabled, Bazaar marketplace tasks ≥ $1.00 are automatically held in escrow.
                Funds release to the provider after the 48-hour dispute window, or you can trigger
                early release once delivery is confirmed.
            </p>

            {/* Fee Comparison */}
            <div className="grid grid-cols-2 gap-0 border-2 border-black mb-6">
                <div className={`p-4 text-center border-r-2 border-black transition-colors ${enabled ? 'bg-[var(--primary)]' : 'bg-white'}`}>
                    <div className="flex items-center justify-center gap-1 mb-1">
                        <ShieldCheck className="w-4 h-4" strokeWidth={3} />
                        <span className="text-[10px] font-black uppercase tracking-widest">Escrow</span>
                    </div>
                    <div className="text-3xl font-black">2<span className="text-lg">%</span></div>
                    <div className="text-[10px] font-bold text-[var(--neutral-700)] uppercase tracking-wider mt-1">48h dispute window</div>
                </div>
                <div className={`p-4 text-center transition-colors ${!enabled ? 'bg-[var(--primary)]' : 'bg-white'}`}>
                    <div className="flex items-center justify-center gap-1 mb-1">
                        <Zap className="w-4 h-4" strokeWidth={3} />
                        <span className="text-[10px] font-black uppercase tracking-widest">Direct</span>
                    </div>
                    <div className="text-3xl font-black">1<span className="text-lg">%</span></div>
                    <div className="text-[10px] font-bold text-[var(--neutral-700)] uppercase tracking-wider mt-1">Instant settlement</div>
                </div>
            </div>

            {/* Toggle Row */}
            <div className="flex items-center justify-between">
                <div>
                    <div className="font-black uppercase text-sm tracking-wide">
                        {enabled ? 'Escrow enabled — 2% on Bazaar tasks' : 'Direct settlement — 1% on all tasks'}
                    </div>
                    <div className="text-[var(--neutral-500)] text-xs font-mono mt-0.5">
                        {enabled ? 'Bazaar tasks ≥ $1.00 are automatically escrowed' : 'All tasks settle directly via x402'}
                    </div>
                </div>
                <button
                    onClick={toggle}
                    disabled={isPending}
                    aria-label={enabled ? 'Disable escrow' : 'Enable escrow'}
                    className={`relative w-14 h-7 border-2 border-black transition-colors focus:outline-none ${
                        enabled ? 'bg-[var(--primary)]' : 'bg-[var(--neutral-300)]'
                    } ${isPending ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
                >
                    <span
                        className={`absolute top-0.5 w-5 h-5 bg-black border border-black transition-transform ${
                            enabled ? 'translate-x-7' : 'translate-x-0.5'
                        }`}
                    />
                </button>
            </div>

            {saved && (
                <div className="mt-3 text-[var(--success)] text-xs font-black uppercase tracking-wide">Saved.</div>
            )}
            {error && (
                <div className="mt-3 text-[var(--error)] text-xs font-black uppercase tracking-wide">{error}</div>
            )}

            {/* Disclaimer */}
            <div className="mt-6 flex items-start gap-2 bg-[var(--neutral-100)] border border-black border-dashed p-3">
                <Info className="w-4 h-4 shrink-0 mt-0.5" />
                <p className="text-[10px] font-bold text-[var(--neutral-600)] leading-relaxed">
                    The 2% escrow fee is enforced on-chain by the P402Escrow contract at time of release.
                    This fee is separate from your plan&apos;s platform fee. Direct x402 settlements use
                    your plan&apos;s standard rate (1.00% Free / 0.75% Pro / volume Enterprise).
                </p>
            </div>
        </div>
    );
}
