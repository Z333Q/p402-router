'use client';

import Link from 'next/link';
import { useSession } from 'next-auth/react';
import { useState, useEffect } from 'react';
import dynamic from 'next/dynamic';
import { Badge } from '@/app/dashboard/_components/ui';
import { CommandPalette } from '@/components/common/CommandPalette';

const NavConnectButton = dynamic(() => import('./NavConnectButton'), { ssr: false });
const ConnectButton = dynamic(
    () => import('@rainbow-me/rainbowkit').then(mod => mod.ConnectButton),
    { ssr: false }
);

export function TopNav() {
    // ... existing hook logic ...
    const { data: session } = useSession();
    const user = session?.user;
    const [isMenuOpen, setIsMenuOpen] = useState(false);
    const [isPaletteOpen, setIsPaletteOpen] = useState(false);

    // Keyboard Listener for Command Palette
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
                e.preventDefault();
                setIsPaletteOpen(prev => !prev);
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, []);

    return (
        <header className="sticky top-0 z-50 bg-white border-b-2 border-black selection:bg-primary selection:text-black transition-none">
            <CommandPalette isOpen={isPaletteOpen} onClose={() => setIsPaletteOpen(false)} />
            <div className="container flex items-center justify-between h-16 px-6 mx-auto max-w-7xl relative overflow-hidden">

                <Link href="/" className="no-underline text-inherit relative z-10">
                    <div className="flex items-center gap-2 font-black uppercase tracking-tighter italic">
                        <div className="w-8 h-8 bg-primary border-2 border-black flex items-center justify-center overflow-hidden">
                            <img src="/favicon.png" alt="P402 Logo" className="w-6 h-6" />
                        </div>
                        P402<span className="text-primary NOT-italic">.io</span>
                    </div>
                </Link>

                {/* Command Palette Affordance */}
                <div
                    onClick={() => setIsPaletteOpen(true)}
                    className="hidden lg:flex flex-1 max-w-md mx-8 px-4 py-2 border-2 border-black bg-neutral-50 items-center justify-between gap-4 cursor-pointer hover:bg-neutral-100 transition-colors"
                >
                    <span className="text-[10px] font-black uppercase tracking-widest text-neutral-400">Search Protocol / Command...</span>
                    <Badge variant="default" className="!py-0.5 !px-1.5 !text-[9px] opacity-100">CMD+K</Badge>
                </div>

                {/* Desktop Nav */}
                <nav className="hidden md:flex gap-8 text-[11px] font-black uppercase tracking-[0.15em]">
                    <Link href="/#product" className="text-black no-underline hover:text-primary transition-none border-b-2 border-transparent">Product</Link>
                    <Link href="/intelligence" className="text-black no-underline hover:text-primary transition-none border-b-2 border-transparent">Intelligence</Link>
                    <Link href="/dashboard/bazaar" className="text-black no-underline hover:text-primary transition-none border-b-2 border-transparent">Bazaar</Link>
                    <Link href="/docs/api" className="text-black no-underline hover:text-primary transition-none border-b-2 border-transparent">Developers</Link>
                </nav>

                <div className="flex items-center gap-3">
                    <div className="hidden md:block">
                        <NavConnectButton />
                    </div>

                    {/* Mobile Menu Toggle */}
                    <button
                        className="btn btn-secondary block md:hidden !p-2"
                        onClick={() => setIsMenuOpen(!isMenuOpen)}
                    >
                        {isMenuOpen ? (
                            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                <path d="M18 6L6 18M6 6L18 18" stroke="currentColor" strokeWidth="2" strokeLinecap="square" />
                            </svg>
                        ) : (
                            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                <path d="M3 12H21M3 6H21M3 18H21" stroke="currentColor" strokeWidth="2" strokeLinecap="square" />
                            </svg>
                        )}
                    </button>
                </div>
            </div>

            {/* Mobile Nav Drawer */}
            {isMenuOpen && (
                <div className="absolute top-16 left-0 right-0 bg-white border-b-2 border-black p-6 flex flex-col gap-4 z-40">
                    <nav className="flex flex-col gap-4 text-base font-extrabold uppercase">
                        <Link href="/#product" onClick={() => setIsMenuOpen(false)} className="text-black no-underline">Product</Link>
                        <Link href="/intelligence" onClick={() => setIsMenuOpen(false)} className="text-black no-underline text-primary">Intelligence</Link>
                        <Link href="/dashboard/bazaar" onClick={() => setIsMenuOpen(false)} className="text-black no-underline">Bazaar</Link>
                        <Link href="/docs/api" onClick={() => setIsMenuOpen(false)} className="text-black no-underline">Developers</Link>
                        <Link href="/docs/sdk" onClick={() => setIsMenuOpen(false)} className="text-black no-underline">SDK</Link>
                        <Link href="/docs/mcp" onClick={() => setIsMenuOpen(false)} className="text-black no-underline">MCP</Link>
                    </nav>
                    <div className="border-t-2 border-black pt-4 flex flex-col gap-3">
                        <ConnectButton />
                        {user ? (
                            <Link href="/dashboard" onClick={() => setIsMenuOpen(false)} className="btn btn-primary w-full justify-center">Dashboard</Link>
                        ) : (
                            <Link href="/login" onClick={() => setIsMenuOpen(false)} className="btn btn-primary w-full justify-center">Sign In</Link>
                        )}
                    </div>
                </div>
            )}
        </header>
    );
}
