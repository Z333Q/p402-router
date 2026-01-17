
import { TopNav } from "@/components/TopNav"
import { Footer } from "@/components/Footer"
import { Hero } from "@/components/landing/Hero"
import { AuditorSection } from "@/components/landing/AuditorSection"
import { BazaarLoop } from "@/components/landing/BazaarLoop"
import { Testimonials } from "@/components/landing/Testimonials"
import Link from 'next/link'

export const dynamic = 'force-dynamic';

export default async function Page() {
    return (
        <div className="min-h-screen bg-white text-black font-sans selection:bg-primary selection:text-black">
            <TopNav />
            <main>
                <Hero />
                <AuditorSection />

                {/* Protocol Deep Dive / Features */}
                <section className="py-24 bg-white">
                    <div className="container mx-auto px-6 max-w-7xl">
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-12">
                            <div className="card p-8 border-4 border-black bg-[#B6FF2E]/5">
                                <h3 className="text-2xl font-black uppercase mb-4 tracking-tighter">A2A Standard</h3>
                                <p className="text-sm font-medium leading-relaxed">
                                    Full implementation of Agent-to-Agent communication protocols. Standardized JSON-RPC context discovery and task negotiation.
                                </p>
                            </div>
                            <div className="card p-8 border-4 border-black bg-white">
                                <h3 className="text-2xl font-black uppercase mb-4 tracking-tighter">AP2 Mandates</h3>
                                <p className="text-sm font-medium leading-relaxed">
                                    Enforce spend policies with EIP-712 cryptographic mandates. No private key sharing—just verifiable budget allowances.
                                </p>
                            </div>
                            <div className="card p-8 border-4 border-black bg-white">
                                <h3 className="text-2xl font-black uppercase mb-4 tracking-tighter">Decision Trace</h3>
                                <p className="text-sm font-medium leading-relaxed">
                                    Audit every token spent. Real-time observability into facilitator scoring, policy checks, and settlement proofs.
                                </p>
                            </div>
                        </div>
                    </div>
                </section>

                <BazaarLoop />
                <Testimonials />

                {/* CTA */}
                <section className="py-32 bg-primary text-center border-t-8 border-black">
                    <div className="container mx-auto px-6">
                        <h2 className="text-6xl md:text-8xl font-black uppercase tracking-tighter mb-8 leading-none">
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
