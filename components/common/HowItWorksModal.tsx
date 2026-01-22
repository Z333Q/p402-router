'use client';
import React, { useState } from 'react';
import { Card, Button } from '@/app/dashboard/_components/ui';
import { X, Shield, Zap, Cpu, Activity, Database, Lock } from 'lucide-react';
import { clsx } from 'clsx';

export function HowItWorksModal({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
    const [step, setStep] = useState(0);

    if (!isOpen) return null;

    const steps = [
        {
            title: "1. Protocol Security",
            icon: <Shield className="text-[#22D3EE]" size={32} />,
            description: "P402 acts as a secure gateway for Agent-to-Agent (A2A) traffic. Every request is audited for security risks, adversarial patterns, and sensitive data leaks before reaching downstream providers.",
            tag: "A2A SECURITY",
            color: "#22D3EE"
        },
        {
            title: "2. Smart Caching",
            icon: <Database className="text-[#B6FF2E]" size={32} />,
            description: "Our system identifies redundant requests and serves them from a secure semantic cache. This eliminates unnecessary API calls, reducing your orchestration costs to zero for repeated queries.",
            tag: "COST OPTIMIZATION",
            color: "#B6FF2E"
        },
        {
            title: "3. Human Verification (A2P)",
            icon: <Lock className="text-[#A855F7]" size={32} />,
            description: "For high-value or high-risk transactions, the protocol triggers an Agent-to-Passenger (A2P) verification. This pushes a biometric approval request to the human owner's mobile device.",
            tag: "A2P GOVERNANCE",
            color: "#A855F7"
        },
        {
            title: "4. Atomic Settlement (x402)",
            icon: <Zap className="text-yellow-400" size={32} />,
            description: "Payments are settled trustlessly on-chain using the x402 standard. We support gasless refueling on Base L2, ensuring agents can transact seamlessly without holding native gas tokens.",
            tag: "TRUSTLESS PAYMENT",
            color: "#FACC15"
        },
        {
            title: "5. Transparent Auditing",
            icon: <Activity className="text-red-500" size={32} />,
            description: "Every decision, policy check, and settlement proof is recorded in a transparent audit trail. This provides enterprises with full observability into their autonomous agent expenditures.",
            tag: "FULL OBSERVABILITY",
            color: "#EF4444"
        }
    ];

    const currentStep = steps[step];

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/95 backdrop-blur-lg animate-in fade-in duration-500">
            <Card className="w-full max-w-3xl bg-neutral-900 p-0 overflow-hidden shadow-[20px_20px_0px_0px_rgba(34,211,238,0.2)] border-2 border-white/10">
                {/* Header */}
                <div className="flex justify-between items-center p-6 border-b border-white/10 bg-black text-white">
                    <div className="flex items-center gap-3">
                        <div className="w-2 h-2 bg-primary rounded-full animate-pulse" />
                        <h2 className="text-xl font-bold uppercase tracking-tight">P402 Protocol Implementation Guide</h2>
                    </div>
                    <button onClick={onClose} className="text-neutral-500 hover:text-white transition-colors">
                        <X size={20} />
                    </button>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-5 h-[420px]">
                    {/* Visual Pillar */}
                    <div className="lg:col-span-2 bg-black flex flex-col items-center justify-center p-8 text-center border-r border-white/10 relative overflow-hidden">
                        <div className="absolute inset-0 opacity-[0.03] pointer-events-none bg-[url('https://www.transparenttextures.com/patterns/stardust.png')]" />

                        <div className="relative z-10 space-y-6">
                            <div
                                className="w-20 h-20 rounded-xl border-2 flex items-center justify-center transition-colors duration-500"
                                style={{ borderColor: currentStep?.color || '#fff' }}
                            >
                                <Cpu size={40} className="text-white" />
                            </div>

                            <div className="space-y-2">
                                <div
                                    className="px-2 py-1 text-[9px] font-bold uppercase tracking-widest text-black inline-block"
                                    style={{ backgroundColor: currentStep?.color || '#fff' }}
                                >
                                    {currentStep?.tag}
                                </div>
                                <div className="text-[10px] font-mono text-neutral-500 uppercase tracking-widest">
                                    Step {step + 1} of {steps.length}
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Content Pillar */}
                    <div className="lg:col-span-3 p-10 flex flex-col justify-center bg-neutral-900">
                        <div className="space-y-6">
                            <div className="flex items-center gap-4">
                                <div className="w-12 h-12 bg-black border border-white/10 flex items-center justify-center rounded-lg">
                                    {currentStep?.icon}
                                </div>
                                <h3 className="text-2xl font-bold text-white tracking-tight">
                                    {currentStep?.title}
                                </h3>
                            </div>

                            <p className="text-base text-neutral-400 leading-relaxed font-medium">
                                {currentStep?.description}
                            </p>

                            <div className="flex gap-2 pt-4">
                                {steps.map((_, i) => (
                                    <button
                                        key={i}
                                        onClick={() => setStep(i)}
                                        className={clsx(
                                            "h-1 flex-1 transition-all rounded-full",
                                            i === step ? "bg-primary" : "bg-neutral-800 hover:bg-neutral-700"
                                        )}
                                    />
                                ))}
                            </div>
                        </div>
                    </div>
                </div>

                {/* Footer Actions */}
                <div className="p-6 bg-black border-t border-white/10 flex justify-between gap-4">
                    <Button
                        variant="ghost"
                        className="text-neutral-400 hover:text-white hover:bg-neutral-800"
                        onClick={() => setStep(Math.max(0, step - 1))}
                        disabled={step === 0}
                    >
                        PREVIOUS
                    </Button>

                    {step < steps.length - 1 ? (
                        <Button
                            className="bg-primary hover:bg-primary/90 text-black font-bold h-11 px-8"
                            onClick={() => setStep(step + 1)}
                        >
                            NEXT STEP
                        </Button>
                    ) : (
                        <Button
                            className="bg-[#B6FF2E] hover:bg-[#B6FF2E]/90 text-black font-bold h-11 px-8"
                            onClick={onClose}
                        >
                            GET STARTED
                        </Button>
                    )}
                </div>
            </Card>
        </div>
    );
}
