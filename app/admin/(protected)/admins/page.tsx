'use client';
import { useEffect, useState } from 'react';
import { DataTable, AdminPageHeader, RoleBadge, StatusBadge, AdminButton } from '../../_components/AdminUI';
import { ADMIN_ROLES, type AdminRole } from '@/lib/admin/permissions';

type AdminUser = {
    id: string;
    email: string;
    name: string | null;
    role: AdminRole;
    is_active: boolean;
    totp_enabled: boolean;
    last_login_at: string | null;
    created_at: string;
    created_by_email: string | null;
};

export default function AdminsPage() {
    const [admins, setAdmins]   = useState<AdminUser[]>([]);
    const [loading, setLoading] = useState(true);
    const [showForm, setShowForm] = useState(false);
    const [form, setForm]       = useState({ email: '', name: '', role: 'analytics', password: '' });
    const [saving, setSaving]   = useState(false);
    const [error, setError]     = useState('');
    const [deactivating, setDeactivating] = useState<string | null>(null);

    async function load() {
        setLoading(true);
        const res = await fetch('/api/admin/admins');
        if (res.ok) {
            const d = await res.json();
            setAdmins(d.admins ?? []);
        }
        setLoading(false);
    }

    useEffect(() => { load(); }, []);

    async function create(e: React.FormEvent) {
        e.preventDefault();
        setSaving(true);
        setError('');
        const res = await fetch('/api/admin/admins', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(form),
        });
        if (res.ok) {
            setShowForm(false);
            setForm({ email: '', name: '', role: 'analytics', password: '' });
            load();
        } else {
            const d = await res.json();
            setError(d.error ?? 'Failed to create admin');
        }
        setSaving(false);
    }

    async function deactivate(id: string) {
        setDeactivating(id);
        await fetch(`/api/admin/admins/${id}`, { method: 'DELETE' });
        setDeactivating(null);
        load();
    }

    const columns = [
        {
            key: 'email',
            header: 'Admin',
            render: (row: AdminUser) => (
                <div>
                    <div className="text-sm font-bold text-white">{row.name ?? row.email}</div>
                    <div className="text-[10px] text-neutral-500 font-mono">{row.email}</div>
                </div>
            ),
        },
        {
            key: 'role',
            header: 'Role',
            width: '120px',
            render: (row: AdminUser) => <RoleBadge role={row.role} />,
        },
        {
            key: 'is_active',
            header: 'Status',
            width: '90px',
            render: (row: AdminUser) => <StatusBadge status={row.is_active ? 'active' : 'inactive'} />,
        },
        {
            key: 'totp_enabled',
            header: '2FA',
            width: '70px',
            render: (row: AdminUser) => (
                <span className={`text-[10px] font-mono font-black ${row.totp_enabled ? 'text-[#34D399]' : 'text-neutral-600'}`}>
                    {row.totp_enabled ? 'ON' : 'OFF'}
                </span>
            ),
        },
        {
            key: 'last_login_at',
            header: 'Last Login',
            width: '130px',
            render: (row: AdminUser) => (
                <span className="text-[10px] text-neutral-500 font-mono">
                    {row.last_login_at ? new Date(row.last_login_at).toLocaleDateString() : 'Never'}
                </span>
            ),
        },
        {
            key: 'created_by_email',
            header: 'Created By',
            width: '160px',
            render: (row: AdminUser) => (
                <span className="text-[10px] text-neutral-600 font-mono">{row.created_by_email ?? 'System'}</span>
            ),
        },
        {
            key: 'actions',
            header: '',
            width: '120px',
            render: (row: AdminUser) => (
                row.role !== 'super_admin' && row.is_active ? (
                    <AdminButton
                        size="sm"
                        variant="danger"
                        disabled={deactivating === row.id}
                        onClick={() => deactivate(row.id)}
                    >
                        {deactivating === row.id ? '…' : 'Deactivate'}
                    </AdminButton>
                ) : null
            ),
        },
    ];

    return (
        <div>
            <AdminPageHeader
                title="Admin Users"
                subtitle="Manage who has access to this console"
                action={
                    <AdminButton onClick={() => setShowForm(true)} variant="primary">
                        + Add Admin
                    </AdminButton>
                }
            />

            <DataTable
                columns={columns as Parameters<typeof DataTable>[0]['columns']}
                data={admins as Record<string, unknown>[]}
                loading={loading}
                total={admins.length}
                rowKey={(r: Record<string, unknown>) => String(r.id)}
                emptyMessage="No admin users configured"
            />

            {/* Create admin modal */}
            {showForm && (
                <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
                    <div className="border-2 border-neutral-700 bg-[#0D0D0D] p-8 w-full max-w-md">
                        <h3 className="text-sm font-black text-white uppercase tracking-widest mb-6">Add Admin</h3>
                        <form onSubmit={create} className="space-y-4">
                            {[
                                { key: 'email', label: 'Email', type: 'email', placeholder: 'admin@p402.io' },
                                { key: 'name', label: 'Name', type: 'text', placeholder: 'Jane Smith' },
                                { key: 'password', label: 'Password', type: 'password', placeholder: '••••••••' },
                            ].map(f => (
                                <div key={f.key}>
                                    <label className="block text-[10px] font-black uppercase tracking-widest text-neutral-500 mb-2">{f.label}</label>
                                    <input
                                        type={f.type}
                                        value={form[f.key as keyof typeof form]}
                                        onChange={e => setForm(prev => ({ ...prev, [f.key]: e.target.value }))}
                                        placeholder={f.placeholder}
                                        className="w-full h-10 px-3 bg-neutral-900 border-2 border-neutral-700 text-white font-mono text-xs focus:outline-none focus:border-[#FF3B30]"
                                        required={f.key !== 'name'}
                                    />
                                </div>
                            ))}
                            <div>
                                <label className="block text-[10px] font-black uppercase tracking-widest text-neutral-500 mb-2">Role</label>
                                <select
                                    value={form.role}
                                    onChange={e => setForm(prev => ({ ...prev, role: e.target.value }))}
                                    className="w-full h-10 px-3 bg-neutral-900 border-2 border-neutral-700 text-white font-mono text-xs focus:outline-none focus:border-[#FF3B30]"
                                >
                                    {ADMIN_ROLES.filter(r => r !== 'super_admin').map(r => (
                                        <option key={r} value={r}>{r}</option>
                                    ))}
                                </select>
                            </div>

                            {error && (
                                <div className="text-[10px] font-mono text-[#FF3B30] border border-[#FF3B30] px-3 py-2">{error}</div>
                            )}

                            <div className="flex gap-3 pt-2">
                                <AdminButton type="submit" variant="primary" disabled={saving}>
                                    {saving ? 'Creating…' : 'Create Admin'}
                                </AdminButton>
                                <AdminButton variant="ghost" onClick={() => { setShowForm(false); setError(''); }}>
                                    Cancel
                                </AdminButton>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
