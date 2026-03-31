/**
 * Admin RBAC — role definitions and permission checking.
 * Roles are hierarchical: super_admin > ops_admin/safety/finance > analytics (read-only).
 */

export const ADMIN_ROLES = ['super_admin', 'ops_admin', 'analytics', 'safety', 'finance'] as const;
export type AdminRole = typeof ADMIN_ROLES[number];

// Permission wildcard format: 'resource.*' = all actions on resource
// '*' = full platform access
const ROLE_PERMISSIONS: Record<AdminRole, readonly string[]> = {
    super_admin: ['*'],
    ops_admin:   ['overview.read', 'health.*', 'facilitators.*', 'routing.*', 'system.*', 'users.read', 'bazaar.*', 'analytics.read', 'audit.read', 'intelligence.read'],
    analytics:   ['overview.read', 'analytics.read', 'users.read', 'audit.read', 'intelligence.read'],
    safety:      ['overview.read', 'safety.*', 'users.read', 'users.ban', 'users.unban', 'audit.read'],
    finance:     ['overview.read', 'analytics.read', 'analytics.revenue', 'audit.read'],
} as const;

export function hasPermission(role: AdminRole, permission: string): boolean {
    const perms = ROLE_PERMISSIONS[role];
    if (!perms) return false;
    for (const p of perms) {
        if (p === '*') return true;
        if (p.endsWith('.*') && permission.startsWith(p.slice(0, -2))) return true;
        if (p === permission) return true;
    }
    return false;
}

// Nav items visible to each role (used by AdminSidebar)
export interface NavItem {
    label: string;
    href: string;
    icon: string;
    permission: string;
    badge?: string;
}

export const ADMIN_NAV: NavItem[] = [
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

export const ROLE_LABELS: Record<AdminRole, string> = {
    super_admin: 'Super Admin',
    ops_admin:   'Ops Admin',
    analytics:   'Analytics',
    safety:      'Safety',
    finance:     'Finance',
};

export const ROLE_COLORS: Record<AdminRole, string> = {
    super_admin: '#FF3B30',
    ops_admin:   '#FF9500',
    analytics:   '#22D3EE',
    safety:      '#F59E0B',
    finance:     '#22C55E',
};
