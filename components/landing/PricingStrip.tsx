/**
 * 3AZ-2-D — Landing-page pricing strip refresh.
 *
 * Replaces the 3AX-era Free / Pro $499 / Enterprise teaser (with stale
 * "Platform Fee" BPS numbers) with the V5-led hybrid ladder shipped at
 * commit e1b20c2. Three slots chosen to match the public funnel:
 *   - Sandbox (free entry)
 *   - Build (first paid self-serve SKU)
 *   - Growth (the core production tier)
 *
 * All prices come from lib/pricing/rate-card.ts so a price change in
 * one place updates every public surface.
 *
 * CTAs route through /get-access?intent=… which is the live V5 funnel
 * surface. Build will eventually go straight to Stripe checkout once
 * 3AY-8R-Impl-4 ships; until then the access-request form (3AY-8R-3)
 * captures the intent.
 */

import Link from 'next/link';
import { PLANS, formatUsd } from '@/lib/pricing/rate-card';

interface PlanSlot {
    name: string;
    tag: string;
    price: string;
    suffix: string;
    description: string;
    cta: string;
    href: string;
    popular?: boolean;
}

const SLOTS: PlanSlot[] = [
    {
        name: PLANS.sandbox.name,
        tag: 'Evaluate',
        price: formatUsd(PLANS.sandbox.monthlyPriceAnnualUsd),
        suffix: '/month',
        description: `${(PLANS.sandbox.includedEventsPerMonth ?? 0).toLocaleString('en-US')} metered events. Hard cap.`,
        cta: 'Start free',
        href: '/login',
    },
    {
        name: PLANS.build.name,
        tag: 'Build',
        price: formatUsd(PLANS.build.monthlyPriceAnnualUsd),
        suffix: '/month',
        description: `${(PLANS.build.includedEventsPerMonth ?? 0).toLocaleString('en-US')} events. ${PLANS.build.retentionDays}-day retention.`,
        cta: 'Start Build',
        href: '/get-access?intent=build',
        popular: true,
    },
    {
        name: PLANS.growth.name,
        tag: 'Operate',
        price: formatUsd(PLANS.growth.monthlyPriceAnnualUsd),
        suffix: '/month',
        description: `${(PLANS.growth.includedEventsPerMonth ?? 0).toLocaleString('en-US')} events. ${PLANS.growth.retentionDays}-day retention.`,
        cta: 'Start Growth',
        href: '/get-access?intent=growth',
    },
];

export function PricingStrip() {
    return (
        <section className="py-24 bg-white border-t-2 border-black overflow-hidden">
            <div className="container mx-auto px-6 max-w-7xl">
                <div className="text-center mb-16">
                    <h2 className="text-4xl md:text-6xl font-black uppercase tracking-tighter mb-4 italic">
                        Transparent Economics
                    </h2>
                    <p className="font-mono text-sm uppercase text-neutral-500 tracking-widest">
                        Free Sandbox. Production plans usage-based. Enterprise sales-led.
                    </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-0 border-2 border-black shadow-[12px_12px_0px_#000]">
                    {SLOTS.map((slot, i) => (
                        <div
                            key={slot.name}
                            className={`p-10 flex flex-col items-center text-center transition-all ${slot.popular ? 'bg-primary border-black md:border-x-2' : 'bg-white'} ${i !== 0 && !slot.popular ? 'border-t-2 md:border-t-0 md:border-l-2 border-black' : ''}`}
                        >
                            <div className="text-[10px] font-black uppercase tracking-[0.3em] mb-2 opacity-60">{slot.tag}</div>
                            <h3 className="text-3xl font-black uppercase mb-4 tracking-tighter">{slot.name}</h3>
                            <div className="text-5xl font-black mb-1 tracking-tighter">{slot.price}</div>
                            <div className="text-[11px] font-bold uppercase tracking-widest mb-3 opacity-60">{slot.suffix}</div>
                            <p className="text-xs font-medium text-neutral-700 mb-8 leading-relaxed">
                                {slot.description}
                            </p>

                            <Link
                                href={slot.href}
                                className={`w-full py-4 font-black uppercase tracking-widest text-sm border-2 border-black transition-all ${slot.popular ? 'bg-black text-white hover:bg-white hover:text-black' : 'bg-white text-black hover:bg-primary'}`}
                            >
                                {slot.cta}
                            </Link>
                        </div>
                    ))}
                </div>

                <div className="mt-12 text-center">
                    <Link
                        href="/pricing"
                        className="font-black uppercase tracking-widest text-sm border-b-2 border-black hover:text-primary hover:border-primary transition-all pb-1"
                    >
                        View full pricing, Scale, and Enterprise &rarr;
                    </Link>
                </div>
            </div>
        </section>
    );
}
