export const dynamic = 'force-dynamic';
import Link from 'next/link'
import pool from '@/lib/db'
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"

export const metadata = {
    title: 'Bazaar | P402',
    description: 'Global x402 Discovery Layer'
}

export default async function PublicBazaarPage() {
    const session = await getServerSession(authOptions)
    const user = session?.user

    // Fetch Resources
    let resources: any[] = []
    let err = ''
    try {
        const res = await pool.query(`
            SELECT * FROM bazaar_resources 
            WHERE rank_score >= 0 
            ORDER BY rank_score DESC, updated_at DESC 
            LIMIT 50
        `)
        resources = res.rows
    } catch (e: any) {
        console.error("Bazaar Fetch Error", e)
        err = "Could not load registry data."
    }

    return (
        <div className="min-h-screen flex flex-col font-sans selection:bg-primary selection:text-black">
            <header className="border-b-2 border-black px-6 h-16 flex items-center justify-between sticky top-0 bg-white/90 backdrop-blur-sm z-50">
                <Link href="/" className="no-underline text-inherit relative z-10 group flex items-center gap-3">
                    <div className="w-8 h-8 bg-primary border-2 border-black flex items-center justify-center overflow-hidden transition-transform group-hover:scale-105">
                        <img src="/favicon.png" alt="P402 Logo" className="w-6 h-6" />
                    </div>
                    <span className="text-xl font-black no-underline text-black uppercase hover:text-primary-dim transition-colors">
                        P402 Bazaar
                    </span>
                </Link>
                <div className="flex items-center gap-4">
                    <Link href="/docs/bazaar" className="text-sm font-bold text-neutral-600 hover:text-black transition-colors underline decoration-2">
                        API Spec
                    </Link>
                    {user ? (
                        <Link href="/dashboard/bazaar" className="btn btn-primary">
                            Dashboard
                        </Link>
                    ) : (
                        <Link href="/login" className="btn btn-secondary">
                            Sign In
                        </Link>
                    )}
                </div>
            </header>

            <main className="flex-1 py-12 px-6">
                <div className="max-w-[1280px] mx-auto">
                    <div className="mb-16 text-center">
                        <h1 className="text-6xl md:text-8xl font-black uppercase leading-[0.85] mb-8 tracking-tight text-black">
                            Decentralized<br />
                            <span className="bg-primary px-4 border-2 border-black">Discovery</span>
                        </h1>
                        <p className="text-xl md:text-2xl text-neutral-600 max-w-2xl mx-auto font-medium">
                            Find, verify, and route to <span className="text-black border-b-4 border-primary font-bold">standard x402</span> payment-protected APIs.
                        </p>
                    </div>

                    {err && (
                        <div className="p-4 bg-red-100 border-2 border-red-500 text-center mb-6 font-bold text-red-600 uppercase tracking-widest">
                            Error: {err}
                        </div>
                    )}

                    {resources.length === 0 ? (
                        <div className="card text-center max-w-lg mx-auto bg-neutral-100">
                            <div className="font-black text-2xl mb-4 text-black uppercase">Registry Empty</div>
                            <p className="mb-8 text-neutral-600 text-lg">No resources have been indexed yet. Be the first to claim a route.</p>
                            <Link href="/dashboard/bazaar" className="btn btn-primary inline-flex">
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
            <footer className="border-t-2 border-black p-12 text-center text-xs text-neutral-500 font-mono uppercase tracking-widest bg-white">
                P402 Bazaar • The Global Registry for Agentic Services
            </footer>
        </div>
    )
}

function ResourceCard({ r }: { r: any }) {
    const hasPricing = r.pricing && typeof r.pricing.amount !== 'undefined';

    return (
        <div className="card hover:shadow-[8px_8px_0px_#000] hover:translate-y-[-4px] transition-all duration-150 p-0 overflow-hidden flex flex-col h-full bg-white group">
            <div className="p-5 border-b-2 border-black bg-neutral-50 flex justify-between items-start">
                <div className="font-black text-lg truncate max-w-[200px] text-black uppercase tracking-tight">{r.title || r.canonical_route_id}</div>
                <div className="text-[10px] bg-white border-2 border-black px-2 py-1 font-bold text-black uppercase">
                    {r.pricing?.model || 'PAY-PER-CALL'}
                </div>
            </div>
            <div className="p-5 flex-1 flex flex-col">
                <div className="mb-6 h-[60px] overflow-hidden">
                    <p className="text-sm text-neutral-600 leading-relaxed font-medium line-clamp-3">
                        {r.description || 'No description provided for this resource.'}
                    </p>
                </div>
                <div className="mt-auto flex gap-2 flex-wrap">
                    {Array.isArray(r.methods) && r.methods.map((m: string) => (
                        <span key={m} className="text-[10px] bg-neutral-100 border-2 border-neutral-200 text-black px-2 py-1 font-bold uppercase tracking-wider">{m}</span>
                    ))}
                    {hasPricing ? (
                        <span className="text-[10px] bg-primary border-2 border-black px-2 py-1 font-bold text-black uppercase">
                            ${r.pricing.amount} {r.pricing.unit || 'USD'}
                        </span>
                    ) : (
                        <span className="text-[10px] bg-white border-2 border-neutral-300 px-2 py-1 font-bold text-neutral-400 uppercase">
                            UNPRICED
                        </span>
                    )}
                </div>
            </div>
            <div className="p-3 border-t-2 border-black bg-black text-white">
                <div className="text-[10px] font-mono truncate flex items-center gap-2">
                    <span className="w-2 h-2 bg-primary"></span>
                    {r.route_path}
                </div>
            </div>
        </div>
    )
}
