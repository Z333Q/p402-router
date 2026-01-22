import { TopNav } from "@/components/TopNav"
import { Footer } from "@/components/Footer"
import { HeroAuditor } from "@/components/landing/HeroAuditor"
import { BazaarLoop } from "@/components/landing/BazaarLoop"
import { Testimonials } from "@/components/landing/Testimonials"
import { RequestInspector } from "@/components/landing/RequestInspector"
import { LandingGuide } from "@/components/landing/LandingGuide"
import Link from 'next/link'

export const dynamic = 'force-dynamic';

export default async function Page() {
    return (
        <div className="min-h-screen bg-white text-black font-sans selection:bg-primary selection:text-black">
            <TopNav />
            <main>
                <HeroAuditor />

                <LandingGuide />

                {/* Protocol Deep Dive / Features */}
                <section id="product" className="py-24 bg-white border-t-2 border-black">
                    <div className="container mx-auto px-6 max-w-7xl">
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-12">
                            <div className="card p-10 border-2 border-black bg-white shadow-[8px_8px_0px_#000]">
                                <div className="text-[10px] font-black text-primary mb-2 uppercase">v3.0 Execution</div>
                                <h3 className="text-2xl font-black uppercase mb-4 tracking-tighter italic">Protocol Economist</h3>
                                <p className="text-sm font-bold leading-relaxed text-neutral-600">
                                    Autonomous optimization powered by Gemini 3. Forensic analysis of ledgers to execute
                                    model substitutions and cost-saving failovers with zero human oversight.
                                </p>
                            </div>
                            <div className="card p-10 border-2 border-black bg-white shadow-[8px_8px_0px_#000]">
                                <div className="text-[10px] font-black text-[#B6FF2E] mb-2 uppercase">v3.0 Memory</div>
                                <h3 className="text-2xl font-black uppercase mb-4 tracking-tighter italic">Semantic Shield</h3>
                                <p className="text-sm font-bold leading-relaxed text-neutral-600">
                                    Vector-based interception using text-embedding-004. Shield your budget by serving cached
                                    responses to similar intents before they ever leave your infrastructure.
                                </p>
                            </div>
                            <div className="card p-10 border-2 border-black bg-white shadow-[8px_8px_0px_#000]">
                                <div className="text-[10px] font-black text-[#A855F7] mb-2 uppercase">v3.0 Observability</div>
                                <h3 className="text-2xl font-black uppercase mb-4 tracking-tighter italic">Thinking Trace</h3>
                                <p className="text-sm font-bold leading-relaxed text-neutral-600">
                                    Full cryptographic auditability. Real-time observability into the AI's internal reasoning chain,
                                    policy checks, and x402 settlement proofs.
                                </p>
                            </div>
                        </div>
                    </div>
                </section>

                <RequestInspector />
                <BazaarLoop />
                <Testimonials />

                {/* CTA */}
                <section className="py-32 bg-primary text-center border-t-2 border-black">
                    <div className="container mx-auto px-6">
                        <h2 className="text-6xl md:text-8xl font-black uppercase tracking-tighter mb-8 leading-none italic">
                            Ready to define<br />the future?
                        </h2>
                        <div className="flex justify-center gap-6">
                            <Link href="/docs" className="btn btn-dark text-2xl px-12 py-6 h-auto">
                                Start Building
                            </Link>
                        </div>
                    </div>
                </section>
            </main>
            <Footer />
        </div>
    )
}
