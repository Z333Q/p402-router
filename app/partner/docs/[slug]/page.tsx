import { notFound } from 'next/navigation'
import type { Metadata } from 'next'
import Link from 'next/link'
import { ChevronLeft } from 'lucide-react'
import { positioningArticles } from '../_articles/positioning'
import { productArticles } from '../_articles/product'
import { campaignArticles } from '../_articles/campaigns'
import { complianceArticles } from '../_articles/compliance'
import { technicalArticles } from '../_articles/technical'
import { payoutArticles } from '../_articles/payouts'

// ---------------------------------------------------------------------------
// Article registry — all 24 docs merged from category modules
// ---------------------------------------------------------------------------

export interface ArticleContent {
    title: string
    category: string
    categorySlug: string
    updatedAt: string
    body: React.ReactNode
}

const ARTICLES: Record<string, ArticleContent> = {
    ...positioningArticles,
    ...productArticles,
    ...campaignArticles,
    ...complianceArticles,
    ...technicalArticles,
    ...payoutArticles,
}

// ---------------------------------------------------------------------------
// Metadata
// ---------------------------------------------------------------------------

export async function generateMetadata(
    { params }: { params: Promise<{ slug: string }> }
): Promise<Metadata> {
    const { slug } = await params
    const article = ARTICLES[slug]
    if (!article) return { title: 'Not Found — Partner Docs' }
    return {
        title: `${article.title} — Partner Docs — P402`,
        description: `${article.category} guide for P402 partners.`,
    }
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default async function ArticlePage(
    { params }: { params: Promise<{ slug: string }> }
) {
    const { slug } = await params
    const article = ARTICLES[slug]
    if (!article) notFound()

    // Build same-category article list for prev/next nav
    const sameCategory = Object.entries(ARTICLES)
        .filter(([, a]) => a.categorySlug === article.categorySlug)
        .map(([s, a]) => ({ slug: s, title: a.title }))
    const currentIndex = sameCategory.findIndex(a => a.slug === slug)
    const nextArticle = sameCategory[currentIndex + 1] ?? null
    const prevArticle = sameCategory[currentIndex - 1] ?? null

    return (
        <div className="max-w-3xl mx-auto space-y-8">

            {/* Breadcrumb */}
            <div className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-widest text-neutral-400">
                <Link
                    href="/partner/docs"
                    className="flex items-center gap-1 hover:text-black transition-colors"
                >
                    <ChevronLeft size={12} />
                    Partner Docs
                </Link>
                <span>/</span>
                <span className="text-black">{article.category}</span>
            </div>

            {/* Header */}
            <div className="border-b-2 border-black pb-6">
                <div className="flex items-center gap-3 mb-3">
                    <span className="text-[9px] font-black uppercase tracking-widest bg-primary border border-black px-2 py-0.5">
                        {article.category}
                    </span>
                    <span className="text-[10px] text-neutral-400 font-medium">
                        Updated {article.updatedAt}
                    </span>
                </div>
                <h1 className="text-3xl font-black uppercase tracking-tight leading-none">
                    {article.title}
                </h1>
                <p className="text-[10px] font-black uppercase tracking-widest text-error mt-3">
                    Confidential — Partner Use Only. Do Not Share.
                </p>
            </div>

            {/* Body */}
            <div className="prose-partner space-y-6 text-sm leading-relaxed text-neutral-700">
                {article.body}
            </div>

            {/* Prev / Next nav */}
            <div className="border-t-2 border-black pt-6 flex justify-between items-start gap-4">
                <div>
                    {prevArticle && (
                        <Link
                            href={`/partner/docs/${prevArticle.slug}`}
                            className="flex items-center gap-2 text-[11px] font-black uppercase tracking-widest text-neutral-400 hover:text-black transition-colors"
                        >
                            <ChevronLeft size={12} />
                            {prevArticle.title}
                        </Link>
                    )}
                </div>
                <div className="text-right">
                    {nextArticle && (
                        <Link
                            href={`/partner/docs/${nextArticle.slug}`}
                            className="text-[11px] font-black uppercase tracking-widest text-neutral-400 hover:text-black transition-colors"
                        >
                            {nextArticle.title} →
                        </Link>
                    )}
                </div>
            </div>

            {/* Back to hub */}
            <div className="border-2 border-neutral-200 p-4 flex items-center justify-between">
                <p className="text-[11px] text-neutral-500 font-medium">
                    Questions about this content? Contact your partner manager.
                </p>
                <Link
                    href="/partner/docs"
                    className="text-[10px] font-black uppercase tracking-widest text-black hover:text-primary transition-colors"
                >
                    ← All Docs
                </Link>
            </div>
        </div>
    )
}
