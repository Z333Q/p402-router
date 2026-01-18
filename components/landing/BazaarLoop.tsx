import Link from 'next/link'

export function BazaarLoop() {
    return (
        <section id="bazaar" className="bg-neutral-900 text-neutral-100 border-y-2 border-black py-24">
            <div className="container mx-auto px-6 max-w-7xl">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-16 items-center">
                    <div>
                        <h2 className="text-2xl font-extrabold uppercase mb-4 leading-tight tracking-wider">A distribution loop tied to discovery.</h2>
                        <p className="text-neutral-400 mb-8 max-w-md">
                            Bazaar is the discovery layer for payable endpoints. Router adds
                            runtime signals so buyers pick endpoints using real health and policy outcomes.
                        </p>
                        <div className="flex gap-2 flex-wrap mb-10">
                            <span className="badge border-neutral-700 bg-neutral-800 text-neutral-100">Listing metadata</span>
                            <span className="badge border-neutral-700 bg-neutral-800 text-neutral-100">Runtime health</span>
                            <span className="badge border-neutral-700 bg-neutral-800 text-neutral-100">Policy outcomes</span>
                        </div>
                        <Link href="/bazaar" className="btn btn-primary">Join Bazaar Waitlist</Link>
                    </div>
                    <div className="card bg-neutral-800 border-2 border-black p-8 text-white">
                        <div className="font-extrabold uppercase text-xs tracking-widest mb-6 text-neutral-400">Bazaar Overlay Preview</div>
                        <div className="grid grid-cols-2 gap-8">
                            <div><div className="text-xs font-bold text-neutral-400 uppercase mb-1">Approval Rate</div><div className="text-2xl font-extrabold">98.2%</div></div>
                            <div><div className="text-xs font-bold text-neutral-400 uppercase mb-1">p95 Verify</div><div className="text-2xl font-extrabold">42ms</div></div>
                            <div><div className="text-xs font-bold text-neutral-400 uppercase mb-1">p95 Settle</div><div className="text-2xl font-extrabold">310ms</div></div>
                            <div><div className="text-xs font-bold text-neutral-400 uppercase mb-1">Last Seen</div><div className="text-2xl font-extrabold">12s ago</div></div>
                        </div>
                        <div className="bg-neutral-900 border-2 border-black p-4 mt-8 font-mono text-xs">
                            <code className="text-primary">exact, USDC, eip155:8453</code>
                        </div>
                    </div>
                </div>
            </div>
        </section>
    )
}
