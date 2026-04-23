import { Package, Image, FileText, Layout, Code, Presentation } from 'lucide-react'
import type { Metadata } from 'next'
import { AssetRow } from './AssetRow'

export const metadata: Metadata = { title: 'Partner Assets — P402' }

const ASSET_TYPES = [
    {
        icon: Image,
        type: 'Logos & Brand',
        items: [
            { name: 'P402 Logo (SVG)', size: '4 KB',   format: 'SVG' },
            { name: 'P402 Logo (PNG)', size: '28 KB',  format: 'PNG' },
            { name: 'P402 Dark Logo',  size: '28 KB',  format: 'PNG' },
            { name: 'P402 Icon',       size: '8 KB',   format: 'SVG' },
        ],
    },
    {
        icon: Layout,
        type: 'Social Copy',
        items: [
            { name: 'X/Twitter thread templates', size: '—', format: 'TXT' },
            { name: 'LinkedIn post templates',     size: '—', format: 'TXT' },
            { name: 'Newsletter snippets',         size: '—', format: 'TXT' },
            { name: 'YouTube descriptions',        size: '—', format: 'TXT' },
        ],
    },
    {
        icon: FileText,
        type: 'Product Cards',
        items: [
            { name: 'P402 One-Pager',       size: '340 KB', format: 'PDF' },
            { name: 'x402 Protocol Brief',  size: '180 KB', format: 'PDF' },
            { name: 'Router Comparison',    size: '210 KB', format: 'PDF' },
            { name: 'Bazaar Overview',      size: '155 KB', format: 'PDF' },
        ],
    },
    {
        icon: Presentation,
        type: 'Decks & Slides',
        items: [
            { name: 'Partner Intro Deck',    size: '2.1 MB', format: 'PPTX' },
            { name: 'Technical Deep-Dive',   size: '3.4 MB', format: 'PPTX' },
            { name: 'Enterprise Pitch Deck', size: '4.0 MB', format: 'PPTX' },
        ],
    },
    {
        icon: Code,
        type: 'Code Snippets',
        items: [
            { name: 'P402 SDK quickstart',     size: '—', format: 'TS' },
            { name: 'x402 payment example',    size: '—', format: 'TS' },
            { name: 'OpenAI compat migration', size: '—', format: 'TS' },
            { name: 'Agent with mandate',      size: '—', format: 'TS' },
        ],
    },
]

export default function PartnerAssetsPage() {
    return (
        <div className="space-y-6">
            <div>
                <h1 className="page-title">Partner Assets</h1>
                <p className="text-sm text-neutral-500 mt-1">
                    Approved logos, copy templates, product cards, and code snippets for your campaigns.
                </p>
            </div>

            {/* Usage note */}
            <div className="card p-4 bg-primary/5 border-primary/30">
                <p className="text-[11px] text-neutral-700 leading-relaxed">
                    <strong className="text-black">Usage rules: </strong>
                    All assets must be used in accordance with the{' '}
                    <a href="/partner/docs" className="text-black font-bold underline">Partner Brand Guidelines</a>.
                    Do not alter logos, create derivative brand materials, or use P402 brand assets
                    in a way that implies an endorsement beyond your affiliate role.
                </p>
            </div>

            {/* Asset grids */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
                {ASSET_TYPES.map(section => (
                    <div key={section.type} className="card p-5">
                        <div className="flex items-center gap-3 mb-4 pb-3 border-b-2 border-black">
                            <section.icon size={16} className="text-neutral-500" />
                            <h3 className="text-[11px] font-black uppercase tracking-[0.2em] text-neutral-600">
                                {section.type}
                            </h3>
                        </div>
                        {section.items.map(item => <AssetRow key={item.name} item={item} />)}
                    </div>
                ))}
            </div>

            {/* Request note */}
            <div className="card p-4 flex items-start gap-3 bg-neutral-50">
                <Package size={14} className="text-neutral-400 shrink-0 mt-0.5" />
                <p className="text-[11px] text-neutral-500 leading-relaxed">
                    Need a co-branded asset or something not listed here? Reach out via{' '}
                    <a href="/partner/support" className="text-black font-bold hover:text-primary transition-colors">Partner Support</a>
                    {' '}and we'll work with you.
                </p>
            </div>
        </div>
    )
}
