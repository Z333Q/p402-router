import { TopNav } from "@/components/TopNav";
import { Footer } from "@/components/Footer";

export default function SkillDocs() {
    return (
        <div className="min-h-screen bg-white text-black font-sans selection:bg-primary selection:text-black">
            <TopNav />
            <main className="max-w-4xl mx-auto py-24 px-6">

                {/* Header */}
                <div className="mb-12 border-b-4 border-black pb-8">
                    <h1 className="text-6xl font-black uppercase italic tracking-tighter mb-4">Claude Skill</h1>
                    <p className="text-xl font-bold text-neutral-600 uppercase tracking-tight">
                        AI-assisted integration for Claude Code and Claude.ai.
                    </p>
                </div>

                {/* What It Does */}
                <section className="mb-16">
                    <h2 className="text-3xl font-black uppercase italic mb-6">What This Gives You</h2>
                    <p className="text-lg font-bold text-neutral-600 leading-relaxed mb-8 uppercase tracking-tight">
                        Install the P402 skill and Claude gains deep knowledge of the routing engine, billing guard,
                        payment flows, and A2A protocol. Ask it to generate integration code, debug routing decisions,
                        compare model pricing, or set up agent spending controls. It knows the API surface, the TypeScript
                        types, the error codes, and the design patterns.
                    </p>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {[
                            'OpenAI-compatible drop-in migration',
                            'Session-budgeted agent architecture',
                            'x402 payment settlement integration',
                            'A2A agent-to-agent communication',
                            'Cost intelligence dashboards',
                            'Semantic cache configuration',
                            'Billing Guard constraint design',
                            'Multi-provider failover patterns',
                        ].map((item) => (
                            <div key={item} className="p-4 border-2 border-black bg-neutral-50 font-bold text-sm uppercase tracking-tight">
                                {item}
                            </div>
                        ))}
                    </div>
                </section>

                {/* Installation Methods */}
                <section className="mb-16">
                    <h2 className="text-3xl font-black uppercase italic mb-8">Install</h2>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">

                        {/* Method 1: Claude Code Project */}
                        <div className="p-8 border-4 border-black bg-white shadow-[8px_8px_0px_0px_rgba(0,0,0,1)]">
                            <div className="text-xs font-black uppercase tracking-[0.3em] text-neutral-400 mb-4">Recommended</div>
                            <h3 className="text-xl font-black uppercase italic mb-4">Clone the Repo</h3>
                            <p className="text-sm font-bold text-neutral-600 mb-6 uppercase tracking-tight">
                                The skill ships with every clone. Open in Claude Code and it loads automatically.
                            </p>
                            <div className="bg-[#141414] p-4 border-2 border-black font-mono text-xs text-[#B6FF2E] overflow-x-auto">
                                <pre>{`git clone https://github.com/Z333Q/p402-router
cd p402-router
# Skill is in .claude/skills/p402/
# Open in Claude Code. Done.`}</pre>
                            </div>
                        </div>

                        {/* Method 2: Global Claude Code */}
                        <div className="p-8 border-4 border-black bg-white shadow-[8px_8px_0px_0px_rgba(0,0,0,1)]">
                            <div className="text-xs font-black uppercase tracking-[0.3em] text-neutral-400 mb-4">Any Project</div>
                            <h3 className="text-xl font-black uppercase italic mb-4">Global Install</h3>
                            <p className="text-sm font-bold text-neutral-600 mb-6 uppercase tracking-tight">
                                Install globally so the skill is available in every Claude Code session.
                            </p>
                            <div className="bg-[#141414] p-4 border-2 border-black font-mono text-xs text-[#B6FF2E] overflow-x-auto">
                                <pre>{`# Download and install globally
curl -sL https://p402.io/skill/p402.zip \\
  -o /tmp/p402.zip
unzip /tmp/p402.zip \\
  -d ~/.claude/skills/`}</pre>
                            </div>
                        </div>

                        {/* Method 3: Claude.ai Upload */}
                        <div className="p-8 border-4 border-black bg-white shadow-[8px_8px_0px_0px_rgba(0,0,0,1)]">
                            <div className="text-xs font-black uppercase tracking-[0.3em] text-neutral-400 mb-4">Web / Mobile</div>
                            <h3 className="text-xl font-black uppercase italic mb-4">Claude.ai</h3>
                            <p className="text-sm font-bold text-neutral-600 mb-6 uppercase tracking-tight">
                                Download the .skill file and upload it through the Claude.ai interface.
                            </p>
                            <div className="space-y-3 text-sm font-bold uppercase tracking-tight">
                                <div className="flex items-start gap-3">
                                    <span className="text-[#B6FF2E] bg-black px-2 py-0.5 font-mono text-xs">1</span>
                                    <span>Download p402.skill below</span>
                                </div>
                                <div className="flex items-start gap-3">
                                    <span className="text-[#B6FF2E] bg-black px-2 py-0.5 font-mono text-xs">2</span>
                                    <span>Settings &gt; Capabilities &gt; Skills</span>
                                </div>
                                <div className="flex items-start gap-3">
                                    <span className="text-[#B6FF2E] bg-black px-2 py-0.5 font-mono text-xs">3</span>
                                    <span>Upload the file</span>
                                </div>
                            </div>
                        </div>
                    </div>
                </section>

                {/* Download Buttons */}
                <section className="mb-16">
                    <div className="flex flex-wrap gap-4">
                        <a
                            href="/skill/p402.skill"
                            download
                            className="inline-block px-8 py-4 bg-[#B6FF2E] text-black border-4 border-black font-black uppercase text-sm tracking-widest hover:-translate-y-1 transition-transform shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]"
                        >
                            Download .skill
                        </a>
                        <a
                            href="/skill/p402.zip"
                            download
                            className="inline-block px-8 py-4 bg-white text-black border-4 border-black font-black uppercase text-sm tracking-widest hover:-translate-y-1 transition-transform shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]"
                        >
                            Download .zip
                        </a>
                        <a
                            href="/skill/SKILL.md"
                            target="_blank"
                            className="inline-block px-8 py-4 bg-neutral-100 text-black border-4 border-black font-black uppercase text-sm tracking-widest hover:-translate-y-1 transition-transform shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]"
                        >
                            View SKILL.md
                        </a>
                    </div>
                </section>

                {/* Also Works With */}
                <section className="mb-16">
                    <h2 className="text-3xl font-black uppercase italic mb-8">Cross-Platform</h2>
                    <p className="text-lg font-bold text-neutral-600 leading-relaxed mb-6 uppercase tracking-tight">
                        The Agent Skills standard is portable. The same skill works across multiple AI coding tools.
                    </p>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="p-6 border-2 border-black">
                            <h4 className="font-black uppercase italic mb-2">OpenAI Codex CLI</h4>
                            <div className="bg-[#141414] p-3 border-2 border-black font-mono text-xs text-[#B6FF2E]">
                                <code>cp -r p402 ~/.codex/skills/p402</code>
                            </div>
                        </div>
                        <div className="p-6 border-2 border-black">
                            <h4 className="font-black uppercase italic mb-2">Plugin Marketplace</h4>
                            <div className="bg-[#141414] p-3 border-2 border-black font-mono text-xs text-[#B6FF2E]">
                                <code>/plugin install p402@p402-router</code>
                            </div>
                        </div>
                    </div>
                </section>

                {/* Skill Contents */}
                <section className="mb-16">
                    <h2 className="text-3xl font-black uppercase italic mb-8">Contents</h2>
                    <div className="space-y-4">
                        {[
                            { file: 'SKILL.md', lines: '167', desc: 'Core skill: routing modes, billing guard, session lifecycle, integration patterns', href: '/skill/SKILL.md' },
                            { file: 'references/api-reference.md', lines: '533', desc: 'Every endpoint with TypeScript types, request/response examples, error codes', href: '/skill/references/api-reference.md' },
                            { file: 'references/routing-guide.md', lines: '247', desc: 'Scoring algorithm, provider landscape, tiers, failover, advanced configuration', href: '/skill/references/routing-guide.md' },
                            { file: 'references/payment-flows.md', lines: '416', desc: 'x402 3-step flow, EIP-3009, onchain verification, session funding, USDC addresses', href: '/skill/references/payment-flows.md' },
                            { file: 'references/a2a-protocol.md', lines: '607', desc: 'JSON-RPC methods, task lifecycle, AP2 mandates, x402 extension, Bazaar marketplace', href: '/skill/references/a2a-protocol.md' },
                        ].map((item) => (
                            <a
                                key={item.file}
                                href={item.href}
                                target="_blank"
                                className="block p-6 border-2 border-black hover:bg-neutral-50 transition-colors group"
                            >
                                <div className="flex items-baseline justify-between mb-2">
                                    <span className="font-mono font-bold text-sm">{item.file}</span>
                                    <span className="text-xs font-bold text-neutral-400 uppercase">{item.lines} lines</span>
                                </div>
                                <p className="text-sm font-bold text-neutral-600 uppercase tracking-tight group-hover:text-black transition-colors">
                                    {item.desc}
                                </p>
                            </a>
                        ))}
                    </div>
                </section>

            </main>
            <Footer />
        </div>
    );
}
