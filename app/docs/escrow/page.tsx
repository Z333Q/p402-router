import type { Metadata } from 'next';
import Link from 'next/link';
import { TopNav } from '@/components/TopNav';
import { Footer } from '@/components/Footer';

export const metadata: Metadata = {
    title: 'Escrow | P402 Docs',
    description: 'Conditional USDC escrow on Base mainnet. Lock funds on-chain, release on confirmed delivery. 48-hour dispute window, 1% protocol fee. REST API reference.',
    alternates: { canonical: 'https://p402.io/docs/escrow' },
};

const STATES = [
    { state: 'CREATED',     actor: 'P402 API',   description: 'Escrow record created in DB. Awaiting on-chain funding.' },
    { state: 'FUNDED',      actor: 'Payer',       description: 'USDC locked in P402Escrow contract. Provider notified.' },
    { state: 'ACCEPTED',    actor: 'Provider',    description: 'Provider has acknowledged the job and committed to deliver.' },
    { state: 'IN_PROGRESS', actor: 'Provider',    description: 'Active work underway. Dispute window not yet open.' },
    { state: 'DELIVERED',   actor: 'Provider',    description: 'Provider marked delivery. 48-hour dispute window opens.' },
    { state: 'SETTLED',     actor: 'Payer',       description: 'Payer confirmed delivery. USDC released: 99% to provider, 1% fee to treasury.' },
    { state: 'DISPUTED',    actor: 'Payer',       description: 'Payer raised a dispute within the window. Admin review triggered.' },
    { state: 'RESOLVED',    actor: 'P402 Admin',  description: 'Admin resolved dispute — funds sent to provider or refunded to payer.' },
    { state: 'EXPIRED',     actor: 'System',      description: 'Escrow expired without delivery. Payer can reclaim funds.' },
    { state: 'CANCELLED',   actor: 'Either',      description: 'Cancelled before funding. No funds moved.' },
] as const;

const ENDPOINTS = [
    { method: 'GET',  path: '/api/v2/escrow',      desc: 'List escrows by address or state' },
    { method: 'POST', path: '/api/v2/escrow',      desc: 'Create a new escrow' },
    { method: 'GET',  path: '/api/v2/escrow/[id]', desc: 'Get escrow details + event log' },
    { method: 'POST', path: '/api/v2/escrow/[id]', desc: 'Transition state: fund | accept | start | deliver | release | dispute' },
] as const;

export default function EscrowDocsPage() {
    return (
        <div className="min-h-screen bg-white text-black font-sans selection:bg-primary selection:text-black">
            <TopNav />
            <main>

                {/* Header */}
                <section className="border-b-2 border-black py-16 bg-white">
                    <div className="container mx-auto px-6 max-w-5xl">
                        <div className="text-[10px] font-black uppercase tracking-widest text-neutral-500 mb-3">
                            <Link href="/docs" className="hover:text-black">Docs</Link> / Escrow
                        </div>
                        <h1 className="text-5xl lg:text-6xl font-black uppercase tracking-tighter leading-none mb-5">
                            Escrow
                        </h1>
                        <p className="text-xl font-bold text-neutral-600 max-w-2xl uppercase tracking-tight leading-relaxed">
                            Conditional USDC escrow on Base. Lock funds on-chain, release only on confirmed delivery. Built for agent-to-agent commerce.
                        </p>
                    </div>
                </section>

                {/* Contract */}
                <section className="border-b-2 border-black py-12">
                    <div className="container mx-auto px-6 max-w-5xl">
                        <h2 className="text-2xl font-black uppercase tracking-tighter mb-6">Deployed Contract</h2>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-px bg-black border-2 border-black">
                            <div className="bg-white p-6">
                                <div className="text-[10px] font-black uppercase text-neutral-500 mb-2">Network</div>
                                <div className="font-mono font-bold text-sm">Base Mainnet (8453)</div>
                            </div>
                            <div className="bg-white p-6">
                                <div className="text-[10px] font-black uppercase text-neutral-500 mb-2">P402Escrow</div>
                                <div className="font-mono text-xs break-all text-primary font-bold">0x4596c0e69d08e4ca6f02c7a129fc2bff8a6905ac</div>
                            </div>
                            <div className="bg-white p-6">
                                <div className="text-[10px] font-black uppercase text-neutral-500 mb-2">Protocol Fee</div>
                                <div className="font-mono font-bold text-sm">1% → P402 Treasury</div>
                            </div>
                        </div>
                    </div>
                </section>

                {/* State Machine */}
                <section className="border-b-2 border-black py-12">
                    <div className="container mx-auto px-6 max-w-5xl">
                        <h2 className="text-2xl font-black uppercase tracking-tighter mb-2">State Machine</h2>
                        <p className="text-sm text-neutral-600 font-bold uppercase mb-6">
                            CREATED → FUNDED → ACCEPTED → IN_PROGRESS → DELIVERED → SETTLED / DISPUTED → RESOLVED
                        </p>
                        <div className="border-2 border-black overflow-hidden">
                            <table className="w-full text-sm">
                                <thead>
                                    <tr className="bg-black text-white">
                                        <th className="text-left px-4 py-3 font-black uppercase text-xs">State</th>
                                        <th className="text-left px-4 py-3 font-black uppercase text-xs">Set By</th>
                                        <th className="text-left px-4 py-3 font-black uppercase text-xs">Meaning</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {STATES.map((s, i) => (
                                        <tr key={s.state} className={`border-b border-neutral-200 ${i % 2 === 0 ? 'bg-white' : 'bg-neutral-50'}`}>
                                            <td className="px-4 py-3 font-mono font-black text-xs text-primary">{s.state}</td>
                                            <td className="px-4 py-3 font-mono text-xs text-neutral-600">{s.actor}</td>
                                            <td className="px-4 py-3 text-xs text-neutral-700">{s.description}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </section>

                {/* Quick Start */}
                <section className="border-b-2 border-black py-12">
                    <div className="container mx-auto px-6 max-w-5xl">
                        <h2 className="text-2xl font-black uppercase tracking-tighter mb-6">Quick Start</h2>
                        <div className="space-y-6">

                            <div>
                                <div className="text-[10px] font-black uppercase tracking-widest text-neutral-500 mb-2">1. Create escrow</div>
                                <pre className="bg-black text-primary font-mono text-xs p-6 overflow-x-auto border-2 border-black">{`POST /api/v2/escrow
Content-Type: application/json

{
  "payer_address":    "0xYourWallet",
  "provider_address": "0xProviderWallet",
  "amount_usd":       25.00,
  "reference_id":     "job_abc123",
  "description":      "Logo design — 3 variants"
}`}</pre>
                            </div>

                            <div>
                                <div className="text-[10px] font-black uppercase tracking-widest text-neutral-500 mb-2">2. Response</div>
                                <pre className="bg-black text-primary font-mono text-xs p-6 overflow-x-auto border-2 border-black">{`{
  "id":               "escrow_6a6f625f...",
  "state":            "CREATED",
  "amount_usd":       25.00,
  "amount_usdc":      "25000000",
  "payer_address":    "0xYourWallet",
  "provider_address": "0xProviderWallet",
  "created_at":       "2026-03-23T00:00:00Z"
}`}</pre>
                            </div>

                            <div>
                                <div className="text-[10px] font-black uppercase tracking-widest text-neutral-500 mb-2">3. Transition state</div>
                                <pre className="bg-black text-primary font-mono text-xs p-6 overflow-x-auto border-2 border-black">{`POST /api/v2/escrow/{id}
{ "action": "fund", "tx_hash": "0x..." }   // payer funds on-chain
{ "action": "accept" }                      // provider accepts
{ "action": "start" }                       // provider starts work
{ "action": "deliver", "proof_hash": "0x..." } // provider delivers
{ "action": "release" }                     // payer releases → SETTLED
{ "action": "dispute" }                     // payer disputes → DISPUTED`}</pre>
                            </div>
                        </div>
                    </div>
                </section>

                {/* API Reference */}
                <section className="border-b-2 border-black py-12">
                    <div className="container mx-auto px-6 max-w-5xl">
                        <h2 className="text-2xl font-black uppercase tracking-tighter mb-6">API Reference</h2>
                        <div className="border-2 border-black overflow-hidden">
                            <table className="w-full text-sm">
                                <thead>
                                    <tr className="bg-black text-white">
                                        <th className="text-left px-4 py-3 font-black uppercase text-xs">Method</th>
                                        <th className="text-left px-4 py-3 font-black uppercase text-xs">Endpoint</th>
                                        <th className="text-left px-4 py-3 font-black uppercase text-xs">Description</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {ENDPOINTS.map((e, i) => (
                                        <tr key={e.path + e.method} className={`border-b border-neutral-200 ${i % 2 === 0 ? 'bg-white' : 'bg-neutral-50'}`}>
                                            <td className="px-4 py-3">
                                                <span className={`font-mono font-black text-xs px-2 py-0.5 ${e.method === 'GET' ? 'bg-primary text-black' : 'bg-black text-primary'}`}>
                                                    {e.method}
                                                </span>
                                            </td>
                                            <td className="px-4 py-3 font-mono text-xs text-black">{e.path}</td>
                                            <td className="px-4 py-3 text-xs text-neutral-700">{e.desc}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                        <p className="text-xs text-neutral-500 mt-4 font-mono uppercase">
                            All endpoints require authentication. Dispute resolution (resolve action) is admin-only in V1.
                        </p>
                    </div>
                </section>

                {/* Dispute window */}
                <section className="border-b-2 border-black py-12">
                    <div className="container mx-auto px-6 max-w-5xl">
                        <h2 className="text-2xl font-black uppercase tracking-tighter mb-6">Dispute Window</h2>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                            <div className="border-2 border-black p-6">
                                <div className="text-[10px] font-black uppercase text-neutral-500 mb-3">Window Duration</div>
                                <div className="text-4xl font-black mb-2">48 hrs</div>
                                <p className="text-sm text-neutral-600">
                                    After the provider marks <span className="font-mono font-bold text-primary">DELIVERED</span>, the payer has 48 hours to either release funds or raise a dispute. After the window closes without action, the provider may claim payment.
                                </p>
                            </div>
                            <div className="border-2 border-black p-6">
                                <div className="text-[10px] font-black uppercase text-neutral-500 mb-3">Resolution</div>
                                <div className="text-4xl font-black mb-2">All-or-nothing</div>
                                <p className="text-sm text-neutral-600">
                                    V1 dispute resolution is admin-mediated. P402 reviews evidence bundles and calls <span className="font-mono font-bold">resolve(id, toProvider)</span> on-chain — either 99% to provider or full refund to payer.
                                </p>
                            </div>
                        </div>
                    </div>
                </section>

                {/* Nav */}
                <section className="py-12">
                    <div className="container mx-auto px-6 max-w-5xl flex gap-6 flex-wrap">
                        <Link href="/docs/bazaar" className="font-black text-xs uppercase tracking-widest border-b-2 border-black hover:text-primary">← Bazaar</Link>
                        <Link href="/docs/a2a" className="font-black text-xs uppercase tracking-widest border-b-2 border-black hover:text-primary">A2A Protocol →</Link>
                        <Link href="/product/escrow" className="font-black text-xs uppercase tracking-widest border-b-2 border-black hover:text-primary">Product Overview →</Link>
                    </div>
                </section>

            </main>
            <Footer />
        </div>
    );
}
