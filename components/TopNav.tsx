'use client';

import Link from 'next/link';
import { useSession } from 'next-auth/react';
import { useState, useEffect, useRef } from 'react';
import dynamic from 'next/dynamic';
import { CommandPalette } from '@/components/common/CommandPalette';

const NavConnectButton = dynamic(() => import('./NavConnectButton'), { ssr: false });
const ConnectButton = dynamic(
    () => import('@rainbow-me/rainbowkit').then(mod => mod.ConnectButton),
    { ssr: false }
);

const PRODUCT_LINKS = [
    {
        label: 'Payments',
        desc: 'Verify, settle, and reuse micropayments via x402.',
        href: '/product/payments',
    },
    {
        label: 'Controls',
        desc: 'Mandates, policies, and spend governance.',
        href: '/product/controls',
    },
    {
        label: 'Orchestration',
        desc: 'A2A tasks with streaming trace and paid workflows.',
        href: '/product/orchestration',
    },
    {
        label: 'Ecosystem',
        desc: 'Skills, Bazaar, and Verified Publisher.',
        href: '/product/ecosystem',
    },
] as const;

export function TopNav() {
    const { data: session } = useSession();
    const user = session?.user;
    const [isMenuOpen, setIsMenuOpen] = useState(false);
    const [isPaletteOpen, setIsPaletteOpen] = useState(false);
    const [isProductOpen, setIsProductOpen] = useState(false);
    const productRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
                e.preventDefault();
                setIsPaletteOpen(prev => !prev);
            }
            if (e.key === 'Escape') {
                setIsProductOpen(false);
                setIsMenuOpen(false);
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, []);

    useEffect(() => {
        const handleClick = (e: MouseEvent) => {
            if (productRef.current && !productRef.current.contains(e.target as Node)) {
                setIsProductOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClick);
        return () => document.removeEventListener('mousedown', handleClick);
    }, []);

    return (
        <header className="sticky top-0 z-50 bg-white border-b-2 border-black selection:bg-primary selection:text-black">
            <CommandPalette isOpen={isPaletteOpen} onClose={() => setIsPaletteOpen(false)} />

            <div className="container flex items-center justify-between h-16 px-6 mx-auto max-w-7xl">

                {/* Logo */}
                <Link href="/" className="no-underline text-inherit shrink-0">
                    <div className="flex items-center gap-2 font-black uppercase tracking-tighter italic">
                        <div className="w-11 h-11 bg-primary border-2 border-black flex items-center justify-center overflow-hidden">
                            <img src="/favicon.png" alt="P402 Logo" className="w-8 h-8" />
                        </div>
                        P402<span className="text-primary not-italic">.io</span>
                    </div>
                </Link>

                {/* Desktop Nav */}
                <nav className="hidden md:flex items-center gap-7 text-[11px] font-black uppercase tracking-[0.15em]">

                    {/* Product dropdown */}
                    <div
                        ref={productRef}
                        className="relative"
                        onMouseEnter={() => setIsProductOpen(true)}
                        onMouseLeave={() => setIsProductOpen(false)}
                    >
                        <button
                            onClick={() => setIsProductOpen(prev => !prev)}
                            className="flex items-center gap-1.5 text-black hover:text-primary transition-colors"
                            aria-expanded={isProductOpen}
                            aria-haspopup="true"
                        >
                            Product
                            <svg
                                width="8" height="5" viewBox="0 0 8 5" fill="none"
                                className={`transition-transform duration-150 ${isProductOpen ? 'rotate-180' : ''}`}
                            >
                                <path d="M1 1L4 4L7 1" stroke="currentColor" strokeWidth="1.5" strokeLinecap="square" />
                            </svg>
                        </button>

                        {isProductOpen && (
                            <div className="absolute top-full left-1/2 -translate-x-1/2 pt-3 w-72 z-50">
                                <div className="bg-white border-2 border-black">
                                    {PRODUCT_LINKS.map((link, i) => (
                                        <Link
                                            key={link.href}
                                            href={link.href}
                                            onClick={() => setIsProductOpen(false)}
                                            className={`block px-4 py-3 hover:bg-neutral-50 no-underline group ${i < PRODUCT_LINKS.length - 1 ? 'border-b border-neutral-100' : ''}`}
                                        >
                                            <div className="font-black text-[11px] uppercase tracking-wider text-black group-hover:text-primary transition-colors">{link.label}</div>
                                            <div className="text-[10px] font-medium text-neutral-500 normal-case tracking-normal mt-0.5">{link.desc}</div>
                                        </Link>
                                    ))}
                                    <div className="px-4 py-2 bg-neutral-50 border-t-2 border-neutral-100">
                                        <Link
                                            href="/pricing"
                                            onClick={() => setIsProductOpen(false)}
                                            className="text-[10px] font-black uppercase tracking-widest text-neutral-500 hover:text-black no-underline"
                                        >
                                            View pricing →
                                        </Link>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>

                    <Link href="/docs/api" className="text-black no-underline hover:text-primary transition-colors">Docs</Link>
                    <Link href="/pricing" className="text-black no-underline hover:text-primary transition-colors">Pricing</Link>
                    <Link href="/trust" className="text-black no-underline hover:text-primary transition-colors">Trust</Link>
                </nav>

                {/* Right actions */}
                <div className="flex items-center gap-2">

                    {/* GitHub — desktop only */}
                    <a
                        href="https://github.com/Z333Q/p402-protocol"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="hidden lg:flex items-center p-1.5 text-neutral-400 hover:text-black transition-colors"
                        aria-label="p402-protocol on GitHub"
                    >
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M12 2C6.477 2 2 6.477 2 12c0 4.418 2.865 8.166 6.839 9.489.5.092.682-.217.682-.482 0-.237-.009-.868-.013-1.703-2.782.604-3.369-1.342-3.369-1.342-.454-1.154-1.11-1.462-1.11-1.462-.908-.62.069-.608.069-.608 1.003.07 1.531 1.03 1.531 1.03.892 1.529 2.341 1.087 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.11-4.555-4.943 0-1.091.39-1.984 1.029-2.683-.103-.253-.446-1.27.098-2.647 0 0 .84-.269 2.75 1.025A9.578 9.578 0 0112 6.836a9.59 9.59 0 012.504.337c1.909-1.294 2.747-1.025 2.747-1.025.546 1.377.202 2.394.1 2.647.64.699 1.028 1.592 1.028 2.683 0 3.842-2.339 4.687-4.566 4.935.359.309.678.919.678 1.852 0 1.336-.012 2.415-.012 2.743 0 .267.18.578.688.48C19.138 20.163 22 16.418 22 12c0-5.523-4.477-10-10-10z"/></svg>
                    </a>

                    {/* CMD+K — compact, desktop only */}
                    <button
                        onClick={() => setIsPaletteOpen(true)}
                        className="hidden lg:flex items-center gap-2 px-2.5 py-1.5 border border-neutral-200 text-neutral-400 hover:border-black hover:text-black transition-colors"
                        aria-label="Open command palette (⌘K)"
                    >
                        <svg width="11" height="11" viewBox="0 0 12 12" fill="none" aria-hidden="true">
                            <circle cx="5" cy="5" r="3.5" stroke="currentColor" strokeWidth="1.5" />
                            <path d="M8.5 8.5L11 11" stroke="currentColor" strokeWidth="1.5" strokeLinecap="square" />
                        </svg>
                        <span className="text-[9px] font-black uppercase tracking-widest">⌘K</span>
                    </button>

                    {user ? (
                        <>
                            <div className="hidden md:block">
                                <NavConnectButton />
                            </div>
                            <Link
                                href="/dashboard"
                                className="hidden md:inline-flex items-center h-9 px-5 bg-black text-primary font-black text-[11px] uppercase tracking-wider border-2 border-black hover:bg-primary hover:text-black transition-colors"
                            >
                                Dashboard
                            </Link>
                        </>
                    ) : (
                        <>
                            <Link
                                href="/login"
                                className="hidden md:inline-flex items-center h-9 px-4 text-black font-black text-[11px] uppercase tracking-wider border-2 border-black bg-white hover:bg-neutral-50 transition-colors"
                            >
                                Sign in
                            </Link>
                            <Link
                                href="/login"
                                className="hidden md:inline-flex items-center h-9 px-5 bg-primary text-black font-black text-[11px] uppercase tracking-wider border-2 border-black hover:bg-black hover:text-primary transition-colors"
                            >
                                Start free
                            </Link>
                        </>
                    )}

                    {/* Mobile menu toggle */}
                    <button
                        className="btn btn-secondary block md:hidden !p-2"
                        onClick={() => setIsMenuOpen(!isMenuOpen)}
                        aria-label={isMenuOpen ? 'Close menu' : 'Open menu'}
                        aria-expanded={isMenuOpen}
                    >
                        {isMenuOpen ? (
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                                <path d="M18 6L6 18M6 6L18 18" stroke="currentColor" strokeWidth="2" strokeLinecap="square" />
                            </svg>
                        ) : (
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                                <path d="M3 12H21M3 6H21M3 18H21" stroke="currentColor" strokeWidth="2" strokeLinecap="square" />
                            </svg>
                        )}
                    </button>
                </div>
            </div>

            {/* Mobile Nav Drawer */}
            {isMenuOpen && (
                <div className="absolute top-16 left-0 right-0 bg-white border-b-2 border-black z-40">
                    <div className="divide-y-2 divide-neutral-100">
                        {/* Product section */}
                        <div className="px-6 py-4">
                            <div className="text-[9px] text-neutral-400 font-black uppercase tracking-widest mb-3">Product</div>
                            <div className="flex flex-col gap-3">
                                {PRODUCT_LINKS.map(link => (
                                    <Link
                                        key={link.href}
                                        href={link.href}
                                        onClick={() => setIsMenuOpen(false)}
                                        className="font-black text-sm uppercase tracking-tight text-black no-underline hover:text-primary"
                                    >
                                        {link.label}
                                    </Link>
                                ))}
                            </div>
                        </div>

                        {/* Secondary links */}
                        <nav className="flex flex-col gap-4 px-6 py-4 font-black text-sm uppercase">
                            <Link href="/docs/api" onClick={() => setIsMenuOpen(false)} className="text-black no-underline hover:text-primary">Docs</Link>
                            <Link href="/pricing" onClick={() => setIsMenuOpen(false)} className="text-black no-underline hover:text-primary">Pricing</Link>
                            <Link href="/trust" onClick={() => setIsMenuOpen(false)} className="text-black no-underline hover:text-primary">Trust</Link>
                        </nav>

                        {/* Auth actions */}
                        <div className="px-6 py-4 flex flex-col gap-3">
                            <ConnectButton />
                            {user ? (
                                <Link href="/dashboard" onClick={() => setIsMenuOpen(false)} className="btn btn-primary w-full justify-center">Dashboard</Link>
                            ) : (
                                <>
                                    <Link href="/login" onClick={() => setIsMenuOpen(false)} className="btn btn-primary w-full justify-center">Start free</Link>
                                    <Link href="/login" onClick={() => setIsMenuOpen(false)} className="btn btn-secondary w-full justify-center">Sign in</Link>
                                </>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </header>
    );
}
