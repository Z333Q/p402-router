import Link from 'next/link'
import {
    DollarSign,
    Zap,
    Shield,
    BarChart2,
    Users,
    BookOpen,
    ArrowRight,
    Check,
} from 'lucide-react'
import type { Metadata } from 'next'

export const metadata: Metadata = {
    title: 'Partner Program — P402',
    description:
        'Earn recurring commissions by referring developers, agents, and enterprises to the P402 AI payment router. Three tracks: affiliate, agency, and enterprise referral.',
}

// ---------------------------------------------------------------------------
// Data
// ---------------------------------------------------------------------------

const TRACKS = [
    {
        id: 'affiliate',
        badge: 'Track A',
        name: 'Developer Affiliate',
        for: 'AI builders, educators, SDK tutorial writers, technical content creators',
        commissions: [
            '20% recurring for 12 months on referred Pro subscriptions',
            'Share of P402 net platform fee from referred usage',
            'Bonus bounty for referred publisher activations',
        ],
        cta: 'Apply as Affiliate',
    },
    {
        id: 'agency',
        badge: 'Track B',
        name: 'Integration Partner',
        for: 'Agencies, consultant networks, AI automation firms, implementation shops',
        commissions: [
            '25% recurring on referred Pro subscriptions',
            'Fixed bounty per launched client workspace',
            'Optional implementation rebate for onboarding assets',
        ],
        cta: 'Apply as Agency',
    },
    {
        id: 'enterprise',
        badge: 'Track C',
        name: 'Enterprise Referral Partner',
        for: 'Ecosystem connectors, investors, advisors, enterprise consultants',
        commissions: [
            '5–10% of year-one net software revenue',
            'Fixed bounty for accepted and closed-won deals',
            'Deal registration required — no cookie-only attribution',
        ],
        cta: 'Apply as Enterprise Partner',
    },
]

const HOW_IT_WORKS = [
    { step: '01', title: 'Apply', body: 'Submit your application. We review channel quality and fit with the P402 ICP before approving.' },
    { step: '02', title: 'Get your link', body: 'Once approved, generate referral links with UTM and SubID support for precise attribution.' },
    { step: '03', title: 'Drive activation', body: 'Share P402 with your audience. Commissions start after meaningful activation — funded wallets, first settlements, paid subscriptions.' },
    { step: '04', title: 'Earn recurring', body: 'Subscription commissions recur for 12 months per referred account. Usage commissions accrue monthly.' },
]

const PROGRAM_FEATURES = [
    { icon: DollarSign, title: 'Revenue-based commissions', body: 'We pay on collected subscription revenue and P402 net platform fee — not on gross settlement volume.' },
    { icon: Zap,         title: 'First-class dashboard',    body: 'Dedicated partner portal with links, conversion analytics, commission ledger, and payout tracking.' },
    { icon: Shield,      title: 'Fraud-aware payouts',      body: 'Hold periods, manual review for anomalies, and idempotent ledger entries protect the commission pool.' },
    { icon: BarChart2,   title: 'Full attribution trace',   body: 'First-touch + last-touch tracking with UTM and SubID. Override rules for registered leads and deals.' },
    { icon: Users,       title: 'Agency lead workflows',    body: 'Agency partners can register leads and deals, overriding cookie attribution with accepted registrations.' },
    { icon: BookOpen,    title: 'Gated partner docs',       body: 'Talk tracks, approved claims, ICP guides, comparison sheets, and campaign assets — gated by partner role.' },
]

// ---------------------------------------------------------------------------
// Components
// ---------------------------------------------------------------------------

function TrackCard({ track }: { track: typeof TRACKS[number] }) {
    return (
        <div className="card p-6 flex flex-col gap-5">
            <div>
                <div className="flex items-center gap-3 mb-3">
                    <span className="px-2 py-0.5 text-[9px] font-black uppercase tracking-widest bg-neutral-100 border border-black text-neutral-600">
                        {track.badge}
                    </span>
                </div>
                <h3 className="text-lg font-black uppercase tracking-tight text-black mb-1">{track.name}</h3>
                <p className="text-xs text-neutral-500">{track.for}</p>
            </div>
            <div>
                <p className="text-[10px] font-black uppercase tracking-[0.2em] text-neutral-400 mb-2">Commissions</p>
                <ul className="space-y-1.5">
                    {track.commissions.map(c => (
                        <li key={c} className="flex items-start gap-2 text-xs text-neutral-700">
                            <Check size={12} className="text-primary shrink-0 mt-0.5" strokeWidth={3} />
                            {c}
                        </li>
                    ))}
                </ul>
            </div>
            <Link
                href={`/partners/apply?type=${track.id}`}
                className="btn btn-primary w-full text-center mt-auto flex items-center justify-center gap-2"
            >
                {track.cta}
                <ArrowRight size={14} />
            </Link>
        </div>
    )
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default function PartnersLandingPage() {
    return (
        <div className="min-h-screen bg-white font-sans">
            {/* Hero */}
            <section className="border-b-2 border-black bg-black text-white">
                <div className="mx-auto max-w-5xl px-6 py-20 lg:py-28">
                    <div className="max-w-2xl">
                        <div className="flex items-center gap-3 mb-6">
                            <span className="px-2 py-0.5 text-[9px] font-black uppercase tracking-widest bg-primary text-black border border-primary">
                                Partner Program
                            </span>
                            <span className="text-[10px] text-neutral-400 font-mono">Application-only · Approval-based</span>
                        </div>
                        <h1 className="text-4xl lg:text-5xl font-black uppercase tracking-tight leading-none mb-6">
                            Earn recurring revenue <span className="text-primary">by distributing the future of AI payments.</span>
                        </h1>
                        <p className="text-neutral-300 text-base leading-relaxed mb-8 max-w-xl">
                            P402 is the payment-aware AI router trusted by agents, developers, and enterprises.
                            Refer accounts that activate and grow — earn commissions that compound.
                        </p>
                        <div className="flex items-center gap-4 flex-wrap">
                            <Link href="/partners/apply" className="btn btn-primary flex items-center gap-2">
                                Apply Now
                                <ArrowRight size={14} />
                            </Link>
                            <Link href="#program" className="text-sm font-black text-neutral-400 hover:text-white transition-colors uppercase tracking-widest">
                                Learn More ↓
                            </Link>
                        </div>
                    </div>
                </div>
            </section>

            {/* Stats bar */}
            <section className="border-b-2 border-black bg-primary">
                <div className="mx-auto max-w-5xl px-6 py-5">
                    <div className="grid grid-cols-2 lg:grid-cols-4 gap-6">
                        {[
                            { label: 'Commission on Pro', value: '20%' },
                            { label: 'Commission duration', value: '12 mo' },
                            { label: 'Attribution window', value: '90 days' },
                            { label: 'Program tracks', value: '3' },
                        ].map(item => (
                            <div key={item.label}>
                                <div className="text-3xl font-black text-black">{item.value}</div>
                                <div className="text-[10px] font-black uppercase tracking-[0.2em] text-neutral-700">{item.label}</div>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* Program tracks */}
            <section id="program" className="border-b-2 border-black">
                <div className="mx-auto max-w-5xl px-6 py-16">
                    <div className="mb-10">
                        <h2 className="text-2xl font-black uppercase tracking-tight text-black mb-3">
                            Three Partner Tracks
                        </h2>
                        <p className="text-sm text-neutral-500 max-w-xl">
                            Not a flat referral program. A segmented partner system designed for how P402 actually gets distributed.
                        </p>
                    </div>
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                        {TRACKS.map(t => <TrackCard key={t.id} track={t} />)}
                    </div>
                </div>
            </section>

            {/* How it works */}
            <section className="border-b-2 border-black bg-neutral-50">
                <div className="mx-auto max-w-5xl px-6 py-16">
                    <h2 className="text-2xl font-black uppercase tracking-tight text-black mb-10">How It Works</h2>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                        {HOW_IT_WORKS.map(item => (
                            <div key={item.step} className="space-y-3">
                                <div className="text-4xl font-black text-primary/40">{item.step}</div>
                                <h3 className="text-sm font-black uppercase tracking-tight text-black">{item.title}</h3>
                                <p className="text-xs text-neutral-500 leading-relaxed">{item.body}</p>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* Features */}
            <section className="border-b-2 border-black">
                <div className="mx-auto max-w-5xl px-6 py-16">
                    <h2 className="text-2xl font-black uppercase tracking-tight text-black mb-10">What You Get</h2>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                        {PROGRAM_FEATURES.map(f => (
                            <div key={f.title} className="card p-5">
                                <f.icon className="h-5 w-5 text-primary mb-3" />
                                <h3 className="text-sm font-black uppercase tracking-tight text-black mb-2">{f.title}</h3>
                                <p className="text-xs text-neutral-500 leading-relaxed">{f.body}</p>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* CTA */}
            <section className="bg-black text-white">
                <div className="mx-auto max-w-5xl px-6 py-16 text-center">
                    <h2 className="text-3xl font-black uppercase tracking-tight mb-4">
                        Ready to Partner?
                    </h2>
                    <p className="text-neutral-400 text-sm mb-8 max-w-md mx-auto">
                        Applications are reviewed manually. We prioritize quality distribution over volume.
                        Approval takes 2–5 business days.
                    </p>
                    <Link href="/partners/apply" className="btn btn-primary inline-flex items-center gap-2">
                        Apply to Partner Program
                        <ArrowRight size={14} />
                    </Link>
                </div>
            </section>
        </div>
    )
}
