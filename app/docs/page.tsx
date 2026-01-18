import Link from 'next/link';
import { TopNav } from "@/components/TopNav";
import { Footer } from "@/components/Footer";

export default function DocsIndex() {
    return (
        <div className="min-h-screen bg-white text-black font-sans selection:bg-primary selection:text-black">
            <TopNav />

            <main className="max-w-4xl mx-auto py-24 px-6">
                <div className="mb-16 border-b-4 border-black pb-12">
                    <h1 className="text-6xl font-black mb-4 tracking-tighter uppercase italic">Documentation</h1>
                    <p className="text-xl font-bold text-neutral-600 uppercase tracking-tight">
                        The Operating System for the Agentic Economy.
                    </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    {/* A2A Protocol */}
                    <Link href="/docs/a2a" className="group block p-10 border-4 border-black bg-white hover:bg-primary transition-all hover:-translate-y-1 hover:shadow-[12px_12px_0px_0px_rgba(0,0,0,1)]">
                        <div className="flex items-center gap-4 mb-6">
                            <span className="text-4xl">🤖</span>
                            <h2 className="text-2xl font-black uppercase italic group-hover:text-black">A2A Protocol</h2>
                        </div>
                        <p className="text-sm font-bold text-neutral-600 mb-8 min-h-[48px] uppercase tracking-tight">
                            Implement the Agent-to-Agent protocol for discovery, messaging, and task management. Now with **x402 Extension** support.
                        </p>
                        <span className="font-black text-xs uppercase tracking-widest border-b-2 border-black inline-block">Read Guide &rarr;</span>
                    </Link>

                    {/* AP2 Mandates */}
                    <Link href="/docs/mandates" className="group block p-10 border-4 border-black bg-white hover:bg-primary transition-all hover:-translate-y-1 hover:shadow-[12px_12px_0px_0px_rgba(0,0,0,1)]">
                        <div className="flex items-center gap-4 mb-6">
                            <span className="text-4xl">💳</span>
                            <h2 className="text-2xl font-black uppercase italic group-hover:text-black">AP2 Mandates</h2>
                        </div>
                        <p className="text-sm font-bold text-neutral-600 mb-8 min-h-[48px] uppercase tracking-tight">
                            Secure agent spending with policy-driven, cryptographic mandates on the x402 standard.
                        </p>
                        <span className="font-black text-xs uppercase tracking-widest border-b-2 border-black inline-block">Learn Standards &rarr;</span>
                    </Link>

                    {/* AI Router */}
                    <Link href="/docs/router" className="group block p-10 border-4 border-black bg-white hover:bg-primary transition-all hover:-translate-y-1 hover:shadow-[12px_12px_0px_0px_rgba(0,0,0,1)]">
                        <div className="flex items-center gap-4 mb-6">
                            <span className="text-4xl">🧠</span>
                            <h2 className="text-2xl font-black uppercase italic group-hover:text-black">AI Router</h2>
                        </div>
                        <p className="text-sm font-bold text-neutral-600 mb-8 min-h-[48px] uppercase tracking-tight">
                            Route LLM requests by cost, speed, or quality. Semantic caching and auto-failover built-in.
                        </p>
                        <span className="font-black text-xs uppercase tracking-widest border-b-2 border-black inline-block">Explore Logic &rarr;</span>
                    </Link>

                    {/* SDK & Tools */}
                    <Link href="/docs/sdk" className="group block p-10 border-4 border-black bg-white hover:bg-primary transition-all hover:-translate-y-1 hover:shadow-[12px_12px_0px_0px_rgba(0,0,0,1)]">
                        <div className="flex items-center gap-4 mb-6">
                            <span className="text-4xl">📦</span>
                            <h2 className="text-2xl font-black uppercase italic group-hover:text-black">SDKs & Tools</h2>
                        </div>
                        <p className="text-sm font-bold text-neutral-600 mb-8 min-h-[48px] uppercase tracking-tight">
                            JavaScript SDKs, MCP Server integration, and CLI tools for autonomous developers.
                        </p>
                        <span className="font-black text-xs uppercase tracking-widest border-b-2 border-black inline-block">Get Started &rarr;</span>
                    </Link>
                </div>

                <div className="mt-24 p-12 border-4 border-black bg-neutral-50 relative overflow-hidden">
                    <div className="relative z-10">
                        <h3 className="text-2xl font-black uppercase italic mb-8">Resource Hub</h3>
                        <ul className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <li><Link href="/docs/v2-spec" className="text-sm font-bold uppercase hover:text-primary flex items-center gap-2">📄 V2 Protocol Spec (Web)</Link></li>
                            <li><Link href="/whitepaper.pdf" target="_blank" className="text-sm font-bold uppercase hover:text-primary flex items-center gap-2">📥 Download Whitepaper (PDF)</Link></li>
                            <li><Link href="/docs/bazaar" className="text-sm font-bold uppercase hover:text-primary flex items-center gap-2">🛒 Bazaar Marketplace</Link></li>
                            <li><Link href="/docs/api" className="text-sm font-bold uppercase hover:text-primary flex items-center gap-2">🔌 API Reference</Link></li>
                            <li><Link href="https://github.com/google/a2a-protocol" className="text-sm font-bold uppercase hover:text-primary flex items-center gap-2">📜 A2A Spec (External)</Link></li>
                        </ul>
                    </div>
                    {/* Decorative Background Element */}
                    <div className="absolute top-0 right-0 p-4 opacity-5 font-black text-8xl italic pointer-events-none select-none">
                        DOCS
                    </div>
                </div>
            </main>

            <Footer />
        </div>
    );
}
