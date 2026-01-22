
"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import {
    LayoutDashboard,
    Network,
    ShieldCheck,
    DatabaseZap,
    LineChart,
    Store,
    Bot,
    Settings,
    LogOut,
    Unplug,
    Activity,
    X
} from "lucide-react"
import { useSession, signOut } from "next-auth/react"
import { useDisconnect } from 'wagmi'
import { Badge } from "@/app/dashboard/_components/ui"

const NAV_ITEMS = [
    { name: "Mission Control", href: "/dashboard", icon: LayoutDashboard },
    { name: "Live Traffic", href: "/dashboard/traffic", icon: Activity },
    { name: "Intelligence", href: "/dashboard/intelligence", icon: Bot },
    { name: "Security Audit", href: "/dashboard/audit", icon: ShieldCheck },
    { name: "Policies", href: "/dashboard/policies", icon: DatabaseZap },
    { name: "Facilitators", href: "/dashboard/facilitators", icon: Network },
    { name: "Discovery Bazaar", href: "/dashboard/bazaar", icon: Store },
]

const ADMIN_ITEMS = [
    { name: "Global Sync", href: "#", icon: Activity, adminOnly: true, action: 'sync' },
]

export function AppSidebar({ isOpen, setIsOpen }: { isOpen: boolean; setIsOpen: (val: boolean) => void }) {
    const pathname = usePathname()
    const { data: session } = useSession()
    const { disconnect } = useDisconnect()
    const isAdmin = (session?.user as any)?.isAdmin

    const handleDeauthorize = async () => {
        disconnect()
        await signOut({ callbackUrl: '/login' })
    }

    return (
        <aside className={`
            fixed left-0 top-0 z-40 h-screen w-64 border-r-2 border-black bg-white transition-transform duration-300 ease-in-out lg:translate-x-0
            ${isOpen ? 'translate-x-0' : '-translate-x-full'}
            selection:bg-primary selection:text-black shadow-[4px_0_0_0_rgba(0,0,0,0.05)]
        `}>
            {/* Logo Area */}
            <div className="flex h-16 items-center border-b-2 border-black px-6 bg-white relative overflow-hidden group">
                <div className="absolute inset-0 bg-primary/10 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none animate-flicker" />
                <Link href="/" className="flex items-center gap-2 relative z-10 w-full" onClick={() => setIsOpen(false)}>
                    <img src="/favicon.png" alt="P402 Logo" className="h-8 w-8 border-2 border-black" />
                    <span className="font-sans text-xl font-black tracking-tighter text-black uppercase italic">
                        P402<span className="text-primary NOT-italic">.io</span>
                    </span>
                </Link>
                <button
                    onClick={() => setIsOpen(false)}
                    className="lg:hidden ml-auto p-2 hover:bg-neutral-100 border-2 border-black"
                >
                    <X size={16} />
                </button>
            </div>

            {/* Navigation */}
            <nav className="flex-1 space-y-6 px-3 py-6 overflow-y-auto custom-scrollbar">
                <div className="space-y-1">
                    <div className="px-3 mb-2 text-[10px] font-black text-neutral-600 uppercase tracking-[0.2em]">Operations</div>
                    {NAV_ITEMS.map((item) => {
                        const isActive = pathname === item.href
                        return (
                            <Link
                                key={item.href}
                                href={item.href}
                                onClick={() => setIsOpen(false)}
                                className={`
                                    group flex items-center gap-3 rounded-none border-l-4 px-3 py-3 text-[11px] font-black uppercase tracking-widest transition-all
                                    ${isActive
                                        ? "border-black bg-primary text-black shadow-[4px_0_0_0_rgba(0,0,0,1)]"
                                        : "border-transparent text-neutral-400 hover:bg-neutral-50 hover:text-black hover:border-neutral-200"
                                    }
                                `}
                            >
                                <item.icon className={`h-4 w-4 transition-transform group-hover:scale-110 ${isActive ? "text-primary shadow-[0_0_8px_rgba(182,255,46,0.5)]" : "text-neutral-600 group-hover:text-neutral-100"}`} />
                                {item.name}
                            </Link>
                        )
                    })}
                </div>

                {isAdmin && (
                    <div className="space-y-1">
                        <div className="px-3 mb-2 text-[10px] font-black text-primary/40 uppercase tracking-[0.2em]">System Controls</div>
                        {ADMIN_ITEMS.map((item) => (
                            <button
                                key={item.name}
                                className="w-full group flex items-center gap-3 rounded-none border-l-4 border-transparent px-3 py-3 text-[11px] font-black uppercase tracking-widest text-neutral-400 hover:bg-neutral-50 hover:text-black hover:border-black transition-all"
                                onClick={async () => {
                                    if (item.action === 'sync') {
                                        try {
                                            const res = await fetch('/api/v1/bazaar/sync', { method: 'POST' });
                                            if (res.ok) alert('Global Sync Initiated successfully.');
                                            else alert('Sync failed: ' + res.statusText);
                                        } catch (e) {
                                            alert('Sync system unreachable');
                                        }
                                    }
                                }}
                            >
                                <item.icon className="h-4 w-4 text-neutral-600 group-hover:text-primary" />
                                {item.name}
                            </button>
                        ))}
                    </div>
                )}
            </nav>

            {/* Footer / User */}
            <div className="border-t-2 border-black p-4 bg-neutral-50">
                <button
                    onClick={handleDeauthorize}
                    className="flex w-full items-center gap-3 px-3 py-2.5 text-[10px] font-black uppercase tracking-widest text-neutral-400 hover:text-error transition-colors group"
                >
                    <Unplug className="h-3.5 w-3.5 group-hover:translate-x-1 transition-transform" />
                    Deauthorize
                </button>
            </div>
        </aside>
    )
}
