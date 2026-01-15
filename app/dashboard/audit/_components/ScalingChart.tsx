'use client';

import React, { useState, useEffect, useRef } from 'react';
import { ScalingTier } from '@/lib/auditor';

interface ScalingChartProps {
    data: ScalingTier[];
    className?: string;
}

export function ScalingChart({ data, className = '' }: ScalingChartProps) {
    const [animated, setAnimated] = useState(false);
    const [hoveredTier, setHoveredTier] = useState<number | null>(null);
    const containerRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const observer = new IntersectionObserver(
            (entries) => {
                const entry = entries[0];
                if (entry && entry.isIntersecting) {
                    setAnimated(true);
                }
            },
            { threshold: 0.3 }
        );

        if (containerRef.current) {
            observer.observe(containerRef.current);
        }

        return () => observer.disconnect();
    }, []);

    const maxValue = Math.max(...data.map(d => d.legacyMonthly));

    return (
        <div ref={containerRef} className={`space-y-6 ${className}`}>
            {/* Chart Header */}
            <div className="flex items-center justify-between">
                <h3 className="text-xl font-black uppercase tracking-tight">Cost at Scale</h3>
                <div className="flex gap-4">
                    <div className="flex items-center gap-2">
                        <div className="w-4 h-4 bg-neutral-300 border-2 border-black" />
                        <span className="text-[10px] font-bold uppercase text-neutral-500">Legacy</span>
                    </div>
                    <div className="flex items-center gap-2">
                        <div className="w-4 h-4 bg-primary border-2 border-black" />
                        <span className="text-[10px] font-bold uppercase text-neutral-500">P402</span>
                    </div>
                </div>
            </div>

            {/* Chart Grid */}
            <div className="relative h-[300px] border-l-4 border-b-4 border-black bg-white">
                {/* Y-axis labels */}
                <div className="absolute left-0 top-0 bottom-8 w-16 flex flex-col justify-between text-right pr-2 -translate-x-full">
                    <span className="text-[10px] font-mono font-bold">${(maxValue).toLocaleString()}</span>
                    <span className="text-[10px] font-mono font-bold">${(maxValue / 2).toLocaleString()}</span>
                    <span className="text-[10px] font-mono font-bold">$0</span>
                </div>

                {/* Bars Container */}
                <div className="absolute inset-0 flex items-end justify-around px-4 pb-8 pt-4">
                    {data.slice(0, 5).map((tier, idx) => {
                        const legacyHeight = (tier.legacyMonthly / maxValue) * 100;
                        const p402Height = (tier.p402Monthly / maxValue) * 100;
                        const isHovered = hoveredTier === idx;

                        return (
                            <div
                                key={tier.callsPerDay}
                                className="flex flex-col items-center gap-2 flex-1 cursor-pointer group"
                                onMouseEnter={() => setHoveredTier(idx)}
                                onMouseLeave={() => setHoveredTier(null)}
                            >
                                {/* Bars */}
                                <div className="flex gap-1 items-end h-[220px]">
                                    {/* Legacy Bar */}
                                    <div
                                        className="w-6 sm:w-10 bg-neutral-200 border-2 border-black transition-all duration-700 ease-out origin-bottom"
                                        style={{
                                            height: animated ? `${legacyHeight}%` : '0%',
                                            transitionDelay: `${idx * 100}ms`,
                                            opacity: isHovered ? 0.7 : 1
                                        }}
                                    />
                                    {/* P402 Bar */}
                                    <div
                                        className="w-6 sm:w-10 bg-primary border-2 border-black transition-all duration-700 ease-out origin-bottom relative"
                                        style={{
                                            height: animated ? `${p402Height}%` : '0%',
                                            transitionDelay: `${idx * 100 + 50}ms`
                                        }}
                                    >
                                        {/* Savings Badge */}
                                        {animated && (
                                            <div
                                                className="absolute -top-8 left-1/2 -translate-x-1/2 whitespace-nowrap animate-in fade-in slide-in-from-bottom-2 duration-500"
                                                style={{ animationDelay: `${idx * 100 + 500}ms` }}
                                            >
                                                <span className="text-[10px] font-black text-primary bg-black px-1.5 py-0.5">
                                                    -{tier.savingsPercent}%
                                                </span>
                                            </div>
                                        )}
                                    </div>
                                </div>

                                {/* X-axis Label */}
                                <span className="text-[9px] sm:text-[10px] font-mono font-bold text-neutral-500 text-center">
                                    {formatVolume(tier.callsPerDay)}
                                </span>
                            </div>
                        );
                    })}
                </div>

                {/* Hover Tooltip */}
                {hoveredTier !== null && data[hoveredTier] && (
                    <div className="absolute top-4 right-4 bg-black text-white p-4 border-4 border-primary animate-in fade-in zoom-in-95 duration-200 space-y-2">
                        <div className="text-[10px] font-bold uppercase text-neutral-400">
                            {formatVolume(data[hoveredTier]!.callsPerDay)} calls/day
                        </div>
                        <div className="space-y-1">
                            <div className="flex justify-between gap-8">
                                <span className="text-xs text-neutral-400">Legacy:</span>
                                <span className="text-sm font-black font-mono">${data[hoveredTier]!.legacyMonthly.toLocaleString()}/mo</span>
                            </div>
                            <div className="flex justify-between gap-8">
                                <span className="text-xs text-primary">P402:</span>
                                <span className="text-sm font-black font-mono text-primary">${data[hoveredTier]!.p402Monthly.toLocaleString()}/mo</span>
                            </div>
                        </div>
                        <div className="pt-2 border-t border-neutral-700">
                            <span className="text-lg font-black text-primary">Save ${data[hoveredTier]!.savings.toLocaleString()}</span>
                        </div>
                    </div>
                )}
            </div>

            {/* X-axis Title */}
            <div className="text-center text-[10px] font-bold uppercase text-neutral-400 tracking-widest">
                Daily API Calls →
            </div>
        </div>
    );
}

function formatVolume(n: number): string {
    if (n >= 1000000) return `${n / 1000000}M`;
    if (n >= 1000) return `${n / 1000}K`;
    return n.toString();
}

// ============================================================================
// ANIMATED COUNTER
// ============================================================================

interface AnimatedCounterProps {
    value: number;
    prefix?: string;
    suffix?: string;
    duration?: number;
    className?: string;
}

export function AnimatedCounter({ value, prefix = '', suffix = '', duration = 1500, className = '' }: AnimatedCounterProps) {
    const [displayValue, setDisplayValue] = useState(0);
    const [hasStarted, setHasStarted] = useState(false);
    const ref = useRef<HTMLSpanElement>(null);

    useEffect(() => {
        const observer = new IntersectionObserver(
            (entries) => {
                const entry = entries[0];
                if (entry && entry.isIntersecting && !hasStarted) {
                    setHasStarted(true);
                }
            },
            { threshold: 0.5 }
        );

        if (ref.current) observer.observe(ref.current);
        return () => observer.disconnect();
    }, [hasStarted]);

    useEffect(() => {
        if (!hasStarted) return;

        const startTime = Date.now();
        const startValue = 0;

        const animate = () => {
            const elapsed = Date.now() - startTime;
            const progress = Math.min(elapsed / duration, 1);

            // Easing function (ease-out-expo)
            const eased = progress === 1 ? 1 : 1 - Math.pow(2, -10 * progress);

            setDisplayValue(Math.round(startValue + (value - startValue) * eased));

            if (progress < 1) {
                requestAnimationFrame(animate);
            }
        };

        requestAnimationFrame(animate);
    }, [hasStarted, value, duration]);

    return (
        <span ref={ref} className={className}>
            {prefix}{displayValue.toLocaleString()}{suffix}
        </span>
    );
}

// ============================================================================
// COST PROJECTOR (Interactive Slider)
// ============================================================================

interface CostProjectorProps {
    baseSpend: number;
    baseCalls: number;
    className?: string;
}

export function CostProjector({ baseSpend, baseCalls, className = '' }: CostProjectorProps) {
    const [volume, setVolume] = useState(baseCalls);
    const costPerCall = baseSpend / (baseCalls * 30);

    const legacyCost = volume * 30 * costPerCall;
    const p402Cost = legacyCost * 0.65;
    const savings = legacyCost - p402Cost;

    return (
        <div className={`p-6 bg-black text-white border-4 border-primary space-y-6 ${className}`}>
            <div className="flex items-center justify-between">
                <h3 className="text-lg font-black uppercase tracking-tight italic text-primary">
                    Cost Projector
                </h3>
                <span className="text-[10px] font-bold uppercase text-neutral-500">
                    Interactive
                </span>
            </div>

            {/* Slider */}
            <div className="space-y-3">
                <div className="flex justify-between text-[10px] font-bold uppercase text-neutral-400">
                    <span>Daily Calls</span>
                    <span className="text-primary font-mono text-sm">{volume.toLocaleString()}</span>
                </div>
                <input
                    type="range"
                    min="1000"
                    max="1000000"
                    step="1000"
                    value={volume}
                    onChange={(e) => setVolume(parseInt(e.target.value))}
                    className="w-full h-3 bg-neutral-800 appearance-none cursor-pointer accent-primary"
                    style={{
                        background: `linear-gradient(to right, #B6FF2E ${(volume / 1000000) * 100}%, #333 ${(volume / 1000000) * 100}%)`
                    }}
                />
                <div className="flex justify-between text-[9px] font-mono text-neutral-500">
                    <span>1K</span>
                    <span>250K</span>
                    <span>500K</span>
                    <span>750K</span>
                    <span>1M</span>
                </div>
            </div>

            {/* Cost Comparison */}
            <div className="grid grid-cols-2 gap-4">
                <div className="p-4 bg-neutral-900 border-2 border-neutral-700">
                    <div className="text-[10px] font-bold uppercase text-neutral-500 mb-1">Legacy Cost</div>
                    <div className="text-2xl font-black font-mono text-neutral-400">
                        ${legacyCost.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                        <span className="text-xs text-neutral-600">/mo</span>
                    </div>
                </div>
                <div className="p-4 bg-primary/10 border-2 border-primary">
                    <div className="text-[10px] font-bold uppercase text-primary mb-1">P402 Cost</div>
                    <div className="text-2xl font-black font-mono text-primary">
                        ${p402Cost.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                        <span className="text-xs text-primary/60">/mo</span>
                    </div>
                </div>
            </div>

            {/* Savings Highlight */}
            <div className="text-center py-4 border-t-2 border-dashed border-neutral-700">
                <div className="text-[10px] font-bold uppercase text-neutral-500 mb-2">Your Monthly Savings</div>
                <div className="text-4xl font-black font-mono text-primary animate-pulse">
                    ${savings.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                </div>
            </div>
        </div>
    );
}

// ============================================================================
// CONFIDENCE METER
// ============================================================================

interface ConfidenceMeterProps {
    value: number;
    className?: string;
}

export function ConfidenceMeter({ value, className = '' }: ConfidenceMeterProps) {
    const [animated, setAnimated] = useState(false);
    const ref = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const observer = new IntersectionObserver(
            (entries) => {
                const entry = entries[0];
                if (entry && entry.isIntersecting) setAnimated(true);
            },
            { threshold: 0.5 }
        );

        if (ref.current) observer.observe(ref.current);
        return () => observer.disconnect();
    }, []);

    const getColor = (val: number) => {
        if (val >= 80) return 'bg-primary';
        if (val >= 50) return 'bg-yellow-400';
        return 'bg-orange-400';
    };

    const getLabel = (val: number) => {
        if (val >= 80) return 'High Confidence';
        if (val >= 50) return 'Medium Confidence';
        return 'Low Confidence';
    };

    return (
        <div ref={ref} className={`space-y-2 ${className}`}>
            <div className="flex justify-between items-center">
                <span className="text-[10px] font-bold uppercase text-neutral-400">Analysis Confidence</span>
                <span className="text-xs font-black">{value}%</span>
            </div>
            <div className="h-2 bg-neutral-200 border border-black overflow-hidden">
                <div
                    className={`h-full ${getColor(value)} transition-all duration-1000 ease-out`}
                    style={{ width: animated ? `${value}%` : '0%' }}
                />
            </div>
            <div className="text-[9px] font-bold uppercase text-neutral-400">
                {getLabel(value)}
            </div>
        </div>
    );
}
