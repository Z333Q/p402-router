import Link from 'next/link';
import { Check } from 'lucide-react';

export function PricingStrip() {
    const plans = [
        {
            name: "Free",
            tag: "Experiment",
            price: "$0",
            fee: "1.00%",
            cta: "Get Started",
            href: "/login"
        },
        {
            name: "Pro",
            tag: "Operate",
            price: "$499",
            fee: "0.75%",
            cta: "Upgrade",
            href: "/dashboard/billing",
            popular: true
        },
        {
            name: "Enterprise",
            tag: "Govern",
            price: "Custom",
            fee: "0.40%",
            cta: "Contact Sales",
            href: "mailto:sales@p402.io"
        }
    ];

    return (
        <section className="py-24 bg-white border-t-2 border-black overflow-hidden">
            <div className="container mx-auto px-6 max-w-7xl">
                <div className="text-center mb-16">
                    <h2 className="text-4xl md:text-6xl font-black uppercase tracking-tighter mb-4 italic">
                        Transparent Economics
                    </h2>
                    <p className="font-mono text-sm uppercase text-neutral-500 tracking-widest">
                        Choose the tier that matches your production scale
                    </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-0 border-2 border-black shadow-[12px_12px_0px_#000]">
                    {plans.map((plan, i) => (
                        <div
                            key={plan.name}
                            className={`p-10 flex flex-col items-center text-center transition-all ${plan.popular ? 'bg-primary border-black md:border-x-2' : 'bg-white'
                                } ${i !== 0 && !plan.popular ? 'border-t-2 md:border-t-0 md:border-l-2 border-black' : ''}`}
                        >
                            <div className="text-[10px] font-black uppercase tracking-[0.3em] mb-2 opacity-60">{plan.tag}</div>
                            <h3 className="text-3xl font-black uppercase mb-4 tracking-tighter">{plan.name}</h3>
                            <div className="text-5xl font-black mb-2 tracking-tighter">{plan.price}</div>
                            <div className="text-xs font-bold uppercase tracking-widest mb-8">
                                <span className="opacity-60">Platform Fee:</span> {plan.fee}
                            </div>

                            <Link
                                href={plan.href}
                                className={`w-full py-4 font-black uppercase tracking-widest text-sm border-2 border-black transition-all ${plan.popular ? 'bg-black text-white hover:bg-white hover:text-black' : 'bg-white text-black hover:bg-primary'
                                    }`}
                            >
                                {plan.cta}
                            </Link>
                        </div>
                    ))}
                </div>

                <div className="mt-12 text-center">
                    <Link
                        href="/pricing"
                        className="font-black uppercase tracking-widest text-sm border-b-2 border-black hover:text-primary hover:border-primary transition-all pb-1"
                    >
                        View full pricing & upgrade math &rarr;
                    </Link>
                </div>
            </div>
        </section>
    );
}
