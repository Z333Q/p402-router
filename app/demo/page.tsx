'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { DemoScreen } from '@/components/demo/DemoScreen';
import Link from 'next/link';

// Animation phases
type Phase = 'REQUEST' | '402' | 'PAY' | 'RETRY' | 'RECEIPT' | 'REUSE' | 'AUDIT_FAIL' | 'AUDIT_PASS' | 'AUDIT_EXPORT';

export default function DemoPage() {
    const [phase, setPhase] = useState<Phase>('REQUEST');

    useEffect(() => {
        let isMounted = true;

        const runSequence = async () => {
            if (!isMounted) return;

            // 1. REQUEST Phase
            setPhase('REQUEST');
            await wait(2000);
            if (!isMounted) return;

            // 2. 402 Phase
            setPhase('402');
            await wait(2500);
            if (!isMounted) return;

            // 3. PAY Phase
            setPhase('PAY');
            await wait(1500);
            if (!isMounted) return;

            // 4. RETRY Phase
            setPhase('RETRY');
            await wait(2500);
            if (!isMounted) return;

            // 5. RECEIPT Phase
            setPhase('RECEIPT');
            await wait(2500);
            if (!isMounted) return;

            // 6. REUSE Phase
            setPhase('REUSE');
            await wait(3000);
            if (!isMounted) return;

            // 7. AUDIT FAIL Phase
            setPhase('AUDIT_FAIL');
            await wait(3000);
            if (!isMounted) return;

            // 8. AUDIT PASS Phase
            setPhase('AUDIT_PASS');
            await wait(2000);
            if (!isMounted) return;

            // 9. AUDIT EXPORT Phase
            setPhase('AUDIT_EXPORT');
            await wait(4000);
            if (!isMounted) return;

            // Loop
            runSequence();
        };

        runSequence();

        return () => {
            isMounted = false;
        };
    }, []);

    const wait = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

    // Determine the visual state of the screen based on the phase
    const getScreenState = (): 'request' | '402' | 'success' | 'receipt' | 'logs' | 'audit_fail' | 'audit_pass' | 'audit_export' => {
        switch (phase) {
            case 'REQUEST': return 'request';
            case '402': return '402';
            case 'PAY': return '402';
            case 'RETRY': return 'success';
            case 'RECEIPT': return 'receipt';
            case 'REUSE': return 'logs';
            case 'AUDIT_FAIL': return 'audit_fail';
            case 'AUDIT_PASS': return 'audit_pass';
            case 'AUDIT_EXPORT': return 'audit_export';
            default: return 'request';
        }
    };

    return (
        <div className="min-h-screen bg-[#E5E5E5] flex flex-col items-center justify-center p-8 font-sans">

            {/* Container Frame */}
            <div className="relative w-full max-w-5xl aspect-video bg-white border-[2px] border-black shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] overflow-hidden flex flex-col">

                {/* Screen Content */}
                <div className="flex-1 relative">
                    <AnimatePresence mode="wait">
                        <motion.div
                            key={getScreenState()}
                            initial={{ opacity: 1 }} // Hard cut preference
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 1 }} // Hard cut preference
                            transition={{ duration: 0.08 }} // 80ms cut
                            className="absolute inset-0"
                        >
                            <DemoScreen state={getScreenState()} />
                        </motion.div>
                    </AnimatePresence>

                    {/* Payment Overlay Animation */}
                    <AnimatePresence>
                        {phase === 'PAY' && (
                            <motion.div
                                initial={{ y: '100%' }}
                                animate={{ y: 0 }}
                                exit={{ y: '100%' }}
                                transition={{ type: 'spring', bounce: 0, duration: 0.3 }}
                                className="absolute bottom-0 left-0 right-0 bg-black text-white p-6 border-t-2 border-[#B6FF2E] z-40"
                            >
                                <div className="flex items-center justify-between">
                                    <div className="font-mono text-[#B6FF2E]">SIGNING_EVENT: EIP-712_MANDATE_SIGNED</div>
                                    <div className="w-4 h-4 bg-[#B6FF2E] animate-pulse" />
                                </div>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>

                {/* Overlay Text (Top Right) */}
                <div className="absolute top-8 right-8 flex gap-2 pointer-events-none z-50">
                    {['REQUEST', '402', 'PAY', 'RETRY', 'RECEIPT REUSE', 'AUDIT'].map((step) => {
                        // Map composite steps
                        const isActive =
                            (step === 'RECEIPT REUSE' && (phase === 'RECEIPT' || phase === 'REUSE')) ||
                            (step === 'AUDIT' && (phase.startsWith('AUDIT'))) ||
                            step === phase;

                        return (
                            <div
                                key={step}
                                className={`
                  px-2 py-1 text-xs font-bold border-2 border-black transition-colors duration-150 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]
                  ${isActive
                                        ? 'bg-black text-white'
                                        : 'bg-white text-black opacity-50'}
                `}
                            >
                                {step}
                            </div>
                        );
                    })}
                </div>

                {/* VO Captions (Bottom) */}
                <div className="absolute bottom-12 left-0 right-0 flex justify-center pointer-events-none z-50">
                    <AnimatePresence mode="wait">
                        <motion.div
                            key={phase}
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -10 }}
                            className="bg-[#B6FF2E] text-black px-4 py-2 border-2 border-black max-w-xl text-center font-sans font-bold text-lg shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]"
                        >
                            {phase === 'REQUEST' && "Agent requests service. Gateway discovers cost."}
                            {phase === '402' && "402 Payment Required. Negotiating terms."}
                            {phase === 'PAY' && "Agent signs EIP-712 mandate. Settling USDC on Base."}
                            {phase === 'RETRY' && "Request retried with cryptographic proof."}
                            {(phase === 'RECEIPT' || phase === 'REUSE') && "Sovereign session established. Zero-friction reuse."}
                            {phase === 'AUDIT_FAIL' && "Real-time audit verifies policy compliance."}
                            {phase === 'AUDIT_PASS' && "Findings fixed. Proof verified."}
                            {phase === 'AUDIT_EXPORT' && "Exporting evidence for machine governance."}
                        </motion.div>
                    </AnimatePresence>
                </div>

            </div>

            {/* CTA Link */}
            <div className="mt-12 flex justify-center">
                <Link
                    href="https://www.p402.io/demo/payment-flow"
                    className="px-8 py-4 bg-[#B6FF2E] border-2 border-black font-black uppercase tracking-tighter shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] hover:translate-x-[-2px] hover:translate-y-[-2px] hover:shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] active:translate-x-[0px] active:translate-y-[0px] active:shadow-none transition-all text-base hover:bg-black hover:text-white"
                >
                    Build Your First Payment Flow →
                </Link>
            </div>
        </div>
    );
}
