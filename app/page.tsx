
import { TopNav } from "@/components/TopNav"
import { Footer } from "@/components/Footer"
import { HeroAuditor } from "@/components/landing/HeroAuditor"
import { BazaarLoop } from "@/components/landing/BazaarLoop"
import { Testimonials } from "@/components/landing/Testimonials"
import { RequestInspector } from "@/components/landing/RequestInspector"
import Link from 'next/link'

export const dynamic = 'force-dynamic';

export default async function Page() {
    return (
        <div className="min-h-screen bg-white text-black font-sans selection:bg-primary selection:text-black">
            <TopNav />
            <main>
                <HeroAuditor />

                {/* Protocol Deep Dive / Features */}
                <section id="product" className="py-24 bg-white border-t-2 border-black">
                    <div className="container mx-auto px-6 max-w-7xl">
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-12">
                            <div className="card p-10 border-2 border-black bg-white">
                                <h3 className="text-2xl font-black uppercase mb-4 tracking-tighter italic">A2A Standard</h3>
                                <p className="text-sm font-bold leading-relaxed text-neutral-600">
                                    Full implementation of Agent-to-Agent communication protocols. Standardized JSON-RPC context discovery and task negotiation.
                                </p>
                            </div>
                            <div className="card p-10 border-2 border-black bg-white">
                                <h3 className="text-2xl font-black uppercase mb-4 tracking-tighter italic">AP2 Mandates</h3>
                                <p className="text-sm font-bold leading-relaxed text-neutral-600">
                                    Enforce spend policies with EIP-712 cryptographic mandates. No private key sharing—just verifiable budget allowances.
                                </p>
                            </div>
                            <div className="card p-10 border-2 border-black bg-white">
                                <h3 className="text-2xl font-black uppercase mb-4 tracking-tighter italic">Decision Trace</h3>
                                <p className="text-sm font-bold leading-relaxed text-neutral-600">
                                    Audit every token spent. Real-time observability into facilitator scoring, policy checks, and settlement proofs.
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
