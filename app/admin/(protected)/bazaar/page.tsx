'use client';
import { useEffect, useState } from 'react';
import { AdminPageHeader, AdminCard, DataTable, StatusBadge, AdminButton } from '../../_components/AdminUI';

type Listing = {
    id: string;
    name: string;
    description: string;
    source_url: string;
    status: string;
    safety_score: number | null;
    created_at: string;
};

export default function BazaarPage() {
    const [listings, setListings] = useState<Listing[]>([]);
    const [loading, setLoading]   = useState(true);
    const [syncing, setSyncing]   = useState(false);

    async function load() {
        setLoading(true);
        const res = await fetch('/api/a2a/bazaar');
        if (res.ok) {
            const d = await res.json();
            setListings(d.listings ?? []);
        }
        setLoading(false);
    }

    async function triggerSync() {
        setSyncing(true);
        await fetch('/api/internal/bazaar/sync', { method: 'POST' });
        await load();
        setSyncing(false);
    }

    useEffect(() => { load(); }, []);

    const columns = [
        {
            key: 'name',
            header: 'Agent',
            render: (row: Listing) => (
                <div>
                    <div className="text-sm font-bold text-white">{row.name}</div>
                    <div className="text-[10px] text-neutral-500 font-mono line-clamp-1">{row.description}</div>
                </div>
            ),
        },
        {
            key: 'status',
            header: 'Status',
            width: '100px',
            render: (row: Listing) => <StatusBadge status={row.status} />,
        },
        {
            key: 'safety_score',
            header: 'Safety',
            width: '80px',
            render: (row: Listing) => {
                const s = row.safety_score ?? 0;
                return (
                    <span className={`font-mono text-xs font-black ${s < 50 ? 'text-[#FF3B30]' : s < 80 ? 'text-[#FBBF24]' : 'text-[#34D399]'}`}>
                        {row.safety_score ?? '—'}
                    </span>
                );
            },
        },
        {
            key: 'created_at',
            header: 'Listed',
            width: '100px',
            render: (row: Listing) => (
                <span className="font-mono text-[10px] text-neutral-500">
                    {new Date(row.created_at).toLocaleDateString()}
                </span>
            ),
        },
    ];

    const byStatus = (s: string) => listings.filter(l => l.status === s).length;

    return (
        <div>
            <AdminPageHeader
                title="Bazaar"
                subtitle="Agent marketplace listings and safety scanner"
                action={
                    <AdminButton onClick={triggerSync} disabled={syncing} variant="secondary" size="sm">
                        {syncing ? 'Syncing…' : '↻ Sync Now'}
                    </AdminButton>
                }
            />

            <div className="grid grid-cols-3 gap-4 mb-8">
                {[
                    { label: 'Active',      count: byStatus('active'),     color: '#34D399' },
                    { label: 'Pending',     count: byStatus('pending'),    color: '#FBBF24' },
                    { label: 'Quarantined', count: byStatus('quarantined'), color: '#FF3B30' },
                ].map(item => (
                    <div key={item.label} className="border-2 border-neutral-800 bg-[#111111] p-5">
                        <div className="text-[10px] font-black uppercase tracking-widest mb-2" style={{ color: item.color }}>
                            {item.label}
                        </div>
                        <span className="text-3xl font-black" style={{ color: item.color }}>{item.count}</span>
                    </div>
                ))}
            </div>

            <DataTable
                columns={columns as Parameters<typeof DataTable>[0]['columns']}
                data={listings as Record<string, unknown>[]}
                loading={loading}
                total={listings.length}
                rowKey={(r: Record<string, unknown>) => String(r.id)}
                emptyMessage="No bazaar listings"
            />
        </div>
    );
}
