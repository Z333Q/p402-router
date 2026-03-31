'use client';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { LogOut, Shield } from 'lucide-react';
import { ROLE_LABELS, ROLE_COLORS, type AdminRole } from '@/lib/admin/permissions';
import type { AdminUser } from '@/lib/admin/auth';

export function AdminHeader({ admin }: { admin: AdminUser }) {
    const router = useRouter();
    const [loggingOut, setLoggingOut] = useState(false);

    async function logout() {
        setLoggingOut(true);
        await fetch('/api/admin/auth', { method: 'DELETE' });
        router.push('/admin/login');
    }

    const roleColor = ROLE_COLORS[admin.role as AdminRole];
    const roleLabel = ROLE_LABELS[admin.role as AdminRole];

    return (
        <header className="h-16 border-b-2 border-neutral-800 bg-[#0D0D0D] flex items-center justify-between px-6 sticky top-0 z-30">
            <div className="flex items-center gap-3">
                <Shield size={14} className="text-[#FF3B30]" />
                <span className="font-mono text-[10px] uppercase tracking-widest text-neutral-500">
                    P402 Admin Console
                </span>
                <span className="text-neutral-700">·</span>
                <span className="font-mono text-[10px] text-neutral-600">All actions logged</span>
            </div>

            <div className="flex items-center gap-4">
                {/* Role badge */}
                <div
                    className="px-2 py-1 border font-mono text-[9px] uppercase tracking-widest"
                    style={{ borderColor: roleColor, color: roleColor }}
                >
                    {roleLabel}
                </div>

                {/* Admin identity */}
                <span className="text-xs text-neutral-400 font-mono hidden sm:block">
                    {admin.email}
                </span>

                {/* Logout */}
                <button
                    onClick={logout}
                    disabled={loggingOut}
                    className="flex items-center gap-2 h-8 px-3 border-2 border-neutral-700 text-neutral-400 hover:border-[#FF3B30] hover:text-[#FF3B30] transition-colors text-[10px] font-black uppercase tracking-widest disabled:opacity-40"
                >
                    <LogOut size={12} />
                    {loggingOut ? '...' : 'Sign Out'}
                </button>
            </div>
        </header>
    );
}
