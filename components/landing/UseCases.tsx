export function UseCases() {
    return (
        <section className="py-24">
            <div className="container mx-auto px-6 max-w-7xl">
                <h2 className="text-3xl font-extrabold uppercase mb-12">Built for paid APIs and agent stacks.</h2>
                <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                    <Card title="Pay-per-call APIs" body="Meter every request without subscriptions." />
                    <Card title="MCP servers" body="Charge per tool invocation." />
                    <Card title="Agent-to-agent" body="Policies gate spend and domains." />
                    <Card title="Internal chargeback" body="Paid edges between services across teams." />
                </div>
            </div>
        </section>
    )
}

function Card({ title, body }: { title: string; body: string }) {
    return (
        <div className="card p-6 border-2 border-black">
            <div className="font-extrabold mb-2 uppercase text-sm tracking-tight">{title}</div>
            <div className="text-xs text-neutral-600">{body}</div>
        </div>
    )
}
