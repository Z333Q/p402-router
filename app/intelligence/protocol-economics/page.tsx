import Link from 'next/link';
import { PaperLayout } from '../_components/PaperLayout';

export default function ProtocolEconomicsIndex() {
    return (
        <PaperLayout
            title="Pillar: Protocol Economics"
            subtitle="MARKET DESIGN • ATOMIC SETTLEMENT • GAME THEORY"
            meta={{
                author: "P402 Intelligence",
                date: "Q1 2026",
                type: "Pillar Overvew"
            }}
        >
            <h2>Overview</h2>
            <p>
                Protocol Economics at P402 focuses on the mathematical foundations of machine-to-machine commerce.
                We design the mechanisms that allow for trustless, atomic resource negotiation at scale.
            </p>

            <h3 className="mt-12 mb-6 uppercase text-xl font-bold border-b-2 border-black pb-2">Primary Research</h3>
            <div className="space-y-4">
                <Link href="/intelligence/research/x402-standard" className="block p-6 border-2 border-black hover:bg-[#B6FF2E] transition-colors group">
                    <h4 className="font-bold uppercase group-hover:text-black">The x402 Standard</h4>
                    <p className="text-sm text-neutral-600">A novel protocol for HTTP-native settlement.</p>
                </Link>
                <Link href="/intelligence/research/economics-of-latency" className="block p-6 border-2 border-black hover:bg-[#B6FF2E] transition-colors group">
                    <h4 className="font-bold uppercase group-hover:text-black">Economics of Latency</h4>
                    <p className="text-sm text-neutral-600">Dynamic pricing for real-time semantic routing.</p>
                </Link>
            </div>

            <h3 className="mt-12 mb-6 uppercase text-xl font-bold border-b-2 border-black pb-2">Case Studies</h3>
            <div className="space-y-4">
                <Link href="/intelligence/research/supply-chain-miracle" className="block p-6 border-2 border-black hover:bg-[#B6FF2E] transition-colors group">
                    <h4 className="font-bold uppercase group-hover:text-black">Supply Chain Miracle</h4>
                    <p className="text-sm text-neutral-600">400ms global logistics settlement on Base.</p>
                </Link>
            </div>
        </PaperLayout>
    );
}
