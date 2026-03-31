'use client';
import { useEffect, useState, useCallback } from 'react';
import { DataTable, AdminPageHeader } from '../../_components/AdminUI';

type AuditEntry = {
    id: string;
    admin_user_id: string | null;
    admin_email: string;
    action: string;
    resource_type: string | null;
    resource_id: string | null;
    before_state: Record<string, unknown> | null;
    after_state: Record<string, unknown> | null;
    ip_address: string | null;
    created_at: string;
};

const ACTION_COLOR: Record<string, string> = {
    'session.login':      '#22D3EE',
    'session.login_failed': '#FF3B30',
    'tenant.ban':         '#FF3B30',
    'tenant.unban':       '#34D399',
    'admin.create':       '#FF9500',
    'admin.deactivate':   '#FBBF24',
};

export default function AuditPage() {
    const [entries, setEntries]  = useState<AuditEntry[]>([]);
    const [total, setTotal]      = useState(0);
    const [page, setPage]        = useState(1);
    const [loading, setLoading]  = useState(true);
    const [expanded, setExpanded] = useState<string | null>(null);
    const [filters, setFilters]  = useState({ action: '', resourceType: '', adminEmail: '' });

    const load = useCallback(async (p: number) => {
        setLoading(true);
        const params = new URLSearchParams({ page: String(p) });
        if (filters.action) params.set('action', filters.action);
        if (filters.resourceType) params.set('resourceType', filters.resourceType);
        if (filters.adminEmail) params.set('adminEmail', filters.adminEmail);
        try {
            const res = await fetch(`/api/admin/audit-log?${params}`);
            const d   = await res.json();
            setEntries(d.entries ?? []);
            setTotal(d.total ?? 0);
        } finally {
            setLoading(false);
        }
    }, [filters]);

    useEffect(() => { load(page); }, [page, load]);
    useEffect(() => { setPage(1); load(1); }, [filters]);

    const columns = [
        {
            key: 'created_at',
            header: 'Time',
            width: '130px',
            render: (row: AuditEntry) => (
                <span className="font-mono text-[10px] text-neutral-500">
                    {new Date(row.created_at).toLocaleString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                </span>
            ),
        },
        {
            key: 'admin_email',
            header: 'Admin',
            width: '180px',
            render: (row: AuditEntry) => (
                <span className="font-mono text-xs text-neutral-300">{row.admin_email}</span>
            ),
        },
        {
            key: 'action',
            header: 'Action',
            width: '180px',
            render: (row: AuditEntry) => {
                const color = ACTION_COLOR[row.action] ?? '#6B6B6B';
                return (
                    <span className="font-mono text-[10px] font-black px-2 py-0.5 border" style={{ borderColor: color, color }}>
                        {row.action}
                    </span>
                );
            },
        },
        {
            key: 'resource_type',
            header: 'Resource',
            width: '130px',
            render: (row: AuditEntry) => (
                <span className="font-mono text-xs text-neutral-500">
                    {row.resource_type ?? '—'}{row.resource_id ? ` · ${row.resource_id.slice(0, 8)}` : ''}
                </span>
            ),
        },
        {
            key: 'ip_address',
            header: 'IP',
            width: '110px',
            render: (row: AuditEntry) => (
                <span className="font-mono text-[10px] text-neutral-600">{row.ip_address ?? '—'}</span>
            ),
        },
        {
            key: 'diff',
            header: '',
            width: '70px',
            render: (row: AuditEntry) => (
                (row.before_state || row.after_state) ? (
                    <button
                        onClick={() => setExpanded(expanded === row.id ? null : row.id)}
                        className="text-[9px] font-black uppercase tracking-widest text-neutral-600 hover:text-[#22D3EE] transition-colors"
                    >
                        {expanded === row.id ? 'Hide' : 'Diff'}
                    </button>
                ) : null
            ),
        },
    ];

    return (
        <div>
            <AdminPageHeader
                title="Audit Log"
                subtitle={`${total.toLocaleString()} events recorded`}
            />

            {/* Filters */}
            <div className="flex gap-3 mb-6 flex-wrap">
                {[
                    { key: 'action', placeholder: 'Filter by action…' },
                    { key: 'resourceType', placeholder: 'Resource type…' },
                    { key: 'adminEmail', placeholder: 'Admin email…' },
                ].map(f => (
                    <input
                        key={f.key}
                        value={filters[f.key as keyof typeof filters]}
                        onChange={e => setFilters(prev => ({ ...prev, [f.key]: e.target.value }))}
                        placeholder={f.placeholder}
                        className="h-9 px-3 bg-neutral-900 border-2 border-neutral-700 text-white font-mono text-xs focus:outline-none focus:border-[#FF3B30] w-48"
                    />
                ))}
            </div>

            {/* Table with expandable diff rows */}
            <div className="border-2 border-neutral-800">
                <div className="overflow-x-auto">
                    <table className="w-full border-collapse">
                        <thead>
                            <tr className="border-b-2 border-neutral-800 bg-[#0D0D0D]">
                                {['Time', 'Admin', 'Action', 'Resource', 'IP', ''].map(h => (
                                    <th key={h} className="px-4 py-3 text-left text-[10px] font-black uppercase tracking-widest text-neutral-500">
                                        {h}
                                    </th>
                                ))}
                            </tr>
                        </thead>
                        <tbody>
                            {loading && !entries.length ? (
                                [1,2,3,4,5].map(i => (
                                    <tr key={i} className="border-b border-neutral-800/50">
                                        {[1,2,3,4,5,6].map(j => (
                                            <td key={j} className="px-4 py-3">
                                                <div className="h-4 bg-neutral-800 animate-pulse" />
                                            </td>
                                        ))}
                                    </tr>
                                ))
                            ) : !entries.length ? (
                                <tr>
                                    <td colSpan={6} className="px-4 py-12 text-center text-xs text-neutral-600 font-mono">
                                        No audit events found
                                    </td>
                                </tr>
                            ) : entries.map(row => (
                                <>
                                    <tr key={row.id} className="border-b border-neutral-800/30 hover:bg-neutral-800/20 transition-colors">
                                        {columns.map(col => (
                                            <td key={col.key} className="px-4 py-3 text-sm">
                                                {col.render(row)}
                                            </td>
                                        ))}
                                    </tr>
                                    {expanded === row.id && (row.before_state || row.after_state) && (
                                        <tr key={`${row.id}-diff`} className="border-b border-neutral-800">
                                            <td colSpan={6} className="px-4 pb-4 pt-0">
                                                <div className="grid grid-cols-2 gap-4 mt-2">
                                                    <div>
                                                        <div className="text-[9px] font-black uppercase tracking-widest text-neutral-600 mb-2">Before</div>
                                                        <pre className="bg-neutral-900 border border-neutral-800 p-3 text-[10px] font-mono text-neutral-400 overflow-x-auto max-h-48 overflow-y-auto">
                                                            {row.before_state ? JSON.stringify(row.before_state, null, 2) : 'null'}
                                                        </pre>
                                                    </div>
                                                    <div>
                                                        <div className="text-[9px] font-black uppercase tracking-widest text-[#34D399] mb-2">After</div>
                                                        <pre className="bg-neutral-900 border border-neutral-800 p-3 text-[10px] font-mono text-neutral-300 overflow-x-auto max-h-48 overflow-y-auto">
                                                            {row.after_state ? JSON.stringify(row.after_state, null, 2) : 'null'}
                                                        </pre>
                                                    </div>
                                                </div>
                                            </td>
                                        </tr>
                                    )}
                                </>
                            ))}
                        </tbody>
                    </table>
                </div>

                {total > 50 && (
                    <div className="flex items-center justify-between px-4 py-3 border-t-2 border-neutral-800">
                        <span className="text-[10px] text-neutral-500 font-mono">
                            {((page - 1) * 50) + 1}–{Math.min(page * 50, total)} of {total.toLocaleString()}
                        </span>
                        <div className="flex gap-1">
                            <button
                                onClick={() => setPage(p => p - 1)}
                                disabled={page <= 1}
                                className="h-7 px-3 border-2 border-neutral-700 text-[10px] font-black text-neutral-400 hover:border-neutral-500 hover:text-white transition-colors disabled:opacity-30"
                            >←</button>
                            <button
                                onClick={() => setPage(p => p + 1)}
                                disabled={page >= Math.ceil(total / 50)}
                                className="h-7 px-3 border-2 border-neutral-700 text-[10px] font-black text-neutral-400 hover:border-neutral-500 hover:text-white transition-colors disabled:opacity-30"
                            >→</button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
