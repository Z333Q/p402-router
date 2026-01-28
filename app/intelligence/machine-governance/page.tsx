import Link from 'next/link';
import { PaperLayout } from '../_components/PaperLayout';

export default function MachineGovernanceIndex() {
    return (
        <PaperLayout
            title="Pillar: Machine Governance"
            subtitle="POLICY • CRYPTOGRAPHY • ZERO TRUST"
            meta={{
                author: "P402 Intelligence",
                date: "Q1 2026",
                type: "Pillar Overvew"
            }}
        >
            <h2>Overview</h2>
            <p>
                Machine Governance addresses the Principal-Agent problem in AI.
                We build the cryptographic constraints that ensure autonomous agents act strictly within their mandates.
            </p>

            <h3 className="mt-12 mb-6 uppercase text-xl font-bold border-b-2 border-black pb-2">Primary Research</h3>
            <div className="space-y-4">
                <Link href="/intelligence/research/ap2-mandates" className="block p-6 border-2 border-black hover:bg-[#B6FF2E] transition-colors group">
                    <h4 className="font-bold uppercase group-hover:text-black">AP2 Mandates</h4>
                    <p className="text-sm text-neutral-600">Cryptographic enforceability in nondeterministic systems.</p>
                </Link>
                <Link href="/intelligence/research/verifiable-compute" className="block p-6 border-2 border-black hover:bg-[#B6FF2E] transition-colors group">
                    <h4 className="font-bold uppercase group-hover:text-black">Verifiable Compute</h4>
                    <p className="text-sm text-neutral-600">Proof of inference and model integrity.</p>
                </Link>
            </div>

            <h3 className="mt-12 mb-6 uppercase text-xl font-bold border-b-2 border-black pb-2">Case Studies</h3>
            <div className="space-y-4">
                <Link href="/intelligence/research/medical-data-heist" className="block p-6 border-2 border-black hover:bg-[#B6FF2E] transition-colors group">
                    <h4 className="font-bold uppercase group-hover:text-black">The Medical Data Heist</h4>
                    <p className="text-sm text-neutral-600">Stopping exfiltration at the router level.</p>
                </Link>
            </div>
        </PaperLayout>
    );
}
