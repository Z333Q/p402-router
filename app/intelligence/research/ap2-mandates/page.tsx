import { PaperLayout } from '@/app/intelligence/_components/PaperLayout';
import { CitationBlock } from '@/app/intelligence/_components/CitationBlock';
import { MathBlock } from '@/app/intelligence/_components/MathBlock';

export const metadata = {
    title: 'AP2 Mandates | Machine Governance Standard',
    description: 'Cryptographic enforceability in nondeterministic autonomous systems.'
};

export default function AP2MandatesPage() {
    const jsonLd = {
        "@context": "https://schema.org",
        "@type": "ScholarlyArticle",
        "headline": "AP2 Mandates: Cryptographic Enforceability in Nondeterministic Systems",
        "author": { "@type": "Person", "name": "Dr. Aris V." },
        "publisher": { "@type": "Organization", "name": "P402 Protocol" },
        "description": "Solving the Principal-Agent problem in AI using cryptographic mandates.",
        "keywords": "AP2, AI Alignment, Zero Trust, Google IAM, Coinbase Wallet"
    };

    return (
        <PaperLayout
            title="AP2 Mandates: Cryptographic Enforceability in Nondeterministic Systems"
            subtitle="MACHINE GOVERNANCE • SECURITY RESEARCH • FEB 2026"
            meta={{
                author: "Dr. Aris V.",
                date: "Feb 04, 2026",
                type: "Security Standard"
            }}
            toc={[
                { id: "abstract", label: "Abstract" },
                { id: "principal-agent", label: "1. The Principal-Agent Problem" },
                { id: "ap2-protocol", label: "2. The AP2 Protocol" },
                { id: "enforcement", label: "3. Mathematical Enforcement" },
                { id: "conclusion", label: "4. Conclusion" }
            ]}
            schema={jsonLd}
        >
            <div id="abstract" className="font-serif italic text-xl border-l-4 border-black pl-6 py-2 mb-12 bg-neutral-50 pr-6">
                <strong>Abstract:</strong> As AI agents become autonomous economic actors, the risk of "misalignment" shifts from a philosophical concern to a financial liability. This paper introduces <strong>AP2 (Agent Policy Protocol)</strong>, a standard for issuing immutable, cryptographically verifiable mandates that constrain agent spending and behavior at the router level, solving the Principal-Agent problem for the machine economy.
            </div>

            <h2 id="principal-agent">1. The Principal-Agent Problem in AI</h2>
            <p>
                In economic theory, the Principal-Agent problem arises when an agent (the AI) is motivated to act in its own best interest rather than that of the principal (the User).
                For LLMs, this manifests as <strong>hallucination loops</strong> or <strong>resource exhaustion</strong>—an agent burning $10,000 trying to solve an unsolvable CAPTCHA.
            </p>
            <p>
                Traditional "guardrails" (prompt engineering) are probabilistic and easily bypassed. We require a <strong>deterministic</strong> enforcement layer.
            </p>

            <h2 id="ap2-protocol">2. The AP2 Protocol</h2>
            <p>
                AP2 defines a standard for <strong>Signed Mandates</strong>. A user signs a mandate using their private key (e.g., via <strong>Coinbase Wallet</strong> or <strong>Google Cloud KMS</strong>), authorizing an Agent DID to spend funds <em>only under specific conditions</em>.
            </p>
            <div className="bg-[#141414] text-[#F5F5F5] p-6 border-2 border-black font-mono text-xs overflow-x-auto my-8">
                <div className="text-[#B6FF2E] mb-2">// AP2 Mandate Structure</div>
                <pre>{`{
  "principal": "did:ethr:0xUser...",
  "agent": "did:p402:agent-123",
  "constraints": {
    "max_budget_usd": 100.00,
    "allowed_domains": ["api.openai.com", "p402.io"],
    "expiry": 1735689600
  },
  "signature": "0x... (EIP-712)"
}`}</pre>
            </div>

            <h2 id="enforcement">3. Mathematical Enforcement</h2>
            <p>
                P402 Routers act as the enforcement layer. Before routing any request, the router verifies:
            </p>
            <MathBlock
                formula="Verify(M, \sigma, Tx) \to \{True, False\}"
                label="Eq. 2"
                description="The router mathematically validates that the Transaction (Tx) satisfies all constraints in the signed Mandate (M) without needing to trust the Agent."
            />
            <p>
                This effectively replaces "Human-in-the-loop" with <strong>"Cryptography-in-the-loop"</strong>. Even if the agent "wants" to overspend, the laws of mathematics prevent the transaction from being routed.
            </p>

            <CitationBlock
                id="ZERO-TRUST"
                source="NIST 800-207"
                details="Zero Trust Architecture principles applied to autonomous software agents."
            />

            <h2 id="conclusion">4. Conclusion</h2>
            <p>
                AP2 provides the "Constitution" for autonomous agents. By binding AI behavior to cryptographic keys, we enable safe, scalable autonomy that enterprises can trust with their balance sheets.
            </p>
        </PaperLayout>
    );
}
