import Link from 'next/link'
import { RoutingSimulation } from './RoutingSimulation'

export function Hero() {
    return (
        <section className="py-16">
            <div className="container mx-auto px-6 max-w-7xl">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
                    <div>
                        <div className="badge badge-success mb-6">LIVE ON BASE</div>

                        <div className="mb-6">
                            <a href="https://www.producthunt.com/products/p402-io?embed=true&utm_source=badge-featured&utm_medium=badge&utm_campaign=badge-p402-io" target="_blank" rel="noopener noreferrer">
                                <img src="https://api.producthunt.com/widgets/embed-image/v1/featured.svg?post_id=1060148&theme=light&t=1767960638366" alt="P402.io - Route, verify, and settle paid API calls with clear traces | Product Hunt" style={{ width: '250px', height: '54px' }} width="250" height="54" />
                            </a>
                        </div>

                        <h1 className="text-4xl md:text-6xl font-black uppercase leading-[0.95] mb-6 tracking-tighter">
                            ROUTE, VERIFY, AND<br />SETTLE X402 PAYMENTS<br />AT SCALE.
                        </h1>

                        <p className="text-lg text-neutral-600 mb-8 max-w-[540px] font-medium leading-relaxed">
                            P402 Router sits between your paid endpoints and facilitators.
                            Enforce spend controls, settle in USDC (EIP-3009 compliant),
                            and publish Bazaar-ready metadata.
                        </p>

                        <div className="flex flex-col md:flex-row gap-4 mb-6">
                            <Link href="/get-access" className="btn btn-primary px-8">GET ACCESS</Link>
                            <Link href="/docs/sdk" className="btn btn-secondary px-8">GET SDK</Link>
                            <Link href="/docs/api" className="btn btn-dark px-8">API DOCS</Link>
                        </div>

                        <div className="text-[10px] text-neutral-400 font-bold uppercase tracking-widest mb-12 italic">
                            Uses HTTP 402 with PAYMENT-REQUIRED and PAYMENT-SIGNATURE headers.
                        </div>

                        <div className="grid grid-cols-2 md:grid-cols-4 gap-8 border-t-2 border-black/5 pt-8">
                            <Metric label="UPTIME" value="99.99%" />
                            <Metric label="TOKEN" value="USDC" />
                            <Metric label="FEE" value="1%" />
                            <Metric label="LATENCY" value="<100ms" />
                        </div>
                    </div>

                    <div>
                        <RoutingSimulation />
                    </div>
                </div>
            </div>
        </section>
    )
}

function Metric({ label, value }: { label: string; value: string }) {
    return (
        <div>
            <div className="text-xs font-bold uppercase tracking-wider mb-1 text-neutral-600">{label}</div>
            <div className="text-xl font-extrabold">{value}</div>
        </div>
    )
}

