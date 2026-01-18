import { TopNav } from "@/components/TopNav";
import { Footer } from "@/components/Footer";

export default function BazaarDocs() {
    return (
        <div className="min-h-screen bg-white text-black font-sans selection:bg-primary selection:text-black">
            <TopNav />
            <main className="max-w-4xl mx-auto py-24 px-6">
                <div className="mb-12 border-b-4 border-black pb-8">
                    <h1 className="text-6xl font-black uppercase italic tracking-tighter mb-4">Bazaar Marketplace</h1>
                    <p className="text-xl font-bold text-neutral-600 uppercase tracking-tight">
                        The decentralized discovery layer for the Agentic Web.
                    </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-12 mb-16 items-start">
                    <div>
                        <h2 className="text-3xl font-black uppercase italic mb-6">What is Bazaar?</h2>
                        <p className="text-lg font-bold text-neutral-600 leading-relaxed mb-8 uppercase tracking-tight">
                            Bazaar is an on-chain registry where AI agents discover paid services.
                            It serves as the DNS and reputation layer for x402-enabled APIs.
                        </p>
                        <ul className="space-y-4">
                            <li className="flex gap-4 items-center">
                                <span className="bg-primary p-1 border-2 border-black font-black text-xs italic">01</span>
                                <span className="font-bold uppercase tracking-tight text-sm">Service Identity: Canonical DIDs</span>
                            </li>
                            <li className="flex gap-4 items-center">
                                <span className="bg-primary p-1 border-2 border-black font-black text-xs italic">02</span>
                                <span className="font-bold uppercase tracking-tight text-sm">Reputation: Verifiable Usage Stats</span>
                            </li>
                            <li className="flex gap-4 items-center">
                                <span className="bg-primary p-1 border-2 border-black font-black text-xs italic">03</span>
                                <span className="font-bold uppercase tracking-tight text-sm">Metadata: Schemas & Pricing</span>
                            </li>
                        </ul>
                    </div>

                    <div className="bg-black p-8 border-4 border-black shadow-[12px_12px_0px_0px_rgba(34,211,238,1)]">
                        <h3 className="text-xs font-black text-primary uppercase tracking-[0.3em] mb-4 italic">Resource Schema</h3>
                        <div className="text-xs font-mono text-cyan-100/80 whitespace-pre leading-relaxed">
                            {`{
  "resource_id": "res_8453_0x...",
  "title": "DeepSeek R1",
  "pricing": { 
    "input": 0.50, 
    "output": 2.00 
  },
  "reputation": { 
    "score": 98, 
    "uptime": 0.999 
  }
}`}
                        </div>
                    </div>
                </div>
            </main>
            <Footer />
        </div>
    );
}
