'use client';
import React, { useState } from 'react';
import { HowItWorksModal } from '@/components/common/HowItWorksModal';
import { Play } from 'lucide-react';

export function LandingGuide() {
    const [helpOpen, setHelpOpen] = useState(false);

    return (
        <section className="py-12 bg-neutral-100 border-y-2 border-black">
            <div className="container mx-auto px-6 max-w-7xl">
                <div className="flex flex-col md:flex-row items-center justify-between gap-8 bg-white border-4 border-black p-8 shadow-[12px_12px_0px_0px_rgba(0,0,0,1)] relative overflow-hidden group">
                    <div className="absolute inset-0 bg-primary/3 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" />

                    <div className="flex-1 space-y-4 relative z-10">
                        <div className="badge badge-info bg-[#A855F7] text-white border-2 border-black font-black uppercase text-[10px] tracking-widest px-3 shadow-[2px_2px_0px_#000]">Security Protocol v3.0</div>
                        <h2 className="text-4xl font-black uppercase tracking-tighter text-black italic">
                            THE A2A PAYMENT RAIL IN 60 SECONDS
                        </h2>
                        <p className="text-neutral-600 font-medium text-lg leading-relaxed max-w-2xl">
                            New to P402? Walk through our implementation guide to see how our Gemini-vetted infrastructure handles
                            A2A security, smart cost-interception, and trustless x402 settlement.
                        </p>
                    </div>

                    <div className="flex-shrink-0 relative z-10">
                        <button
                            onClick={() => setHelpOpen(true)}
                            className="btn btn-primary px-10 py-5 flex items-center gap-4 text-xl font-black uppercase italic tracking-tighter shadow-[4px_4px_0px_#000] hover:translate-x-1 hover:translate-y-1 hover:shadow-none transition-all"
                        >
                            <Play size={24} fill="currentColor" />
                            Start Interactive Guide
                        </button>
                    </div>
                </div>
            </div>

            <HowItWorksModal isOpen={helpOpen} onClose={() => setHelpOpen(false)} />
        </section>
    );
}
