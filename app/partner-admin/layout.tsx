'use client'

import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { useEffect } from 'react'
import Link from 'next/link'
import { isInternalPartnerRole } from '@/lib/partner/permissions'
import { Users, FileText, DollarSign, Package, LayoutDashboard, Briefcase, UserPlus } from 'lucide-react'

const NAV_ITEMS = [
    { href: '/partner-admin/applications', label: 'Applications',     icon: FileText },
    { href: '/partner-admin/partners',     label: 'Partners',         icon: Users },
    { href: '/partner-admin/leads',        label: 'Leads',            icon: UserPlus },
    { href: '/partner-admin/deals',        label: 'Deals',            icon: Briefcase },
    { href: '/partner-admin/review',       label: 'Commission Review', icon: DollarSign },
    { href: '/partner-admin/payouts',      label: 'Payout Batches',   icon: Package },
]

export default function PartnerAdminLayout({ children }: { children: React.ReactNode }) {
    const { data: session, status } = useSession()
    const router = useRouter()

    const user = session?.user as { partnerRole?: string } | undefined
    const isAdmin = user?.partnerRole ? isInternalPartnerRole(user.partnerRole) : false

    useEffect(() => {
        if (status === 'unauthenticated') {
            router.push('/login?callbackUrl=/partner-admin/applications')
        }
        if (status === 'authenticated' && !isAdmin) {
            router.push('/partner')
        }
    }, [status, isAdmin, router])

    if (status === 'loading') {
        return (
            <div className="flex h-screen items-center justify-center bg-white">
                <div className="h-1 w-32 overflow-hidden bg-neutral-100 border border-black">
                    <div className="h-full w-full animate-loading-bar bg-primary origin-left" />
                </div>
            </div>
        )
    }

    if (!isAdmin) return null

    return (
        <div className="flex min-h-screen bg-neutral-50 font-sans text-black">
            {/* Sidebar */}
            <aside className="w-56 border-r-2 border-black bg-white flex flex-col shrink-0 fixed h-full z-10">
                <div className="border-b-2 border-black px-5 py-4">
                    <div className="flex items-center gap-2">
                        <div className="w-4 h-4 bg-black" />
                        <span className="font-black uppercase tracking-[0.15em] text-[11px]">Partner Admin</span>
                    </div>
                    <div className="mt-1 px-0.5 py-0.5 bg-neutral-900 text-primary text-[9px] font-black uppercase tracking-widest inline-block">
                        INTERNAL
                    </div>
                </div>

                <nav className="flex-1 py-4 overflow-y-auto">
                    {NAV_ITEMS.map(item => (
                        <Link
                            key={item.href}
                            href={item.href}
                            className="flex items-center gap-3 px-5 py-3 text-xs font-bold uppercase tracking-widest text-neutral-600 hover:bg-primary hover:text-black transition-colors"
                        >
                            <item.icon size={14} />
                            {item.label}
                        </Link>
                    ))}
                </nav>

                <div className="border-t-2 border-black p-4 space-y-2">
                    <Link href="/partner" className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-neutral-400 hover:text-black transition-colors">
                        <LayoutDashboard size={12} /> Partner Portal
                    </Link>
                    <Link href="/dashboard" className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-neutral-400 hover:text-black transition-colors">
                        ← Dashboard
                    </Link>
                </div>
            </aside>

            {/* Main */}
            <main className="flex-1 ml-56">
                <header className="h-14 border-b-2 border-black bg-white flex items-center px-8 sticky top-0 z-20">
                    <span className="text-[10px] font-black uppercase tracking-[0.25em] text-neutral-400">
                        P402 / Partner Program Administration
                    </span>
                </header>
                <div className="p-8">
                    <div className="max-w-7xl mx-auto">
                        {children}
                    </div>
                </div>
            </main>
        </div>
    )
}
