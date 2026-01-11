export function WhatIsRouter() {
    return (
        <section id="product" className="bg-neutral-100 border-y-2 border-black py-24">
            <div className="container mx-auto px-6 max-w-7xl">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-12 items-start">
                    <div className="md:col-span-1">
                        <h2 className="text-3xl font-black uppercase leading-tight mb-4 pb-4 border-b-2 border-black italic">
                            Protocol-Native Intelligence.
                        </h2>
                        <p className="text-neutral-600 font-medium">
                            P402 gives your agents a decentralized control plane. Define policies,
                            route by intent, and settle payments instantly using the x402 standard.
                        </p>
                    </div>
                    <div className="md:col-span-2 grid grid-cols-1 md:grid-cols-3 gap-4">
                        <FeatureCard title="Intent-Based Routing" body="Route requests based on cost, speed, or quality. Semantic caching included." />
                        <FeatureCard title="Policy Enforcement" body="Cryptographically enforce budgets and access rules at the edge." />
                        <FeatureCard title="Decision Tracing" body="Full observability into every payment decision and settlement event." />
                    </div>
                </div>
            </div>
        </section>
    )
}

function FeatureCard({ title, body }: { title: string; body: string }) {
    return (
        <div className="card p-4 border-2 border-black bg-white">
            <div className="font-bold mb-2 uppercase text-sm tracking-tight">{title}</div>
            <div className="text-xs text-neutral-600">{body}</div>
        </div>
    )
}
