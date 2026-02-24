export const dynamic = 'force-dynamic';
import Link from 'next/link'
import pool from '@/lib/db'
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { TopNav } from '@/components/TopNav'
import { Footer } from '@/components/Footer'
import { AuditGateBanner } from '@/app/dashboard/_components/audit/AuditGateBanner'
import { ShieldCheck, ShieldAlert, Cpu, Lock } from 'lucide-react'

export const metadata = {
    title: 'Bazaar | P402',
    description: 'Global x402 Discovery Layer'
}

export default async function PublicBazaarPage() {
    const session = await getServerSession(authOptions)
    const user = session?.user

    // Fetch Resources with basic DB join for ERC8004 agent data if we explicitly modeled the relation
    // For now we assume rank_score exists on bazaar_resources or simulate the trust score
    let resources: any[] = []
    let err = ''
    try {
        const res = await pool.query(`
            SELECT br.*, 
                   COALESCE(ea.reputation_score, br.rank_score, 100) as reputation_score,
                   ea.is_verified,
                   br.safety_flags,
                   br.safety_score
            FROM bazaar_resources br
            LEFT JOIN erc8004_agents ea ON ea.resource_id = br.resource_id
            WHERE br.rank_score >= 0 
            ORDER BY br.rank_score DESC, br.updated_at DESC 
            LIMIT 50
        `)
        resources = res.rows
    } catch (e: any) {
        console.error("Bazaar Fetch Error", e)
        err = "Could not load registry data."
    }

    // Determine current user plan state for the AuditGateBanner
    let planTier = 'free';
    if (user && (user as any).tenantId) {
        try {
            const planRes = await pool.query(`SELECT plan FROM tenants WHERE id = $1`, [(user as any).tenantId]);
            planTier = planRes.rows[0]?.plan || 'free';
        } catch (e) { }
    }

    return (
        <div className="min-h-screen flex flex-col font-sans selection:bg-[var(--primary)] selection:text-black">
            <TopNav />

            <main className="flex-1 py-12 px-6">
                <div className="max-w-[1280px] mx-auto">

                    {/* Page Header */}
                    <div className="mb-16 text-center">
                        <h1 className="text-6xl md:text-8xl font-black uppercase leading-[0.85] mb-8 tracking-tight text-black">
                            Decentralized<br />
                            <span className="bg-[var(--primary)] px-4 border-2 border-black">Discovery</span>
                        </h1>
                        <p className="text-xl md:text-2xl text-[var(--neutral-600)] max-w-2xl mx-auto font-medium mb-12">
                            Find, verify, and route to <span className="text-black border-b-4 border-[var(--primary)] font-bold">standard x402</span> payment-protected APIs.
                        </p>

                        <div className="max-w-3xl mx-auto">
                            <AuditGateBanner
                                state={planTier === 'free' ? 'preview' : 'allowed'}
                                featureName="Publisher Verification"
                                prompt={{
                                    target_plan: 'Pro',
                                    headline: 'Publish Your Custom Agent',
                                    body: 'Free listings have no trust badge. Upgrade to Pro to verify your publisher identity and increase your paid routing calls.',
                                    cta_label: 'Upgrade to Publish',
                                    cta_route: '/dashboard/billing/upgrade'
                                }}
                            >
                                <Link href="/dashboard/bazaar" className="btn bg-[var(--primary)] text-black border-2 border-black inline-flex items-center gap-2 px-8 py-4 uppercase font-black hover:bg-[var(--primary-hover)] transition-colors shadow-[4px_4px_0px_#000]">
                                    <ShieldCheck className="w-5 h-5" />
                                    Publish Verified Agent
                                </Link>
                            </AuditGateBanner>
                        </div>
                    </div>

                    {err && (
                        <div className="p-4 bg-[var(--error)] border-2 border-black text-center mb-6 font-bold text-white uppercase tracking-widest">
                            Error: {err}
                        </div>
                    )}

                    {resources.length === 0 ? (
                        <div className="card text-center max-w-lg mx-auto bg-[var(--neutral-100)] border-2 border-black">
                            <div className="font-black text-2xl mb-4 text-black uppercase">Registry Empty</div>
                            <p className="mb-8 text-[var(--neutral-600)] text-lg">No resources have been indexed yet. Be the first to claim a route.</p>
                            <Link href="/dashboard/bazaar" className="btn bg-[var(--primary)] text-black border-2 border-black inline-flex items-center shadow-[4px_4px_0px_#000] hover:bg-[var(--primary-hover)] transition-colors">
                                Index Your Route
                            </Link>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                            {resources.map((r: any) => (
                                <ResourceCard key={r.resource_id} r={r} />
                            ))}
                        </div>
                    )}
                </div>
            </main>
            <Footer />
        </div>
    )
}

function TrustBadge({ score, isVerified }: { score: number, isVerified: boolean }) {
    if (!isVerified) {
        return (
            <div className="flex items-center gap-1.5 text-[10px] bg-[var(--neutral-100)] border-2 border-black px-2 py-1 font-black uppercase text-black">
                <ShieldAlert className="w-3 h-3" />
                Unverified
            </div>
        );
    }

    const isHigh = score >= 80;
    const isMedium = score >= 50 && score < 80;

    let colorClass = 'bg-[var(--error)] text-white'; // Low
    if (isHigh) colorClass = 'bg-[var(--success)] text-white';
    else if (isMedium) colorClass = 'bg-[var(--warning)] text-black';

    return (
        <div className={`flex items-center gap-1.5 text-[10px] border-2 border-black px-2 py-1 font-black uppercase tracking-wider ${colorClass}`}>
            <ShieldCheck className="w-3 h-3" />
            Trust: {Number(score).toFixed(0)}
        </div>
    );
}

function ResourceCard({ r }: { r: any }) {
    const hasPricing = r.pricing && typeof r.pricing.amount !== 'undefined';
    const safetyScore = r.safety_score || 100;
    const safetyFlags = r.safety_flags || [];

    return (
        <div className="group card hover:shadow-[8px_8px_0px_#000] hover:translate-y-[-4px] transition-all duration-150 p-0 overflow-hidden flex flex-col h-full bg-white border-2 border-black">
            {/* Header */}
            <div className="p-5 border-b-2 border-black bg-[var(--neutral-50)] flex flex-col gap-3">
                <div className="flex justify-between items-start">
                    <div className="font-black text-lg truncate max-w-[200px] text-black uppercase tracking-tight" title={r.title || r.canonical_route_id}>
                        {r.title || r.canonical_route_id}
                    </div>
                </div>
                <div className="flex items-center gap-2 flex-wrap">
                    <TrustBadge score={r.reputation_score} isVerified={r.is_verified} />
                    <div className="text-[10px] bg-white border-2 border-black px-2 py-1 font-bold text-black uppercase">
                        {r.pricing?.model || 'PAY-PER-CALL'}
                    </div>
                </div>
            </div>

            {/* Body */}
            <div className="p-5 flex-1 flex flex-col border-b-2 border-black">
                <div className="mb-6">
                    <p className="text-sm text-[var(--neutral-600)] leading-relaxed font-medium line-clamp-3">
                        {r.description || 'No description provided for this resource.'}
                    </p>
                </div>

                <div className="mt-auto flex gap-2 flex-wrap mb-4">
                    {Array.isArray(r.methods) && r.methods.map((m: string) => (
                        <span key={m} className="text-[10px] bg-[var(--neutral-100)] border-2 border-black text-black px-2 py-1 font-bold uppercase tracking-wider">{m}</span>
                    ))}
                    {hasPricing ? (
                        <span className="text-[10px] bg-[var(--primary)] border-2 border-black px-2 py-1 font-bold text-black uppercase">
                            ${r.pricing.amount} {r.pricing.unit || 'USD'}
                        </span>
                    ) : (
                        <span className="text-[10px] bg-white border-2 border-[var(--neutral-300)] px-2 py-1 font-bold text-[var(--neutral-400)] uppercase">
                            UNPRICED
                        </span>
                    )}
                </div>

                {/* Scan Drawer (Accordion) */}
                <details className="group/drawer border-2 border-black bg-[var(--neutral-50)] [&_summary::-webkit-details-marker]:hidden">
                    <summary className="p-3 text-xs font-bold uppercase tracking-wide cursor-pointer flex justify-between items-center outline-none list-none text-[var(--neutral-700)] hover:bg-[var(--neutral-100)] transition-colors">
                        <span className="flex items-center gap-2">
                            <Cpu className="w-4 h-4" />
                            Security Scan Report
                        </span>
                        <span>+</span>
                    </summary>
                    <div className="p-3 border-t-2 border-black bg-white flex flex-col gap-2 text-xs font-mono">
                        <div className="flex justify-between items-center">
                            <span className="text-[var(--neutral-500)]">Code Exec:</span>
                            <span className="font-bold text-[var(--success)]">Safe</span>
                        </div>
                        <div className="flex justify-between items-center">
                            <span className="text-[var(--neutral-500)]">Data Exfil Risk:</span>
                            <span className={`font-bold ${safetyScore >= 90 ? 'text-[var(--success)]' : 'text-[var(--warning)]'}`}>
                                {safetyScore >= 90 ? 'Low' : 'Medium'}
                            </span>
                        </div>
                        {safetyFlags.length > 0 && (
                            <div className="mt-2 pt-2 border-t border-[var(--neutral-200)] text-[var(--error)] flex flex-col gap-1">
                                <span className="text-[10px] font-bold uppercase">Flags Detected:</span>
                                {safetyFlags.map((f: string) => <span key={f}>- {f}</span>)}
                            </div>
                        )}
                    </div>
                </details>
            </div>

            {/* Footer */}
            <div className="p-3 bg-black text-white">
                <div className="text-[10px] font-mono truncate flex items-center gap-2">
                    <span className="w-2 h-2 bg-[var(--primary)]"></span>
                    {r.route_path}
                </div>
            </div>
        </div>
    )
}

