import Link from 'next/link'
import { AccessForm } from '@/app/components/AccessForm'

export function FinalCTA() {
    return (
        <section className="bg-neutral-900 text-neutral-100 border-t-2 border-black py-24">
            <div className="container mx-auto px-6 max-w-7xl">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-16 items-start">
                    <div>
                        <h2 className="text-3xl font-extrabold uppercase mb-6 leading-tight">Make x402 reliable in production.</h2>
                        <p className="text-neutral-400 mb-10 max-w-md">
                            Get Router access for policies, traces, and Bazaar overlays.
                        </p>
                        <div className="flex gap-4">
                            <Link href="/get-access" className="btn btn-primary">Talk to Sales</Link>
                            <Link href="/status" className="btn bg-neutral-800 text-neutral-100 border-neutral-700">View Status</Link>
                        </div>
                    </div>
                    <div>
                        <AccessForm />
                    </div>
                </div>
            </div>
        </section>
    )
}
