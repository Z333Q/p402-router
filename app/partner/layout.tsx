'use client'

import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import { Menu } from 'lucide-react'
import { PartnerSidebar } from '@/components/layout/PartnerSidebar'
import { resolvePartnerPermissions } from '@/lib/partner/permissions'
import type { PartnerPermission } from '@/lib/partner/permissions'
import Link from 'next/link'

export default function PartnerLayout({ children }: { children: React.ReactNode }) {
    const { data: session, status } = useSession()
    const router = useRouter()
    const [isSidebarOpen, setIsSidebarOpen] = useState(false)
    const [loadingTooLong, setLoadingTooLong] = useState(false)

    const user = session?.user as {
        partnerId?: string;
        partnerRole?: string;
        partnerGroupIds?: string[];
    } | undefined

    useEffect(() => {
        if (status === 'unauthenticated') {
            router.push('/login?callbackUrl=/partner')
        }
    }, [status, router])

    useEffect(() => {
        if (status === 'loading') {
            const t = setTimeout(() => setLoadingTooLong(true), 8000)
            return () => clearTimeout(t)
        }
        setLoadingTooLong(false)
    }, [status])

    // Loading state
    if (status === 'loading') {
        return (
            <div className="flex h-screen w-full items-center justify-center bg-white">
                <div className="flex flex-col items-center gap-4">
                    <div className="h-1 w-32 overflow-hidden bg-neutral-100 border border-black">
                        <div className="h-full w-full animate-loading-bar bg-primary origin-left" />
                    </div>
                    <span className="font-mono text-xs text-neutral-400 uppercase tracking-widest">Loading Partner Portal...</span>
                    {loadingTooLong && (
                        <button onClick={() => router.push('/login')} className="btn btn-secondary text-xs mt-2">
                            Go to Sign In
                        </button>
                    )}
                </div>
            </div>
        )
    }

    // Not authenticated — redirect handled above, show nothing
    if (status === 'unauthenticated') return null

    // Authenticated but no partner membership — show apply prompt
    if (!user?.partnerId) {
        return (
            <div className="flex h-screen w-full items-center justify-center bg-white p-8">
                <div className="max-w-md w-full border-2 border-black bg-white p-8">
                    <div className="mb-6">
                        <span className="inline-block px-2 py-0.5 text-[9px] font-black uppercase tracking-widest bg-neutral-100 border border-black text-neutral-600 mb-4">
                            Partner Portal
                        </span>
                        <h1 className="text-2xl font-black uppercase tracking-tight text-black mb-3">
                            Not a Partner Yet
                        </h1>
                        <p className="text-sm text-neutral-600 leading-relaxed">
                            Your account doesn&apos;t have an active partner membership.
                            Apply to join the P402 Partner Program to earn commissions
                            on referred subscriptions and usage.
                        </p>
                    </div>
                    <div className="flex flex-col gap-3">
                        <Link
                            href="/partners/apply"
                            className="btn btn-primary w-full text-center"
                        >
                            Apply to Partner Program →
                        </Link>
                        <Link
                            href="/partners"
                            className="btn btn-secondary w-full text-center"
                        >
                            Learn About the Program
                        </Link>
                        <Link
                            href="/dashboard"
                            className="text-[11px] font-bold text-neutral-400 hover:text-black transition-colors text-center uppercase tracking-widest"
                        >
                            ← Back to Dashboard
                        </Link>
                    </div>
                </div>
            </div>
        )
    }

    const permissions: PartnerPermission[] = resolvePartnerPermissions(user.partnerRole ?? '')

    return (
        <div className="flex min-h-screen bg-neutral-50 font-sans text-black selection:bg-primary selection:text-black">
            {/* Sidebar */}
            <PartnerSidebar
                isOpen={isSidebarOpen}
                setIsOpen={setIsSidebarOpen}
                permissions={permissions}
            />

            {/* Mobile overlay */}
            {isSidebarOpen && (
                <div
                    className="fixed inset-0 z-30 bg-black/50 backdrop-blur-sm lg:hidden"
                    onClick={() => setIsSidebarOpen(false)}
                />
            )}

            {/* Main */}
            <main className="flex-1 flex flex-col min-w-0 lg:ml-64">
                {/* Top bar */}
                <header className="flex h-16 items-center justify-between border-b-2 border-black bg-white px-4 lg:px-8 sticky top-0 z-20">
                    <div className="flex items-center gap-4">
                        <button
                            onClick={() => setIsSidebarOpen(true)}
                            className="lg:hidden p-2 hover:bg-neutral-100 border-2 border-black transition-colors"
                        >
                            <Menu size={20} />
                        </button>
                        <span className="font-mono text-[10px] text-neutral-400 uppercase tracking-[0.2em] font-black hidden sm:inline-block">
                            Partner Portal: <span className="text-black bg-primary px-2 py-0.5 ml-2 italic capitalize">
                                {user.partnerRole?.replace('partner_', '').replace('_', ' ')}
                            </span>
                        </span>
                    </div>
                    <div className="flex items-center gap-4">
                        <Link
                            href="/dashboard"
                            className="text-[10px] font-black uppercase tracking-widest text-neutral-400 hover:text-black transition-colors border border-neutral-200 hover:border-black px-3 py-1.5"
                        >
                            Customer ↗
                        </Link>
                        <div className="h-2 w-2 bg-primary border border-black" />
                    </div>
                </header>

                <div className="flex-1 overflow-x-hidden p-4 lg:p-8">
                    <div className="mx-auto max-w-7xl animate-in fade-in duration-300">
                        {children}
                    </div>
                </div>
            </main>
        </div>
    )
}
