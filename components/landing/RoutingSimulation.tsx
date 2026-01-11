'use client';
import React, { useState, useEffect } from 'react';
import { clsx } from 'clsx';

const PROVIDERS = ['OPENAI', 'ANTHROPIC', 'COHERE', 'MISTRAL', 'GROQ'];
const MODES = ['CHEAPEST', 'FASTEST', 'BALANCED'];

export function RoutingSimulation() {
    const [step, setStep] = useState(0);
    const [selectedProvider, setSelectedProvider] = useState('');
    const [mode, setMode] = useState(MODES[0]);

    useEffect(() => {
        const interval = setInterval(() => {
            setStep((s) => (s + 1) % 4);
            if (step === 3) {
                const randomProvider = PROVIDERS[Math.floor(Math.random() * PROVIDERS.length)] ?? PROVIDERS[0] ?? '';
                const randomMode = MODES[Math.floor(Math.random() * MODES.length)] ?? MODES[0] ?? 'CHEAPEST';
                setSelectedProvider(randomProvider);
                setMode(randomMode);
            }
        }, 2000);
        return () => clearInterval(interval);
    }, [step]);

    return (
        <div className="card p-0 border-2 border-black bg-white shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] relative overflow-hidden group h-[500px] flex flex-col">
            <div className="absolute inset-0 bg-primary/2 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none animate-scanline" />

            {/* Window Header */}
            <div className="border-b-2 border-black p-4 flex justify-between items-center bg-white relative z-10">
                <div className="font-black uppercase text-[10px] tracking-[0.2em] text-black">X402 REQUEST FLOW</div>
                <div className="flex gap-1.5">
                    <div className="w-2.5 h-2.5 bg-[#FF5F56] border border-black" />
                    <div className="w-2.5 h-2.5 bg-[#FFBD2E] border border-black" />
                    <div className="w-2.5 h-2.5 bg-[#27C93F] border border-black" />
                </div>
            </div>

            <div className="p-6 space-y-2 flex-1 relative z-10">
                <div className="text-[10px] font-medium text-neutral-400 mb-6 font-mono italic">Four steps. One decision trace.</div>

                {[
                    { id: 1, title: 'Buyer requests a paid endpoint', sub: 'Standard HTTP request.' },
                    { id: 2, title: 'Server returns 402', sub: 'PAYMENT-REQUIRED includes base64 requirements.' },
                    { id: 3, title: 'Buyer retries with payment', sub: 'PAYMENT-SIGNATURE includes signed payload.' },
                    { id: 4, title: 'Server verifies and settles', sub: 'Facilitator verifies, settles, returns PAYMENT-RESPONSE.' }
                ].map((s, i) => (
                    <div
                        key={s.id}
                        className={clsx(
                            "p-3 flex gap-4 transition-all duration-300",
                            step === i ? "bg-primary/10 border-2 border-primary scale-[1.02]" : "border-2 border-transparent opacity-50 grayscale"
                        )}
                    >
                        <div className={clsx(
                            "w-6 h-6 flex items-center justify-center font-black text-xs shrink-0 border-2 border-black",
                            step === i ? "bg-primary text-black" : "bg-white text-black"
                        )}>
                            {s.id}
                        </div>
                        <div className="space-y-0.5">
                            <div className="text-[11px] font-black uppercase tracking-tight">{s.title}</div>
                            <div className="text-[9px] font-medium text-neutral-500 font-mono">{s.sub}</div>
                        </div>
                    </div>
                ))}
            </div>

            {/* Headers Fixed Block */}
            <div className="bg-neutral-900 p-6 text-primary font-mono space-y-3 relative z-10">
                <div className="text-[9px] font-black uppercase tracking-[0.3em] text-neutral-500 mb-2 font-sans italic">HEADERS</div>
                <div className={clsx("text-[10px] transition-opacity", step >= 1 ? "opacity-100" : "opacity-30")}>PAYMENT-REQUIRED</div>
                <div className={clsx("text-[10px] transition-opacity", step >= 2 ? "opacity-100" : "opacity-30")}>PAYMENT-SIGNATURE</div>
                <div className={clsx("text-[10px] transition-opacity", step >= 3 ? "opacity-100" : "opacity-30")}>PAYMENT-RESPONSE</div>
            </div>
        </div>
    );
}
