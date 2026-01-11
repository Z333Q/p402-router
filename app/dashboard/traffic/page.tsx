'use client'
import React from 'react'
import { Badge, Button, Card, CodeBox, EmptyState, ErrorState, Input, Select } from '../_components/ui'
import { TraceTimeline } from '../_components/trace'
import { useTraffic, EventRow } from '@/hooks/useTraffic'
import { clsx } from 'clsx'
import { formatDistanceToNow } from 'date-fns'

export default function LiveTrafficPage() {
    const {
        filtered,
        loading,
        error,
        selected,
        setSelected,
        searchQuery,
        setSearchQuery,
        outcomeFilter,
        setOutcomeFilter,
        refresh
    } = useTraffic()

    return (
        <div className="space-y-8 max-w-[1600px] mx-auto">
            {/* Page Header */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div className="space-y-1">
                    <h1 className="text-4xl font-black uppercase tracking-tighter text-black">Live Traffic</h1>
                    <p className="text-neutral-500 font-medium">Real-time inspector with header decoding & deny hints.</p>
                </div>
                <Button onClick={refresh} variant="secondary" className="hidden sm:inline-flex">Manual Refresh</Button>
            </div>

            {error && (
                <ErrorState
                    title="Router API connectivity issue"
                    body={error}
                    action={<Button onClick={refresh}>Reconnect Stream</Button>}
                />
            )}

            {/* Split Pane Layout */}
            <div className="grid grid-cols-1 xl:grid-cols-12 gap-8 items-start">

                {/* Left Column: Request List (7/12) */}
                <div className="xl:col-span-7 space-y-6">
                    <Card title="Traffic Stream" className="p-0 overflow-hidden">
                        {/* Filters Header */}
                        <div className="p-4 bg-neutral-50 border-b-2 border-black grid grid-cols-1 md:grid-cols-2 gap-4">
                            <Input
                                value={searchQuery}
                                onChange={setSearchQuery}
                                placeholder="Filter by Route, Path, or ID..."
                                className="bg-white"
                            />
                            <Select
                                value={outcomeFilter}
                                onChange={(v) => setOutcomeFilter(v as any)}
                                options={[
                                    { value: 'all', label: 'All outcomes' },
                                    { value: 'allow', label: 'Allow Only' },
                                    { value: 'settled', label: 'Settled Only' },
                                    { value: 'deny', label: 'Denied Only' },
                                    { value: 'error', label: 'Errors Only' }
                                ]}
                            />
                        </div>

                        {loading && filtered.length === 0 ? (
                            <div className="py-20 text-center font-bold text-neutral-400 uppercase tracking-widest text-xs animate-pulse">
                                Connecting to Router...
                            </div>
                        ) : filtered.length === 0 ? (
                            <EmptyState
                                title="No matching activity"
                                body="Try adjusting your filters or sending a test request."
                                action={<Button variant="dark" onClick={() => setSearchQuery('')}>Clear Filters</Button>}
                            />
                        ) : (
                            <div className="overflow-x-auto">
                                <table className="w-full text-left border-collapse">
                                    <thead>
                                        <tr className="bg-neutral-100 border-b-2 border-black">
                                            <th className="px-4 py-3 text-[10px] font-black uppercase tracking-widest text-neutral-600">Time</th>
                                            <th className="px-4 py-3 text-[10px] font-black uppercase tracking-widest text-neutral-600">Route</th>
                                            <th className="px-4 py-3 text-[10px] font-black uppercase tracking-widest text-neutral-600">Network</th>
                                            <th className="px-4 py-3 text-[10px] font-black uppercase tracking-widest text-neutral-600 text-right">Outcome</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-black/5">
                                        {filtered.map((r) => {
                                            const isSelected = selected?.eventId === r.eventId
                                            return (
                                                <tr
                                                    key={r.eventId}
                                                    onClick={() => setSelected(r)}
                                                    className={clsx(
                                                        "cursor-pointer transition-colors group",
                                                        isSelected ? "bg-primary/20" : "hover:bg-neutral-50"
                                                    )}
                                                >
                                                    <td className="px-4 py-4 font-mono text-[10px] text-neutral-500 whitespace-nowrap">
                                                        {formatDistanceToNow(new Date(r.at))} ago
                                                    </td>
                                                    <td className="px-4 py-4">
                                                        <div className="font-bold text-sm text-black group-hover:underline underline-offset-4 decoration-2">
                                                            {r.routeId || 'unknown'}
                                                        </div>
                                                        <div className="text-[10px] font-mono text-neutral-400">{r.method} {r.path}</div>
                                                    </td>
                                                    <td className="px-4 py-4 text-[10px] font-bold text-neutral-500 uppercase">
                                                        {r.network || 'base'}
                                                    </td>
                                                    <td className="px-4 py-4 text-right">
                                                        <Badge tone={
                                                            r.outcome === 'settled' ? 'ok' :
                                                                r.outcome === 'allow' ? 'info' :
                                                                    r.outcome === 'deny' ? 'warn' : 'bad'
                                                        }>
                                                            {r.outcome}
                                                        </Badge>
                                                    </td>
                                                </tr>
                                            )
                                        })}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </Card>
                </div>

                {/* Right Column: Inspector (5/12) */}
                <div className="xl:col-span-5 sticky top-24">
                    {selected ? (
                        <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
                            <Card title="Traffic Inspector">
                                <div className="flex justify-between items-start mb-6">
                                    <div className="space-y-1">
                                        <div className="font-mono text-[10px] font-bold text-neutral-400 uppercase tracking-widest">Transaction ID</div>
                                        <div className="font-mono text-xs font-black text-black select-all bg-neutral-100 px-2 py-0.5 border border-black/10">
                                            {selected.eventId}
                                        </div>
                                    </div>
                                    <Badge tone={
                                        selected.outcome === 'settled' ? 'ok' :
                                            selected.outcome === 'allow' ? 'info' :
                                                selected.outcome === 'deny' ? 'warn' : 'bad'
                                    }>
                                        {selected.outcome}
                                    </Badge>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                                    <div className="p-4 bg-neutral-50 border-2 border-black space-y-1 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]">
                                        <div className="text-[10px] font-black uppercase text-neutral-400">Request Context</div>
                                        <div className="font-black text-xs text-black">
                                            {selected.method || 'POST'} {selected.path || '/'}
                                        </div>
                                    </div>
                                    <div className="p-4 bg-neutral-50 border-2 border-black space-y-1 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]">
                                        <div className="text-[10px] font-black uppercase text-neutral-400">Payment Metadata</div>
                                        <div className="font-black text-xs text-black uppercase tracking-tight">
                                            {selected.scheme || 'exact'} · ${selected.amount || '0.00'}
                                        </div>
                                    </div>
                                </div>

                                {selected.denyCode && (
                                    <div className="p-4 bg-error/10 border-2 border-error mb-6 space-y-2">
                                        <div className="font-black text-error uppercase text-xs tracking-tight flex items-center gap-2">
                                            <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="3">
                                                <circle cx="12" cy="12" r="10" />
                                                <line x1="12" y1="8" x2="12" y2="12" />
                                                <line x1="12" y1="16" x2="12.01" y2="16" />
                                            </svg>
                                            Policy Breach: {selected.denyCode}
                                        </div>
                                        <div className="text-xs text-error font-medium leading-relaxed">
                                            {getTroubleshootingHint(selected.denyCode)}
                                        </div>
                                    </div>
                                )}

                                <div className="p-4 bg-white border-2 border-black space-y-4">
                                    <div className="text-[10px] font-black uppercase text-neutral-400 border-b-2 border-black/5 pb-2">Header Signatures</div>
                                    <HeaderField
                                        label="PROTOCOL-402-REQUIRED"
                                        status={selected.headers?.paymentRequiredPresent ? 'Present' : 'Missing'}
                                        present={selected.headers?.paymentRequiredPresent}
                                    />
                                    <HeaderField
                                        label="PROTOCOL-402-SIGNATURE"
                                        status={selected.headers?.paymentSignaturePresent ? 'Present' : 'Missing'}
                                        present={selected.headers?.paymentSignaturePresent}
                                    />
                                </div>
                            </Card>

                            <TraceTimeline steps={selected.steps || []} />

                            <CodeBox title="Full Decision Object" value={selected.raw || selected} className="max-h-[400px]" />
                        </div>
                    ) : (
                        <div className="h-[600px] flex items-center justify-center border-2 border-dashed border-black/10 text-neutral-300 font-black uppercase tracking-widest text-sm">
                            Select a transaction to inspect
                        </div>
                    )}
                </div>
            </div>
        </div>
    )
}

function HeaderField({ label, status, present }: { label: string; status: string; present?: boolean }) {
    return (
        <div className="space-y-1">
            <div className="text-[10px] font-bold text-black uppercase tracking-tight">{label}</div>
            <div className={clsx(
                "font-mono text-[10px] break-all p-2 border border-black/5 leading-normal",
                present ? "text-success bg-success/5" : "text-neutral-400 bg-neutral-50"
            )}>
                {status}
            </div>
        </div>
    )
}

function getTroubleshootingHint(code: string) {
    const hints: Record<string, string> = {
        'X402_LEGACY_HEADER_X_PAYMENT': 'The client is using an outdated header (X-PAYMENT). Please upgrade the SDK to use the standard PROTOCOL-402-SIGNATURE.',
        'X402_AMOUNT_BELOW_REQUIRED': 'The payment amount attached to this request is lower than the minimum price configured in your route policy.',
        'X402_MISSING_SIGNATURE': 'No cryptographic payment signature was found in the headers. Verify the buyer extension is correctly signing the challenge.',
        'X402_INVALID_SIGNATURE': 'The payment signature failed verification. This could be due to a network ID mismatch or an incorrect private key.',
        'INSUFFICIENT_TREASURY_BALANCE': 'Your treasury address does not have enough USDC to cover the facilitator fee for this transaction.',
    };
    return hints[code] || 'Check the decision trace for internal evaluation details.';
}
