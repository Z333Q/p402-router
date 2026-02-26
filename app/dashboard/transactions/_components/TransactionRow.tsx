'use client';

import { useState, useCallback } from 'react';
import Link from 'next/link';
import { formatDistanceToNow } from 'date-fns';
import { getEvidenceBundleAction } from '@/lib/actions/evidence';
import type { EvidenceBundle } from '@/lib/schemas/evidence-bundle';
import { FeedbackIndicator } from '@/app/dashboard/_components/FeedbackIndicator';

interface SettlementRowData {
    id: string;
    scheme: 'exact' | 'onchain' | 'receipt';
    tx_hash?: string;
    payment_hash?: string;
    amount_usd: number;
    payer: string;
    verified_at: string;
    session_id: string;
}

interface TransactionRowProps {
    settlement: SettlementRowData;
}

const SCHEME_LABELS: Record<string, string> = {
    exact: 'EIP-3009',
    onchain: 'On-Chain',
    receipt: 'Receipt',
};

const SCHEME_CLASSES: Record<string, string> = {
    exact:   'bg-success/10 text-success border-success/40',
    onchain: 'bg-info/10 text-info border-info/40',
    receipt: 'border-neutral-300 text-neutral-500',
};

export function TransactionRow({ settlement }: TransactionRowProps) {
    const [isOpen, setIsOpen]   = useState(false);
    const [bundle, setBundle]   = useState<Omit<EvidenceBundle, 'tenantId'> | null>(null);
    const [loading, setLoading] = useState(false);
    const [copied, setCopied]   = useState(false);

    const basescanUrl = settlement.tx_hash
        ? `https://basescan.org/tx/${settlement.tx_hash}`
        : null;

    const handleToggle = useCallback(async () => {
        const next = !isOpen;
        setIsOpen(next);
        if (next && !bundle) {
            setLoading(true);
            const result = await getEvidenceBundleAction(
                settlement.tx_hash ?? settlement.session_id,
                settlement.tx_hash ? 'txHash' : 'sessionId'
            );
            setLoading(false);
            if (result.success && result.bundle) {
                setBundle(result.bundle);
            }
        }
    }, [isOpen, bundle, settlement]);

    const handleCopy = useCallback(async () => {
        if (!bundle) return;
        await navigator.clipboard.writeText(JSON.stringify(bundle, null, 2));
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    }, [bundle]);

    const schemeClasses = SCHEME_CLASSES[settlement.scheme] ?? 'border-neutral-300 text-neutral-500';
    const schemeLabel   = SCHEME_LABELS[settlement.scheme] ?? settlement.scheme;

    return (
        <>
            {/* ── Main row ──────────────────────────────────────────────────── */}
            <tr className="border-b-2 border-neutral-100 hover:bg-neutral-50 transition-colors">
                <td className="px-5 py-4 text-xs font-medium text-neutral-500">
                    {formatDistanceToNow(new Date(settlement.verified_at), { addSuffix: true })}
                </td>

                <td className="px-5 py-4 whitespace-nowrap">
                    <span className="text-base font-black text-black">
                        ${settlement.amount_usd.toFixed(4)}
                    </span>
                    <span className="ml-1 text-[10px] font-black text-neutral-400">USDC</span>
                </td>

                <td className="px-5 py-4">
                    <span className={`inline-flex items-center px-2 py-0.5 text-[10px] font-black uppercase tracking-widest border-2 ${schemeClasses}`}>
                        {schemeLabel}
                    </span>
                </td>

                <td className="px-5 py-4 text-[11px] text-neutral-500 font-mono max-w-[130px] truncate">
                    {settlement.session_id || <span className="text-neutral-300">—</span>}
                </td>

                <td className="px-5 py-4 text-[11px] text-neutral-500 font-mono">
                    {settlement.payer !== 'unknown'
                        ? `${settlement.payer.slice(0, 6)}…${settlement.payer.slice(-4)}`
                        : <span className="text-neutral-300">—</span>
                    }
                </td>

                <td className="px-5 py-4">
                    {basescanUrl ? (
                        <Link
                            href={basescanUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-[11px] font-mono text-black border-b border-dashed border-neutral-300 hover:border-black transition-colors no-underline"
                        >
                            {settlement.tx_hash!.slice(0, 8)}…{settlement.tx_hash!.slice(-6)}
                        </Link>
                    ) : (
                        <span className="text-neutral-300 text-[11px]">—</span>
                    )}
                </td>

                <td className="px-5 py-4">
                    <FeedbackIndicator settlementId={settlement.id} />
                </td>

                <td className="px-5 py-4 text-right">
                    <button
                        onClick={handleToggle}
                        className="text-[10px] font-black uppercase tracking-widest text-neutral-400 hover:text-black transition-colors whitespace-nowrap"
                        aria-expanded={isOpen}
                    >
                        {isOpen ? 'Close ▴' : 'Details ▾'}
                    </button>
                </td>
            </tr>

            {/* ── Evidence panel ────────────────────────────────────────────── */}
            {isOpen && (
                <tr className="bg-neutral-50 border-b-2 border-black">
                    <td colSpan={8} className="px-5 py-4">
                        {loading ? (
                            <p className="text-[11px] font-mono text-neutral-400 py-1">
                                Loading evidence bundle…
                            </p>
                        ) : bundle ? (
                            <div className="space-y-3">
                                <div className="flex items-center justify-between">
                                    <div className="text-[10px] font-black uppercase tracking-widest text-neutral-500">
                                        Evidence bundle · v{bundle.bundleVersion} · exported {bundle.exportedAt}
                                    </div>
                                    <div className="flex gap-2">
                                        <button
                                            onClick={handleCopy}
                                            className="h-7 px-3 border-2 border-black text-[10px] font-black uppercase tracking-widest hover:bg-black hover:text-primary transition-colors"
                                        >
                                            {copied ? 'Copied ✓' : 'Copy bundle'}
                                        </button>
                                        {bundle.basescanTxUrl && (
                                            <Link
                                                href={bundle.basescanTxUrl}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="h-7 px-3 border-2 border-black text-[10px] font-black uppercase tracking-widest inline-flex items-center hover:bg-black hover:text-primary transition-colors no-underline"
                                            >
                                                Basescan ↗
                                            </Link>
                                        )}
                                    </div>
                                </div>
                                <pre className="text-[10px] font-mono bg-[#0D0D0D] text-neutral-300 p-4 overflow-x-auto max-h-72 leading-relaxed">
                                    {JSON.stringify(bundle, null, 2)}
                                </pre>
                            </div>
                        ) : (
                            <p className="text-[11px] font-mono text-neutral-400 py-1">
                                Evidence bundle not available for this settlement.
                            </p>
                        )}
                    </td>
                </tr>
            )}
        </>
    );
}
