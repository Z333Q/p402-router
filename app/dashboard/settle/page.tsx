import { Suspense } from 'react';
import Link from 'next/link';
import { getCurrentTenantId, getSettlements, getSettlementStats, type SettlementStatsBucket } from '@/lib/db/queries';
import { P402_CONFIG } from '@/lib/constants';
import { TransactionRow } from '../transactions/_components/TransactionRow';

// V5 §18.5: Settle = canonical settlement surface. Sibling of /meter, /monitor,
// /control, /optimize, /prove. Read-only: never writes to processed_tx_hashes
// (financial-integrity table).

function fmtUsd(n: number): string {
    if (n === 0) return '$0.00';
    if (n < 0.01) return `$${n.toFixed(4)}`;
    if (n < 1000) return `$${n.toFixed(2)}`;
    if (n < 1_000_000) return `$${(n / 1000).toFixed(1)}k`;
    return `$${(n / 1_000_000).toFixed(2)}M`;
}

function fmtCount(n: number): string {
    if (n < 1000) return String(n);
    if (n < 1_000_000) return `${(n / 1000).toFixed(1)}k`;
    return `${(n / 1_000_000).toFixed(2)}M`;
}

// ── Stats strip ───────────────────────────────────────────────────────────────

async function SettlementStatsStrip() {
    const tenantId = await getCurrentTenantId();
    const [last24h, last7d, last30d] = await Promise.all([
        getSettlementStats(tenantId, '24h'),
        getSettlementStats(tenantId, '7d'),
        getSettlementStats(tenantId, '30d'),
    ]);

    const cells: Array<{ label: string; primary: string; secondary: string }> = [
        {
            label: 'Settled · 24h',
            primary: fmtUsd(last24h.total_usd),
            secondary: `${fmtCount(last24h.count)} txs`,
        },
        {
            label: 'Settled · 7d',
            primary: fmtUsd(last7d.total_usd),
            secondary: `${fmtCount(last7d.count)} txs`,
        },
        {
            label: 'Settled · 30d',
            primary: fmtUsd(last30d.total_usd),
            secondary: `${fmtCount(last30d.count)} txs`,
        },
        {
            label: 'Unique payers · 30d',
            primary: fmtCount(last30d.unique_payers),
            secondary: last30d.count > 0
                ? `${(last30d.count / Math.max(last30d.unique_payers, 1)).toFixed(1)} txs / payer`
                : 'no traffic yet',
        },
    ];

    return (
        <>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-0 border-2 border-black divide-x-0 lg:divide-x-2 divide-y-2 lg:divide-y-0 divide-black">
                {cells.map((cell) => (
                    <div key={cell.label} className="px-5 py-4 bg-white">
                        <div className="text-[10px] font-black uppercase tracking-widest text-neutral-500 mb-2">
                            {cell.label}
                        </div>
                        <div className="text-3xl font-black tracking-tighter text-black leading-none">
                            {cell.primary}
                        </div>
                        <div className="text-[11px] font-medium text-neutral-500 mt-1">
                            {cell.secondary}
                        </div>
                    </div>
                ))}
            </div>

            <SchemeAndNetworkBreakdown stats={last30d} />
        </>
    );
}

function SchemeAndNetworkBreakdown({ stats }: { stats: SettlementStatsBucket }) {
    const totalScheme = stats.by_scheme.reduce((acc, s) => acc + s.count, 0);
    const totalNetwork = stats.by_network.reduce((acc, n) => acc + n.count, 0);

    if (totalScheme === 0 && totalNetwork === 0) return null;

    return (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-0 border-2 border-black divide-y-2 md:divide-y-0 md:divide-x-2 divide-black">
            <div className="p-5 bg-white">
                <div className="text-[10px] font-black uppercase tracking-widest text-neutral-500 mb-3">
                    By scheme · 30d
                </div>
                <div className="space-y-2">
                    {totalScheme === 0 ? (
                        <div className="text-xs text-neutral-400">No settlements in window.</div>
                    ) : stats.by_scheme.map((s) => {
                        const pct = (s.count / totalScheme) * 100;
                        return (
                            <div key={s.scheme}>
                                <div className="flex items-baseline justify-between">
                                    <span className="text-[11px] font-black uppercase tracking-widest text-black">{s.scheme}</span>
                                    <span className="text-[11px] font-mono text-neutral-600">
                                        {fmtCount(s.count)} · {fmtUsd(s.total_usd)}
                                    </span>
                                </div>
                                <div className="h-1.5 bg-neutral-100 mt-1 border border-black overflow-hidden">
                                    <div className="h-full bg-primary" style={{ width: `${pct}%` }} />
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>
            <div className="p-5 bg-white">
                <div className="text-[10px] font-black uppercase tracking-widest text-neutral-500 mb-3">
                    By network · 30d
                </div>
                <div className="space-y-2">
                    {totalNetwork === 0 ? (
                        <div className="text-xs text-neutral-400">No settlements in window.</div>
                    ) : stats.by_network.map((n) => {
                        const pct = (n.count / totalNetwork) * 100;
                        return (
                            <div key={n.network}>
                                <div className="flex items-baseline justify-between">
                                    <span className="text-[11px] font-black uppercase tracking-widest text-black">{n.network}</span>
                                    <span className="text-[11px] font-mono text-neutral-600">
                                        {fmtCount(n.count)} · {fmtUsd(n.total_usd)}
                                    </span>
                                </div>
                                <div className="h-1.5 bg-neutral-100 mt-1 border border-black overflow-hidden">
                                    <div className="h-full bg-primary" style={{ width: `${pct}%` }} />
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>
        </div>
    );
}

function StatsStripSkeleton() {
    return (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-0 border-2 border-black divide-x-0 lg:divide-x-2 divide-y-2 lg:divide-y-0 divide-black">
            {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="px-5 py-4 bg-white animate-pulse">
                    <div className="h-2.5 w-24 bg-neutral-200 mb-3" />
                    <div className="h-8 w-20 bg-neutral-200" />
                    <div className="h-2.5 w-16 bg-neutral-200 mt-2" />
                </div>
            ))}
        </div>
    );
}

// ── Recent settlements table ──────────────────────────────────────────────────

function TableSkeleton() {
    return (
        <>
            {[1, 2, 3, 4, 5].map((i) => (
                <tr key={i} className="border-b-2 border-neutral-100 animate-pulse">
                    {Array.from({ length: 8 }).map((_, j) => (
                        <td key={j} className="px-5 py-4">
                            <div className="h-3 bg-neutral-200 w-20" />
                        </td>
                    ))}
                </tr>
            ))}
        </>
    );
}

async function RecentSettlementsTable() {
    const tenantId = await getCurrentTenantId();
    const settlementsResult = await getSettlements(tenantId, 50);
    const settlements = settlementsResult.rows;

    if (settlements.length === 0) {
        return (
            <div className="text-center py-16 border-2 border-black">
                <div className="text-[10px] font-black uppercase tracking-widest text-neutral-400 mb-3">
                    No settlements yet
                </div>
                <h3 className="text-2xl font-black uppercase tracking-tighter mb-3">
                    Awaiting first settlement
                </h3>
                <p className="text-neutral-600 font-medium mb-6 max-w-md mx-auto">
                    Settle records every USDC payment that flows through the P402 facilitator.
                    Run a paid request and it will appear here within seconds.
                </p>
                <div className="flex gap-3 justify-center flex-wrap">
                    <Link
                        href="/docs/quickstart"
                        className="inline-flex items-center h-10 px-5 bg-primary border-2 border-black font-black text-[11px] uppercase tracking-wider hover:bg-black hover:text-primary transition-colors no-underline"
                    >
                        Quickstart →
                    </Link>
                    <Link
                        href="/dashboard/meter/events"
                        className="inline-flex items-center h-10 px-5 border-2 border-black font-black text-[11px] uppercase tracking-wider hover:bg-neutral-50 transition-colors no-underline"
                    >
                        Open Meter
                    </Link>
                </div>
            </div>
        );
    }

    return (
        <div className="overflow-x-auto border-2 border-black">
            <table className="min-w-full divide-y-2 divide-neutral-100">
                <thead className="bg-neutral-50 border-b-2 border-black">
                    <tr>
                        {['Time', 'Amount', 'Scheme', 'Session', 'Payer', 'Transaction', 'Trust', ''].map((h) => (
                            <th
                                key={h}
                                className="px-5 py-3 text-left text-[10px] font-black uppercase tracking-widest text-neutral-500"
                            >
                                {h}
                            </th>
                        ))}
                    </tr>
                </thead>
                <tbody className="bg-white">
                    {settlements.map((settlement) => (
                        <TransactionRow key={settlement.id} settlement={settlement} />
                    ))}
                </tbody>
            </table>
        </div>
    );
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default async function SettlePage() {
    return (
        <div className="max-w-7xl mx-auto space-y-8">

            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
                <div>
                    <div className="text-[10px] font-black uppercase tracking-widest text-neutral-400 mb-1">
                        Dashboard / Settle
                    </div>
                    <h1 className="text-4xl font-black uppercase tracking-tighter text-black leading-none">
                        Settlement
                    </h1>
                    <p className="text-neutral-600 font-medium mt-2 max-w-xl">
                        Every USDC settlement processed through the P402 facilitator.
                        Volume, scheme split, network split, and the underlying ledger — all from one source of truth: <code className="font-mono text-xs">processed_tx_hashes</code>.
                    </p>
                </div>

                <div className="flex gap-3 shrink-0">
                    <a
                        href="/api/v1/analytics/evidence-bundle?download=true"
                        className="inline-flex items-center h-10 px-5 border-2 border-black font-black text-[11px] uppercase tracking-wider hover:bg-black hover:text-primary transition-colors no-underline"
                    >
                        Export bundle ↓
                    </a>
                    <Link
                        href={`https://basescan.org/address/${P402_CONFIG.TREASURY_ADDRESS}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center h-10 px-5 border-2 border-black font-black text-[11px] uppercase tracking-wider hover:bg-neutral-50 transition-colors no-underline"
                    >
                        Treasury ↗
                    </Link>
                </div>
            </div>

            {/* Stats */}
            <Suspense fallback={<StatsStripSkeleton />}>
                <SettlementStatsStrip />
            </Suspense>

            {/* Treasury info strip */}
            <div className="border-2 border-black p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-neutral-50">
                <div>
                    <div className="text-[10px] font-black uppercase tracking-widest text-neutral-400 mb-1">
                        Treasury address
                    </div>
                    <code className="font-mono text-sm text-black break-all">
                        {P402_CONFIG.TREASURY_ADDRESS}
                    </code>
                </div>
                <div className="flex gap-8 text-right sm:text-right">
                    <div>
                        <div className="text-[10px] font-black uppercase tracking-widest text-neutral-400">Network</div>
                        <div className="text-sm font-black text-black">Base L2 · Chain {P402_CONFIG.CHAIN_ID}</div>
                    </div>
                    <div>
                        <div className="text-[10px] font-black uppercase tracking-widest text-neutral-400">Asset</div>
                        <div className="text-sm font-black text-black">USDC</div>
                    </div>
                </div>
            </div>

            {/* Recent settlements */}
            <div className="space-y-3">
                <div className="flex items-baseline justify-between">
                    <h2 className="text-2xl font-black uppercase tracking-tighter text-black">
                        Recent settlements
                    </h2>
                    <Link
                        href="/dashboard/transactions"
                        className="text-[10px] font-black uppercase tracking-widest text-neutral-500 hover:text-black transition-colors"
                    >
                        Full history →
                    </Link>
                </div>
                <Suspense
                    fallback={
                        <div className="overflow-x-auto border-2 border-black">
                            <table className="min-w-full">
                                <thead className="bg-neutral-50 border-b-2 border-black">
                                    <tr>
                                        {['Time', 'Amount', 'Scheme', 'Session', 'Payer', 'Transaction', 'Trust', ''].map(h => (
                                            <th key={h} className="px-5 py-3 text-left text-[10px] font-black uppercase tracking-widest text-neutral-500">{h}</th>
                                        ))}
                                    </tr>
                                </thead>
                                <tbody>
                                    <TableSkeleton />
                                </tbody>
                            </table>
                        </div>
                    }
                >
                    <RecentSettlementsTable />
                </Suspense>
            </div>

            {/* Scheme legend */}
            <div className="border-2 border-black p-4 bg-neutral-50">
                <div className="text-[10px] font-black uppercase tracking-widest text-neutral-500 mb-3">
                    Settlement schemes (x402)
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    {[
                        { label: 'exact', desc: 'EIP-3009 TransferWithAuthorization. Payer signs offline, facilitator pays gas. Zero payer cost.' },
                        { label: 'onchain', desc: 'Payer broadcasts the tx themselves. Facilitator verifies on-chain inclusion before unlocking the resource.' },
                        { label: 'receipt', desc: 'Reuse a prior on-chain payment for repeat access. No new signature, no new tx.' },
                    ].map(s => (
                        <div key={s.label} className="border-l-2 border-black pl-3">
                            <div className="text-[10px] font-black uppercase tracking-widest text-black mb-0.5">{s.label}</div>
                            <p className="text-xs font-medium text-neutral-500">{s.desc}</p>
                        </div>
                    ))}
                </div>
            </div>

        </div>
    );
}
