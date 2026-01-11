import React from 'react'
import { clsx } from 'clsx'

export type TraceStep = {
    stepId: string
    at: string
    type: 'policy_eval' | 'routing_decision' | 'verify' | 'settle' | 'response' | 'error'
    durationMs?: number
    detail?: string
}

type TraceTimelineProps = {
    steps: TraceStep[]
    className?: string
}

export function TraceTimeline({ steps, className }: TraceTimelineProps) {
    if (!steps || steps.length === 0) {
        return (
            <div className={clsx("p-12 text-center text-neutral-400 font-bold uppercase tracking-widest text-xs border-2 border-dashed border-black/10", className)}>
                No trace steps recorded.
            </div>
        )
    }

    return (
        <div className={clsx("bg-white border-2 border-black p-6 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]", className)}>
            <div className="font-extrabold uppercase text-xs tracking-widest mb-8 text-black pb-2 border-b-2 border-black inline-block">
                Decision Trace Timeline
            </div>

            <div className="space-y-4 relative before:absolute before:left-3 before:top-2 before:bottom-2 before:w-0.5 before:bg-black/5">
                {steps.map((step, idx) => (
                    <div
                        key={idx}
                        className={clsx(
                            "group flex items-start gap-4 p-4 border-2 border-black relative transition-transform hover:-translate-y-0.5",
                            step.type === 'error' ? 'bg-error/10 border-error' : 'bg-neutral-50 hover:bg-white'
                        )}
                    >
                        {/* Step Number Dot */}
                        <div className={clsx(
                            "w-6 h-6 border-2 border-black flex items-center justify-center font-black text-[10px] shrink-0 z-10",
                            getStepColorClass(step.type)
                        )}>
                            {idx + 1}
                        </div>

                        <div className="flex-1 min-w-0">
                            <div className="flex justify-between items-center mb-1">
                                <div className={clsx(
                                    "font-black text-xs uppercase tracking-tight",
                                    step.type === 'error' ? 'text-error' : 'text-black'
                                )}>
                                    {step.type.replace('_', ' ')}
                                </div>
                                {step.durationMs && (
                                    <span className="font-mono text-[10px] font-bold text-neutral-400 bg-white px-1.5 border border-black/5">
                                        {step.durationMs}ms
                                    </span>
                                )}
                            </div>

                            {step.detail && (
                                <div className="text-xs text-neutral-600 mb-2 leading-relaxed">
                                    {step.detail}
                                </div>
                            )}

                            <div className="text-[10px] font-bold text-neutral-400 font-mono uppercase">
                                {new Date(step.at).toLocaleTimeString()}
                            </div>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    )
}

function getStepColorClass(type: string): string {
    switch (type) {
        case 'policy_eval': return 'bg-info text-black'
        case 'routing_decision': return 'bg-primary text-black'
        case 'verify': return 'bg-warn text-black'
        case 'settle': return 'bg-success text-black'
        case 'response': return 'bg-neutral-300 text-black'
        case 'error': return 'bg-error text-white'
        default: return 'bg-neutral-200 text-black'
    }
}
