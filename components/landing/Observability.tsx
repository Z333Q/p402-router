export function Observability() {
    return (
        <section className="py-24">
            <div className="container mx-auto px-6 max-w-7xl">
                <h2 className="text-3xl font-extrabold uppercase mb-12">Every payment attempt gets a trace.</h2>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <TraceCard title="DecisionTrace timeline" body="Plan, 402 challenge, signature, verify, settle, response. One record per attempt." />
                    <TraceCard title="Stable deny codes" body="Header mismatch, invalid signature, amount too low, insufficient USDC, KYT flagged." />
                    <TraceCard title="Replay safety" body="Idempotency controls reduce duplicate settles and noisy retries." />
                </div>
            </div>
        </section>
    )
}

function TraceCard({ title, body }: { title: string; body: string }) {
    return (
        <div className="card p-6 border-2 border-black">
            <div className="font-bold mb-3 text-lg leading-tight uppercase tracking-tight">{title}</div>
            <div className="text-sm text-neutral-600">{body}</div>
        </div>
    )
}
