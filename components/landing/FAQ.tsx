export function FAQ() {
    return (
        <section className="py-24">
            <div className="container mx-auto px-6 max-w-7xl">
                <h2 className="text-3xl font-extrabold uppercase mb-12">FAQ</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FAQItem q="I still get 402 after attaching the payment header. Why?" a="1) Use PAYMENT-SIGNATURE, not legacy X-PAYMENT. 2) Signature could be invalid. 3) Amount too low. 4) Address lacks USDC or KYT flagged." />
                    <FAQItem q="What does Bazaar do?" a="Bazaar lists payable endpoints using machine-readable metadata, so developers and agents discover pricing and routes." />
                    <FAQItem q="Do different facilitators exist?" a="Yes. The ecosystem lists multiple facilitators with different network, token, and feature profiles." />
                    <FAQItem q="What changes in v2 matter for Router?" a="V2 adds lifecycle hooks for custom logic at key points in the flow, plus an extension system for discovery." />
                </div>
            </div>
        </section>
    )
}

function FAQItem({ q, a }: { q: string; a: string }) {
    return (
        <div className="card p-6 border-2 border-black bg-neutral-100">
            <div className="font-extrabold mb-3 uppercase text-sm tracking-tight">{q}</div>
            <div className="text-xs text-neutral-600 leading-relaxed">{a}</div>
        </div>
    )
}
