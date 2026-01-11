'use client'
import { AppSidebar } from '@/components/layout/AppSidebar'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { useEffect } from 'react'

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
    const { status } = useSession()
    const router = useRouter()

    useEffect(() => {
        if (status === 'unauthenticated') {
            router.push('/login')
        }
    }, [status, router])

    if (status === 'loading') {
        return (
            <div className="flex h-screen w-full items-center justify-center bg-white">
                <div className="flex flex-col items-center gap-4">
                    <div className="h-1 w-32 overflow-hidden bg-neutral-100 border border-black">
                        <div className="h-full w-full animate-loading-bar bg-primary origin-left" />
                    </div>
                    <span className="font-mono text-xs text-neutral-400 uppercase tracking-widest">Initializing System...</span>
                </div>
            </div>
        )
    }

    return (
        <div className="flex min-h-screen bg-neutral-50 font-sans text-black selection:bg-primary selection:text-black">
            {/* Sidebar Shell */}
            <AppSidebar />

            {/* Main Content Area */}
            <main className="ml-64 flex-1 flex flex-col min-w-0">
                {/* Global Status Bar */}
                <header className="flex h-16 items-center justify-between border-b-2 border-black bg-white px-8">
                    <span className="font-mono text-[10px] text-neutral-400 uppercase tracking-[0.2em] font-black">
                        System Status: <span className="text-black bg-primary px-2 py-0.5 ml-2 italic">Scale: Normal</span>
                    </span>
                    <div className="flex items-center gap-4">
                        <div className="h-2 w-2 rounded-full bg-primary animate-pulse border border-black" />
                    </div>
                </header>

                <div className="flex-1 overflow-auto p-8">
                    <div className="mx-auto max-w-7xl animate-in fade-in duration-300">
                        {children}
                    </div>
                </div>
            </main>
        </div>
    )
}
