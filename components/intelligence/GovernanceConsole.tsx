'use client';

import { cn } from '@/lib/utils';
import { ShieldCheck, Zap, Lock, Unlock, Check, X, AlertCircle } from 'lucide-react';

interface GovernanceConsoleProps {
    mode: 'autonomous' | 'approval';
    pendingOptimizations: any[];
    onModeChange: (mode: 'autonomous' | 'approval') => void;
    onApprove: (id: string) => void;
    onReject: (id: string) => void;
    className?: string;
}

export function GovernanceConsole({
    mode,
    pendingOptimizations,
    onModeChange,
    onApprove,
    onReject,
    className
}: GovernanceConsoleProps) {
    return (
        <div className={cn("space-y-6", className)}>
            {/* Mode Selector */}
            <div className="border-4 border-neutral-900 bg-white p-6 shadow-[8px_8px_0px_0px_rgba(0,0,0,1)]">
                <div className="flex items-center justify-between mb-6">
                    <h3 className="text-xl font-black uppercase tracking-tight flex items-center gap-2">
                        <ShieldCheck className="w-6 h-6" />
                        Guardian Mode
                    </h3>
                    <div className={cn(
                        "text-[10px] font-black px-2 py-1 border-2 uppercase tracking-widest",
                        mode === 'autonomous' ? "bg-green-100 text-green-800 border-green-800" : "bg-amber-100 text-amber-800 border-amber-800"
                    )}>
                        {mode === 'autonomous' ? 'FULLY AUTONOMOUS' : 'APPROVAL REQUIRED'}
                    </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                    <button
                        onClick={() => onModeChange('autonomous')}
                        className={cn(
                            "flex flex-col items-center justify-center p-4 border-4 transition-all duration-75",
                            mode === 'autonomous'
                                ? "border-neutral-900 bg-neutral-900 text-white translate-x-1 translate-y-1 shadow-none"
                                : "border-neutral-300 bg-neutral-50 text-neutral-400 hover:border-neutral-900 hover:text-neutral-900 shadow-[4px_4px_0px_0px_rgba(0,0,0,0.1)]"
                        )}
                    >
                        <Zap className="w-8 h-8 mb-2" />
                        <span className="font-black uppercase text-xs">Autonomous</span>
                        <span className="text-[10px] opacity-60 font-bold mt-1">AI executes instantly</span>
                    </button>

                    <button
                        onClick={() => onModeChange('approval')}
                        className={cn(
                            "flex flex-col items-center justify-center p-4 border-4 transition-all duration-75",
                            mode === 'approval'
                                ? "border-neutral-900 bg-neutral-900 text-white translate-x-1 translate-y-1 shadow-none"
                                : "border-neutral-300 bg-neutral-50 text-neutral-400 hover:border-neutral-900 hover:text-neutral-900 shadow-[4px_4px_0px_0px_rgba(0,0,0,0.1)]"
                        )}
                    >
                        <Lock className="w-8 h-8 mb-2" />
                        <span className="font-black uppercase text-xs">Guardian</span>
                        <span className="text-[10px] opacity-60 font-bold mt-1">Human must approve</span>
                    </button>
                </div>
            </div>

            {/* Pending Queue */}
            {mode === 'approval' && (
                <div className="border-4 border-neutral-900 bg-amber-50 p-6 shadow-[8px_8px_0px_0px_rgba(0,0,0,1)]">
                    <h3 className="text-xl font-black uppercase tracking-tight mb-6 flex items-center gap-2">
                        <AlertCircle className="w-6 h-6 text-amber-600" />
                        Approval Queue
                        {pendingOptimizations.length > 0 && (
                            <span className="bg-amber-600 text-white text-xs px-2 py-0.5 rounded-full">
                                {pendingOptimizations.length}
                            </span>
                        )}
                    </h3>

                    <div className="space-y-4">
                        {pendingOptimizations.length === 0 ? (
                            <div className="text-center py-8 text-neutral-400 font-bold uppercase text-xs border-2 border-dashed border-neutral-300">
                                No pending optimizations for review
                            </div>
                        ) : (
                            pendingOptimizations.map((opt) => (
                                <div key={opt.id} className="bg-white border-2 border-neutral-900 p-4 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
                                    <div className="flex justify-between items-start mb-3">
                                        <div>
                                            <div className="text-[10px] font-black text-amber-600 uppercase tracking-tighter">
                                                {opt.type === 'override' ? 'MODEL SUBSTITUTION' : 'WEIGHT ADJUSTMENT'}
                                            </div>
                                            <div className="text-sm font-black uppercase leading-tight">
                                                {opt.rule_name || 'Global Weights Update'}
                                            </div>
                                        </div>
                                        <div className="flex gap-2">
                                            <button
                                                onClick={() => onApprove(opt.id)}
                                                className="p-1.5 bg-green-500 text-white border-2 border-neutral-900 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] hover:shadow-none translate hover:translate-x-0.5 hover:translate-y-0.5 transition-all"
                                            >
                                                <Check className="w-4 h-4" />
                                            </button>
                                            <button
                                                onClick={() => onReject(opt.id)}
                                                className="p-1.5 bg-red-500 text-white border-2 border-neutral-900 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] hover:shadow-none translate hover:translate-x-0.5 hover:translate-y-0.5 transition-all"
                                            >
                                                <X className="w-4 h-4" />
                                            </button>
                                        </div>
                                    </div>

                                    <div className="text-[10px] font-bold text-neutral-500 uppercase overflow-hidden text-ellipsis whitespace-nowrap bg-neutral-50 p-2 border border-neutral-200">
                                        {opt.description}
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}
