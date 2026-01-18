
'use client';

import { useEffect, useRef, useState } from 'react';

interface Testimonial {
    company: string;
    quote: string;
    author: string;
}

const testimonials: Testimonial[] = [
    { company: "Ask-AI", quote: "Ask-AI is excited to collaborate with Google on the A2A protocol, shaping the future of AI interoperability.", author: "CEO Alon Talmor PhD" },
    { company: "Atlassian", quote: "A standardized protocol like A2A will help agents successfully discover, coordinate, and reason with one another to enable richer forms of delegation.", author: "Brendan Haire, VP Engineering AI Platform" },
    { company: "Articul8", quote: "We’re enabling Articul8's ModelMesh to treat A2A as a first-class citizen, enabling secure, seamless communication between intelligent agents.", author: "Arun Subramaniyan, CEO" },
    { company: "Box", quote: "We look forward to enabling Box agents to work with Google Cloud’s agent ecosystem using A2A... empowering organizations to better automate workflows.", author: "Ketan Kittur, VP Product Management" },
    { company: "C3 AI", quote: "A2A has the potential to help customers break down silos and securely enable AI agents to work together across systems, teams, and applications.", author: "Nikhil Krishnan, CTO Data Science" },
    { company: "Cognizant", quote: "As a pioneer in enterprise multi-agent systems, Cognizant is committed and actively pursuing agent interoperability as a critical requirement.", author: "Babak Hodjat, CTO - AI" },
    { company: "Cohere", quote: "The open A2A protocol ensures seamless, trusted collaboration—even in air-gapped environments—so that businesses can innovate at scale.", author: "Autumn Moulder, VP Engineering" },
    { company: "Datadog", quote: "We're excited to see Google Cloud introduce the A2A protocol to streamline the development of sophisticated agentic systems.", author: "Yrieix Garnier, VP Product" },
    { company: "Salesforce", quote: "Salesforce is leading with A2A standard support to extend our open platform, enabling AI agents to work together seamlessly.", author: "Gary Lerhaupt, VP Product Architecture" },
    { company: "ServiceNow", quote: "ServiceNow and Google Cloud are collaborating to set a new industry standard for agent-to-agent interoperability.", author: "Pat Casey, CTO" },
    { company: "UiPath", quote: "Establishing an industry standard for seamless agent-to-agent communication is a significant step towards a future in which AI agents and humans collaborate.", author: "Graham Sheldon, CPO" },
    { company: "MongoDB", quote: "Combining MongoDB with A2A lets businesses unlock new possibilities across industries to redefine the future of AI applications.", author: "Andrew Davidson, SVP Products" },
    { company: "PayPal", quote: "PayPal supports Google Cloud’s A2A protocol, which represents a new way for developers and merchants to create next-generation commerce experiences.", author: "Prakhar Mehrotra, SVP AI" }
];

export function Testimonials() {
    const scrollerRef = useRef<HTMLDivElement>(null);
    const [start, setStart] = useState(false);

    useEffect(() => {
        if (!scrollerRef.current) return;
        // Clone items for infinite scroll effect
        const scrollerContent = Array.from(scrollerRef.current.children);
        scrollerContent.forEach((item) => {
            const duplicatedItem = item.cloneNode(true);
            if (scrollerRef.current) {
                scrollerRef.current.appendChild(duplicatedItem);
            }
        });
        setStart(true);
    }, []);

    return (
        <section className="py-24 bg-white overflow-hidden border-b-2 border-black">
            <div className="container mx-auto px-6 mb-16">
                <h2 className="text-4xl md:text-6xl font-black uppercase tracking-tighter mb-4 text-black italic">Adopted By Leaders</h2>
                <div className="h-2 w-32 bg-primary border-2 border-black mb-6" />
                <p className="text-xl font-bold text-neutral-600 uppercase tracking-widest">Defining the economic layer of the Agentic Web.</p>
            </div>

            <div
                className="relative flex overflow-hidden group"
            >
                <div
                    ref={scrollerRef}
                    className={`flex gap-0 w-max hover:[animation-play-state:paused] ${start ? 'animate-scroll' : ''}`}
                >
                    {testimonials.map((t, idx) => (
                        <div
                            key={idx}
                            className="w-[350px] md:w-[500px] p-10 border-r-2 border-y-2 border-black bg-white flex-shrink-0"
                        >
                            <div className="h-full flex flex-col justify-between">
                                <p className="text-lg font-bold text-black mb-8 leading-tight italic">"{t.quote}"</p>
                                <div>
                                    <div className="inline-block bg-primary text-black px-2 py-0.5 border-2 border-black font-black text-xs uppercase tracking-widest mb-2">{t.company}</div>
                                    <div className="text-neutral-500 font-bold text-sm uppercase">{t.author}</div>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
            <style jsx>{`
                .animate-scroll {
                    animation: scroll 60s linear infinite;
                }
                @keyframes scroll {
                    from {
                        transform: translateX(0);
                    }
                    to {
                        transform: translateX(-50%);
                    }
                }
            `}</style>
        </section>
    );
}
