'use client';

import Link from 'next/link';
import { useSession } from 'next-auth/react';
import { useState } from 'react';
import dynamic from 'next/dynamic';

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

    return (
        <header className="sticky top-0 z-50 bg-white border-b-2 border-black pixel-grid selection:bg-primary selection:text-black transition-all duration-300">
            <div className="container flex items-center justify-between h-16 px-6 mx-auto max-w-7xl relative overflow-hidden group">
                <div className="absolute inset-0 bg-primary/3 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" />

                <Link href="/" className="no-underline text-inherit relative z-10 group">
                    <div className="flex items-center gap-2 font-black uppercase tracking-tighter italic">
                        <div className="w-8 h-8 bg-primary border-2 border-black flex items-center justify-center overflow-hidden transition-transform group-hover:scale-105">
                            <img src="/favicon.png" alt="P402 Logo" className="w-6 h-6" />
                        </div>
                        P402<span className="text-primary NOT-italic">.io</span>
                    </div>
                </Link>

                {/* Desktop Nav */}
                <nav className="hidden md:flex gap-8 text-[11px] font-black uppercase tracking-[0.2em]">
                    <Link href="/#product" className="text-black no-underline hover:text-primary transition-colors border-b-2 border-transparent hover:border-primary">Product</Link>
                    <Link href="/dashboard/bazaar" className="text-black no-underline hover:text-primary transition-colors border-b-2 border-transparent hover:border-primary">Bazaar</Link>
                    <Link href="/docs/api" className="text-black no-underline hover:text-primary transition-colors border-b-2 border-transparent hover:border-primary">Developers</Link>
                    <Link href="/docs/sdk" className="text-black no-underline hover:text-primary transition-colors border-b-2 border-transparent hover:border-primary">SDK</Link>
                    <Link href="/docs/mcp" className="text-black no-underline hover:text-primary transition-colors border-b-2 border-transparent hover:border-primary">MCP</Link>
                </nav>

                <div className="flex items-center gap-3">
                    <div className="hidden md:block">
                        <NavConnectButton />
                    </div>

                    <div className="flex gap-2">
                        {user ? (
                            <Link href="/dashboard" className="btn btn-secondary hidden md:inline-flex text-xs !py-1.5 !px-3">Dashboard</Link>
                        ) : (
                            <Link href="/login" className="btn btn-secondary hidden md:inline-flex text-xs !py-1.5 !px-3.5">Sign In</Link>
                        )}

                        {/* Mobile Menu Toggle */}
                        <button
                            className="btn btn-secondary block md:hidden !p-1.5"
                            onClick={() => setIsMenuOpen(!isMenuOpen)}
                        >
                            <svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
                                <path d="M3 5H17M3 10H17M3 15H17" stroke="currentColor" strokeWidth="2" strokeLinecap="square" />
                            </svg>
                        </button>
                    </div>
                </div>
            </div>

            {/* Mobile Nav Drawer */}
            {isMenuOpen && (
                <div className="absolute top-16 left-0 right-0 bg-white border-b-2 border-black p-6 flex flex-col gap-4 z-40">
                    <nav className="flex flex-col gap-4 text-base font-extrabold uppercase">
                        <Link href="/#product" onClick={() => setIsMenuOpen(false)} className="text-black no-underline">Product</Link>
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
