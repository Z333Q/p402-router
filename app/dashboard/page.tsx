'use client'
import React from 'react'
import { useAccount, useBalance } from 'wagmi'
import dynamic from 'next/dynamic'

const ConnectButton = dynamic(
    () => import('@rainbow-me/rainbowkit').then(mod => mod.ConnectButton),
    { ssr: false }
)
import { WalletRequired } from './_components/WalletRequired'
import { useDashboardStats, DashboardEvent } from '@/hooks/useDashboardStats'
import { Card, Badge, Button, ErrorState } from './_components/ui'
import { OnboardingChecklist } from './_components/OnboardingChecklist'
import { ProTip } from './_components/ProTip'
import { clsx } from 'clsx'
import { formatDistanceToNow } from 'date-fns'

import { CostIntelligence } from './_components/CostIntelligence'
import { useAnalytics } from '@/hooks/useAnalytics'

export default function DashboardPage() {
    const { address, isConnected } = useAccount()
    const { data: balance } = useBalance({
        address: address,
        token: '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913' // Base USDC
    })

    const { events: legacyEvents, loading: legacyLoading } = useDashboardStats()
    const { data: analyticsData, loading: analyticsLoading } = useAnalytics()

    return (
        <div className="space-y-12">
            {/* Page Header */}
            <div className="flex flex-col lg:flex-row justify-between items-start gap-8">
                <div className="space-y-2">
                    <h1 className="text-5xl font-black uppercase tracking-tighter text-neutral-100 italic">
                        {isConnected ? 'Intelligence' : 'Initializing'}<span className="text-primary NOT-italic">.</span>
                    </h1>
                    <p className="text-neutral-400 font-medium max-w-lg border-l-2 border-primary/20 pl-4">
                        {isConnected
                            ? "Autonomous payment routing and cost optimization for x402-compliant AI agents."
                            : "Anchor your x402 identity to unlock autonomous routing and historical spend intelligence."}
                    </p>
                </div>

                {/* Wallet & Quick Actions */}
                <Card className="w-full lg:max-w-md p-6 bg-neutral-900 border-neutral-800 shadow-none">
                    <div className="flex items-center gap-3 mb-6">
                        <div className={clsx(
                            "w-2 h-2 rounded-full",
                            isConnected ? "bg-primary shadow-[0_0_8px_rgba(204,255,0,0.5)] animate-pulse" : "bg-error"
                        )} />
                        <span className="font-extrabold uppercase text-[10px] tracking-[0.2em] text-neutral-500">
                            System Node: {isConnected ? 'Active & Anchored' : 'Identity Unanchored'}
                        </span>
                    </div>

                    <div className="mb-6">
                        {isConnected ? (
                            <div className="flex flex-col gap-3">
                                <div className="flex items-center justify-between bg-black/40 p-3 border border-neutral-800">
                                    <span className="font-mono text-[10px] font-bold text-neutral-400">
                                        {address?.slice(0, 10)}...{address?.slice(-8)}
                                    </span>
                                    <span className="font-black text-xl text-primary font-mono tracking-tighter">
                                        {balance?.formatted ? Number(balance.formatted).toFixed(2) : '0.00'} <span className="text-[10px] text-neutral-500 uppercase ml-1">{balance?.symbol}</span>
                                    </span>
                                </div>
                            </div>
                        ) : (
                            <div className="space-y-4">
                                <p className="text-xs text-neutral-400 font-medium leading-relaxed italic">
                                    Connect identity to anchor routing policies.
                                </p>
                                <ConnectButton
                                    label="Connect Wallet"
                                    accountStatus="address"
                                    showBalance={false}
                                />
                            </div>
                        )}
                    </div>

                    {isConnected && (
                        <div className="grid grid-cols-2 gap-3">
                            <a
                                href="https://www.coinbase.com/buy/usdc"
                                target="_blank"
                                className="btn border border-neutral-800 text-neutral-400 text-[10px] py-2 text-center no-underline hover:bg-neutral-800 transition-colors uppercase font-bold"
                            >
                                Top up
                            </a>
                            <Button
                                variant="dark"
                                className="text-[10px] py-2 bg-neutral-800 border-none"
                                onClick={() => {
                                    navigator.clipboard.writeText(address || '')
                                    alert('Address copied!')
                                }}
                            >
                                Copy ID
                            </Button>
                        </div>
                    )}
                </Card>
            </div>

            {/* Onboarding only for new wallets/empty data */}
            {analyticsData?.history.length === 0 && <OnboardingChecklist />}

            <WalletRequired
                mode="soft"
                title="Authorization Required"
                description="Secure your agent identity to anchor routing policies and decrypt historical spend intelligence."
            >
                {/* V2 Cost Intelligence Section */}
                <CostIntelligence />

                {/* V2 Live Decisions Section */}
                <div className="space-y-4">
                    <div className="flex items-center justify-between">
                        <h2 className="text-xl font-black uppercase tracking-tighter text-neutral-100">Routing Ledger</h2>
                        <Badge tone="neutral">Spec 6.2 Compliant</Badge>
                    </div>

                    <Card className="p-0 overflow-hidden bg-black border-neutral-800 shadow-none">
                        <div className="overflow-x-auto">
                            <table className="w-full text-left border-collapse">
                                <thead>
                                    <tr className="border-b border-neutral-800 bg-neutral-900/50">
                                        <th className="px-6 py-4 text-[10px] font-black uppercase text-neutral-500 tracking-[0.2em]">Timestamp</th>
                                        <th className="px-6 py-4 text-[10px] font-black uppercase text-neutral-500 tracking-[0.2em]">Context</th>
                                        <th className="px-6 py-4 text-[10px] font-black uppercase text-neutral-500 tracking-[0.2em]">Provider</th>
                                        <th className="px-6 py-4 text-[10px] font-black uppercase text-neutral-500 tracking-[0.2em]">Mode</th>
                                        <th className="px-6 py-4 text-[10px] font-black uppercase text-neutral-500 tracking-[0.2em] text-right">Settlement</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-neutral-800/50">
                                    {analyticsLoading ? (
                                        <tr>
                                            <td colSpan={5} className="px-6 py-16 text-center text-[10px] font-bold text-neutral-600 uppercase tracking-widest animate-pulse">
                                                Synchronizing Decisions...
                                            </td>
                                        </tr>
                                    ) : analyticsData?.history.length === 0 ? (
                                        <tr>
                                            <td colSpan={5} className="px-6 py-16 text-center text-[10px] font-bold text-neutral-600 uppercase tracking-widest">
                                                No decisions indexed
                                            </td>
                                        </tr>
                                    ) : (
                                        analyticsData?.decisions?.map((decision) => (
                                            <tr key={decision.id} className="hover:bg-neutral-900/40 transition-colors group">
                                                <td className="px-6 py-5 font-mono text-[10px] text-neutral-500">
                                                    {formatDistanceToNow(new Date(decision.timestamp))} ago
                                                </td>
                                                <td className="px-6 py-5">
                                                    <div className="flex flex-col gap-1">
                                                        <span className="text-[10px] font-black text-neutral-200 uppercase tracking-tight">{decision.task || 'Inference'}</span>
                                                        <span className="text-[9px] font-mono text-neutral-600 truncate max-w-[150px]">{decision.request_id}</span>
                                                    </div>
                                                </td>
                                                <td className="px-6 py-5">
                                                    <Badge tone={decision.success ? 'ok' : 'bad'} className="bg-transparent border-neutral-700 text-neutral-400 group-hover:border-primary group-hover:text-primary transition-colors">
                                                        {decision.selected_provider_id?.replace('fac_', '').toUpperCase()} {decision.selected_model && `(${decision.selected_model})`}
                                                    </Badge>
                                                </td>
                                                <td className="px-6 py-5 uppercase text-[10px] font-bold text-neutral-600">
                                                    {decision.requested_mode}
                                                </td>
                                                <td className="px-6 py-5 text-right font-black text-xs text-primary font-mono">
                                                    ${parseFloat(decision.cost_usd.toString()).toFixed(4)}
                                                </td>
                                            </tr>
                                        ))
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </Card>
                </div>
            </WalletRequired>
        </div>
    )
}

