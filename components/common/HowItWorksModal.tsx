'use client';
import React, { useState } from 'react';
import { Card, Button, Badge } from '@/app/dashboard/_components/ui';
import { X, Shield, Brain, Zap, Cpu, Activity, Database } from 'lucide-react';
import { clsx } from 'clsx';

export function HowItWorksModal({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
    const [step, setStep] = useState(0);

    if (!isOpen) return null;

    const steps = [
        {
            title: "1. The Sentinel (G3 Flash)",
            icon: <Shield className="text-[#22D3EE]" size={32} />,
            description: "Every incoming agent request is scanned in real-time. Gemini 3 Flash performs a sub-second forensic sweep for anomalies, security risks, and adversarial prompt injections.",
            tag: "G3 FLASH MONITORING",
            color: "#22D3EE"
        },
        {
            title: "2. Semantic Shield (Memory)",
            icon: <Database className="text-[#B6FF2E]" size={32} />,
            description: "P402 uses text-embedding-004 to match queries against its vector memory. If a similar intent is found, we serve the result immediately—interception at zero cost and sub-50ms latency.",
            tag: "ZERO-COST INTERCEPTION",
            color: "#B6FF2E"
        },
        {
            title: "3. Protocol Economist (G3 Pro)",
            icon: <Brain className="text-[#A855F7]" size={32} />,
            description: "The autonomous brain of the protocol. It analyzes your entire ledger to execute optimizations: model substitutions, rate limiting, and dynamic failover chains across 300+ models.",
            tag: "AUTONOMOUS GOVERNANCE",
            color: "#A855F7"
        },
        {
            title: "4. Proof of Settlement (x402)",
            icon: <Zap className="text-yellow-400" size={32} />,
            description: "Value is transferred atomicity via the x402 protocol. We support EIP-3009 gasless refueling and on-chain verification on Base L2, ensuring trustless settlement for every inference.",
            tag: "ATOMIC VERIFICATION",
            color: "#FACC15"
        },
        {
            title: "5. Thinking Trace (Senses)",
            icon: <Activity className="text-red-500" size={32} />,
            description: "Full observability into the AI's reasoning. Our SSE-based Senses layer streams exactly why the Economist made a decision, providing a transparent audit trail for enterprise governance.",
            tag: "REAL-TIME TELEMETRY",
            color: "#EF4444"
        }
    ];

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/90 backdrop-blur-md animate-in fade-in duration-500">
            <Card className="w-full max-w-3xl bg-neutral-900 p-0 overflow-hidden shadow-[20px_20px_0px_0px_rgba(182,255,46,0.3)] border-4 border-black">
                {/* Header */}
                <div className="flex justify-between items-center p-6 border-b-4 border-black bg-black text-white">
                    <div className="flex items-center gap-3">
                        <div className="w-3 h-3 bg-red-500 rounded-full animate-pulse" />
                        <h2 className="text-2xl font-black uppercase tracking-tighter italic">P402 Intelligence V3.0 ONBOARDING</h2>
                    </div>
                    <button onClick={onClose} className="hover:text-primary transition-colors">
                        <X size={24} />
                    </button>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-5 h-[450px]">
                    {/* Visual Pillar */}
                    <div className="lg:col-span-2 bg-black flex flex-col items-center justify-center p-8 text-center border-r-4 border-black relative overflow-hidden">
                        <div className="absolute inset-0 opacity-20 bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')]" />

                        <div className="relative z-10 space-y-6">
                            <div
                                className="w-24 h-24 rounded-none border-4 border-white flex items-center justify-center animate-spin-slow"
                                style={{ borderColor: steps[step]?.color || '#fff' }}
                            >
                                <Cpu size={48} className="text-white" />
                            </div>

                            <div className="space-y-2">
                                <div
                                    className="px-3 py-1 text-[10px] font-black uppercase tracking-widest"
                                    style={{ backgroundColor: steps[step]?.color || '#fff', color: 'black' }}
                                >
                                    {steps[step]?.tag}
                                </div>
                                <div className="text-[10px] font-mono font-bold text-neutral-500 uppercase tracking-widest">
                                    Step {step + 1} of {steps.length}
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Content Pillar */}
                    <div className="lg:col-span-3 p-10 flex flex-col justify-center bg-neutral-900">
                        <div className="space-y-8">
                            <div className="flex items-center gap-6">
                                <div className="w-16 h-16 bg-black border-2 border-neutral-800 flex items-center justify-center transform rotate-3">
                                    {steps[step]?.icon}
                                </div>
                                <h3 className="text-3xl font-black uppercase text-white tracking-tighter italic">
                                    {steps[step]?.title}
                                </h3>
                            </div>

                            <p className="text-lg font-medium leading-relaxed text-neutral-400">
                                {steps[step]?.description}
                            </p>

                            <div className="flex gap-2 pt-4">
                                {steps.map((_, i) => (
                                    <button
                                        key={i}
                                        onClick={() => setStep(i)}
                                        className={clsx(
                                            "h-1.5 flex-1 transition-all rounded-full",
                                            i === step ? "bg-primary scale-x-110" : "bg-neutral-800 hover:bg-neutral-700"
                                        )}
                                    />
                                ))}
                            </div>
                        </div>
                    </div>
                </div>

                {/* Footer Actions */}
                <div className="p-6 bg-black border-t-4 border-black flex justify-between gap-4">
                    <Button
                        variant="ghost"
                        className="text-white hover:bg-neutral-800"
                        onClick={() => setStep(Math.max(0, step - 1))}
                        disabled={step === 0}
                    >
                        PREVIOUS
                    </Button>

                    {step < steps.length - 1 ? (
                        <Button
                            className="bg-primary hover:bg-primary/90 text-black font-black px-8"
                            onClick={() => setStep(step + 1)}
                        >
                            CONTINUE MISSION &rarr;
                        </Button>
                    ) : (
                        <Button
                            className="bg-[#B6FF2E] hover:bg-[#B6FF2E]/90 text-black font-black px-8"
                            onClick={onClose}
                        >
                            INITIALIZE SYSTEM
                        </Button>
                    )}
                </div>
            </Card>
        </div>
    );
}
