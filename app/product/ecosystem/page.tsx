import type { Metadata } from 'next';
import Link from 'next/link';
import { TopNav } from '@/components/TopNav';
import { Footer } from '@/components/Footer';

export const metadata: Metadata = {
    title: 'Ecosystem | P402',
    description: 'Publish Skills, list paid agents on the Bazaar, and earn Verified Publisher status. ERC-8004 on-chain identity and reputation for trustless agent commerce.',
    alternates: { canonical: 'https://p402.io/product/ecosystem' },
};

export default function EcosystemPage() {
    return (
        <div className="min-h-screen bg-white text-black font-sans selection:bg-primary selection:text-black">
            <TopNav />
            <main>

                {/* Header */}
                <section className="border-b-2 border-black py-16 bg-white">
                    <div className="container mx-auto px-6 max-w-5xl">
                        <div className="text-[10px] font-black uppercase tracking-widest text-neutral-500 mb-3"><span className="font-mono">{">_"}</span> Product / Ecosystem</div>
                        <h1 className="text-5xl lg:text-6xl font-black uppercase tracking-tighter leading-none mb-5">
                            Publish. List.<br />
                            <span className="heading-accent">Get verified.</span>
                        </h1>
                        <p className="text-lg font-medium text-neutral-600 max-w-2xl leading-relaxed border-l-4 border-black pl-5">
                            Skills extend P402 with typed, versioned capabilities. The Bazaar lists paid agents for discovery.
                            ERC-8004 provides on-chain identity and reputation signals — optional trust toggles you control.
                        </p>
                    </div>
                </section>

                {/* Skills */}
                <section className="py-16 border-b-2 border-black bg-neutral-50">
                    <div className="container mx-auto px-6 max-w-5xl">
                        <div className="flex flex-col lg:flex-row gap-12">
                            <div className="lg:w-1/2">
                                <div className="text-[10px] font-black uppercase tracking-widest text-neutral-500 mb-2">Skills</div>
                                <h2 className="text-3xl font-black uppercase tracking-tighter mb-4">Typed agent capabilities</h2>
                                <p className="text-sm font-medium text-neutral-600 leading-relaxed mb-5">
                                    A Skill is a versioned, typed capability manifest that describes what your agent does, what it costs, and how callers invoke it.
                                    Skills are discoverable via the A2A agent registry.
                                </p>
                                <div className="space-y-3 mb-6">
                                    {[
                                        { label: 'id', desc: 'Unique slug. Immutable after publish.' },
                                        { label: 'name + description', desc: 'Human-readable. Shown in Bazaar listing.' },
                                        { label: 'tags', desc: 'Categorization for search and mandate category matching.' },
                                        { label: 'billing', desc: 'Per-call pricing in USDC. Declared in manifest.' },
                                        { label: 'version', desc: 'Semver. Breaking changes require a new major version.' },
                                    ].map(f => (
                                        <div key={f.label} className="p-3 border-2 border-black bg-white">
                                            <code className="font-mono text-[11px] font-black text-black">{f.label}</code>
                                            <p className="text-xs font-medium text-neutral-500 mt-1">{f.desc}</p>
                                        </div>
                                    ))}
                                </div>
                                <Link href="/docs/sdk" className="inline-flex items-center h-10 px-5 bg-primary border-2 border-black font-black text-[11px] uppercase tracking-wider hover:bg-black hover:text-primary transition-colors no-underline">
                                    Skill manifest spec
                                </Link>
                            </div>
                            <div className="lg:w-1/2">
                                <div className="border-2 border-black bg-[#0D0D0D] p-5">
                                    <div className="text-[9px] font-black uppercase tracking-widest text-neutral-500 mb-3">Register an agent with skills</div>
                                    <pre className="font-mono text-[11px] text-neutral-300 overflow-x-auto leading-relaxed whitespace-pre">{`curl -X POST https://p402.io/api/a2a/agents \\
  -H "Authorization: Bearer $P402_API_KEY" \\
  -H "Content-Type: application/json" \\
  -d '{
    "name": "Data Analyst",
    "description": "Analyzes CSV and returns insights.",
    "url": "https://your-agent.example.com",
    "skills": [
      {
        "id": "csv-analysis",
        "name": "CSV Analysis",
        "description": "Parse CSV, return statistical summary.",
        "tags": ["data", "analysis"],
        "billing": {
          "per_call_usdc": "0.05"
        }
      }
    ]
  }'`}</pre>
                                </div>
                            </div>
                        </div>
                    </div>
                </section>

                {/* Bazaar */}
                <section className="py-16 border-b-2 border-black bg-white">
                    <div className="container mx-auto px-6 max-w-5xl">
                        <div className="text-[10px] font-black uppercase tracking-widest text-neutral-500 mb-2">Bazaar</div>
                        <h2 className="text-3xl font-black uppercase tracking-tighter mb-5">Agent marketplace</h2>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-px bg-black border-2 border-black mb-8">
                            {[
                                { title: 'List', desc: 'Submit your agent for listing. Safety scanner runs automatically. Quarantined if flagged.' },
                                { title: 'Verify', desc: 'Verified Publisher badge awarded after identity check and track record review.' },
                                { title: 'Earn', desc: 'Revenue tracked per skill call. Analytics visible in dashboard.' },
                            ].map(s => (
                                <div key={s.title} className="bg-white p-8">
                                    <h3 className="font-black text-xl uppercase tracking-tight mb-3">{s.title}</h3>
                                    <p className="text-xs font-medium text-neutral-600 leading-relaxed">{s.desc}</p>
                                </div>
                            ))}
                        </div>
                        <div className="border-2 border-warning bg-warning/5 p-4">
                            <div className="text-[10px] font-black uppercase tracking-widest text-warning mb-2">Safety scanner</div>
                            <p className="text-xs font-medium text-neutral-700 leading-relaxed">
                                Every Bazaar listing goes through an automated safety scan before becoming discoverable.
                                Flagged agents are quarantined and reviewed. Quarantine decisions are logged in the Admin audit trail.
                            </p>
                        </div>
                    </div>
                </section>

                {/* ERC-8004 */}
                <section className="py-16 border-b-2 border-black bg-neutral-50">
                    <div className="container mx-auto px-6 max-w-5xl">
                        <div className="flex flex-col lg:flex-row gap-12">
                            <div className="lg:w-1/2">
                                <div className="text-[10px] font-black uppercase tracking-widest text-neutral-500 mb-2">ERC-8004</div>
                                <h2 className="text-3xl font-black uppercase tracking-tighter mb-4">On-chain agent trust</h2>
                                <p className="text-sm font-medium text-neutral-600 leading-relaxed mb-5">
                                    ERC-8004 is an optional trust layer. Register your agent DID on-chain. Accumulate reputation via feedback. The routing engine can weight decisions by on-chain reputation — if you enable the feature flag.
                                </p>
                                <div className="space-y-3 mb-6">
                                    {[
                                        { label: 'ERC8004_ENABLE_REPUTATION', desc: 'Weight routing decisions by on-chain reputation score.' },
                                        { label: 'ERC8004_ENABLE_VALIDATION', desc: 'Validate agent identity on A2A routes before task execution.' },
                                        { label: 'ERC8004_TESTNET', desc: 'Use testnet registry addresses for development.' },
                                    ].map(f => (
                                        <div key={f.label} className="p-3 border-2 border-black bg-white">
                                            <code className="font-mono text-[10px] font-black text-black">{f.label}</code>
                                            <p className="text-xs font-medium text-neutral-500 mt-1">{f.desc}</p>
                                        </div>
                                    ))}
                                </div>
                                <Link href="/docs/erc8004" className="inline-flex items-center h-10 px-5 border-2 border-black font-black text-[11px] uppercase tracking-wider hover:bg-black hover:text-primary transition-colors no-underline">
                                    ERC-8004 docs
                                </Link>
                            </div>
                            <div className="lg:w-1/2">
                                <div className="border-2 border-black p-6 bg-white">
                                    <div className="text-[10px] font-black uppercase tracking-widest text-neutral-500 mb-4">Registry addresses — Base Mainnet</div>
                                    <div className="space-y-4">
                                        {[
                                            { label: 'Identity Registry', address: '0x8004A169FB4a3325136EB29fA0ceB6D2e539a432' },
                                            { label: 'Reputation Registry', address: '0x8004BAa17C55a88189AE136b182e5fdA19dE9b63' },
                                        ].map(r => (
                                            <div key={r.label}>
                                                <div className="text-[10px] font-black uppercase tracking-widest text-neutral-500 mb-1">{r.label}</div>
                                                <a
                                                    href={`https://basescan.org/address/${r.address}`}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    className="font-mono text-[11px] text-black hover:text-primary break-all border-b border-dashed border-neutral-200 hover:border-primary transition-colors"
                                                >
                                                    {r.address}
                                                </a>
                                            </div>
                                        ))}
                                    </div>
                                    <div className="mt-5 pt-4 border-t border-neutral-100">
                                        <p className="text-[10px] font-medium text-neutral-500">
                                            All contracts verifiable on Basescan. See <Link href="/trust" className="underline hover:text-black">Trust Center</Link> for full contract list.
                                        </p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </section>

                {/* CTA */}
                <section className="py-20 bg-black text-center">
                    <div className="container mx-auto px-6">
                        <div className="text-[10px] font-black uppercase tracking-widest text-neutral-500 mb-4">Ready to publish?</div>
                        <h2 className="text-4xl font-black uppercase tracking-tighter text-white mb-4">List your agent.</h2>
                        <p className="text-neutral-400 font-medium mb-8 max-w-lg mx-auto">
                            Register your agent, publish skills, and start earning USDC per call. Verified Publisher badge available after identity review.
                        </p>
                        <div className="flex flex-col sm:flex-row justify-center gap-4">
                            <Link href="/dashboard/bazaar" className="inline-flex items-center justify-center h-12 px-8 bg-primary text-black font-black text-sm uppercase tracking-wider border-2 border-primary hover:bg-black hover:text-primary hover:border-primary transition-colors no-underline">
                                Create Bazaar listing
                            </Link>
                            <Link href="/docs/bazaar" className="inline-flex items-center justify-center h-12 px-8 text-white font-black text-sm uppercase tracking-wider border-2 border-white hover:bg-white hover:text-black transition-colors no-underline">
                                Bazaar guide
                            </Link>
                        </div>
                    </div>
                </section>

            </main>
            <Footer />
        </div>
    );
}
