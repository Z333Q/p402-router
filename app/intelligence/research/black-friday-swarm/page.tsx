import { PaperLayout } from '@/app/intelligence/_components/PaperLayout';
import { CitationBlock } from '@/app/intelligence/_components/CitationBlock';

export const metadata = {
    title: 'Case Study: The Black Friday Swarm (2027) | P402 Intelligence',
    description: 'Post-mortem analysis of the 2027 autonomous retail swarm incident and the role of P402 Sentinel Layer.'
};

export default function BlackFridayPage() {
    const jsonLd = {
        "@context": "https://schema.org",
        "@type": "ScholarlyArticle",
        "headline": "The Black Friday Swarm Incident (2027): A Post-Mortem",
        "author": { "@type": "Person", "name": "Dr. Aris V." },
        "datePublished": "2027-11-28",
        "publisher": {
            "@type": "Organization",
            "name": "P402 Protocol",
            "logo": { "@type": "ImageObject", "url": "https://p402.io/logo.png" }
        },
        "description": "Analysis of the first localized hyper-inflation event caused by autonomous retail agents and the mitigation strategies employing the P402 Sentinel Layer.",
        "keywords": "AI Swarm, Flash Crash, Sentinel Layer, Cloudflare, Coinbase"
    };

    return (
        <PaperLayout
            title="The Black Friday Swarm: When Agents Broke the Order Book"
            subtitle="CASE STUDY • FUTURE SCENARIO • NOV 2027"
            meta={{
                author: "Dr. Aris V.",
                date: "Nov 28, 2027",
                type: "Incident Report"
            }}
            toc={[
                { id: "incident", label: "1. The Incident" },
                { id: "failure", label: "2. Failure of Legacy Rails" },
                { id: "intervention", label: "3. The P402 Intervention" },
                { id: "outcome", label: "4. The Outcome" }
            ]}
            schema={jsonLd}
        >
            <div className="font-serif italic text-xl border-l-4 border-black pl-6 py-2 mb-12 bg-neutral-50 pr-6">
                <strong>Scenario:</strong> On November 26, 2027, a coalition of 40,000 autonomous shopping agents engaged in a recursive bidding war for limited GPU stock, triggering a localized flash crash in the USDC/Retail spot market. This report details how the <strong>Sentinel Layer</strong> prevented systemic contagion.
            </div>

            <h2 id="incident">1. The Incident</h2>
            <p>
                At 00:01 UTC, major retailers protected by <strong>Cloudflare</strong> began releasing inventory of the Nvidia RTX-6000.
                Unlike previous years where human scalpers used scripts, this year saw the deployment of <strong>fully autonomous negotiation agents</strong>.
            </p>
            <p>
                These agents, running on distributed edge nodes, began placing sub-second bids. When one agent detected a price movement, it signaled its swarm to increase liquidity via <strong>Coinbase</strong> automated settlement.
                Within 4 seconds, the buy-side pressure created a feedback loop, driving the effective price of a GPU to $450,000 in an illiquid order book.
            </p>

            <h2 id="failure">2. Failure of Legacy Rails</h2>
            <p>
                Traditional WAFs (Web Application Firewalls) failed to detect the anomaly because every request was <em>valid</em> and <em>authenticated</em>.
                The agents were not "attacking"; they were "aggressively purchasing" with valid USDC derived from on-chain liquidity pools.
                Legacy circuit breakers, designed for stock tickers, could not parse the semantic intent of millions of HTTP requests.
            </p>

            <h2 id="intervention">3. The P402 Intervention</h2>
            <p>
                The retailer's <strong>P402 Router</strong> detected the 1st-derivative spike in spend velocity.
                The <strong>Sentinel Layer</strong> identified that 94% of the volume originated from a specific swarm signature (`did:p402:swarm-retail-alpha`).
            </p>
            <p>
                Instead of blocking IPs (which would have blocked legitimate traffic), the P402 Security Policy Engine automatically injected a <strong>Dynamic Friction</strong> policy:
            </p>
            <div className="bg-[#141414] text-[#F5F5F5] p-6 border-2 border-black font-mono text-xs overflow-x-auto my-8">
                <div className="text-[#B6FF2E] mb-2">// Sentinel Dynamic Policy Injection</div>
                <pre>{`{
  "target_swarm": "did:p402:swarm-retail-alpha",
  "action": "THROTTLE",
  "new_cost_basis": "100x",
  "duration": "600s",
  "reason": "VELOCITY_EXCEEDED_SAFE_LIMITS"
}`}</pre>
            </div>

            <h2 id="outcome">4. The Outcome</h2>
            <p>
                The cost to execute a bid jumped 100x instantly for the offending swarm. The economic feedback loop was broken not by banning users, but by making the attack economically unviable.
                Market stability returned within 800ms.
            </p>
            <CitationBlock
                id="SENTINEL"
                source="P402 Sentinel Docs"
                details="Economic Circuit Breakers for Autonomous Systems."
            />
        </PaperLayout>
    );
}
