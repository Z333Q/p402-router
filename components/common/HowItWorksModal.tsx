'use client';
import React, { useState } from 'react';
import { Card, Button, Badge } from '@/app/dashboard/_components/ui';
import { X, Play, Shield, Globe, Zap } from 'lucide-react';
import { clsx } from 'clsx';

export function HowItWorksModal({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
    const [step, setStep] = useState(0);

    if (!isOpen) return null;

    const steps = [
        {
            title: "1. The Plan",
            icon: <Globe className="text-primary" size={32} />,
            description: "An agent requests a service. P402 Router matches the request to the best available Facilitator based on price, performance, and reputation."
        },
        {
            title: "2. The Challenge",
            icon: <Shield className="text-warn" size={32} />,
            description: "The Router issues an HTTP 402 challenge. The agent must provide a valid service proof or fulfill a micro-transaction mandate."
        },
        {
            title: "3. Verification",
            icon: <Zap className="text-success" size={32} />,
            description: "P402 verifies the transaction on Base L2. We use EIP-712 proofs to ensure the service was rendered and the payment is secure."
        },
        {
            title: "4. Settlement",
            icon: <Shield className="text-primary" size={32} />,
            description: "Funds are trustlessly settled directly to the service provider's treasury, with protocol fees collected by the P402 Smart Contract."
        }
    ];

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-300">
            <Card className="w-full max-w-2xl bg-white p-0 overflow-hidden shadow-[12px_12px_0px_0px_rgba(182,255,46,1)] border-4 border-black">
                <div className="flex justify-between items-center p-6 border-b-4 border-black bg-black text-white">
                    <h2 className="text-2xl font-black uppercase tracking-tighter italic">How It Works</h2>
                    <button onClick={onClose} className="hover:text-primary transition-colors">
                        <X size={24} />
                    </button>
                </div>

                <div className="p-8">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-center">
                        <div className="space-y-6">
                            {steps[step] && (
                                <>
                                    <div className="flex items-center gap-4">
                                        <div className="w-12 h-12 bg-neutral-100 border-2 border-black flex items-center justify-center transform -rotate-3">
                                            {steps[step].icon}
                                        </div>
                                        <h3 className="text-xl font-black uppercase text-black">{steps[step].title}</h3>
                                    </div>
                                    <p className="text-sm font-medium leading-relaxed text-neutral-600">
                                        {steps[step].description}
                                    </p>
                                </>
                            )}
                            <div className="flex gap-2">
                                {steps.map((_, i) => (
                                    <div
                                        key={i}
                                        className={clsx(
                                            "h-2 flex-1 border border-black transition-all",
                                            i <= step ? "bg-primary" : "bg-neutral-100"
                                        )}
                                    />
                                ))}
                            </div>
                        </div>

                        <div className="bg-neutral-900 aspect-video border-4 border-black flex flex-col items-center justify-center p-6 text-center space-y-4">
                            <div className="text-primary animate-bounce">
                                <Shield size={48} />
                            </div>
                            <div className="text-[10px] font-mono font-bold text-neutral-500 uppercase tracking-widest">
                                Transaction Integrity Guarded by Base L2
                            </div>
                        </div>
                    </div>
                </div>

                <div className="p-6 bg-neutral-50 border-t-2 border-black flex justify-between gap-4">
                    <Button
                        variant="secondary"
                        onClick={() => setStep(Math.max(0, step - 1))}
                        disabled={step === 0}
                    >
                        Previous
                    </Button>
                    {step < steps.length - 1 ? (
                        <Button onClick={() => setStep(step + 1)}>
                            Next Step
                        </Button>
                    ) : (
                        <Button variant="dark" onClick={onClose}>
                            Got it, Let's Go!
                        </Button>
                    )}
                </div>
            </Card>
        </div>
    );
}
