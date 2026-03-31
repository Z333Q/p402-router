'use client';
import { useEffect, useState } from 'react';
import { AdminPageHeader, AdminCard, GrowthChart, StatusBadge } from '../../_components/AdminUI';

type IntelligenceStatus = {
    costIntelligenceEnabled: boolean;
    semanticCacheEnabled: boolean;
    recentDecisions: { id: string; decision_type: string; reasoning: string; created_at: string }[];
    recentAnomalies: { id: string; severity: string; description: string; created_at: string }[];
};

export default function IntelligencePage() {
    const [status, setStatus]   = useState<IntelligenceStatus | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetch('/api/v1/intelligence/status')
            .then(r => r.ok ? r.json() : null)
            .then(d => { if (d) setStatus(d); })
            .finally(() => setLoading(false));
    }, []);

    return (
        <div>
            <AdminPageHeader
                title="Intelligence Layer"
                subtitle="Gemini 3 Protocol Economist + Sentinel anomaly detection"
            />

            <div className="grid grid-cols-2 gap-4 mb-8">
                {[
                    { label: 'Cost Intelligence (Economist)', key: 'costIntelligenceEnabled' },
                    { label: 'Semantic Cache',                key: 'semanticCacheEnabled' },
                ].map(item => (
                    <div key={item.key} className="border-2 border-neutral-800 bg-[#111111] p-5 flex items-center justify-between">
                        <span className="text-xs font-mono text-neutral-400">{item.label}</span>
                        <StatusBadge status={status?.[item.key as keyof IntelligenceStatus] ? 'active' : 'inactive'} />
                    </div>
                ))}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <AdminCard title="Recent Decisions (Economist)">
                    {loading ? (
                        <div className="space-y-3">{[1,2,3].map(i => <div key={i} className="h-12 bg-neutral-800 animate-pulse" />)}</div>
                    ) : !status?.recentDecisions?.length ? (
                        <p className="text-xs text-neutral-600 font-mono">No recent decisions</p>
                    ) : (
                        <div className="space-y-3">
                            {status.recentDecisions.slice(0, 5).map(d => (
                                <div key={d.id} className="border-l-2 border-[#22D3EE] pl-3">
                                    <div className="text-[10px] font-black uppercase tracking-wider text-neutral-400">{d.decision_type}</div>
                                    <div className="text-xs text-neutral-300 font-mono mt-0.5 line-clamp-2">{d.reasoning}</div>
                                    <div className="text-[9px] text-neutral-600 mt-1 font-mono">{new Date(d.created_at).toLocaleString()}</div>
                                </div>
                            ))}
                        </div>
                    )}
                </AdminCard>

                <AdminCard title="Recent Anomalies (Sentinel)">
                    {loading ? (
                        <div className="space-y-3">{[1,2,3].map(i => <div key={i} className="h-12 bg-neutral-800 animate-pulse" />)}</div>
                    ) : !status?.recentAnomalies?.length ? (
                        <p className="text-xs text-neutral-600 font-mono">No recent anomalies — system healthy</p>
                    ) : (
                        <div className="space-y-3">
                            {status.recentAnomalies.slice(0, 5).map(a => (
                                <div key={a.id} className="border-l-2 border-[#FF9500] pl-3">
                                    <div className="text-[10px] font-black uppercase tracking-wider text-[#FF9500]">{a.severity}</div>
                                    <div className="text-xs text-neutral-300 font-mono mt-0.5 line-clamp-2">{a.description}</div>
                                    <div className="text-[9px] text-neutral-600 mt-1 font-mono">{new Date(a.created_at).toLocaleString()}</div>
                                </div>
                            ))}
                        </div>
                    )}
                </AdminCard>
            </div>
        </div>
    );
}
