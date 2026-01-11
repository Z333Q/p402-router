export function Problem() {
    return (
        <section className="py-24">
            <div className="container mx-auto px-6 max-w-7xl">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-12 items-start">
                    <div className="md:col-span-1">
                        <h2 className="text-3xl font-black uppercase leading-tight mb-4 pb-4 border-b-2 border-black italic">
                            The Protocol Gap.
                        </h2>
                        <p className="text-neutral-600 font-medium">
                            Monetizing AI agents is complex. Without a unified router, you rely on
                            hardcoded providers, manual payment flows, and unprotected wallets.
                        </p>
                    </div>
                    <div className="md:col-span-2 grid grid-cols-1 md:grid-cols-3 gap-4">
                        <ProblemCard title="Fragmented Standards" body="Every API demands a different payment flow. Integration is a nightmare of custom adapters." />
                        <ProblemCard title="Uncontrolled Spend" body="One bug in your agent loop can drain your wallet in seconds. You need policy-level protection." />
                        <ProblemCard title="Single Point of Failure" body="If your primary model provider goes down, your agent dies. Redundancy should be automatic." />
                    </div>
                </div>
            </div>
        </section>
    )
}

function ProblemCard({ title, body }: { title: string; body: string }) {
    return (
        <div className="card p-4 border-2 border-black">
            <div className="font-bold mb-2 uppercase text-sm tracking-tight">{title}</div>
            <div className="text-xs text-neutral-600">{body}</div>
        </div>
    )
}
