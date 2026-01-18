'use client'
import { AppSidebar } from '@/components/layout/AppSidebar'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import { Menu, X } from 'lucide-react'
import { Footer } from '@/components/Footer'

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
    const { status } = useSession()
    const router = useRouter()
    const [isSidebarOpen, setIsSidebarOpen] = useState(false)

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
            <AppSidebar isOpen={isSidebarOpen} setIsOpen={setIsSidebarOpen} />

            {/* Mobile Overlay */}
            {isSidebarOpen && (
                <div
                    className="fixed inset-0 z-30 bg-black/50 backdrop-blur-sm lg:hidden animate-in fade-in duration-300"
                    onClick={() => setIsSidebarOpen(false)}
                />
            )}

            {/* Main Content Area */}
            <main className="flex-1 flex flex-col min-w-0 lg:ml-64">
                {/* Global Status Bar */}
                <header className="flex h-16 items-center justify-between border-b-2 border-black bg-white px-4 lg:px-8 sticky top-0 z-20">
                    <div className="flex items-center gap-4">
                        <button
                            onClick={() => setIsSidebarOpen(true)}
                            className="lg:hidden p-2 hover:bg-neutral-100 border-2 border-black transition-colors"
                        >
                            <Menu size={20} />
                        </button>
                        <span className="font-mono text-[10px] text-neutral-400 uppercase tracking-[0.2em] font-black hidden sm:inline-block">
                            System Status: <span className="text-black bg-primary px-2 py-0.5 ml-2 italic">Scale: Normal</span>
                        </span>
                    </div>
                    <div className="flex items-center gap-4">
                        <div className="h-2 w-2 rounded-full bg-primary animate-pulse border border-black" />
                    </div>
                </header>

                <div className="flex-1 overflow-x-hidden p-4 lg:p-8">
                    <div className="mx-auto max-w-7xl animate-in fade-in duration-300">
                        {children}
                    </div>
                </div>
                <Footer />
            </main>
        </div>
    )
}
