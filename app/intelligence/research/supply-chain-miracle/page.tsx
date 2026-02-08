import { PaperLayout } from '@/app/intelligence/_components/PaperLayout';
import { CitationBlock } from '@/app/intelligence/_components/CitationBlock';

export const metadata = {
    title: 'Case Study: Supply Chain Miracle (2027) | P402 Intelligence',
    description: 'How autonomous logistics agents negotiated a global shipping crisis in milliseconds.'
};

export default function SupplyChainPage() {
    const jsonLd = {
        "@context": "https://schema.org",
        "@type": "ScholarlyArticle",
        "headline": "The Supply Chain Optimization Miracle (2027)",
        "author": { "@type": "Organization", "name": "P402 Intelligence" },
        "datePublished": "2027-05-20",
        "publisher": {
            "@type": "Organization",
            "name": "P402 Protocol",
            "logo": { "@type": "ImageObject", "url": "https://p402.io/logo.png" }
        },
        "description": "A case study on multi-agent negotiation solving a critical logistics bottleneck using atomic x402 settlement on Coinbase Base.",
        "keywords": "Supply Chain, Autonomous Logistics, x402, Coinbase, Base, Flash Settlement"
    };

    return (
        <PaperLayout
            title="The 400ms Supply Chain: A Logistics Miracle"
            subtitle="CASE STUDY • FUTURE SCENARIO • MAY 2027"
            meta={{
                author: "P402 Intelligence",
                date: "May 20, 2027",
                type: "Logistics Report"
            }}
            toc={[
                { id: "bottleneck", label: "1. The Bottleneck" },
                { id: "negotiation", label: "2. The Flash Negotiation" },
                { id: "settlement", label: "3. Atomic Settlement" },
                { id: "impact", label: "4. Global Impact" }
            ]}
            schema={jsonLd}
        >
            <div className="font-serif italic text-xl border-l-4 border-black pl-6 py-2 mb-12 bg-neutral-50 pr-6">
                <strong>Scenario:</strong> A sudden closure of the Suez Canal threatened to disrupt global electronics manufacturing. Within 400ms of the news breaking, autonomous logistics agents reorganized 14,000 shipping container contracts, effectively solving the crisis before humans even read the headline.
            </div>

            <h2 id="bottleneck">1. The Bottleneck</h2>
            <p>
                When a major shipping lane closes, rerouting cargo typically takes weeks of faxes, emails, and SWIFT wire transfers.
                The latency of money (T+2 days) creates a massive inefficiency in physical routing.
            </p>

            <h2 id="negotiation">2. The Flash Negotiation</h2>
            <p>
                Agents representing manufacturers, freight forwarders, and rail operators immediately entered a <strong>P402 Semantic Auction</strong>.
                Using <strong>Google Verification</strong> services to prove cargo contents, agents bid on alternative rail and air slots.
            </p>
            <p>
                Instead of "calling a broker," Agent A (Manufacturer) sent a signed x402 Offer to Agent B (Rail Operator).
            </p>

            <h2 id="settlement">3. Atomic Settlement</h2>
            <p>
                The critical enabler was <strong>Coinbase's Base L2</strong> network.
                Thousands of micro-contracts—ranging from $500 to $50,000—were settled atomically.
                The <strong>x402 Protocol</strong> ensured that the "Right to Ship" token was released exactly when the USDC payment was confirmed.
            </p>
            <div className="bg-[#141414] text-[#F5F5F5] p-6 border-2 border-black font-mono text-xs overflow-x-auto my-8">
                <div className="text-[#B6FF2E] mb-2">// Negotiation Log</div>
                <div>[00:00:00.050] Event: Canal_Blocked</div>
                <div>[00:00:00.120] Agent_A bids 4500 USDC for Slot_B</div>
                <div>[00:00:00.180] Agent_B accepts Offer_A</div>
                <div>[00:00:00.350] Settlement Confirmed on Base (Block 450129)</div>
                <div>[00:00:00.400] Cargo Rerouted</div>
            </div>

            <h2 id="impact">4. Global Impact</h2>
            <p>
                Zero downtime. Zero human intervention. P402 turned a potential global recession event into a minor routing optimization task.
            </p>
        </PaperLayout>
    );
}
