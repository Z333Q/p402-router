
import { TopNav } from "@/components/TopNav"
import { Footer } from "@/components/Footer"
import Link from 'next/link'

export const dynamic = 'force-dynamic';

export default async function Page() {
    return (
        <div className="min-h-screen bg-black text-white font-sans selection:bg-lime-900 selection:text-white">
            <TopNav />

            <main>
                {/* HERO SECTION */}
                <section className="relative pt-32 pb-24 overflow-hidden">
                    <div className="container mx-auto px-6 relative z-10">
                        <div className="max-w-4xl">
                            <h1 className="text-6xl md:text-7xl font-bold tracking-tight mb-8 leading-tight">
                                The Infrastructure for the <span className="text-lime-400">Agentic Web</span>.
                            </h1>
                            <p className="text-2xl text-zinc-400 mb-10 max-w-2xl leading-relaxed">
                                P402 is the orchestration layer that enables AI agents to route requests,
                                discover services, and settle payments autonomously.
                            </p>
                            <div className="flex flex-col sm:flex-row gap-4">
                                <Link href="/docs" className="inline-flex items-center justify-center px-8 py-4 text-lg font-medium text-black bg-lime-400 rounded-full hover:bg-lime-300 transition-colors">
                                    Start Building
                                </Link>
                                <Link href="/dashboard" className="inline-flex items-center justify-center px-8 py-4 text-lg font-medium text-white border border-zinc-700 rounded-full hover:bg-zinc-800 transition-colors">
                                    View Dashboard
                                </Link>
                            </div>
                        </div>
                    </div>
                </section>

                {/* FEATURE GRID */}
                <section className="py-24 border-t border-zinc-900">
                    <div className="container mx-auto px-6">
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-12">

                            {/* A2A Protocol */}
                            <div className="group">
                                <div className="h-12 w-12 bg-zinc-900 rounded-xl flex items-center justify-center mb-6 text-2xl">🤖</div>
                                <h3 className="text-2xl font-bold mb-4 group-hover:text-lime-400 transition-colors">Agent-to-Agent Protocol</h3>
                                <p className="text-zinc-400 leading-relaxed mb-6">
                                    Full implementation of Google's A2A standard. Enable your agents to discover capabilities, negotiate tasks, and generate streaming responses with standardized JSON-RPC contexts.
                                </p>
                                <Link href="/docs/a2a" className="text-lime-400 font-medium hover:underline">Read the Spec &rarr;</Link>
                            </div>

                            {/* AP2 Mandates */}
                            <div className="group">
                                <div className="h-12 w-12 bg-zinc-900 rounded-xl flex items-center justify-center mb-6 text-2xl">💳</div>
                                <h3 className="text-2xl font-bold mb-4 group-hover:text-lime-400 transition-colors">Payment Mandates</h3>
                                <p className="text-zinc-400 leading-relaxed mb-6">
                                    Secure, policy-driven authorization. Users sign cryptographic mandates (EIP-712) allowing agents to spend strict budgets. No shared private keys.
                                </p>
                                <Link href="/docs/mandates" className="text-lime-400 font-medium hover:underline">Learn about Security &rarr;</Link>
                            </div>

                            {/* AI Router */}
                            <div className="group">
                                <div className="h-12 w-12 bg-zinc-900 rounded-xl flex items-center justify-center mb-6 text-2xl">🧠</div>
                                <h3 className="text-2xl font-bold mb-4 group-hover:text-lime-400 transition-colors">Intelligent Routing</h3>
                                <p className="text-zinc-400 leading-relaxed mb-6">
                                    Optimize every token. Route requests to the best provider based on <span className="text-white">Cost</span>, <span className="text-white">Speed</span>, or <span className="text-white">Quality</span> modes. Includes semantic caching and auto-failover.
                                </p>
                                <Link href="/docs/router" className="text-lime-400 font-medium hover:underline">Explore the Engine &rarr;</Link>
                            </div>

                        </div>
                    </div>
                </section>

                {/* CODE DEMO */}
                <section className="py-24 bg-zinc-900/30">
                    <div className="container mx-auto px-6">
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
                            <div>
                                <h2 className="text-3xl md:text-5xl font-bold mb-6">Designed for Developers</h2>
                                <p className="text-xl text-zinc-400 mb-8">
                                    A typed, modern SDK that makes agent orchestration feel like magic.
                                    Integrate in minutes, scale to millions of requests.
                                </p>
                                <ul className="space-y-4 mb-8">
                                    <li className="flex items-center gap-3 text-zinc-300">
                                        <span className="text-lime-400">✓</span> First-class TypeScript support
                                    </li>
                                    <li className="flex items-center gap-3 text-zinc-300">
                                        <span className="text-lime-400">✓</span> Native MCP Server integration
                                    </li>
                                    <li className="flex items-center gap-3 text-zinc-300">
                                        <span className="text-lime-400">✓</span> Zero-config Observability
                                    </li>
                                </ul>
                                <Link href="/docs/sdk" className="text-white border-b border-lime-400 pb-1 hover:text-lime-400 transition-colors">View Full Documentation</Link>
                            </div>

                            <div className="bg-black rounded-2xl border border-zinc-800 p-6 shadow-2xl">
                                <div className="flex gap-2 mb-4">
                                    <div className="w-3 h-3 rounded-full bg-red-500" />
                                    <div className="w-3 h-3 rounded-full bg-yellow-500" />
                                    <div className="w-3 h-3 rounded-full bg-green-500" />
                                </div>
                                <pre className="font-mono text-sm overflow-x-auto text-zinc-300">
                                    {`import { P402Client } from '@p402/sdk';

const client = new P402Client();

// 1. Discovery
const agent = await client.discover('did:p402:agent-1');

// 2. Negotiate & Execute
const task = await client.send({
  to: agent.id,
  task: "Analyze Q3 Earnings",
  budget: { limit: 5.00, asset: "USDC" }
});

// 3. Stream Results
for await (const chunk of task.stream()) {
  console.log(chunk);
}`}
                                </pre>
                            </div>
                        </div>
                    </div>
                </section>

                {/* CTA */}
                <section className="py-32 text-center">
                    <div className="container mx-auto px-6">
                        <h2 className="text-5xl font-bold mb-8">Ready to define the future?</h2>
                        <p className="text-xl text-zinc-400 mb-10 max-w-2xl mx-auto">
                            Join the builders creating the economic layer for autonomous intelligence.
                        </p>
                        <Link href="/docs" className="inline-flex items-center justify-center px-10 py-5 text-xl font-bold text-black bg-lime-400 rounded-full hover:bg-lime-300 transition-colors">
                            Get Started Now
                        </Link>
                    </div>
                </section>
            </main>

            <Footer />
        </div>
    )
}
