'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
    LayoutDashboard, Users, TrendingUp, Activity, ShieldAlert,
    Brain, Store, Crown, FileText, Server,
} from 'lucide-react';
import { hasPermission, ROLE_LABELS, ROLE_COLORS, type AdminRole } from '@/lib/admin/permissions';

const ICON_MAP: Record<string, React.ElementType> = {
    'layout-dashboard': LayoutDashboard,
    'users': Users,
    'trending-up': TrendingUp,
    'activity': Activity,
    'shield-alert': ShieldAlert,
    'brain': Brain,
    'store': Store,
    'crown': Crown,
    'file-text': FileText,
    'server': Server,
};

const NAV = [
    { label: 'Overview',     href: '/admin/overview',     icon: 'layout-dashboard', permission: 'overview.read' },
    { label: 'Users',        href: '/admin/users',         icon: 'users',            permission: 'users.read' },
    { label: 'Analytics',    href: '/admin/analytics',     icon: 'trending-up',      permission: 'analytics.read' },
    { label: 'Health',       href: '/admin/health',        icon: 'activity',         permission: 'health.*' },
    { label: 'Safety',       href: '/admin/safety',        icon: 'shield-alert',     permission: 'safety.*' },
    { label: 'Intelligence', href: '/admin/intelligence',  icon: 'brain',            permission: 'intelligence.read' },
    { label: 'Bazaar',       href: '/admin/bazaar',        icon: 'store',            permission: 'bazaar.*' },
    { label: 'Admin Users',  href: '/admin/admins',        icon: 'crown',            permission: '*' },
    { label: 'Audit Log',    href: '/admin/audit',         icon: 'file-text',        permission: 'audit.read' },
    { label: 'System',       href: '/admin/system',        icon: 'server',           permission: 'system.*' },
];

export function AdminSidebar({ role }: { role: AdminRole }) {
    const pathname = usePathname();
    const visible = NAV.filter(item => hasPermission(role, item.permission));
    const roleColor = ROLE_COLORS[role];
    const roleLabel = ROLE_LABELS[role];

    return (
        <aside className="hidden lg:flex flex-col w-60 min-h-screen border-r-2 border-neutral-800 bg-[#0D0D0D] fixed top-0 left-0 bottom-0 z-40">
            {/* Logo */}
            <div className="flex items-center gap-3 px-5 h-16 border-b-2 border-neutral-800">
                <div className="w-7 h-7 flex items-center justify-center border-2 border-[#FF3B30]">
                    <span className="font-black text-[10px] text-[#FF3B30]">P4</span>
                </div>
                <div>
                    <div className="font-black text-[11px] text-white uppercase tracking-widest">Admin</div>
                    <div className="font-mono text-[9px] uppercase tracking-widest" style={{ color: roleColor }}>
                        {roleLabel}
                    </div>
                </div>
            </div>

            {/* Nav */}
            <nav className="flex-1 py-4 px-3 overflow-y-auto">
                <div className="space-y-0.5">
                    {visible.map(item => {
                        const Icon = ICON_MAP[item.icon] ?? LayoutDashboard;
                        const active = pathname.startsWith(item.href);
                        return (
                            <Link
                                key={item.href}
                                href={item.href}
                                className={`flex items-center gap-3 px-3 h-9 text-xs font-bold uppercase tracking-wider transition-colors border-l-2 ${
                                    active
                                        ? 'border-[#FF3B30] bg-[#FF3B30]/10 text-white'
                                        : 'border-transparent text-neutral-500 hover:text-neutral-300 hover:bg-neutral-800/50'
                                }`}
                            >
                                <Icon size={14} strokeWidth={2.5} />
                                {item.label}
                            </Link>
                        );
                    })}
                </div>
            </nav>

            {/* Bottom — back to app */}
            <div className="px-3 pb-4 border-t-2 border-neutral-800 pt-4">
                <a
                    href="/dashboard"
                    className="flex items-center gap-3 px-3 h-9 text-xs font-bold uppercase tracking-wider text-neutral-600 hover:text-neutral-400 transition-colors"
                >
                    ← Tenant Dashboard
                </a>
            </div>
        </aside>
    );
}
