import { Suspense } from 'react';
import Link from 'next/link';
import { getCurrentTenantId, getPublishOverviewStats } from '@/lib/db/queries';
import { DashboardDemoBanner } from '../_components/DashboardDemoBanner';

// V5 §18.5: Publish = seller-side surface. Sibling of /meter, /monitor,
// /control, /optimize, /settle, /prove. Distinct from /dashboard/bazaar
// (buyer-side discovery / browse-and-import).
//
// Per-tenant ownership of published resources is not yet wired (T3.18 /
// Phase 9). Until then this surface is a publisher landing — explicit about
// what the network looks like today and how to participate.

function fmtCount(n: number): string {
    if (n < 1000) return String(n);
    if (n < 1_000_000) return `${(n / 1000).toFixed(1)}k`;
    return `${(n / 1_000_000).toFixed(2)}M`;
}

// ── Stats strip ───────────────────────────────────────────────────────────────

async function NetworkStats() {
    const tenantId = await getCurrentTenantId();
    const stats = await getPublishOverviewStats(tenantId);
    const healthPct = stats.network_facilitators > 0
        ? (stats.healthy_facilitators / stats.network_facilitators) * 100
        : 100;

    const cells: Array<{ label: string; primary: string; secondary: string }> = [
        {
            label: 'Bazaar resources · network',
            primary: fmtCount(stats.network_resources),
            secondary: 'across all facilitators',
        },
        {
            label: 'Active facilitators',
            primary: fmtCount(stats.network_facilitators),
            secondary: `${stats.healthy_facilitators} healthy`,
        },
        {
            label: 'Network health',
            primary: `${healthPct.toFixed(0)}%`,
            secondary: 'facilitators reporting healthy',
        },
    ];

    return (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-0 border-2 border-black divide-x-0 md:divide-x-2 divide-y-2 md:divide-y-0 divide-black">
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
    );
}

function StatsSkeleton() {
    return (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-0 border-2 border-black divide-x-0 md:divide-x-2 divide-y-2 md:divide-y-0 divide-black">
            {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="px-5 py-4 bg-white animate-pulse">
                    <div className="h-2.5 w-32 bg-neutral-200 mb-3" />
                    <div className="h-8 w-20 bg-neutral-200" />
                    <div className="h-2.5 w-24 bg-neutral-200 mt-2" />
                </div>
            ))}
        </div>
    );
}

// ── Publish paths ─────────────────────────────────────────────────────────────

interface PublishPath {
    step: string;
    title: string;
    description: string;
    cta: { label: string; href: string };
    status: 'available' | 'docs';
}

const PUBLISH_PATHS: PublishPath[] = [
    {
        step: '01',
        title: 'Register a facilitator',
        description:
            'Run a P402 facilitator endpoint so the network can discover your resources. Required before publishing any Skill or route.',
        cta: { label: 'Register facilitator →', href: '/dashboard/facilitators' },
        status: 'available',
    },
    {
        step: '02',
        title: 'Publish a Skill resource',
        description:
            'Expose an x402-priced route at your facilitator. Pricing, accepts, and trust posture are read from your manifest and indexed into the Discovery Bazaar.',
        cta: { label: 'Publishing guide →', href: '/docs/skill' },
        status: 'docs',
    },
    {
        step: '03',
        title: 'Verify discoverability',
        description:
            'Confirm your resource is indexed and ranked. Browse the Bazaar to see how it appears to buyers, and what trust signals are attached.',
        cta: { label: 'Open Bazaar →', href: '/dashboard/bazaar' },
        status: 'available',
    },
];

function PathCard({ path }: { path: PublishPath }) {
    return (
        <div className="border-2 border-black p-5 bg-white space-y-3 hover:shadow-[4px_4px_0_0_rgba(0,0,0,1)] transition-shadow">
            <div className="flex items-baseline justify-between">
                <span className="text-[10px] font-black uppercase tracking-[0.2em] text-primary bg-black px-2 py-1">
                    {path.step}
                </span>
                {path.status === 'docs' && (
                    <span className="text-[9px] font-black uppercase tracking-widest text-neutral-400 border border-neutral-300 px-1.5 py-0.5">
                        Docs only
                    </span>
                )}
            </div>
            <h3 className="text-xl font-black uppercase tracking-tighter text-black leading-tight">
                {path.title}
            </h3>
            <p className="text-[13px] text-neutral-600 font-medium leading-relaxed">
                {path.description}
            </p>
            <Link
                href={path.cta.href}
                className="inline-flex items-center text-[10px] font-black uppercase tracking-widest text-black border-b-2 border-black pb-0.5 hover:text-primary hover:border-primary transition-colors"
            >
                {path.cta.label}
            </Link>
        </div>
    );
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default async function PublishPage() {
    return (
        <div className="max-w-7xl mx-auto space-y-8">

            <DashboardDemoBanner surface="publish" />

            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
                <div>
                    <div className="text-[10px] font-black uppercase tracking-widest text-neutral-400 mb-1">
                        Dashboard / Publish
                    </div>
                    <h1 className="text-4xl font-black uppercase tracking-tighter text-black leading-none">
                        Publish
                    </h1>
                    <p className="text-neutral-600 font-medium mt-2 max-w-xl">
                        Make your Skills and routes discoverable on the P402 network.
                        Publishing is run-your-own-facilitator: you keep the keys, you keep the customers, the protocol handles discovery, pricing, and settlement.
                    </p>
                </div>

                <div className="flex gap-3 shrink-0">
                    <Link
                        href="/dashboard/bazaar"
                        className="inline-flex items-center h-10 px-5 border-2 border-black font-black text-[11px] uppercase tracking-wider hover:bg-neutral-50 transition-colors no-underline"
                    >
                        Browse Bazaar
                    </Link>
                    <Link
                        href="/dashboard/facilitators"
                        className="inline-flex items-center h-10 px-5 bg-primary border-2 border-black font-black text-[11px] uppercase tracking-wider hover:bg-black hover:text-primary transition-colors no-underline"
                    >
                        Register facilitator →
                    </Link>
                </div>
            </div>

            {/* Network stats */}
            <Suspense fallback={<StatsSkeleton />}>
                <NetworkStats />
            </Suspense>

            {/* Ownership-attribution disclosure */}
            <div className="border-2 border-black p-4 bg-neutral-50 flex items-start gap-3">
                <div className="w-1.5 h-1.5 bg-black mt-2 shrink-0" />
                <div className="text-[12px] text-neutral-700 font-medium leading-relaxed">
                    <span className="font-black text-black uppercase tracking-widest text-[10px]">Ownership attribution.</span>{' '}
                    Per-tenant ownership of published resources is not yet wired into the index — Phase 9 work. Until then, this surface shows network-wide totals and the path to publish.
                    Settlements you receive as a provider already flow through the {' '}
                    <Link href="/dashboard/settle" className="underline hover:text-black">Settle</Link>
                    {' '}surface, scoped to your tenant.
                </div>
            </div>

            {/* Publish paths */}
            <div className="space-y-3">
                <h2 className="text-2xl font-black uppercase tracking-tighter text-black">
                    Publishing flow
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {PUBLISH_PATHS.map((path) => (
                        <PathCard key={path.step} path={path} />
                    ))}
                </div>
            </div>

            {/* What discovery indexes */}
            <div className="border-2 border-black p-5 bg-neutral-50">
                <div className="text-[10px] font-black uppercase tracking-widest text-neutral-500 mb-3">
                    What the Bazaar indexes from your facilitator
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {[
                        { label: 'Route manifest',  desc: 'canonical_route_id, methods, route_path, x402 accepts/pricing' },
                        { label: 'Provider wallet', desc: 'payTo address from the manifest — where settlements flow' },
                        { label: 'Trust posture',   desc: 'ERC-8004 identity + reputation, safety score, quarantine flags' },
                        { label: 'Live metrics',    desc: 'p95 latency, success rate, total calls — computed from router_decisions' },
                    ].map(item => (
                        <div key={item.label} className="border-l-2 border-black pl-3">
                            <div className="text-[10px] font-black uppercase tracking-widest text-black mb-0.5">{item.label}</div>
                            <p className="text-xs font-medium text-neutral-600">{item.desc}</p>
                        </div>
                    ))}
                </div>
            </div>

        </div>
    );
}
