'use client'

import { useState } from 'react'
import { Wallet, AlertTriangle, CheckCircle, ChevronRight, FileText } from 'lucide-react'
import Link from 'next/link'

const PAYOUT_PROVIDERS = [
    { id: 'crypto_usdc', label: 'USDC on Base',     desc: 'Instant, gasless via EIP-3009. Minimum $10.' },
    { id: 'stripe_connect', label: 'Stripe Connect', desc: 'Bank transfer to 40+ countries. 2–5 business days.' },
    { id: 'wise',        label: 'Wise',              desc: 'Low-fee international transfers.' },
    { id: 'paypal',      label: 'PayPal',            desc: 'Available in most countries.' },
]

function ComplianceItem({ done, label, action }: { done: boolean; label: string; action?: React.ReactNode }) {
    return (
        <div className="flex items-center gap-3 py-3 border-b border-neutral-100 last:border-0">
            {done
                ? <CheckCircle size={16} className="text-success shrink-0" />
                : <AlertTriangle size={16} className="text-warning shrink-0" />
            }
            <span className={`text-sm flex-1 ${done ? 'text-neutral-400 line-through' : 'text-black font-bold'}`}>
                {label}
            </span>
            {!done && action}
        </div>
    )
}

export default function PayoutsPage() {
    const [selectedProvider, setSelectedProvider] = useState<string | null>(null)

    // These will be populated from /api/partner/me + tax profile queries in Phase 3
    const hasTaxProfile    = false
    const hasPayoutMethod  = false
    const availableBalance = 0
    const pendingBalance   = 0
    const isPayoutBlocked  = !hasTaxProfile || !hasPayoutMethod

    return (
        <div className="space-y-6">
            {/* Header */}
            <div>
                <h1 className="page-title">Payouts</h1>
                <p className="text-sm text-neutral-500 mt-1">
                    Configure your payout method and review your earnings balance.
                </p>
            </div>

            {/* Balance cards */}
            <div className="grid grid-cols-2 gap-4">
                <div className="card p-5">
                    <p className="text-[10px] font-black uppercase tracking-[0.2em] text-neutral-400">Available Balance</p>
                    <p className="text-3xl font-black text-black mt-2">
                        ${availableBalance.toFixed(2)}
                    </p>
                    <p className="text-[11px] text-neutral-400 mt-1">Approved commissions ready to pay out</p>
                    {isPayoutBlocked && (
                        <p className="text-[10px] font-black text-warning mt-2 flex items-center gap-1">
                            <AlertTriangle size={10} /> Payout blocked — see checklist below
                        </p>
                    )}
                </div>
                <div className="card p-5">
                    <p className="text-[10px] font-black uppercase tracking-[0.2em] text-neutral-400">Pending Balance</p>
                    <p className="text-3xl font-black text-black mt-2">
                        ${pendingBalance.toFixed(2)}
                    </p>
                    <p className="text-[11px] text-neutral-400 mt-1">In hold period — not yet payable</p>
                </div>
            </div>

            {/* Compliance checklist */}
            <div className="card p-5">
                <h3 className="section-header text-[11px] mb-2">Payout Readiness</h3>
                <ComplianceItem
                    done={true}
                    label="Partner application approved"
                />
                <ComplianceItem
                    done={hasTaxProfile}
                    label="Tax profile completed (W-9 / W-8BEN)"
                    action={
                        <button className="px-3 py-1 text-[10px] font-black uppercase tracking-widest bg-warning text-black border border-black hover:bg-black hover:text-warning transition-colors">
                            Complete →
                        </button>
                    }
                />
                <ComplianceItem
                    done={hasPayoutMethod}
                    label="Payout method configured"
                    action={
                        <button
                            onClick={() => document.getElementById('payout-method')?.scrollIntoView({ behavior: 'smooth' })}
                            className="px-3 py-1 text-[10px] font-black uppercase tracking-widest bg-primary text-black border border-black hover:bg-black hover:text-primary transition-colors"
                        >
                            Add →
                        </button>
                    }
                />
            </div>

            {/* Add payout method */}
            <div className="card p-5" id="payout-method">
                <h3 className="section-header text-[11px] mb-4">Add Payout Method</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {PAYOUT_PROVIDERS.map(p => (
                        <button
                            key={p.id}
                            onClick={() => setSelectedProvider(p.id)}
                            className={`text-left p-4 border-2 transition-all ${
                                selectedProvider === p.id
                                    ? 'border-black bg-primary/5'
                                    : 'border-neutral-200 hover:border-black hover:bg-neutral-50'
                            }`}
                        >
                            <div className="flex items-center justify-between mb-1">
                                <span className="text-xs font-black uppercase tracking-widest text-black">{p.label}</span>
                                {selectedProvider === p.id && (
                                    <div className="w-4 h-4 bg-primary border-2 border-black flex items-center justify-center">
                                        <CheckCircle size={10} strokeWidth={3} />
                                    </div>
                                )}
                            </div>
                            <p className="text-[11px] text-neutral-500">{p.desc}</p>
                        </button>
                    ))}
                </div>

                {selectedProvider && (
                    <div className="mt-4 p-4 border-2 border-black bg-neutral-50">
                        <p className="text-xs font-black uppercase tracking-widest text-neutral-600 mb-2">
                            {PAYOUT_PROVIDERS.find(p => p.id === selectedProvider)?.label} Setup
                        </p>
                        <p className="text-[11px] text-neutral-500 mb-3">
                            {selectedProvider === 'crypto_usdc'
                                ? 'Enter your Base wallet address. USDC will be sent via gasless EIP-3009 transfer.'
                                : 'Payout method connection coming in Phase 3. We\'ll notify you when it\'s available.'}
                        </p>
                        {selectedProvider === 'crypto_usdc' ? (
                            <div className="flex gap-2">
                                <input
                                    className="flex-1 px-3 py-2 border-2 border-black font-mono text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-1"
                                    placeholder="0x..."
                                />
                                <button className="btn btn-primary px-4">Save</button>
                            </div>
                        ) : (
                            <button disabled className="btn btn-secondary opacity-50 cursor-not-allowed">
                                Coming Soon
                            </button>
                        )}
                    </div>
                )}
            </div>

            {/* Payout history placeholder */}
            <div className="card overflow-hidden">
                <div className="flex items-center justify-between px-5 py-4 border-b-2 border-black">
                    <h3 className="section-header text-[11px]">Payout History</h3>
                </div>
                <div className="p-10 text-center">
                    <Wallet className="h-7 w-7 text-neutral-200 mx-auto mb-3" />
                    <p className="text-sm font-black text-neutral-400 uppercase tracking-widest">No payouts yet</p>
                    <p className="text-xs text-neutral-400 mt-1">Payout records will appear here once your first batch is released.</p>
                </div>
            </div>

            {/* Terms reference */}
            <div className="card p-4 flex items-center gap-3 bg-neutral-50">
                <FileText size={14} className="text-neutral-400 shrink-0" />
                <p className="text-[11px] text-neutral-500 flex-1">
                    Minimum payout threshold: <strong className="text-black">$25</strong>.
                    Hold period: <strong className="text-black">30 days</strong> for subscription commissions,
                    <strong className="text-black"> 45 days</strong> for usage commissions.
                </p>
                <Link href="/partner/docs" className="flex items-center gap-1 text-[10px] font-black uppercase tracking-widest text-neutral-400 hover:text-black transition-colors shrink-0">
                    Payout FAQ <ChevronRight size={10} />
                </Link>
            </div>
        </div>
    )
}
