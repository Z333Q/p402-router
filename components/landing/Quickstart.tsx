import Link from 'next/link'

export function Quickstart() {
    return (
        <section id="developers" className="bg-neutral-100 border-y-2 border-black py-24">
            <div className="container mx-auto px-6 max-w-7xl">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-16 items-start">
                    <div>
                        <h2 className="text-3xl font-extrabold uppercase mb-4 leading-tight border-b-2 border-black pb-4">Monetize in minutes, not months.</h2>
                        <p className="text-neutral-600 mb-8 max-w-md">
                            Wrap any API with the x402 standard. We handle the
                            negotiation, verification, and settlement logic.
                        </p>
                        <div className="flex flex-col gap-4">
                            <Link href="/dashboard/policies" className="btn btn-primary w-fit">Open Playground</Link>
                            <Link href="/docs/sdk" className="btn btn-secondary w-fit">SDK Quickstart</Link>
                        </div>
                    </div>
                    <div className="flex flex-col gap-4">
                        <StepCard step="1" title="Return 402 Payment Required" body="Respond to unpaid requests with the standard 402 status and price headers." />
                        <StepCard step="2" title="Client Signs the Challenge" body="The client wallet signs the payment request (EIP-712) and retries." />
                        <StepCard step="3" title="Router Verifies & Settles" body="We verify the signature, ensure funds, and settle the transaction on-chain." />
                    </div>
                </div>
            </div>
        </section>
    )
}

function StepCard({ step, title, body }: { step: string; title: string; body: string }) {
    return (
        <div className="card p-6 border-2 border-black bg-white flex gap-6">
            <div className="w-10 h-10 bg-primary border-2 border-black flex items-center justify-center font-extrabold shrink-0 text-black">
                {step}
            </div>
            <div>
                <div className="font-extrabold mb-1 uppercase text-sm tracking-tight">{title}</div>
                <div className="text-xs text-neutral-600">{body}</div>
            </div>
        </div>
    )
}
