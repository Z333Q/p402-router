"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import {
    LayoutDashboard,
    Link2,
    BarChart2,
    DollarSign,
    Wallet,
    BookOpen,
    Package,
    Users,
    Briefcase,
    Settings,
    X,
    Unplug,
    ChevronRight,
    ShieldCheck,
    TrendingUp,
} from "lucide-react"
import { useSession, signOut } from "next-auth/react"
import { hasPermission } from "@/lib/partner/permissions"
import type { PartnerPermission } from "@/lib/partner/permissions"

// ---------------------------------------------------------------------------
// Nav definitions
// ---------------------------------------------------------------------------

const PARTNER_NAV = [
    { name: "Overview",     href: "/partner",             icon: LayoutDashboard, permission: 'partner.dashboard.read'    as PartnerPermission },
    { name: "Links",        href: "/partner/links",       icon: Link2,           permission: 'partner.links.read'        as PartnerPermission },
    { name: "Conversions",  href: "/partner/conversions", icon: TrendingUp,      permission: 'partner.conversions.read'  as PartnerPermission },
    { name: "Commissions",  href: "/partner/commissions", icon: BarChart2,       permission: 'partner.commissions.read'  as PartnerPermission },
    { name: "Payouts",      href: "/partner/payouts",     icon: Wallet,          permission: 'partner.payouts.read'      as PartnerPermission },
];

const PARTNER_RESOURCES = [
    { name: "Docs & Guides", href: "/partner/docs",    icon: BookOpen, permission: 'partner.docs.read'   as PartnerPermission },
    { name: "Assets",        href: "/partner/assets",  icon: Package,  permission: 'partner.assets.read' as PartnerPermission },
];

const PARTNER_SALES = [
    { name: "Leads",         href: "/partner/leads",   icon: Users,     permission: 'partner.leads.read' as PartnerPermission },
    { name: "Deals",         href: "/partner/deals",   icon: Briefcase, permission: 'partner.deals.read' as PartnerPermission },
];

const ADMIN_NAV = [
    { name: "Applications",  href: "/partner-admin/applications", icon: ShieldCheck,    permission: 'partner.admin.applications.read' as PartnerPermission },
    { name: "Partners",      href: "/partner-admin/partners",     icon: Users,          permission: 'partner.admin.partners.read'     as PartnerPermission },
    { name: "Review Queue",  href: "/partner-admin/review",       icon: BarChart2,      permission: 'partner.admin.review.read'       as PartnerPermission },
    { name: "Payouts",       href: "/partner-admin/payouts",      icon: DollarSign,     permission: 'partner.admin.payouts.read'      as PartnerPermission },
];

// ---------------------------------------------------------------------------
// Sidebar
// ---------------------------------------------------------------------------

export function PartnerSidebar({
    isOpen,
    setIsOpen,
    permissions,
}: {
    isOpen: boolean;
    setIsOpen: (val: boolean) => void;
    permissions: PartnerPermission[];
}) {
    const pathname = usePathname()
    const { data: session } = useSession()
    const partnerName = (session?.user as any)?.partnerDisplayName ?? "Partner"

    const can = (p: PartnerPermission) => hasPermission(permissions, p)

    const isActive = (href: string) =>
        href === '/partner' ? pathname === '/partner' : pathname?.startsWith(href)

    const renderLink = (item: { name: string; href: string; icon: React.ElementType; permission: PartnerPermission }) => {
        if (!can(item.permission)) return null;
        const active = isActive(item.href)
        return (
            <Link
                key={item.href}
                href={item.href}
                onClick={() => setIsOpen(false)}
                className={`
                    group flex items-center gap-3 border-l-4 px-3 py-3
                    text-[11px] font-black uppercase tracking-widest transition-all
                    ${active
                        ? "border-black bg-primary text-black shadow-[4px_0_0_0_rgba(0,0,0,1)]"
                        : "border-transparent text-neutral-400 hover:bg-neutral-50 hover:text-black hover:border-neutral-200"
                    }
                `}
            >
                <item.icon className={`h-4 w-4 transition-transform group-hover:scale-110 ${active ? "text-black" : "text-neutral-500"}`} />
                {item.name}
            </Link>
        )
    }

    const showSales    = can('partner.leads.read') || can('partner.deals.read')
    const showAdmin    = can('partner.admin.applications.read') || can('partner.admin.partners.read') ||
                         can('partner.admin.review.read') || can('partner.admin.payouts.read')

    return (
        <aside className={`
            fixed left-0 top-0 z-40 h-screen w-64 border-r-2 border-black bg-white
            transition-transform duration-300 ease-in-out lg:translate-x-0
            flex flex-col
            ${isOpen ? 'translate-x-0' : '-translate-x-full'}
        `}>
            {/* Logo */}
            <div className="flex h-16 items-center justify-between border-b-2 border-black px-6 bg-white">
                <Link href="/" className="flex items-center gap-2" onClick={() => setIsOpen(false)}>
                    <img src="/favicon.png" alt="P402 Logo" className="h-8 w-8 border-2 border-black" />
                    <span className="font-sans text-xl font-black tracking-tighter text-black uppercase italic">
                        P402<span className="text-primary">.io</span>
                    </span>
                </Link>
                <button onClick={() => setIsOpen(false)} className="lg:hidden p-2 hover:bg-neutral-100 border-2 border-black">
                    <X size={16} />
                </button>
            </div>

            {/* Partner badge */}
            <div className="px-4 py-3 border-b-2 border-black bg-neutral-50">
                <div className="flex items-center gap-2">
                    <span className="inline-block px-2 py-0.5 text-[9px] font-black uppercase tracking-widest bg-primary text-black border border-black">
                        Partner
                    </span>
                    <span className="text-[11px] font-black text-neutral-600 truncate">{partnerName}</span>
                </div>
                <Link
                    href="/dashboard"
                    className="mt-2 flex items-center gap-1 text-[10px] font-bold text-neutral-400 hover:text-black transition-colors uppercase tracking-widest"
                >
                    <ChevronRight size={10} />
                    Switch to Customer
                </Link>
            </div>

            {/* Navigation */}
            <nav className="flex-1 space-y-5 px-3 py-5 overflow-y-auto">
                {/* Core */}
                <div className="space-y-0.5">
                    <div className="px-3 mb-2 text-[10px] font-black text-neutral-500 uppercase tracking-[0.2em]">Performance</div>
                    {PARTNER_NAV.map(renderLink)}
                </div>

                {/* Resources */}
                <div className="space-y-0.5">
                    <div className="px-3 mb-2 text-[10px] font-black text-neutral-500 uppercase tracking-[0.2em]">Resources</div>
                    {PARTNER_RESOURCES.map(renderLink)}
                </div>

                {/* Sales (agency/enterprise only) */}
                {showSales && (
                    <div className="space-y-0.5">
                        <div className="px-3 mb-2 text-[10px] font-black text-neutral-500 uppercase tracking-[0.2em]">Sales</div>
                        {PARTNER_SALES.map(renderLink)}
                    </div>
                )}

                {/* Admin (internal only) */}
                {showAdmin && (
                    <div className="space-y-0.5">
                        <div className="px-3 mb-2 text-[10px] font-black text-primary/60 uppercase tracking-[0.2em]">Admin</div>
                        {ADMIN_NAV.map(renderLink)}
                    </div>
                )}
            </nav>

            {/* Footer */}
            <div className="border-t-2 border-black p-4 bg-neutral-50 space-y-2">
                <Link
                    href="/partner/settings"
                    onClick={() => setIsOpen(false)}
                    className={`flex items-center gap-3 px-3 py-2.5 text-[10px] font-black uppercase tracking-widest transition-colors ${
                        pathname === '/partner/settings' ? 'text-black' : 'text-neutral-400 hover:text-black'
                    }`}
                >
                    <Settings className="h-3.5 w-3.5" />
                    Settings
                </Link>
                <button
                    onClick={() => signOut({ callbackUrl: '/login' })}
                    className="flex w-full items-center gap-3 px-3 py-2.5 text-[10px] font-black uppercase tracking-widest text-neutral-400 hover:text-error transition-colors group"
                >
                    <Unplug className="h-3.5 w-3.5 group-hover:translate-x-1 transition-transform" />
                    Sign Out
                </button>
            </div>
        </aside>
    )
}
