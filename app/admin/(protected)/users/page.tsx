'use client';
import { useEffect, useState, useCallback } from 'react';
import { DataTable, AdminPageHeader, StatusBadge, AdminButton } from '../../_components/AdminUI';

type Tenant = {
    id: string;
    name: string;
    owner_email: string;
    status: string;
    created_at: string;
    trust_score: number | null;
    is_banned: boolean | null;
    banned_reason: string | null;
    request_count_30d: number;
    last_active_at: string | null;
};

export default function UsersPage() {
    const [data, setData]         = useState<Tenant[]>([]);
    const [total, setTotal]       = useState(0);
    const [page, setPage]         = useState(1);
    const [loading, setLoading]   = useState(true);
    const [search, setSearch]     = useState('');
    const [banned, setBanned]     = useState('');
    const [actionId, setActionId] = useState<string | null>(null);
    const [banReason, setBanReason] = useState('');
    const [showBanDialog, setShowBanDialog] = useState<string | null>(null);

    const load = useCallback(async (p: number) => {
        setLoading(true);
        const params = new URLSearchParams({ page: String(p) });
        if (search) params.set('search', search);
        if (banned) params.set('banned', banned);
        try {
            const res = await fetch(`/api/admin/users?${params}`);
            const d   = await res.json();
            setData(d.users ?? []);
            setTotal(d.total ?? 0);
        } finally {
            setLoading(false);
        }
    }, [search, banned]);

    useEffect(() => { load(page); }, [page, load]);
    useEffect(() => { setPage(1); load(1); }, [search, banned]);

    async function banTenant(id: string, reason: string) {
        setActionId(id);
        await fetch(`/api/admin/users/${id}/ban`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ reason }),
        });
        setActionId(null);
        setShowBanDialog(null);
        setBanReason('');
        load(page);
    }

    async function unbanTenant(id: string) {
        setActionId(id);
        await fetch(`/api/admin/users/${id}/unban`, { method: 'POST' });
        setActionId(null);
        load(page);
    }

    const columns = [
        {
            key: 'owner_email',
            header: 'Tenant',
            render: (row: Tenant) => (
                <div>
                    <div className="text-sm font-bold text-white">{row.name}</div>
                    <div className="text-xs text-neutral-500 font-mono">{row.owner_email}</div>
                </div>
            ),
        },
        {
            key: 'status',
            header: 'Status',
            width: '100px',
            render: (row: Tenant) => (
                <StatusBadge status={row.is_banned ? 'banned' : row.status} />
            ),
        },
        {
            key: 'request_count_30d',
            header: 'Requests (30d)',
            width: '120px',
            render: (row: Tenant) => (
                <span className="font-mono text-xs text-neutral-300">
                    {row.request_count_30d.toLocaleString()}
                </span>
            ),
        },
        {
            key: 'last_active_at',
            header: 'Last Active',
            width: '140px',
            render: (row: Tenant) => (
                <span className="font-mono text-xs text-neutral-500">
                    {row.last_active_at
                        ? new Date(row.last_active_at).toLocaleDateString()
                        : 'Never'}
                </span>
            ),
        },
        {
            key: 'created_at',
            header: 'Joined',
            width: '100px',
            render: (row: Tenant) => (
                <span className="font-mono text-xs text-neutral-500">
                    {new Date(row.created_at).toLocaleDateString()}
                </span>
            ),
        },
        {
            key: 'actions',
            header: '',
            width: '140px',
            render: (row: Tenant) => (
                <div className="flex gap-2">
                    {row.is_banned ? (
                        <AdminButton
                            size="sm"
                            variant="secondary"
                            disabled={actionId === row.id}
                            onClick={() => unbanTenant(row.id)}
                        >
                            Unban
                        </AdminButton>
                    ) : (
                        <AdminButton
                            size="sm"
                            variant="danger"
                            disabled={actionId === row.id}
                            onClick={() => setShowBanDialog(row.id)}
                        >
                            Ban
                        </AdminButton>
                    )}
                </div>
            ),
        },
    ];

    return (
        <div>
            <AdminPageHeader
                title="Users"
                subtitle={`${total.toLocaleString()} tenants registered`}
            />

            {/* Filters */}
            <div className="flex gap-3 mb-6">
                <input
                    value={search}
                    onChange={e => setSearch(e.target.value)}
                    placeholder="Search email or name…"
                    className="h-9 px-3 bg-neutral-900 border-2 border-neutral-700 text-white font-mono text-xs focus:outline-none focus:border-[#FF3B30] w-64"
                />
                <select
                    value={banned}
                    onChange={e => setBanned(e.target.value)}
                    className="h-9 px-3 bg-neutral-900 border-2 border-neutral-700 text-neutral-300 font-mono text-xs focus:outline-none focus:border-[#FF3B30]"
                >
                    <option value="">All statuses</option>
                    <option value="true">Banned only</option>
                    <option value="false">Active only</option>
                </select>
            </div>

            <DataTable
                columns={columns as Parameters<typeof DataTable>[0]['columns']}
                data={data as Record<string, unknown>[]}
                loading={loading}
                total={total}
                page={page}
                pageSize={50}
                onPage={setPage}
                rowKey={r => String(r.id)}
                emptyMessage={search ? `No tenants matching "${search}"` : 'No tenants yet'}
            />

            {/* Ban dialog */}
            {showBanDialog && (
                <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
                    <div className="border-2 border-[#FF3B30] bg-[#0D0D0D] p-8 w-full max-w-md">
                        <h3 className="text-sm font-black text-white uppercase tracking-widest mb-4">
                            Confirm Ban
                        </h3>
                        <p className="text-xs text-neutral-400 font-mono mb-5">
                            This will immediately lock out the tenant and block all API requests.
                        </p>
                        <input
                            value={banReason}
                            onChange={e => setBanReason(e.target.value)}
                            placeholder="Reason for ban (required)"
                            className="w-full h-10 px-3 bg-neutral-900 border-2 border-neutral-700 text-white font-mono text-xs mb-5 focus:outline-none focus:border-[#FF3B30]"
                        />
                        <div className="flex gap-3">
                            <AdminButton
                                variant="danger"
                                disabled={!banReason.trim() || actionId === showBanDialog}
                                onClick={() => banTenant(showBanDialog, banReason)}
                            >
                                {actionId ? 'Banning…' : 'Confirm Ban'}
                            </AdminButton>
                            <AdminButton variant="ghost" onClick={() => { setShowBanDialog(null); setBanReason(''); }}>
                                Cancel
                            </AdminButton>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
