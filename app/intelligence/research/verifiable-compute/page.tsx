import { PaperLayout } from '@/app/intelligence/_components/PaperLayout';
import { CitationBlock } from '@/app/intelligence/_components/CitationBlock';
import { MathBlock } from '@/app/intelligence/_components/MathBlock';

export const metadata = {
    title: 'Verifiable Compute | Proof of Inference',
    description: 'Ensuring model integrity and execution correctness in off-chain intelligence.'
};

export default function VerifiableComputePage() {
    const jsonLd = {
        "@context": "https://schema.org",
        "@type": "ScholarlyArticle",
        "headline": "Verifiable Compute: The Trust Layer for Off-Chain Intelligence",
        "author": { "@type": "Organization", "name": "P402 Intelligence" },
        "publisher": { "@type": "Organization", "name": "P402 Protocol" },
        "description": "Utilizing zkML and TEEs for trustless AI model inference.",
        "keywords": "Verifiable Compute, zkML, Google Cloud TEE, Cloudflare Workers"
    };

    return (
        <PaperLayout
            title="Verifiable Compute: The Trust Layer for Off-Chain Intelligence"
            subtitle="CRYPTOGRAPHY • TRUST SYSTEMS • MAY 2026"
            meta={{
                author: "P402 Intelligence",
                date: "May 10, 2026",
                type: "Technical Standard"
            }}
            toc={[
                { id: "abstract", label: "Abstract" },
                { id: "black-box", label: "1. The Black Box Problem" },
                { id: "zk-inference", label: "2. Verifiable Inference (zkML)" },
                { id: "p402-verification", label: "3. P402 Verification Layer" },
                { id: "conclusion", label: "4. Conclusion" }
            ]}
            schema={jsonLd}
        >
            <div id="abstract" className="font-serif italic text-xl border-l-4 border-black pl-6 py-2 mb-12 bg-neutral-50 pr-6">
                <strong>Abstract:</strong> When an agent pays for "GPT-4 Level" intelligence, how does it know it didn't receive a cheaper, smaller model's output? This paper outlines the P402 approach to <strong>Verifiable Compute</strong>, utilizing cryptographic signatures and emerging zkML (Zero-Knowledge Machine Learning) proofs to bind payment to a specific model execution trace.
            </div>

            <h2 id="black-box">1. The Black Box Problem</h2>
            <p>
                The API economy is currently based on blind trust. A provider claims to serve a specific model, but the consumer has no way to verify the computation.
                In high-stakes scenarios—like medical diagnosis or legal contract generation—blind trust is insufficient.
            </p>

            <h2 id="zk-inference">2. Verifiable Inference (zkML)</h2>
            <p>
                Zero-Knowledge Machine Learning (zkML) allows a compute provider to generate a cryptographic proof that a specific input, passed through a specific model hash ($H\_model$), produced a specific output.
            </p>
            <MathBlock
                formula="\pi = \text{Prove}(H_{model}, x, y)"
                label="Eq. 5"
                description="The proof π verifies that model H produced output y from input x without revealing the model weights."
            />

            <h2 id="p402-verification">3. P402 Verification Layer</h2>
            <p>
                P402 integrates this into the payment flow. The <code>x402-Proof</code> header can optionally contain a zkML proof or a signed attestation from a trusted enclave (TEE) like <strong>Google Cloud Confidential Computing</strong> or <strong>Cloudflare Worker Enclaves</strong>.
                If the proof fails verification, the payment is <strong>automatically slashed</strong> or withheld by the smart contract.
            </p>
            <CitationBlock
                id="EZKL"
                source="EZKL Library"
                details="Implementation standards for zk-SNARKs in deep learning inference."
            />

            <h2 id="conclusion">4. Conclusion</h2>
            <p>
                Trustless commerce requires trustless compute. By mandating verifiable proofs for high-value inference, P402 creates a market where quality is mathematically guaranteed, not just promised.
            </p>
        </PaperLayout>
    );
}
