
import { TopNav } from "@/components/TopNav"
import { Footer } from "@/components/Footer"
import { Testimonials } from "@/components/landing/Testimonials"
import Link from 'next/link'

export const dynamic = 'force-dynamic';

export default async function Page() {
    return (
        <div className="min-h-screen bg-white text-black font-sans selection:bg-primary selection:text-black">
            <TopNav />

            <main>
                {/* HERO SECTION */}
                <section className="relative pt-32 pb-24 border-b-4 border-black bg-white">
                    <div className="container mx-auto px-6 relative z-10">
                        <div className="max-w-4xl">
                            <div className="inline-block bg-black text-primary px-3 py-1 text-sm font-black uppercase mb-6 border-2 border-black">
                                V2 PROTOCOL LIVE
                            </div>
                            <h1 className="text-6xl md:text-8xl font-black uppercase tracking-tighter mb-8 leading-[0.9] text-black">
                                The Infrastructure for the <span className="bg-primary px-2">Agentic Web</span>
                            </h1>
                            <p className="text-2xl font-bold mb-10 max-w-2xl leading-tight border-l-4 border-black pl-6">
                                P402 is the orchestration layer that enables AI agents to route requests,
                                discover services, and settle payments autonomously.
                            </p>
                            <div className="flex flex-col sm:flex-row gap-4">
                                <Link href="/docs" className="btn btn-primary text-xl px-10 py-5">
                                    Start Building
                                </Link>
                                <Link href="/dashboard" className="btn btn-secondary text-xl px-10 py-5">
                                    View Dashboard
                                </Link>
                            </div>
                        </div>
                    </div>
                </section>

                {/* FEATURE GRID */}
                <section className="py-24 bg-white border-b-4 border-black">
                    <div className="container mx-auto px-6">
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">

                            {/* A2A Protocol */}
                            <div className="card group hover:bg-neutral-100 transition-colors cursor-default">
                                <div className="h-16 w-16 bg-black border-2 border-black flex items-center justify-center mb-6 text-3xl">🤖</div>
                                <h3 className="section-header">Agent-to-Agent Protocol</h3>
                                <p className="font-medium leading-relaxed mb-6">
                                    Full implementation of Google's A2A standard. Enable your agents to discover capabilities, negotiate tasks, and generate streaming responses with standardized JSON-RPC contexts.
                                </p>
                                <Link href="/docs/a2a" className="text-info font-black uppercase hover:underline">Read the Spec &rarr;</Link>
                            </div>

                            {/* AP2 Mandates */}
                            <div className="card group hover:bg-neutral-100 transition-colors cursor-default">
                                <div className="h-16 w-16 bg-black border-2 border-black flex items-center justify-center mb-6 text-3xl">💳</div>
                                <h3 className="section-header">Payment Mandates</h3>
                                <p className="font-medium leading-relaxed mb-6">
                                    Secure, policy-driven authorization. Users sign cryptographic mandates (EIP-712) allowing agents to spend strict budgets. No shared private keys.
                                </p>
                                <Link href="/docs/mandates" className="text-info font-black uppercase hover:underline">Learn about Security &rarr;</Link>
                            </div>

                            {/* AI Router */}
                            <div className="card group hover:bg-neutral-100 transition-colors cursor-default">
                                <div className="h-16 w-16 bg-black border-2 border-black flex items-center justify-center mb-6 text-3xl">🧠</div>
                                <h3 className="section-header">Intelligent Routing</h3>
                                <p className="font-medium leading-relaxed mb-6">
                                    Optimize every token. Route requests to the best provider based on <span className="font-black">Cost</span>, <span className="font-black">Speed</span>, or <span className="font-black">Quality</span> modes. Includes semantic caching and auto-failover.
                                </p>
                                <Link href="/docs/router" className="text-info font-black uppercase hover:underline">Explore the Engine &rarr;</Link>
                            </div>

                        </div>
                    </div>
                </section>

                {/* TESTIMONIALS */}
                <Testimonials />

                {/* CODE AUDIT / INSPECTOR SECTION */}
                <section className="py-24 bg-neutral-100 border-t-4 border-black border-b-4 border-black">
                    <div className="container mx-auto px-6">
                        <div className="mb-16">
                            <h2 className="text-4xl md:text-6xl font-black uppercase tracking-tighter mb-4">Request Inspector</h2>
                            <p className="text-xl font-bold text-neutral-600">Trace every interaction. Audit every payment.</p>
                        </div>

                        <div className="pane">
                            {/* Request Builder Side */}
                            <div className="bg-white border-2 border-black p-8">
                                <h3 className="section-header">1. Discovery & Negotiate</h3>
                                <p className="text-sm font-medium mb-6">The SDK handles the complexity of x402 discovery and A2A handshake automatically.</p>

                                <div className="code-block h-[400px] mb-6 overflow-y-auto">
                                    <pre className="text-xs">
                                        {`import { P402Client } from '@p402/sdk';

const client = new P402Client();

// 1. Discover Agent Capabilities
const agent = await client.discover('did:p402:agent-1');

// 2. Setup AP2 Intent Mandate
const mandate = await client.ap2.create({
  limit: 10.00,
  asset: "USDC",
  expiresIn: "1h"
});

// 3. Execute A2A Task
const task = await client.send({
  to: agent.id,
  task: "Research market trends",
  mandateId: mandate.id,
  config: { mode: 'balanced' }
});`}
                                    </pre>
                                </div>
                                <div className="bg-primary border-2 border-black p-4 flex justify-between items-center">
                                    <span className="font-black uppercase text-xs">READY TO SHIP</span>
                                    <Link href="/docs/sdk" className="text-black font-black uppercase text-xs border-b-2 border-black">View SDK Ref</Link>
                                </div>
                            </div>

                            {/* Inspector Side */}
                            <div className="bg-white border-2 border-black p-8">
                                <h3 className="section-header">2. The 402 Exchange</h3>
                                <p className="text-sm font-medium mb-6">Real-time headers, signatures, and settlement proofs for every token consumed.</p>

                                <div className="space-y-4">
                                    <div className="border-2 border-black p-4 bg-neutral-900 text-neutral-100 font-mono text-[10px] leading-tight">
                                        <div className="text-primary mb-2">// REQUEST HEADERS</div>
                                        <div>POST /api/a2a HTTP/1.1</div>
                                        <div>Host: api.p402.io</div>
                                        <div>X-A2A-Version: 2026.01</div>
                                        <div className="text-info">Authorization: Payment x402_proof_8a2d1...</div>
                                    </div>

                                    <div className="border-2 border-black p-4 bg-neutral-100 font-mono text-[10px] leading-tight">
                                        <div className="text-error mb-2">// 402 PAYMENT REQUIRED</div>
                                        <div>HTTP/1.1 402 Payment Required</div>
                                        <div>X-Payment-Cost-USD: 0.0042</div>
                                        <div>X-Payment-Wait-Ms: 120</div>
                                    </div>

                                    <div className="border-2 border-black p-4 bg-success/10 font-mono text-[10px] leading-tight border-success">
                                        <div className="text-success mb-2">// SETTLED SUCCESS</div>
                                        <div>TX: 0x82f...a12c</div>
                                        <div>STATUS: CONFIRMED (BASE L2)</div>
                                        <div>AMOUNT: 0.0042 USDC</div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </section>

                {/* CTA */}
                <section className="py-32 bg-primary text-center border-b-4 border-black">
                    <div className="container mx-auto px-6">
                        <h2 className="text-6xl md:text-8xl font-black uppercase tracking-tighter mb-8 leading-none">
                            Ready to define<br />the future?
                        </h2>
                        <p className="text-2xl font-black uppercase mb-12 max-w-2xl mx-auto">
                            Join the builders creating the economic layer for autonomous intelligence.
                        </p>
                        <div className="flex justify-center gap-6">
                            <Link href="/docs" className="btn btn-secondary text-2xl px-12 py-6">
                                Get Started
                            </Link>
                        </div>
                    </div>
                </section>
            </main>

            <Footer />
        </div>
    )
}
