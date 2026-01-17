import Link from 'next/link';

export default function DocsIndex() {
    return (
        <div className="max-w-4xl mx-auto py-12 px-6">
            <div className="mb-16">
                <h1 className="text-4xl font-bold mb-4 font-sans text-white">P402 Documentation</h1>
                <p className="text-xl text-zinc-400">
                    The comprehensive guide to the Payment-Aware AI Orchestration Layer.
                    Build autonomous agents, monetize APIs, and optimize LLM routing.
                </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

                {/* A2A Protocol */}
                <Link href="/docs/a2a" className="group block p-8 rounded-2xl bg-zinc-900 border border-zinc-800 hover:border-lime-400 transition-colors">
                    <div className="flex items-center gap-3 mb-4">
                        <span className="text-2xl">🤖</span>
                        <h2 className="text-xl font-bold text-white group-hover:text-lime-400">A2A Protocol</h2>
                    </div>
                    <p className="text-zinc-400 mb-6 min-h-[48px]">
                        Implement Google's Agent-to-Agent protocol for discovery, messaging, and task management.
                    </p>
                    <span className="text-lime-400 font-medium text-sm">Read Guide &rarr;</span>
                </Link>

                {/* AP2 Mandates */}
                <Link href="/docs/mandates" className="group block p-8 rounded-2xl bg-zinc-900 border border-zinc-800 hover:border-lime-400 transition-colors">
                    <div className="flex items-center gap-3 mb-4">
                        <span className="text-2xl">💳</span>
                        <h2 className="text-xl font-bold text-white group-hover:text-lime-400">AP2 Payment Mandates</h2>
                    </div>
                    <p className="text-zinc-400 mb-6 min-h-[48px]">
                        Secure agent spending with policy-driven, cryptographic mandates on the x402 standard.
                    </p>
                    <span className="text-lime-400 font-medium text-sm">Learn Standards &rarr;</span>
                </Link>

                {/* AI Router */}
                <Link href="/docs/router" className="group block p-8 rounded-2xl bg-zinc-900 border border-zinc-800 hover:border-lime-400 transition-colors">
                    <div className="flex items-center gap-3 mb-4">
                        <span className="text-2xl">🧠</span>
                        <h2 className="text-xl font-bold text-white group-hover:text-lime-400">AI Router</h2>
                    </div>
                    <p className="text-zinc-400 mb-6 min-h-[48px]">
                        Route LLM requests by cost, speed, or quality. Semantic caching and auto-failover built-in.
                    </p>
                    <span className="text-lime-400 font-medium text-sm">Explore Logic &rarr;</span>
                </Link>

                {/* SDK & Tools */}
                <Link href="/docs/sdk" className="group block p-8 rounded-2xl bg-zinc-900 border border-zinc-800 hover:border-lime-400 transition-colors">
                    <div className="flex items-center gap-3 mb-4">
                        <span className="text-2xl">📦</span>
                        <h2 className="text-xl font-bold text-white group-hover:text-lime-400">SDKs & Tools</h2>
                    </div>
                    <p className="text-zinc-400 mb-6 min-h-[48px]">
                        JavaScript/TypeScript SDKs, MCP Server integration, and CLI tools for developers.
                    </p>
                    <span className="text-lime-400 font-medium text-sm">Get Started &rarr;</span>
                </Link>

            </div>

            <div className="mt-16 p-8 rounded-2xl bg-zinc-900/50 border border-zinc-800">
                <h3 className="text-lg font-bold text-white mb-4">Quick Links</h3>
                <ul className="space-y-3 text-zinc-400">
                    <li><Link href="/docs/bazaar" className="hover:text-lime-400">🛒 Bazaar Marketplace</Link></li>
                    <li><Link href="/docs/api" className="hover:text-lime-400">🔌 API Reference</Link></li>
                    <li><Link href="https://github.com/google/a2a-protocol" className="hover:text-lime-400">📜 A2A Spec (External)</Link></li>
                </ul>
            </div>
        </div>
    );
}
