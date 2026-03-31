'use client';
import { useEffect, useState, useCallback } from 'react';
import { DataTable, AdminPageHeader, AdminButton } from '../../_components/AdminUI';

type Incident = {
    id: string;
    tenant_id: string;
    owner_email: string;
    severity: string;
    category: string;
    description: string;
    status: string;
    trust_score: number | null;
    created_at: string;
    resolved_at: string | null;
};

const STATUS_TABS = ['open', 'investigating', 'resolved', 'false_positive'] as const;
const SEVERITY_COLOR: Record<string, string> = {
    critical: '#FF3B30',
    high:     '#FF9500',
    medium:   '#FBBF24',
    low:      '#22D3EE',
};

export default function SafetyPage() {
    const [incidents, setIncidents]   = useState<Incident[]>([]);
    const [total, setTotal]           = useState(0);
    const [page, setPage]             = useState(1);
    const [loading, setLoading]       = useState(true);
    const [statusFilter, setStatusFilter] = useState<string>('open');
    const [actionId, setActionId]     = useState<string | null>(null);

    const load = useCallback(async (p: number, status: string) => {
        setLoading(true);
        try {
            const res = await fetch(`/api/admin/safety/incidents?page=${p}&status=${status}`);
            const d   = await res.json();
            setIncidents(d.incidents ?? []);
            setTotal(d.total ?? 0);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => { load(page, statusFilter); }, [page, statusFilter, load]);

    async function act(id: string, action: string) {
        setActionId(id);
        await fetch('/api/admin/safety/incidents', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ incidentId: id, action }),
        });
        setActionId(null);
        load(page, statusFilter);
    }

    const columns = [
        {
            key: 'severity',
            header: 'Sev',
            width: '80px',
            render: (row: Incident) => (
                <span
                    className="text-[9px] font-black uppercase tracking-widest px-2 py-0.5 border"
                    style={{ borderColor: SEVERITY_COLOR[row.severity] ?? '#6B6B6B', color: SEVERITY_COLOR[row.severity] ?? '#6B6B6B' }}
                >
                    {row.severity}
                </span>
            ),
        },
        {
            key: 'category',
            header: 'Category / Description',
            render: (row: Incident) => (
                <div>
                    <div className="text-xs font-black text-white uppercase tracking-wider">{row.category}</div>
                    <div className="text-xs text-neutral-500 font-mono mt-0.5 line-clamp-1">{row.description}</div>
                </div>
            ),
        },
        {
            key: 'owner_email',
            header: 'Tenant',
            width: '180px',
            render: (row: Incident) => (
                <span className="font-mono text-xs text-neutral-400">{row.owner_email ?? row.tenant_id?.slice(0, 8)}</span>
            ),
        },
        {
            key: 'trust_score',
            header: 'Trust',
            width: '70px',
            render: (row: Incident) => {
                const score = row.trust_score ?? 0;
                return (
                    <span className={`font-mono text-xs font-black ${score < 40 ? 'text-[#FF3B30]' : score < 70 ? 'text-[#FF9500]' : 'text-[#34D399]'}`}>
                        {row.trust_score ?? '—'}
                    </span>
                );
            },
        },
        {
            key: 'created_at',
            header: 'When',
            width: '100px',
            render: (row: Incident) => (
                <span className="font-mono text-[10px] text-neutral-500">
                    {new Date(row.created_at).toLocaleDateString()}
                </span>
            ),
        },
        {
            key: 'actions',
            header: '',
            width: '240px',
            render: (row: Incident) => (
                <div className="flex gap-2 flex-wrap">
                    {row.status === 'open' && (
                        <AdminButton size="sm" variant="secondary" disabled={!!actionId} onClick={() => act(row.id, 'investigate')}>
                            Investigate
                        </AdminButton>
                    )}
                    {(row.status === 'open' || row.status === 'investigating') && (
                        <>
                            <AdminButton size="sm" variant="danger" disabled={!!actionId} onClick={() => act(row.id, 'ban')}>
                                Ban
                            </AdminButton>
                            <AdminButton size="sm" variant="ghost" disabled={!!actionId} onClick={() => act(row.id, 'false_positive')}>
                                FP
                            </AdminButton>
                        </>
                    )}
                    {row.status === 'investigating' && (
                        <AdminButton size="sm" variant="secondary" disabled={!!actionId} onClick={() => act(row.id, 'resolve')}>
                            Resolve
                        </AdminButton>
                    )}
                </div>
            ),
        },
    ];

    return (
        <div>
            <AdminPageHeader
                title="Safety"
                subtitle="Incident queue, quarantine, and tenant safety management"
            />

            <div className="flex border-2 border-neutral-700 w-fit mb-6">
                {STATUS_TABS.map(tab => (
                    <button
                        key={tab}
                        onClick={() => { setStatusFilter(tab); setPage(1); }}
                        className={`h-8 px-4 text-[10px] font-black uppercase tracking-widest transition-colors ${
                            statusFilter === tab ? 'bg-[#FF3B30] text-white' : 'text-neutral-500 hover:text-white'
                        }`}
                    >
                        {tab.replace('_', ' ')}
                    </button>
                ))}
            </div>

            <DataTable
                columns={columns as Parameters<typeof DataTable>[0]['columns']}
                data={incidents as Record<string, unknown>[]}
                loading={loading}
                total={total}
                page={page}
                pageSize={50}
                onPage={p => { setPage(p); load(p, statusFilter); }}
                rowKey={r => String(r.id)}
                emptyMessage={`No ${statusFilter.replace('_', ' ')} incidents`}
            />
        </div>
    );
}
