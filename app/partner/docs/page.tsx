import { BookOpen, FileText, Shield, Megaphone, Target, HelpCircle, ChevronRight, Lock } from 'lucide-react'
import Link from 'next/link'
import type { Metadata } from 'next'

export const metadata: Metadata = {
    title: 'Partner Docs — P402',
}

// ---------------------------------------------------------------------------
// Doc categories (content populated in Phase 3 CMS)
// ---------------------------------------------------------------------------

const DOC_CATEGORIES = [
    {
        icon: Target,
        title: 'Positioning & Messaging',
        desc: 'Approved product descriptions, elevator pitches, and value propositions for each audience.',
        articles: ['P402 in one sentence', 'ICP guide', 'Approved claims', 'Prohibited language'],
        available: true,
    },
    {
        icon: FileText,
        title: 'Product Explainers',
        desc: 'Partner-edition deep dives into x402, AP2, Bazaar, and the router.',
        articles: ['How x402 works (partner edition)', 'Why AP2 mandates matter', 'Bazaar distribution model', 'Router vs. direct API'],
        available: true,
    },
    {
        icon: Megaphone,
        title: 'Launch Campaigns',
        desc: 'Ready-to-use copy templates, content calendars, and UTM setups.',
        articles: ['Newsletter template', 'X/Twitter threads', 'YouTube description template', 'Email sequences'],
        available: true,
    },
    {
        icon: Shield,
        title: 'Compliance',
        desc: 'Disclosure requirements, brand usage rules, and prohibited promotion methods.',
        articles: ['FTC / ASA disclosure guide', 'Brand guidelines', 'Prohibited methods', 'Brand bidding policy'],
        available: true,
    },
    {
        icon: BookOpen,
        title: 'Technical Guides',
        desc: 'For developer affiliates: SDK walkthroughs, integration tutorials, and code examples.',
        articles: ['SDK quickstart', 'x402 code walkthrough', 'Building a paid agent', 'MCP integration guide'],
        available: true,
    },
    {
        icon: HelpCircle,
        title: 'Payout & Commission FAQ',
        desc: 'Everything about hold periods, tax requirements, and getting paid.',
        articles: ['Commission calculation', 'Hold period rules', 'Tax form requirements', 'Payout timeline'],
        available: true,
    },
]

// ---------------------------------------------------------------------------
// Components
// ---------------------------------------------------------------------------

function DocCard({ category }: { category: typeof DOC_CATEGORIES[number] }) {
    return (
        <div className="card p-5 flex flex-col gap-4">
            <div className="flex items-start gap-3">
                <div className="w-8 h-8 border-2 border-black flex items-center justify-center shrink-0 bg-neutral-50">
                    <category.icon size={16} />
                </div>
                <div>
                    <h3 className="text-sm font-black uppercase tracking-tight text-black">{category.title}</h3>
                    <p className="text-[11px] text-neutral-500 mt-0.5 leading-relaxed">{category.desc}</p>
                </div>
            </div>
            <ul className="space-y-1.5">
                {category.articles.map(a => (
                    <li key={a}>
                        {category.available ? (
                            <Link
                                href={`/partner/docs/${a.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`}
                                className="flex items-center gap-2 text-xs text-neutral-600 hover:text-black hover:font-bold transition-all group"
                            >
                                <ChevronRight size={10} className="text-neutral-300 group-hover:text-black transition-colors" />
                                {a}
                            </Link>
                        ) : (
                            <span className="flex items-center gap-2 text-xs text-neutral-300">
                                <Lock size={10} />
                                {a}
                            </span>
                        )}
                    </li>
                ))}
            </ul>
        </div>
    )
}

// ---------------------------------------------------------------------------
// Page (Server Component — no auth needed beyond layout gate)
// ---------------------------------------------------------------------------

export default function PartnerDocsPage() {
    return (
        <div className="space-y-8">
            {/* Header */}
            <div>
                <h1 className="page-title">Partner Docs</h1>
                <p className="text-sm text-neutral-500 mt-1">
                    Gated resources — positioning, campaign templates, compliance guides, and technical walkthroughs.
                </p>
            </div>

            {/* Search placeholder */}
            <div className="flex items-center gap-3 border-2 border-black px-4 py-3 bg-white">
                <BookOpen size={16} className="text-neutral-300 shrink-0" />
                <input
                    className="flex-1 font-mono text-sm focus:outline-none placeholder:text-neutral-300 bg-transparent"
                    placeholder="Search docs… (e.g. &quot;approved claims&quot;, &quot;payout&quot;)"
                    readOnly
                />
                <span className="text-[10px] font-black uppercase tracking-widest text-neutral-300 border border-neutral-200 px-2 py-1">
                    Coming Soon
                </span>
            </div>

            {/* Categories grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
                {DOC_CATEGORIES.map(c => <DocCard key={c.title} category={c} />)}
            </div>

            {/* Version note */}
            <div className="card p-4 bg-neutral-50 flex items-start gap-3">
                <Shield size={14} className="text-neutral-400 shrink-0 mt-0.5" />
                <p className="text-[11px] text-neutral-500 leading-relaxed">
                    All content in the partner docs hub is version-controlled and reviewed before publication.
                    Always check the{' '}
                    <strong className="text-black">Compliance</strong>
                    {' '}section before publishing any P402 promotional content.
                    Partner docs are confidential — do not share outside your organization.
                </p>
            </div>
        </div>
    )
}
