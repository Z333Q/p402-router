'use client';

import { cn } from '@/lib/utils';
import { Target, Zap, Shield, Cpu, ExternalLink, Power, ListFilter, AlertTriangle, RefreshCcw } from 'lucide-react';

interface Override {
    id: string;
    rule_name: string;
    task_pattern: string;
    original_model: string;
    substitute_model: string;
    enabled: boolean;
    created_at: string;
}

interface RateLimit {
    id: string;
    model_pattern: string;
    requests_per_minute: number;
    tokens_per_minute: number;
    enabled: boolean;
}

interface Failover {
    id: string;
    primary_model: string;
    fallback_models: string[];
    enabled: boolean;
}

interface Alert {
    id: string;
    metric: string;
    threshold: number;
    enabled: boolean;
}

interface Weights {
    cost_weight: number;
    speed_weight: number;
    quality_weight: number;
}

interface ActiveOverridesProps {
    overrides: Override[];
    rateLimits?: RateLimit[];
    failover?: Failover[];
    alerts?: Alert[];
    weights: Weights;
    onToggle: (id: string, enabled: boolean) => void;
    className?: string;
}

export function ActiveOverrides({
    overrides,
    rateLimits = [],
    failover = [],
    alerts = [],
    weights,
    onToggle,
    className
}: ActiveOverridesProps) {
    return (
        <div className={cn("space-y-6", className)}>
            {/* Header / Weights Visualization */}
            <div className="border-4 border-neutral-900 bg-white p-6 shadow-[8px_8px_0px_0px_rgba(0,0,0,1)]">
                <div className="flex items-center justify-between mb-6">
                    <h3 className="text-xl font-black uppercase tracking-tight flex items-center gap-2">
                        <Target className="w-6 h-6" />
                        Autonomous Weights
                    </h3>
                    <div className="bg-green-100 text-green-800 text-[10px] font-black px-2 py-1 border-2 border-green-800 uppercase tracking-widest">
                        LIVE: Sentinel Active
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <WeightMetric
                        label="Cost Efficiency"
                        value={weights.cost_weight}
                        color="bg-emerald-400"
                        icon={<Cpu className="w-4 h-4" />}
                    />
                    <WeightMetric
                        label="Processing Speed"
                        value={weights.speed_weight}
                        color="bg-sky-400"
                        icon={<Zap className="w-4 h-4" />}
                    />
                    <WeightMetric
                        label="Model Quality"
                        value={weights.quality_weight}
                        color="bg-indigo-400"
                        icon={<Shield className="w-4 h-4" />}
                    />
                </div>
            </div>

            {/* Substitution Rules */}
            <div className="border-4 border-neutral-900 bg-neutral-900 p-6 shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] text-white">
                <h3 className="text-xl font-black uppercase tracking-tight mb-6 flex items-center gap-2">
                    <Cpu className="w-6 h-6 text-primary" />
                    Routing Intelligence
                </h3>

                <div className="space-y-4">
                    {/* Overrides */}
                    {overrides.length > 0 && overrides.map((rule) => (
                        <div key={rule.id} className={cn("border-2 p-4 transition-all duration-200", rule.enabled ? "border-primary bg-neutral-800" : "border-neutral-700 opacity-50")}>
                            <div className="flex justify-between items-start mb-3">
                                <div>
                                    <div className="text-[10px] font-black text-primary uppercase tracking-tighter">SUBSTITUTION • {rule.id}</div>
                                    <div className="text-lg font-black uppercase leading-tight">{rule.rule_name}</div>
                                </div>
                                <button onClick={() => onToggle(rule.id, !rule.enabled)} className={cn("p-2 border-2", rule.enabled ? "border-primary text-primary hover:bg-primary hover:text-neutral-900" : "border-neutral-700 text-neutral-500 hover:border-white")}>
                                    <Power className="w-5 h-5" />
                                </button>
                            </div>
                            <div className="grid grid-cols-2 gap-4 text-xs font-bold uppercase">
                                <div className="p-2 bg-neutral-700/50 flex flex-col gap-1">
                                    <span className="text-neutral-500">Pattern</span>
                                    <span className="truncate">{rule.task_pattern || 'ANY'}</span>
                                </div>
                                <div className="p-2 bg-neutral-700/50 flex flex-col gap-1 text-primary">
                                    <span className="text-neutral-500">Route To</span>
                                    <span className="truncate">{rule.substitute_model}</span>
                                </div>
                            </div>
                        </div>
                    ))}

                    {/* Rate Limits */}
                    {rateLimits.length > 0 && rateLimits.map((rl) => (
                        <div key={rl.id} className={cn("border-2 p-4 transition-all duration-200", rl.enabled ? "border-amber-400 bg-neutral-800" : "border-neutral-700 opacity-50")}>
                            <div className="flex justify-between items-start mb-3">
                                <div>
                                    <div className="text-[10px] font-black text-amber-400 uppercase tracking-tighter">RATE LIMIT • {rl.id}</div>
                                    <div className="text-lg font-black uppercase leading-tight">{rl.model_pattern}</div>
                                </div>
                                <button onClick={() => onToggle(rl.id, !rl.enabled)} className={cn("p-2 border-2", rl.enabled ? "border-amber-400 text-amber-400 hover:bg-amber-400 hover:text-neutral-900" : "border-neutral-700 text-neutral-500")}>
                                    <ListFilter className="w-5 h-5" />
                                </button>
                            </div>
                            <div className="grid grid-cols-2 gap-4 text-xs font-bold uppercase">
                                <div className="p-2 bg-neutral-700/50 flex flex-col gap-1">
                                    <span className="text-neutral-500">Max requests</span>
                                    <span className="text-amber-400">{rl.requests_per_minute} RPM</span>
                                </div>
                                <div className="p-2 bg-neutral-700/50 flex flex-col gap-1">
                                    <span className="text-neutral-500">Max tokens</span>
                                    <span className="text-amber-400">{rl.tokens_per_minute} TPM</span>
                                </div>
                            </div>
                        </div>
                    ))}

                    {/* Failover Chains */}
                    {failover.length > 0 && failover.map((f) => (
                        <div key={f.id} className={cn("border-2 p-4 transition-all duration-200", f.enabled ? "border-sky-400 bg-neutral-800" : "border-neutral-700 opacity-50")}>
                            <div className="flex justify-between items-start mb-3">
                                <div>
                                    <div className="text-[10px] font-black text-sky-400 uppercase tracking-tighter">FAILOVER • {f.id}</div>
                                    <div className="text-lg font-black uppercase leading-tight">{f.primary_model}</div>
                                </div>
                                <button onClick={() => onToggle(f.id, !f.enabled)} className={cn("p-2 border-2", f.enabled ? "border-sky-400 text-sky-400 hover:bg-sky-400 hover:text-neutral-900" : "border-neutral-700 text-neutral-500")}>
                                    <RefreshCcw className="w-5 h-5" />
                                </button>
                            </div>
                            <div className="p-2 bg-neutral-700/50 flex flex-col gap-1 text-xs font-bold uppercase text-sky-400">
                                <span className="text-neutral-500 uppercase">Fallback Hierarchy</span>
                                <span className="truncate">{f.fallback_models?.join(' → ')}</span>
                            </div>
                        </div>
                    ))}

                    {/* Alerts */}
                    {alerts.length > 0 && alerts.map((a) => (
                        <div key={a.id} className={cn("border-2 p-4 transition-all duration-200 border-red-500 bg-red-950/20")}>
                            <div className="flex justify-between items-center">
                                <div className="flex items-center gap-3">
                                    <AlertTriangle className="w-5 h-5 text-red-500" />
                                    <div>
                                        <div className="text-[10px] font-black text-red-500 uppercase tracking-tighter">ALERT ACTIVE</div>
                                        <div className="text-lg font-black uppercase leading-tight">Threshold {a.metric} &gt; ${a.threshold}</div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    ))}

                    {overrides.length === 0 && rateLimits.length === 0 && failover.length === 0 && (
                        <div className="border-2 border-dashed border-neutral-700 p-8 text-center text-neutral-500 font-bold uppercase text-sm">
                            No active intelligence modules. Protocol running on defaults.
                        </div>
                    )}
                </div>

                <div className="mt-6 pt-6 border-t-2 border-neutral-800 flex justify-between items-center text-[10px] font-black text-neutral-500 uppercase">
                    <span>Targeting Gemini 3 Intelligence Layer</span>
                    <div className="flex items-center gap-1 hover:text-white transition-colors cursor-pointer">
                        Documentation <ExternalLink className="w-3 h-3" />
                    </div>
                </div>
            </div>
        </div>
    );
}

function WeightMetric({ label, value, color, icon }: { label: string, value: number, color: string, icon: React.ReactNode }) {
    const percentage = Math.round(value * 100);
    return (
        <div className="space-y-2">
            <div className="flex justify-between items-center text-[10px] font-black uppercase text-neutral-500">
                <span className="flex items-center gap-1">
                    {icon} {label}
                </span>
                <span className="text-neutral-900">{percentage}%</span>
            </div>
            <div className="h-2 border-2 border-neutral-900 bg-neutral-100 relative overflow-hidden">
                <div
                    className={cn("h-full transition-all duration-1000 ease-out", color)}
                    style={{ width: `${percentage}%` }}
                />
            </div>
        </div>
    );
}
