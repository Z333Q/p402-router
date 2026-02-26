import { Suspense } from 'react';
import Link from 'next/link';
import { getCurrentTenantId, getSettlements } from '@/lib/db/queries';
import { P402_CONFIG } from '@/lib/constants';
import { TransactionRow } from './_components/TransactionRow';

// ── Skeleton ──────────────────────────────────────────────────────────────────

function TransactionsTableSkeleton() {
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

// ── Table (server component) ──────────────────────────────────────────────────

async function TransactionsTable() {
    const tenantId = await getCurrentTenantId();
    const settlementsResult = await getSettlements(tenantId, 100);
    const settlements = settlementsResult.rows;

    if (settlements.length === 0) {
        return (
            <div className="text-center py-20 border-2 border-black">
                <div className="text-[10px] font-black uppercase tracking-widest text-neutral-400 mb-4">
                    No settlements yet
                </div>
                <h3 className="text-2xl font-black uppercase tracking-tighter mb-3">
                    No Transactions
                </h3>
                <p className="text-neutral-600 font-medium mb-8 max-w-sm mx-auto">
                    Make your first payment through the P402 router to see transactions here.
                </p>
                <div className="flex gap-3 justify-center">
                    <Link
                        href="/docs/api"
                        className="inline-flex items-center h-10 px-5 bg-primary border-2 border-black font-black text-[11px] uppercase tracking-wider hover:bg-black hover:text-primary transition-colors no-underline"
                    >
                        View API Docs
                    </Link>
                    <Link
                        href="/dashboard"
                        className="inline-flex items-center h-10 px-5 border-2 border-black font-black text-[11px] uppercase tracking-wider hover:bg-neutral-50 transition-colors no-underline"
                    >
                        Back to Dashboard
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

export default async function TransactionsPage() {
    return (
        <div className="max-w-7xl mx-auto space-y-8">

            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
                <div>
                    <div className="text-[10px] font-black uppercase tracking-widest text-neutral-400 mb-1">
                        Dashboard / Transactions
                    </div>
                    <h1 className="text-4xl font-black uppercase tracking-tighter text-black leading-none">
                        Transaction History
                    </h1>
                    <p className="text-neutral-600 font-medium mt-2">
                        All USDC settlements processed through P402 on Base L2
                    </p>
                </div>

                <div className="flex gap-3 shrink-0">
                    <a
                        href="/api/v1/analytics/evidence-bundle?download=true"
                        className="inline-flex items-center h-10 px-5 border-2 border-black font-black text-[11px] uppercase tracking-wider hover:bg-black hover:text-primary transition-colors no-underline"
                    >
                        Export All ↓
                    </a>
                    <Link
                        href={`https://basescan.org/address/${P402_CONFIG.TREASURY_ADDRESS}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center h-10 px-5 border-2 border-black font-black text-[11px] uppercase tracking-wider hover:bg-neutral-50 transition-colors no-underline"
                    >
                        View Treasury ↗
                    </Link>
                </div>
            </div>

            {/* Treasury info strip */}
            <div className="border-2 border-black p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-neutral-50">
                <div>
                    <div className="text-[10px] font-black uppercase tracking-widest text-neutral-400 mb-1">
                        Treasury address
                    </div>
                    <code className="font-mono text-sm text-black">
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

            {/* Transactions table */}
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
                                <TransactionsTableSkeleton />
                            </tbody>
                        </table>
                    </div>
                }
            >
                <TransactionsTable />
            </Suspense>

            {/* Scheme legend */}
            <div className="border-2 border-black p-4 bg-neutral-50">
                <div className="text-[10px] font-black uppercase tracking-widest text-neutral-500 mb-3">
                    Settlement schemes
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    {[
                        { label: 'EIP-3009 (exact)', desc: 'User signs authorization. P402 pays gas. Zero cost to payer.' },
                        { label: 'On-Chain (onchain)', desc: 'User broadcasts tx. P402 verifies on-chain inclusion.' },
                        { label: 'Receipt (receipt)', desc: 'Prior payment reused for repeat access. No new signature.' },
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
