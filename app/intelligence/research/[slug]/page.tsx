import { PaperLayout } from '../../_components/PaperLayout';
import { CitationBlock } from '../../_components/CitationBlock';
import { MathBlock } from '../../_components/MathBlock';

// In a real app, we would fetch data based on params.slug
// content map would go here or be MDX

export default async function ArticlePage({ params }: { params: Promise<{ slug: string }> }) {
    const { slug } = await params;
    // Placeholder content logic
    const title = slug.replace(/-/g, ' ').toUpperCase();

    return (
        <PaperLayout
            title={title}
            subtitle="A Foundational Paper on Agentic Economics"
            meta={{
                author: "P402 Intelligence",
                date: "Jan 2026",
                type: "Research Paper"
            }}
            toc={[
                { id: "intro", label: "1. Introduction" },
                { id: "problem", label: "2. The Problem" },
                { id: "solution", label: "3. The x402 Solution" }
            ]}
        >
            <h2 id="intro">1. Introduction</h2>
            <p>
                The transition from human-centric commerce to an autonomus agent economy necessitates
                a fundamental rethinking of settlement layers. Traditional REST APIs treat payments
                as an out-of-band exception, typically handled via 3rd party redirects (Stripe Checkout).
                This is acceptable for humans, but catastrophic for high-velocity agent swarms.
            </p>

            <MathBlock
                formula="T_{settle} < T_{context\_decay}"
                description="Settlement time must be strictly less than the model's context window decay rate."
                label="Eq. 1"
            />

            <h2 id="problem">2. The Problem of State</h2>
            <p>
                Agents operating on standard HTTP rails lack a standardized state machine for
                negotiating resource access. A `402 Payment Required` header is currently
                underspecified in RFC 7231.
            </p>

            <CitationBlock
                id="RFC-7231"
                source="IETF HTTP/1.1 Semantics"
                details="Section 6.5.2 defines 402 but reserves it for future use without implementation details."
                link="https://datatracker.ietf.org/doc/html/rfc7231#section-6.5.2"
            />

            <h2 id="solution">3. The x402 Solution</h2>
            <p>
                P402 introduces the <strong>x402</strong> extension headers, providing a
                cryptographically verifiable handshake for resource pricing and settlement.
            </p>
        </PaperLayout>
    );
}
