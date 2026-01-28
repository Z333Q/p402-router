import Link from 'next/link';
import { PaperLayout } from '../_components/PaperLayout';

export default function SentinelLayerIndex() {
    return (
        <PaperLayout
            title="Pillar: The Sentinel Layer"
            subtitle="RISK • SAFETY • CIRCUIT BREAKERS"
            meta={{
                author: "P402 Intelligence",
                date: "Q1 2026",
                type: "Pillar Overvew"
            }}
        >
            <h2>Overview</h2>
            <p>
                The Sentinel Layer is the immune system of the Agentic Economy.
                It monitors swarm velocity and suppresses feedback loops before they reach critical mass.
            </p>

            <h3 className="mt-12 mb-6 uppercase text-xl font-bold border-b-2 border-black pb-2">Primary Research</h3>
            <div className="space-y-4">
                <Link href="/intelligence/research/flash-crash-protection" className="block p-6 border-2 border-black hover:bg-[#B6FF2E] transition-colors group">
                    <h4 className="font-bold uppercase group-hover:text-black">Flash Crash Protection</h4>
                    <p className="text-sm text-neutral-600">Circuit breakers for autonomous agent swarms.</p>
                </Link>
            </div>

            <h3 className="mt-12 mb-6 uppercase text-xl font-bold border-b-2 border-black pb-2">Case Studies</h3>
            <div className="space-y-4">
                <Link href="/intelligence/research/black-friday-swarm" className="block p-6 border-2 border-black hover:bg-[#B6FF2E] transition-colors group">
                    <h4 className="font-bold uppercase group-hover:text-black">The Black Friday Swarm</h4>
                    <p className="text-sm text-neutral-600">Mitigating recursive bidding wars in retail.</p>
                </Link>
            </div>
        </PaperLayout>
    );
}
