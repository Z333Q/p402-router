import React from 'react';
import Link from 'next/link';
import { ArrowRight } from 'lucide-react';

const STEPS = [
    {
        number: '01',
        title: 'Get your key',
        timeLabel: '30 seconds',
        description: 'Sign up free. Your API key is ready immediately — no credit card, no wallet required to start.',
        action: { label: 'Create Free Account', href: '/login' },
        code: null,
        accent: '#B6FF2E',
    },
    {
        number: '02',
        title: 'Swap one URL',
        timeLabel: '1 line of code',
        description: 'Replace your provider base URL. That\'s it. Your existing OpenAI SDK, same models, same interface.',
        action: null,
        code: 'https://p402.io/api/v2',
        accent: '#22D3EE',
    },
    {
        number: '03',
        title: 'Watch costs drop',
        timeLabel: 'Automatic',
        description: 'P402 routes each request to the optimal model. Every call is logged with cost, latency, and savings. Payments settle on Base.',
        action: { label: 'Run quickstart', href: '/developers/quickstart' },
        code: null,
        accent: '#22C55E',
    },
];

export function HowItWorks() {
    return (
        <section className="py-20 bg-neutral-50 border-y-2 border-black">
            <div className="container mx-auto px-6 max-w-7xl">

                <div className="mb-12">
                    <div className="text-[10px] font-black uppercase tracking-widest text-neutral-500 mb-2">How it works</div>
                    <h2 className="text-4xl font-black uppercase tracking-tighter text-black">
                        Up and running in minutes.
                    </h2>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-0 border-2 border-black">
                    {STEPS.map((step, i) => (
                        <div
                            key={step.number}
                            className={`p-8 flex flex-col gap-5 bg-white ${i < STEPS.length - 1 ? 'border-b-2 md:border-b-0 md:border-r-2 border-black' : ''}`}
                        >
                            {/* Step number + time */}
                            <div className="flex items-center justify-between">
                                <span
                                    className="font-black text-5xl leading-none"
                                    style={{ color: step.accent }}
                                >
                                    {step.number}
                                </span>
                                <span className="font-mono text-[9px] font-bold uppercase tracking-widest text-neutral-400 border border-neutral-200 px-2 py-1">
                                    {step.timeLabel}
                                </span>
                            </div>

                            <div>
                                <h3 className="text-xl font-black uppercase tracking-tight text-black mb-2">{step.title}</h3>
                                <p className="text-sm font-medium text-neutral-600 leading-relaxed">{step.description}</p>
                            </div>

                            {/* Code snippet */}
                            {step.code && (
                                <div className="border-2 border-black bg-[#0D0D0D] px-4 py-3 font-mono text-xs">
                                    <span className="text-neutral-500">baseURL: </span>
                                    <span style={{ color: step.accent }}>{`'${step.code}'`}</span>
                                </div>
                            )}

                            {/* CTA */}
                            {step.action && (
                                <Link
                                    href={step.action.href}
                                    className="mt-auto inline-flex items-center gap-2 font-black text-[11px] uppercase tracking-widest text-black border-b-2 border-black w-fit hover:border-transparent group transition-all"
                                >
                                    {step.action.label}
                                    <ArrowRight size={12} className="group-hover:translate-x-1 transition-transform" />
                                </Link>
                            )}
                        </div>
                    ))}
                </div>

                {/* Connector arrows (desktop only, decorative) */}
                <div className="hidden md:flex items-center justify-center mt-8 gap-2 text-[10px] font-black uppercase tracking-widest text-neutral-400">
                    <span>Average first call:</span>
                    <span className="text-black font-black">under 5 minutes from landing here</span>
                </div>
            </div>
        </section>
    );
}
