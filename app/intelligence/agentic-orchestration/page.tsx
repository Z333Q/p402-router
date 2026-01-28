import Link from 'next/link';
import { PaperLayout } from '../_components/PaperLayout';

export default function AgenticOrchestrationIndex() {
    return (
        <PaperLayout
            title="Pillar: Agentic Orchestration"
            subtitle="SYSTEMS • ROUTING • SEMANTIC WEB"
            meta={{
                author: "P402 Intelligence",
                date: "Q1 2026",
                type: "Pillar Overvew"
            }}
        >
            <h2>Overview</h2>
            <p>
                Moving beyond "dumb pipes" to intelligent routing. Orchestration defines how agents discover,
                negotiate, and execute resource requests in a multi-model environment.
            </p>

            <h3 className="mt-12 mb-6 uppercase text-xl font-bold border-b-2 border-black pb-2">Research Paper</h3>
            <div className="space-y-4">
                <Link href="/intelligence/research/economics-of-latency" className="block p-6 border-2 border-black hover:bg-[#B6FF2E] transition-colors group">
                    <h4 className="font-bold uppercase group-hover:text-black">Semantic Arbitrage</h4>
                    <p className="text-sm text-neutral-600">How routers select optimal providers in real-time.</p>
                </Link>
            </div>
        </PaperLayout>
    );
}
