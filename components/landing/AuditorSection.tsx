'use client';

import React from 'react';
import { Badge, Button } from '@/app/dashboard/_components/ui';
import { Search, ShieldAlert, Zap, TrendingDown } from 'lucide-react';

export function AuditorSection() {
    return (
        <section className="py-32 bg-white border-y-8 border-black overflow-hidden relative">
            {/* Background Accent */}
            <div className="absolute top-0 right-0 w-1/3 h-full bg-[#B6FF2E] -skew-x-12 translate-x-32 hidden lg:block" />

            <div className="container mx-auto px-6 max-w-7xl relative z-10">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-24 items-center">
                    <div className="space-y-8">
                        <div>
                            <Badge variant="primary" className="mb-4">Cost Intelligence</Badge>
                            <h2 className="text-6xl font-black uppercase leading-[0.9] tracking-tighter italic">
                                Your Code is <br />
                                <span className="text-neutral-400">Burning Money.</span>
                            </h2>
                        </div>

                        <p className="text-xl text-neutral-600 leading-relaxed font-medium">
                            Most AI apps waste 30-50% on inefficient routing and redundant calls.
                            Our Auditor scans your repository, detects AI SDK usage, and provides
                            a line-by-line optimization plan.
                        </p>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <Feature
                                icon={<Search className="h-6 w-6" />}
                                title="Dependency Scan"
                                desc="Auto-detects OpenAI, Anthropic, Gemini, and Langchain usage."
                            />
                            <Feature
                                icon={<TrendingDown className="h-6 w-6" />}
                                title="Cost Simulation"
                                desc="Calculates real-world spend based on model token pricing."
                            />
                            <Feature
                                icon={<Zap className="h-6 w-6" />}
                                title="Smart Routing"
                                desc="Suggestions for switching to cost-optimal models like Haiku."
                            />
                            <Feature
                                icon={<ShieldAlert className="h-6 w-6" />}
                                title="Leak Detection"
                                desc="Finds zombie API calls and loops that drain your budget."
                            />
                        </div>

                        <div className="pt-8">
                            <Button
                                variant="dark"
                                size="lg"
                                className="h-16 px-12 text-xl"
                                onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
                            >
                                Start Your Audit
                            </Button>
                        </div>
                    </div>

                    <div className="relative">
                        {/* Fake Results Preview */}
                        <div className="border-4 border-black bg-[#141414] p-8 shadow-[24px_24px_0px_0px_rgba(182,255,46,1)] transform rotate-2">
                            <div className="flex justify-between items-center mb-8 border-b-2 border-neutral-800 pb-4">
                                <div className="font-mono text-[10px] text-neutral-500 uppercase tracking-widest">Audit Result: p402-v2-demo</div>
                                <Badge variant="danger">High Savings</Badge>
                            </div>

                            <div className="space-y-6">
                                <div className="space-y-2">
                                    <div className="text-[10px] font-bold text-neutral-500 uppercase">Current Monthly Spend</div>
                                    <div className="text-4xl font-black text-white">$4,280.42</div>
                                </div>

                                <div className="p-4 border-2 border-black bg-[#B6FF2E] space-y-2">
                                    <div className="text-[10px] font-bold text-black uppercase">P402 Optimized Spend</div>
                                    <div className="text-3xl font-black text-black">$2,140.21</div>
                                </div>

                                <div className="pt-4 space-y-3">
                                    <div className="text-[10px] font-bold text-neutral-500 uppercase">Top Recommendation</div>
                                    <div className="text-sm font-bold text-neutral-300">
                                        Route 80% of classification tasks to Claude 3 Haiku via P402 Orchestrator.
                                    </div>
                                    <div className="h-2 w-full bg-neutral-800">
                                        <div className="h-full w-3/4 bg-[#B6FF2E]" />
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Floating elements */}
                        <div className="absolute -top-12 -right-8 w-24 h-24 bg-white border-4 border-black flex items-center justify-center transform -rotate-12 animate-bounce">
                            <Zap className="h-12 w-12 text-[#B6FF2E] fill-current" />
                        </div>
                    </div>
                </div>
            </div>
        </section>
    );
}

function Feature({ icon, title, desc }: { icon: React.ReactNode, title: string, desc: string }) {
    return (
        <div className="space-y-2">
            <div className="w-12 h-12 border-4 border-black bg-neutral-50 flex items-center justify-center">
                {icon}
            </div>
            <h4 className="font-black uppercase text-sm tracking-tight">{title}</h4>
            <p className="text-xs text-neutral-500 leading-relaxed">{desc}</p>
        </div>
    );
}
