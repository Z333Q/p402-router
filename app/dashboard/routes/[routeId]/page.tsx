import Link from 'next/link'
import { Badge, Card, CodeBox, EmptyState, Button } from '../../_components/ui'
import { clsx } from 'clsx'

async function getRoute(routeId: string) {
    const base = process.env.NEXT_PUBLIC_BASE_URL || ''
    const res = await fetch(`${base}/api/v1/routes/${routeId}`, { cache: 'no-store' })
    if (!res.ok) return null
    return res.json()
}

export default async function RouteDetailPage({ params }: { params: Promise<{ routeId: string }> }) {
    const { routeId } = await params
    const data = await getRoute(routeId)

    if (!data) {
        return (
            <div className="py-24">
                <EmptyState
                    title="Route configuration not found"
                    body="The requested route ID does not exist in the current control plane."
                    action={
                        <Link href="/dashboard" className="no-underline">
                            <Button variant="secondary">Return to Overview</Button>
                        </Link>
                    }
                />
            </div>
        )
    }

    const r = data.route

    return (
        <div className="space-y-8">
            {/* Page Header */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-6">
                <div className="space-y-1">
                    <h1 className="text-4xl font-black uppercase tracking-tighter text-black">Route Configuration</h1>
                    <div className="flex items-center gap-2">
                        <span className="font-mono text-xs font-bold text-neutral-400 select-all bg-neutral-100 px-2 py-0.5 border border-black/5">
                            {r.routeId}
                        </span>
                        {r.bazaar.listed && <Badge tone="ok">Listed</Badge>}
                    </div>
                </div>
                <div className="flex gap-3">
                    <Link href="/dashboard/traffic" className="no-underline">
                        <Button variant="secondary" className="text-xs">Inspect Traffic</Button>
                    </Link>
                    <Link href="/dashboard/policies" className="no-underline">
                        <Button className="text-xs">Manage Policies</Button>
                    </Link>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">

                {/* Left: Bazaar & Identity (7/12) */}
                <div className="lg:col-span-7 space-y-8">
                    <Card title="Discovery Metadata" body="Machine-readable attributes exposed to the Bazaar discovery layer.">
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 my-8 pb-8 border-b-2 border-black/5">
                            <Meta label="Visibility" value={r.bazaar.listed ? 'Public Listing' : 'Private / Hidden'} />
                            <Meta label="Schema Version" value="x402-v2.1" />
                            <Meta label="Last Seen" value={new Date(r.bazaar.lastSeenAt).toLocaleTimeString()} />
                        </div>

                        <div className="bg-neutral-50 border-2 border-black p-6 relative overflow-hidden group">
                            <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                                <svg width="80" height="80" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1">
                                    <path d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                                </svg>
                            </div>

                            <div className="flex justify-between items-center mb-4">
                                <h3 className="font-black uppercase text-lg tracking-tight text-black">{r.bazaar.title}</h3>
                                <Badge tone={r.bazaar.listed ? 'info' : 'neutral'} className="bg-white">
                                    {r.bazaar.mimeType}
                                </Badge>
                            </div>

                            <p className="text-sm text-neutral-600 mb-8 leading-relaxed max-w-xl">
                                {r.bazaar.description}
                            </p>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <div className="text-[10px] font-black uppercase text-neutral-400">Classification Tags</div>
                                    <div className="flex flex-wrap gap-2">
                                        {r.bazaar.tags.map((tag: string) => (
                                            <span key={tag} className="text-[10px] font-bold px-2 py-0.5 bg-white border border-black/10 text-neutral-600 uppercase">
                                                {tag}
                                            </span>
                                        ))}
                                    </div>
                                </div>
                                <div className="space-y-2">
                                    <div className="text-[10px] font-black uppercase text-neutral-400">Control Plane URL</div>
                                    <div className="font-mono text-[10px] text-primary font-bold overflow-hidden text-ellipsis">
                                        p402://edge.router/{r.routeId}
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-8">
                            <CodeBox title="Input Protocol Schema" value={r.bazaar.inputSchema} />
                            <CodeBox title="Output Protocol Schema" value={r.bazaar.outputSchema} />
                        </div>
                    </Card>
                </div>

                {/* Right: Pricing Logic (5/12) */}
                <div className="lg:col-span-5 space-y-6">
                    <Card title="Pricing & Asset Acceptance" body="Facilitators and tokens configured for this active route.">
                        <div className="mt-6 border-2 border-black overflow-hidden shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
                            <table className="w-full text-left border-collapse bg-white">
                                <thead>
                                    <tr className="bg-neutral-100 border-b-2 border-black">
                                        <th className="px-4 py-3 text-[10px] font-black uppercase tracking-widest text-neutral-600">Scheme</th>
                                        <th className="px-4 py-3 text-[10px] font-black uppercase tracking-widest text-neutral-600">Asset</th>
                                        <th className="px-4 py-3 text-[10px] font-black uppercase tracking-widest text-neutral-600 text-right">Floor</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-black/5">
                                    {r.accepts.map((a: any, idx: number) => (
                                        <tr key={idx} className="hover:bg-neutral-50 transition-colors">
                                            <td className="px-4 py-4">
                                                <div className="font-bold text-xs text-black uppercase">{a.scheme}</div>
                                                <div className="text-[9px] font-mono text-neutral-400 truncate max-w-[120px]">{a.network}</div>
                                            </td>
                                            <td className="px-4 py-4 font-black text-xs text-neutral-700">
                                                {a.asset}
                                            </td>
                                            <td className="px-4 py-4 text-right font-black text-sm text-black">
                                                ${parseFloat(a.amount).toFixed(2)}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>

                        <div className="p-6 bg-primary border-2 border-black">
                            <h4 className="font-black uppercase text-xs mb-2">Routing Preference</h4>
                            <p className="text-xs font-bold leading-relaxed text-black/70">
                                This route is currently optimized for <span className="underline decoration-2">Lowest Fee</span> facilitators.
                                Failover transitions to <span className="underline decoration-2">Highest Reputation</span> on multi-failure events.
                            </p>
                        </div>
                    </Card>
                </div>
            </div>
        </div>
    )
}

function Meta({ label, value }: { label: string; value: string }) {
    return (
        <div className="space-y-1">
            <div className="text-[10px] font-black uppercase tracking-widest text-neutral-400">{label}</div>
            <div className="text-sm font-black text-black tracking-tight">{value}</div>
        </div>
    )
}
