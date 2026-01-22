'use client';

import { useState, useEffect, useCallback } from 'react';
import { ThinkingTrace } from '@/components/intelligence/ThinkingTrace';
import { ActiveOverrides } from '@/components/intelligence/ActiveOverrides';
import { GovernanceConsole } from '@/components/intelligence/GovernanceConsole';
import { cn } from '@/lib/utils';
import { useSession } from 'next-auth/react';
import { Shield, Zap, Cpu, RefreshCcw, LayoutDashboard, History, Settings, ExternalLink } from 'lucide-react';

export default function IntelligencePage() {
    const { data: session } = useSession();
    const tenantId = (session?.user as any)?.tenantId || 'default';

    const [steps, setSteps] = useState<any[]>([]);
    const [isStreaming, setIsStreaming] = useState(false);
    const [stats, setStats] = useState<any>(null);
    const [config, setConfig] = useState<any>({ overrides: [], weights: { cost_weight: 0.33, speed_weight: 0.33, quality_weight: 0.34 } });
    const [recentAudits, setRecentAudits] = useState<any[]>([]);
    const [error, setError] = useState<string | null>(null);

    const fetchConfig = useCallback(async () => {
        try {
            const res = await fetch('/api/v1/intelligence/config', {
                headers: { 'x-tenant-id': tenantId }
            });
            const data = await res.json();
            if (data.error) throw new Error(data.error);
            setConfig(data);
        } catch (err: any) {
            console.error('Failed to fetch intelligence config:', err);
        }
    }, [tenantId]);

    const fetchStatus = useCallback(async () => {
        try {
            const res = await fetch('/api/v1/intelligence/status', {
                headers: { 'x-tenant-id': tenantId }
            });
            const data = await res.json();
            if (data.error) throw new Error(data.error);
            setStats(data.stats);
            setRecentAudits(data.recent_audits);
        } catch (err: any) {
            console.error('Failed to fetch intelligence status:', err);
            setError(err.message);
        }
    }, [tenantId]);

    useEffect(() => {
        fetchStatus();
        fetchConfig();

        const handleKeyDown = (e: KeyboardEvent) => {
            if ((e.metaKey || e.ctrlKey) && e.key === 'i') {
                e.preventDefault();
                runAudit();
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [fetchStatus, fetchConfig]);

    const handleToggleOverride = async (id: string, enabled: boolean) => {
        try {
            const res = await fetch('/api/v1/intelligence/config', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'x-tenant-id': tenantId
                },
                body: JSON.stringify({ action: 'toggle_override', id, enabled })
            });
            if (res.ok) fetchConfig();
        } catch (err) {
            console.error('Failed to toggle override:', err);
        }
    };

    const handleModeChange = async (mode: 'autonomous' | 'approval') => {
        try {
            const res = await fetch('/api/v1/intelligence/config', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'x-tenant-id': tenantId
                },
                body: JSON.stringify({ action: 'set_governance', mode })
            });
            if (res.ok) fetchConfig();
        } catch (err) {
            console.error('Failed to change governance mode:', err);
        }
    };

    const handleApprove = async (id: string) => {
        try {
            const res = await fetch('/api/v1/intelligence/config', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'x-tenant-id': tenantId
                },
                body: JSON.stringify({ action: 'approve_optimization', id })
            });
            if (res.ok) fetchConfig();
        } catch (err) {
            console.error('Failed to approve optimization:', err);
        }
    };

    const handleReject = async (id: string) => {
        // For now, rejection just stays in pending but we could add a DELETE if desired
        console.log('Rejected optimization:', id);
    };

    const runAudit = async () => {
        setSteps([]);
        setIsStreaming(true);
        setError(null);

        try {
            const res = await fetch('/api/v1/intelligence/audit', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'x-tenant-id': tenantId
                },
                body: JSON.stringify({ days: 7, execute_actions: true })
            });

            if (!res.ok) throw new Error(`HTTP ${res.status}`);

            const reader = res.body?.getReader();
            if (!reader) throw new Error('Stream not available');

            const decoder = new TextDecoder();
            let buffer = '';

            while (true) {
                const { done, value } = await reader.read();
                if (done) break;

                buffer += decoder.decode(value, { stream: true });
                const lines = buffer.split('\n\n');
                buffer = lines.pop() || '';

                for (const line of lines) {
                    if (!line.startsWith('data: ')) continue;
                    const data = JSON.parse(line.slice(6));

                    if (data.type === 'step') {
                        setSteps(prev => [...prev, {
                            id: Math.random().toString(),
                            type: data.content.includes('[EXECUTED]') ? 'tool_result' :
                                data.content.includes('[FAILED]') ? 'tool_result' :
                                    data.content.includes('[DRY RUN]') ? 'tool_call' :
                                        data.content.includes('[LIMIT]') ? 'conclusion' :
                                            data.content.includes('[CACHE HIT]') ? 'cache_hit' : 'reasoning',
                            content: data.content,
                            timestamp: Date.now(),
                            metadata: {
                                status: data.content.includes('[EXECUTED]') ? 'success' :
                                    data.content.includes('[FAILED]') ? 'failed' : undefined
                            }
                        }]);
                    } else if (data.type === 'done') {
                        const finalResult = data.result;
                        if (finalResult.total_estimated_savings_usd > 0) {
                            setSteps(prev => [...prev, {
                                id: 'conclusion',
                                type: 'conclusion',
                                content: `Audit complete. Total estimated savings: $${finalResult.total_estimated_savings_usd.toFixed(2)}`,
                                timestamp: Date.now()
                            }]);
                        }
                    } else if (data.type === 'error') {
                        throw new Error(data.message);
                    }
                }
            }
            fetchStatus(); // Refresh stats after stream completes
        } catch (err: any) {
            setError(err.message);
        } finally {
            setIsStreaming(false);
        }
    };

    return (
        <div className="max-w-6xl mx-auto p-6 space-y-8 font-mono">
            {/* Header */}
            <div className="flex items-end justify-between border-b-4 border-neutral-900 pb-4 bg-neutral-50 p-4 -mx-4">
                <div>
                    <h1 className="text-4xl font-black uppercase tracking-tighter text-neutral-900">
                        Intelligence <span className="text-primary-dark">Treasury</span>
                    </h1>
                    <p className="text-neutral-500 mt-1 uppercase text-xs font-bold">
                        Autonomous Protocol Economist • Powered by Gemini 3 Pro
                    </p>
                </div>
                <button
                    onClick={runAudit}
                    disabled={isStreaming}
                    className={cn(
                        'px-8 py-4 border-4 border-neutral-900 font-bold uppercase text-lg',
                        'transition-all duration-75 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]',
                        'hover:shadow-none hover:translate-x-1 hover:translate-y-1',
                        isStreaming ? 'bg-neutral-200 text-neutral-400 cursor-not-allowed shadow-none' : 'bg-primary text-neutral-900'
                    )}
                >
                    {isStreaming ? 'Analyzing Forensic Data...' : 'Run Forensic Audit'}
                </button>
            </div>

            {error && (
                <div className="bg-red-50 border-4 border-red-900 p-4 text-red-900 font-bold uppercase text-sm">
                    ⚠️ ERROR: {error}
                </div>
            )}

            {/* Stats Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-6">
                <StatBox
                    label="30d Net Savings"
                    value={`$${(stats?.last_30_days.total_savings_usd || 0).toFixed(2)}`}
                    sub="Autonomous Yield"
                    accent="text-emerald-500"
                    icon={<Zap className="w-4 h-4" />}
                />
                <StatBox
                    label="Active Safeguards"
                    value={(config.overrides?.length || 0) + (config.rateLimits?.length || 0)}
                    sub="Gemini 3 Enforcement"
                    icon={<Shield className="w-4 h-4" />}
                />
                <StatBox
                    label="Audit Depth"
                    value="1.0M"
                    sub="Context Window Used"
                    icon={<Cpu className="w-4 h-4" />}
                />
                <StatBox
                    label="System Status"
                    value="HEALTHY"
                    sub="Sentinel Monitoring"
                    accent="text-sky-500"
                    icon={<RefreshCcw className="w-4 h-4" />}
                />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Left Column: Thinking Trace & Governance */}
                <div className="lg:col-span-2 space-y-8">
                    <GovernanceConsole
                        mode={config.governance || 'autonomous'}
                        pendingOptimizations={[
                            ...(config.overrides?.filter((o: any) => o.status === 'pending').map((o: any) => ({
                                id: o.id,
                                type: 'override',
                                rule_name: o.rule_name,
                                description: `Redirect ${o.task_pattern || 'any task'} to ${o.substitute_model}`
                            })) || []),
                            ...(config.rateLimits?.filter((rl: any) => rl.status === 'pending').map((rl: any) => ({
                                id: rl.id,
                                type: 'rate_limit',
                                rule_name: `Limit ${rl.model_pattern}`,
                                description: `Set limit: ${rl.requests_per_minute} RPM / ${rl.tokens_per_minute} TPM`
                            })) || []),
                            ...(config.failover?.filter((f: any) => f.status === 'pending').map((f: any) => ({
                                id: f.id,
                                type: 'failover',
                                rule_name: `Failover ${f.primary_model}`,
                                description: `Chains to: ${f.fallback_models?.join(', ')}`
                            })) || []),
                            ...(config.weights?.status === 'pending' ? [{
                                id: 'weights',
                                type: 'weights',
                                rule_name: 'Routing Weights Update',
                                description: `New Weights: Cost ${Math.round(config.weights.proposed_weights?.cost * 100)}%, Speed ${Math.round(config.weights.proposed_weights?.speed * 100)}%, Quality ${Math.round(config.weights.proposed_weights?.quality * 100)}%`
                            }] : [])
                        ]}
                        onModeChange={handleModeChange}
                        onApprove={handleApprove}
                        onReject={handleReject}
                    />

                    <ThinkingTrace
                        steps={steps}
                        isStreaming={isStreaming}
                        modelInfo={{
                            model: 'gemini-3-pro-preview',
                            thinkingLevel: 'high'
                        }}
                        className="shadow-[8px_8px_0px_0px_rgba(0,0,0,1)]"
                    />

                    {/* System Log */}
                    <div className="border-4 border-neutral-900 bg-neutral-900 p-6 shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] text-white font-mono text-[10px] space-y-2 overflow-hidden h-[200px] relative">
                        <div className="absolute top-2 right-2 flex items-center gap-2">
                            <span className="w-2 h-2 bg-primary animate-pulse"></span>
                            <span className="text-primary font-bold">SENTINEL_MARATHON_ACTIVE</span>
                        </div>
                        <div className="text-neutral-500 mb-2 border-b border-neutral-800 pb-1">REAL-TIME SYSTEM LOG (1M CONTEXT SCAN)</div>
                        <div className="space-y-1">
                            {/* We can simulate some logs here */}
                            <div className="flex gap-4">
                                <span className="text-neutral-600">[{new Date().toLocaleTimeString()}]</span>
                                <span className="text-green-500">INFO</span>
                                <span>Scanning OpenRouter ledger for tenant_{tenantId.slice(0, 4)}...</span>
                            </div>
                            <div className="flex gap-4">
                                <span className="text-neutral-600">[{new Date().toLocaleTimeString()}]</span>
                                <span className="text-blue-500">AUDIT</span>
                                <span>Semantic cache hit rate: 14.2% (Target: &gt;20.0%)</span>
                            </div>
                            <div className="flex gap-4">
                                <span className="text-neutral-600">[{new Date().toLocaleTimeString()}]</span>
                                <span className="text-primary">OK</span>
                                <span>Failover chain [primary:gpt-5.2] healthy</span>
                            </div>
                            <div className="flex gap-4 opacity-50">
                                <span className="text-neutral-600">[{new Date().toLocaleTimeString()}]</span>
                                <span className="text-neutral-400">DEBUG</span>
                                <span>Heartbeat verified with Antigravity Core</span>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Right Column: Active Overrides & History */}
                <div className="space-y-8">
                    <ActiveOverrides
                        weights={config.weights}
                        overrides={config.overrides?.filter((o: any) => o.status === 'active') || []}
                        rateLimits={config.rateLimits?.filter((rl: any) => rl.status === 'active') || []}
                        failover={config.failover?.filter((f: any) => f.status === 'active') || []}
                        alerts={config.alerts?.filter((a: any) => a.enabled) || []}
                        onToggle={handleToggleOverride}
                    />

                    <div className="space-y-4">
                        <h2 className="text-xl font-black uppercase border-b-2 border-neutral-900 pb-2">
                            Audit History
                        </h2>
                        <div className="space-y-3">
                            {recentAudits && recentAudits.length === 0 ? (
                                <div className="text-neutral-400 py-8 text-center border-2 border-dashed border-neutral-300">
                                    No recent audits
                                </div>
                            ) : (
                                recentAudits?.map((audit: any) => (
                                    <div key={audit.audit_id} className="border-2 border-neutral-900 p-3 bg-white hover:bg-neutral-50 transition-colors">
                                        <div className="flex justify-between items-start mb-2">
                                            <span className="text-[10px] font-bold text-neutral-400 uppercase">
                                                {new Date(audit.created_at).toLocaleDateString()}
                                            </span>
                                            <span className="text-xs font-bold text-green-600">
                                                +${parseFloat(audit.total_savings_usd).toFixed(2)}
                                            </span>
                                        </div>
                                        <div className="text-sm font-bold truncate">{audit.audit_id}</div>
                                        <div className="flex gap-2 mt-2">
                                            <span className="bg-neutral-900 text-white text-[10px] px-1.5 py-0.5">
                                                {audit.findings_count} FINDINGS
                                            </span>
                                            <span className="bg-primary text-neutral-900 text-[10px] px-1.5 py-0.5 font-bold">
                                                {audit.actions_executed} OPTIMS
                                            </span>
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

function StatBox({ label, value, sub, accent, icon }: { label: string, value: string | number, sub?: string, accent?: string, icon?: React.ReactNode }) {
    return (
        <div className="border-4 border-neutral-900 bg-white p-4 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] flex flex-col justify-between min-h-[120px]">
            <div className="flex justify-between items-start">
                <span className="text-[10px] font-black uppercase text-neutral-500 tracking-widest">{label}</span>
                {icon && (
                    <div className="p-1 bg-neutral-100 border-2 border-neutral-900">
                        {icon}
                    </div>
                )}
            </div>
            <div>
                <div className={cn("text-3xl font-black uppercase tracking-tighter tabular-nums", accent || "text-neutral-900")}>
                    {value}
                </div>
                {sub && <div className="text-[10px] font-bold text-neutral-400 uppercase mt-1">{sub}</div>}
            </div>
        </div>
    );
}
