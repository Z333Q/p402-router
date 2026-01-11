import Link from 'next/link'

export function AgenticPatterns() {
    return (
        <section className="py-24 bg-neutral-900 text-white">
            <div className="container mx-auto px-6 max-w-7xl">
                <div className="flex flex-col md:flex-row justify-between items-end mb-12 gap-6">
                    <div>
                        <div className="badge badge-primary mb-4">NEW PARADIGM</div>
                        <h2 className="text-3xl md:text-4xl font-black uppercase italic">Built for Autonomous AI</h2>
                        <p className="text-neutral-400 mt-4 max-w-xl font-medium">
                            Traditional APIs were built for people with credit cards and monthly subscriptions.
                            <strong>P402 is built for AI agents with their own wallets</strong>—allowing them to
                            pay for exactly what they use, when they use it.
                        </p>
                    </div>
                    <Link href="/docs/mcp" className="btn btn-primary">Read Case Studies</Link>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
                    <div className="border-l-4 border-primary pl-8 py-4">
                        <h3 className="text-xl font-extrabold mb-4 uppercase">Self-Healing Data Pipelines</h3>
                        <p className="text-neutral-400 leading-relaxed mb-6">
                            When free-tier APIs hit rate limits (429), agents automatically detect the P402 challenge and settle for premium access instantly. Uptime becomes an autonomous decision.
                        </p>
                        <div className="font-mono text-xs text-primary opacity-75">
                            // Failover: 429 → P402 → Premium Data
                        </div>
                    </div>

                    <div className="border-l-4 border-primary pl-8 py-4">
                        <h3 className="text-xl font-extrabold mb-4 uppercase">Autonomous Swap Research</h3>
                        <p className="text-neutral-400 leading-relaxed mb-6">
                            Agents "buy" high-fidelity news and on-chain intelligence on-demand to validate trades. High-value loops no longer require static human subscriptions.
                        </p>
                        <div className="font-mono text-xs text-primary opacity-75">
                            // Research: Signal → Buy Intelligence → Execution
                        </div>
                    </div>
                </div>
            </div>
        </section>
    )
}
