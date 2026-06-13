import Link from 'next/link';
import { TopNav } from '@/components/TopNav';
import { Footer } from '@/components/Footer';

// V5 §18.3: Six intent-targeted SEO landing pages share this template.
// One H1 per page (matches the search query), one Problem, one Solution
// block of four features, one Proof block of three honest metrics, FAQ,
// and a single CTA. Layout is deliberately short; long pages dilute
// intent match and bury the CTA.

export interface SeoLandingFeature {
    label: string;
    description: string;
}

export interface SeoLandingFaq {
    q: string;
    a: string;
}

export interface SeoLandingProps {
    /** Eyebrow text above H1 (intent label). */
    eyebrow: string;
    /** Primary H1; matches the search-query keyword. */
    h1: string;
    /** Single-sentence subhead under the H1. */
    subhead: string;
    /** One sentence stating who this page is for. */
    audience: string;
    /** Problem statement headline + two short paragraphs. */
    problem: { headline: string; paragraphs: [string, string] };
    /** Four solution features. */
    features: [SeoLandingFeature, SeoLandingFeature, SeoLandingFeature, SeoLandingFeature];
    /** Three honest metric / proof claims; keep numeric where possible. */
    proof: [SeoLandingFeature, SeoLandingFeature, SeoLandingFeature];
    /** Primary CTA label + href; secondary defaults to dashboard. */
    primaryCta: { label: string; href: string };
    /** Optional secondary CTA. */
    secondaryCta?: { label: string; href: string };
    /** Four-to-six page-specific FAQ entries. */
    faq: SeoLandingFaq[];
}

export function SeoLanding(props: SeoLandingProps) {
    const jsonLd = {
        '@context': 'https://schema.org',
        '@graph': [
            {
                '@type': 'WebPage',
                name: props.h1,
                description: props.subhead,
                isPartOf: { '@type': 'WebSite', name: 'P402', url: 'https://p402.io' },
            },
            {
                '@type': 'FAQPage',
                mainEntity: props.faq.map((e) => ({
                    '@type': 'Question',
                    name: e.q,
                    acceptedAnswer: { '@type': 'Answer', text: e.a },
                })),
            },
        ],
    };

    return (
        <>
            <script
                type="application/ld+json"
                dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
            />
            <TopNav />

            <main className="bg-white text-black">
                {/* ── Hero ──────────────────────────────────────────────────── */}
                <section className="max-w-5xl mx-auto px-6 pt-16 pb-12">
                    <p className="text-[10px] font-black uppercase tracking-[0.25em] text-neutral-500 mb-4">
                        {props.eyebrow}
                    </p>
                    <h1 className="text-4xl lg:text-6xl font-black uppercase tracking-tighter leading-[0.95] max-w-4xl">
                        {props.h1}
                    </h1>
                    <p className="text-lg text-neutral-700 font-medium mt-6 max-w-2xl leading-relaxed">
                        {props.subhead}
                    </p>
                    <p className="text-[12px] font-mono text-neutral-500 mt-3">
                        {props.audience}
                    </p>

                    <div className="flex flex-wrap gap-3 mt-8">
                        <Link
                            href={props.primaryCta.href}
                            className="inline-flex items-center h-11 px-6 bg-primary border-2 border-black font-black text-[11px] uppercase tracking-wider hover:bg-black hover:text-primary transition-colors no-underline"
                        >
                            {props.primaryCta.label}
                        </Link>
                        {props.secondaryCta && (
                            <Link
                                href={props.secondaryCta.href}
                                className="inline-flex items-center h-11 px-6 border-2 border-black font-black text-[11px] uppercase tracking-wider hover:bg-neutral-50 transition-colors no-underline"
                            >
                                {props.secondaryCta.label}
                            </Link>
                        )}
                    </div>
                </section>

                {/* ── Problem ───────────────────────────────────────────────── */}
                <section className="border-t-2 border-black bg-neutral-50">
                    <div className="max-w-5xl mx-auto px-6 py-14">
                        <p className="text-[10px] font-black uppercase tracking-[0.25em] text-neutral-500 mb-4">
                            The problem
                        </p>
                        <h2 className="text-3xl font-black uppercase tracking-tighter max-w-3xl">
                            {props.problem.headline}
                        </h2>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6">
                            {props.problem.paragraphs.map((p, i) => (
                                <p key={i} className="text-[15px] text-neutral-700 font-medium leading-relaxed">
                                    {p}
                                </p>
                            ))}
                        </div>
                    </div>
                </section>

                {/* ── Solution / features ───────────────────────────────────── */}
                <section className="border-t-2 border-black">
                    <div className="max-w-5xl mx-auto px-6 py-14">
                        <p className="text-[10px] font-black uppercase tracking-[0.25em] text-neutral-500 mb-4">
                            What P402 does
                        </p>
                        <h2 className="text-3xl font-black uppercase tracking-tighter max-w-3xl">
                            One ledger. Owner, budget, policy, outcome, evidence.
                        </h2>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-0 border-2 border-black mt-8 divide-y-2 md:divide-y-0 md:divide-x-2 md:[&>*:nth-child(n+3)]:border-t-2 [&>*:nth-child(n+3)]:border-black divide-black">
                            {props.features.map((feature) => (
                                <div key={feature.label} className="p-6 bg-white">
                                    <div className="text-[10px] font-black uppercase tracking-widest text-black mb-2">
                                        {feature.label}
                                    </div>
                                    <p className="text-[14px] text-neutral-700 font-medium leading-relaxed">
                                        {feature.description}
                                    </p>
                                </div>
                            ))}
                        </div>
                    </div>
                </section>

                {/* ── Proof ─────────────────────────────────────────────────── */}
                <section className="border-t-2 border-black bg-black text-white">
                    <div className="max-w-5xl mx-auto px-6 py-14">
                        <p className="text-[10px] font-black uppercase tracking-[0.25em] text-primary mb-4">
                            Proof
                        </p>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mt-4">
                            {props.proof.map((p) => (
                                <div key={p.label} className="space-y-2">
                                    <div className="text-3xl font-black tracking-tighter text-primary leading-none">
                                        {p.label}
                                    </div>
                                    <p className="text-[13px] text-neutral-300 font-medium leading-relaxed">
                                        {p.description}
                                    </p>
                                </div>
                            ))}
                        </div>
                    </div>
                </section>

                {/* ── FAQ ───────────────────────────────────────────────────── */}
                <section className="border-t-2 border-black">
                    <div className="max-w-3xl mx-auto px-6 py-14">
                        <p className="text-[10px] font-black uppercase tracking-[0.25em] text-neutral-500 mb-4">
                            Questions
                        </p>
                        <h2 className="text-3xl font-black uppercase tracking-tighter mb-8">
                            {props.eyebrow.toLowerCase()}: FAQ
                        </h2>
                        <div className="space-y-6">
                            {props.faq.map((entry) => (
                                <div key={entry.q} className="border-l-2 border-black pl-4">
                                    <h3 className="text-[14px] font-black uppercase tracking-widest text-black mb-2">
                                        {entry.q}
                                    </h3>
                                    <p className="text-[14px] text-neutral-700 font-medium leading-relaxed">
                                        {entry.a}
                                    </p>
                                </div>
                            ))}
                        </div>
                    </div>
                </section>

                {/* ── Final CTA ─────────────────────────────────────────────── */}
                <section className="border-t-2 border-black bg-primary">
                    <div className="max-w-5xl mx-auto px-6 py-14 flex flex-col items-start gap-6">
                        <h2 className="text-3xl lg:text-4xl font-black uppercase tracking-tighter max-w-3xl">
                            Stop billing surprises. Start metering.
                        </h2>
                        <div className="flex flex-wrap gap-3">
                            <Link
                                href={props.primaryCta.href}
                                className="inline-flex items-center h-11 px-6 bg-black text-primary border-2 border-black font-black text-[11px] uppercase tracking-wider hover:bg-white hover:text-black transition-colors no-underline"
                            >
                                {props.primaryCta.label}
                            </Link>
                            <Link
                                href="/pricing"
                                className="inline-flex items-center h-11 px-6 bg-transparent border-2 border-black font-black text-[11px] uppercase tracking-wider hover:bg-black hover:text-primary transition-colors no-underline"
                            >
                                See pricing →
                            </Link>
                        </div>
                    </div>
                </section>
            </main>

            <Footer />
        </>
    );
}
