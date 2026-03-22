import React, { useState } from 'react';
import { Button, Badge } from '../../_components/ui';
import { useSettlement } from '@/hooks/useSettlement';
import { useEscrow, Escrow } from '@/hooks/useEscrow';
import { BazaarResource } from '@/hooks/useBazaar';
import { Loader2, CheckCircle2, ShieldCheck, Lock, ArrowRight } from 'lucide-react';
import { useAccount } from 'wagmi';

interface SettlementModalProps {
    isOpen: boolean;
    onClose: () => void;
    resource: BazaarResource;
    tenantId: string;
}

const ESCROW_THRESHOLD_USD = 1.00;

export function SettlementModal({ isOpen, onClose, resource, tenantId }: SettlementModalProps) {
    const { settle, isSettling, error: settleError } = useSettlement();
    const { createEscrow, creating } = useEscrow();
    const { address } = useAccount();

    const [step, setStep] = useState<'review' | 'success' | 'escrow-created'>('review');
    const [txHash, setTxHash] = useState<string | null>(null);
    const [createdEscrow, setCreatedEscrow] = useState<Escrow | null>(null);
    const [error, setError] = useState<string | null>(null);

    if (!isOpen) return null;

    const amountUsd = resource.pricing?.min_amount
        ? resource.pricing.min_amount / 1_000_000
        : 0;

    const providerWallet =
        resource.provider_wallet_address ??
        resource.pricing?.payTo ??
        null;

    // Use escrow for amounts ≥ $1 when we have a provider wallet
    const useEscrowFlow = amountUsd >= ESCROW_THRESHOLD_USD && !!providerWallet && !!address;

    const handleDirectSettle = async () => {
        if (!resource.pricing?.min_amount) return;
        const result = await settle({
            tenantId,
            decisionId: `manual_settle_${Date.now()}`,
            amount: amountUsd.toString(),
            recipient: providerWallet ?? resource.source_facilitator_id,
            resourceId: resource.resource_id,
        });
        if (result.success && result.txHash) {
            setTxHash(result.txHash);
            setStep('success');
        }
    };

    const handleEscrowCreate = async () => {
        if (!providerWallet || !address) {
            setError('Wallet not connected or provider address missing.');
            return;
        }
        setError(null);
        const escrow = await createEscrow({
            payerAddress: address,
            providerAddress: providerWallet,
            amountUsd,
            referenceId: `bazaar_${resource.resource_id}_${Date.now()}`,
            description: resource.title,
        });
        if (escrow) {
            setCreatedEscrow(escrow);
            setStep('escrow-created');
        }
    };

    const displayError = error ?? settleError;

    return (
        <div className="fixed inset-0 bg-black/90 backdrop-blur-md flex items-center justify-center z-[100] p-4 animate-in fade-in duration-200">
            <div className="w-full max-w-lg bg-neutral-900 border-4 border-black shadow-[16px_16px_0px_0px_rgba(0,0,0,1)] relative overflow-hidden flex flex-col">

                {/* Header */}
                <div className="bg-black p-4 border-b-2 border-primary/20 flex justify-between items-center">
                    <div className="flex items-center gap-3">
                        <div className="w-3 h-3 bg-primary animate-pulse rounded-full" />
                        <span className="text-xs font-black uppercase tracking-[0.25em] text-primary italic">
                            {useEscrowFlow ? 'Escrow Settlement' : 'Secure Settlement Terminal'}
                        </span>
                    </div>
                    <button onClick={onClose} className="text-neutral-500 hover:text-white transition-colors">
                        <span className="font-mono text-xl">✕</span>
                    </button>
                </div>

                <div className="p-8 flex-1">
                    {step === 'review' && (
                        <div className="space-y-8">
                            <div className="text-center space-y-2">
                                <div className="text-[10px] font-black uppercase text-neutral-500 tracking-widest">Amount</div>
                                <div className="text-6xl font-black text-white tracking-tighter flex justify-center items-start gap-2">
                                    <span className="text-2xl mt-2 text-neutral-500">$</span>
                                    {amountUsd.toFixed(4)}
                                    <span className="text-xl mt-4 text-primary font-mono">USDC</span>
                                </div>
                                {useEscrowFlow && (
                                    <div className="inline-flex items-center gap-1.5 bg-primary/10 border border-primary/30 text-primary px-3 py-1 text-[10px] font-black uppercase tracking-wider">
                                        <Lock size={10} /> Escrow Protected
                                    </div>
                                )}
                            </div>

                            <div className="bg-black/50 border-2 border-white/10 p-4 space-y-3 font-mono text-xs">
                                <div className="flex justify-between items-center text-neutral-400">
                                    <span>RESOURCE:</span>
                                    <span className="text-white truncate max-w-[200px]">{resource.title}</span>
                                </div>
                                {providerWallet && (
                                    <div className="flex justify-between items-center text-neutral-400">
                                        <span>PROVIDER:</span>
                                        <span className="text-white font-mono text-[10px]">
                                            {providerWallet.slice(0, 6)}…{providerWallet.slice(-4)}
                                        </span>
                                    </div>
                                )}
                                <div className="border-t border-white/10 my-2" />
                                <div className="flex justify-between items-center text-primary">
                                    <span className="flex items-center gap-1.5">
                                        <ShieldCheck size={12} /> GAS FEE:
                                    </span>
                                    <span className="bg-primary/20 text-primary px-1.5 py-0.5 text-[10px] uppercase font-bold tracking-wider">
                                        COVERED BY P402
                                    </span>
                                </div>
                                {useEscrowFlow && (
                                    <div className="flex justify-between items-center text-neutral-400 text-[10px] pt-1">
                                        <span>FLOW:</span>
                                        <span className="text-neutral-300">
                                            Escrow → Provider delivers → You release
                                        </span>
                                    </div>
                                )}
                            </div>

                            {displayError && (
                                <div className="p-3 bg-red-500/10 border border-red-500/50 text-red-500 text-xs font-mono">
                                    ERROR: {displayError}
                                </div>
                            )}

                            <div className="space-y-3">
                                <Button
                                    onClick={useEscrowFlow ? handleEscrowCreate : handleDirectSettle}
                                    disabled={isSettling || creating}
                                    className="w-full bg-primary text-black border-2 border-primary hover:bg-primary/90 font-black tracking-widest text-lg h-14 uppercase"
                                >
                                    {(isSettling || creating) ? (
                                        <span className="flex items-center gap-2 justify-center">
                                            <Loader2 className="animate-spin" size={18} />
                                            {creating ? 'Creating Escrow...' : 'Signing...'}
                                        </span>
                                    ) : useEscrowFlow ? (
                                        <span className="flex items-center gap-2 justify-center">
                                            <Lock size={16} /> Create Escrow
                                        </span>
                                    ) : (
                                        'Sign & Pay Now'
                                    )}
                                </Button>
                                <p className="text-center text-[10px] text-neutral-500">
                                    {useEscrowFlow
                                        ? 'Funds held in escrow until you confirm delivery.'
                                        : 'By signing, you authorize a one-time USDC transfer via EIP-3009.'}
                                </p>
                            </div>
                        </div>
                    )}

                    {step === 'success' && (
                        <div className="text-center space-y-6 py-8 animate-in zoom-in-95">
                            <div className="w-20 h-20 bg-success/20 text-success flex items-center justify-center mx-auto mb-6">
                                <CheckCircle2 size={40} />
                            </div>
                            <div className="space-y-2">
                                <h3 className="text-2xl font-black uppercase text-white italic">Payment Successful</h3>
                                <p className="text-neutral-400 text-sm max-w-xs mx-auto">
                                    Settlement executed on-chain. Access has been granted.
                                </p>
                            </div>
                            <div className="bg-neutral-800 p-4 border border-neutral-700 font-mono text-xs text-left overflow-hidden">
                                <div className="text-neutral-500 text-[10px] uppercase mb-1">Transaction Hash</div>
                                <div className="text-primary break-all">{txHash}</div>
                            </div>
                            <Button onClick={onClose} className="w-full font-bold bg-neutral-800 text-white border-neutral-700 hover:bg-neutral-700">
                                CLOSE RECEIPT
                            </Button>
                        </div>
                    )}

                    {step === 'escrow-created' && createdEscrow && (
                        <div className="text-center space-y-6 py-4 animate-in zoom-in-95">
                            <div className="w-20 h-20 bg-primary/20 text-primary flex items-center justify-center mx-auto">
                                <Lock size={40} />
                            </div>
                            <div className="space-y-2">
                                <h3 className="text-2xl font-black uppercase text-white italic">Escrow Created</h3>
                                <p className="text-neutral-400 text-sm max-w-xs mx-auto">
                                    Your payment is protected. The provider will deliver, then you confirm to release funds.
                                </p>
                            </div>
                            <div className="bg-neutral-800 p-4 border border-neutral-700 font-mono text-xs text-left space-y-2">
                                <div className="flex justify-between">
                                    <span className="text-neutral-500 uppercase text-[10px]">Escrow ID</span>
                                    <span className="text-primary text-[10px] truncate max-w-[200px]">{createdEscrow.id}</span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-neutral-500 uppercase text-[10px]">State</span>
                                    <Badge tone="neutral" className="text-[9px]">{createdEscrow.state}</Badge>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-neutral-500 uppercase text-[10px]">Amount</span>
                                    <span className="text-white">${createdEscrow.amount_usd.toFixed(4)} USDC</span>
                                </div>
                            </div>
                            <div className="flex gap-3">
                                <Button onClick={onClose} className="flex-1 font-bold bg-neutral-800 text-white border-neutral-700 hover:bg-neutral-700">
                                    CLOSE
                                </Button>
                                <Button
                                    onClick={onClose}
                                    className="flex-1 font-black bg-primary text-black border-primary hover:bg-primary/90"
                                >
                                    <span className="flex items-center gap-1.5 justify-center">
                                        VIEW ESCROWS <ArrowRight size={14} />
                                    </span>
                                </Button>
                            </div>
                            <p className="text-[10px] text-neutral-500">
                                Track progress in the My Escrows panel below.
                            </p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
