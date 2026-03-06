'use client';

/**
 * FundWalletModal
 * ===============
 * Deferred funding step — shown contextually when the user first hits
 * a payment-required action. Not shown during onboarding.
 *
 * Trigger it from anywhere via the useFundWallet hook:
 *   const { openFundModal } = useFundWallet();
 *   openFundModal();
 */

import { useState, useCallback, createContext, useContext } from 'react';
import { useAccount } from 'wagmi';
import { useAuthState } from '@/lib/hooks/useAuthState';
import { Copy, CheckCircle2, X, ExternalLink, Wallet } from 'lucide-react';

// =============================================================================
// CONTEXT — allows any child component to open the modal
// =============================================================================

interface FundWalletContextValue {
    openFundModal: () => void;
}

const FundWalletContext = createContext<FundWalletContextValue>({
    openFundModal: () => {},
});

export function useFundWallet() {
    return useContext(FundWalletContext);
}

// =============================================================================
// PROVIDER — wrap the dashboard layout with this
// =============================================================================

export function FundWalletProvider({ children }: { children: React.ReactNode }) {
    const [isOpen, setIsOpen] = useState(false);

    const openFundModal = useCallback(() => setIsOpen(true), []);
    const closeModal = useCallback(() => setIsOpen(false), []);

    return (
        <FundWalletContext.Provider value={{ openFundModal }}>
            {children}
            {isOpen && <FundWalletModal onClose={closeModal} />}
        </FundWalletContext.Provider>
    );
}

// =============================================================================
// MODAL
// =============================================================================

function FundWalletModal({ onClose }: { onClose: () => void }) {
    const { address: wagmiAddress } = useAccount();
    const { walletAddress: sessionAddress } = useAuthState();
    // CDP email users: wagmi may not have auto-connected yet, fall back to session address
    const address = wagmiAddress ?? sessionAddress ?? undefined;
    const [copied, setCopied] = useState(false);

    const handleCopy = useCallback(() => {
        if (!address) return;
        navigator.clipboard.writeText(address);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    }, [address]);

    return (
        /* Backdrop */
        <div
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70"
            onClick={onClose}
        >
            {/* Modal panel */}
            <div
                className="relative w-full max-w-[480px] bg-white border-4 border-black shadow-[12px_12px_0px_0px_#000]"
                onClick={(e) => e.stopPropagation()}
            >
                {/* Header */}
                <div className="flex items-center justify-between px-6 py-4 border-b-4 border-black bg-primary">
                    <div className="flex items-center gap-2">
                        <Wallet size={18} className="text-black" />
                        <span className="font-black text-[11px] uppercase tracking-widest text-black">
                            Fund Your Wallet
                        </span>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-1 hover:bg-black/10 transition-colors"
                        aria-label="Close"
                    >
                        <X size={16} className="text-black" />
                    </button>
                </div>

                <div className="p-6 flex flex-col gap-5">

                    {/* Explanation */}
                    <p className="text-sm font-medium text-neutral-700 leading-relaxed">
                        P402 settles AI payments in <strong className="text-black">USDC on Base</strong> — gasless, instant, ~$0.001 per request.
                        Send any amount to get started.
                    </p>

                    {/* Steps */}
                    <div className="flex flex-col gap-3">
                        {/* Step 1: address */}
                        <div className="border-2 border-black p-4">
                            <div className="text-[9px] font-black uppercase tracking-widest text-neutral-500 mb-2">
                                Step 1 — Copy your wallet address
                            </div>
                            {address ? (
                                <div className="flex items-center gap-2 bg-neutral-50 border-2 border-black px-3 py-2">
                                    <code className="font-mono text-xs font-bold text-black truncate flex-1 select-all">
                                        {address}
                                    </code>
                                    <button
                                        onClick={handleCopy}
                                        className="shrink-0 border-2 border-black px-2 py-1 font-black text-[9px] uppercase tracking-widest hover:bg-black hover:text-white transition-colors flex items-center gap-1.5"
                                    >
                                        {copied
                                            ? <><CheckCircle2 size={10} />Copied</>
                                            : <><Copy size={10} />Copy</>}
                                    </button>
                                </div>
                            ) : (
                                <div className="h-10 bg-neutral-100 border-2 border-neutral-200 animate-pulse" />
                            )}
                        </div>

                        {/* Step 2: send USDC */}
                        <div className="border-2 border-black p-4">
                            <div className="text-[9px] font-black uppercase tracking-widest text-neutral-500 mb-2">
                                Step 2 — Send USDC on Base to that address
                            </div>
                            <p className="text-[11px] text-neutral-600 font-medium mb-3 leading-relaxed">
                                Min $0.01. We recommend starting with $1–$5 to explore the full feature set.
                            </p>
                            <div className="flex flex-wrap gap-2">
                                <a
                                    href="https://www.coinbase.com"
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="inline-flex items-center gap-1.5 border-2 border-black px-3 py-1.5 text-[10px] font-black uppercase tracking-widest hover:bg-black hover:text-white transition-colors"
                                >
                                    Coinbase <ExternalLink size={9} />
                                </a>
                                <a
                                    href="https://bridge.base.org"
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="inline-flex items-center gap-1.5 border-2 border-black px-3 py-1.5 text-[10px] font-black uppercase tracking-widest hover:bg-black hover:text-white transition-colors"
                                >
                                    Base Bridge <ExternalLink size={9} />
                                </a>
                                <a
                                    href="https://app.uniswap.org"
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="inline-flex items-center gap-1.5 border-2 border-black px-3 py-1.5 text-[10px] font-black uppercase tracking-widest hover:bg-black hover:text-white transition-colors"
                                >
                                    Uniswap <ExternalLink size={9} />
                                </a>
                            </div>
                        </div>

                        {/* Step 3: return */}
                        <div className="border-2 border-dashed border-neutral-300 p-4">
                            <div className="text-[9px] font-black uppercase tracking-widest text-neutral-400 mb-1">
                                Step 3 — Come back and try again
                            </div>
                            <p className="text-[11px] text-neutral-500 font-medium">
                                Deposits confirm on Base in seconds. No page reload required.
                            </p>
                        </div>
                    </div>

                    {/* CTA */}
                    <button
                        onClick={onClose}
                        className="w-full h-11 bg-black text-primary font-black text-[11px] uppercase tracking-wider border-2 border-black hover:bg-neutral-800 transition-colors"
                    >
                        Got it — I'll fund it now
                    </button>

                    <p className="text-[10px] text-neutral-400 text-center font-medium">
                        USDC contract on Base:{' '}
                        <a
                            href="https://basescan.org/token/0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="font-mono underline hover:text-black"
                        >
                            0x8335…913
                        </a>
                    </p>
                </div>
            </div>
        </div>
    );
}
