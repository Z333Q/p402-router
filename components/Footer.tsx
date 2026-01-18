'use client';

import Link from 'next/link';
import { useState } from 'react';
import { HowItWorksModal } from '@/components/common/HowItWorksModal';

export function Footer() {
    const [helpOpen, setHelpOpen] = useState(false);

    return (
        <footer className="border-t-2 border-black py-12 bg-white">
            <div className="container mx-auto px-6 max-w-7xl">
                <div className="grid grid-cols-1 md:grid-cols-4 gap-12">
                    <div>
                        <div className="flex items-center gap-3 font-black uppercase tracking-tighter mb-4 text-black italic">
                            <img src="/favicon.png" alt="P402 Logo" className="w-12 h-12 border-2 border-black" />
                            <span className="text-xl">P402<span className="text-primary NOT-italic">.io</span></span>
                        </div>
                        <div className="text-sm text-neutral-600 mb-6 font-bold uppercase tracking-tight">Automatic cost control for AI agents.</div>
                        <button
                            onClick={() => setHelpOpen(true)}
                            className="text-[10px] font-black uppercase tracking-widest bg-primary px-3 py-1.5 border-2 border-black hover:bg-black hover:text-white transition-all shadow-none"
                        >
                            Interactive Guide
                        </button>
                        <div className="mt-8">
                            <a href="https://www.producthunt.com/products/p402-io?embed=true&utm_source=badge-featured&utm_medium=badge&utm_campaign=badge-p402-io" target="_blank" rel="noopener noreferrer">
                                <img src="https://api.producthunt.com/widgets/embed-image/v1/featured.svg?post_id=1060148&theme=light&t=1767960638366" alt="P402.io - Route, verify, and settle paid API calls with clear traces | Product Hunt" style={{ width: '200px', height: '43px' }} width="200" height="43" className="hover:translate-x-[-2px] hover:translate-y-[-2px] hover:shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] transition-all border-2 border-black" />
                            </a>
                        </div>
                    </div>
                    <FooterCol title="Product" links={[
                        { label: 'Router', href: '/#product' },
                        { label: 'Policies', href: '/dashboard/policies' },
                        { label: 'Bazaar', href: '/dashboard/bazaar' },
                        { label: 'How it Works', href: '#how-it-works', onClick: () => setHelpOpen(true) },
                    ]} />
                    <FooterCol title="Developers" links={[
                        { label: 'SDK', href: '/docs/sdk' },
                        { label: 'API Docs', href: '/docs/api' },
                        { label: 'Status', href: '/status' },
                        { label: 'MCP', href: '/docs/mcp' },
                    ]} />
                    <FooterCol title="Company" links={[
                        { label: 'Privacy', href: '/privacy' },
                        { label: 'Terms', href: '/terms' },
                        { label: 'Get Access', href: '/get-access' },
                    ]} />
                </div>

                <div className="border-t-2 border-black mt-12 pt-12 text-center">
                    <div className="text-[10px] font-black uppercase tracking-[0.2em] text-neutral-400 mb-6">
                        COMPATIBLE WITH X402 V2 HEADERS AND EXTENSION MODEL
                    </div>
                    <div className="flex flex-wrap justify-center gap-3">
                        {['HTTP 402', 'PAYMENT-REQUIRED', 'PAYMENT-SIGNATURE', 'BAZAAR', 'FACILITATORS'].map(tag => (
                            <div key={tag} className="px-3 py-1.5 border-2 border-black bg-neutral-50 text-[10px] font-bold uppercase tracking-tighter">
                                {tag}
                            </div>
                        ))}
                    </div>
                </div>

                <div className="border-t-2 border-black mt-12 pt-6">
                    <div className="flex flex-col md:flex-row justify-between items-center gap-6">
                        <div className="text-[10px] font-black uppercase tracking-widest text-neutral-500 order-2 md:order-1">
                            © {new Date().getFullYear()} P402. Tokens: USDC, USDT on Base.
                        </div>
                        <div className="flex items-center gap-8 order-1 md:order-2 grayscale opacity-40">
                            <span className="text-[10px] font-black uppercase tracking-[0.3em]">Infrastructure</span>
                            <div className="font-black text-xs uppercase tracking-tighter">Base L2</div>
                            <div className="font-black text-xs uppercase tracking-tighter">Chainlink</div>
                            <div className="font-black text-xs uppercase tracking-tighter">Coinbase</div>
                            <a href="https://openrouter.ai" target="_blank" rel="noopener noreferrer" className="font-black text-xs uppercase tracking-tighter hover:opacity-100 transition-opacity">
                                OpenRouter
                            </a>
                        </div>
                    </div>
                </div>
            </div>
            <HowItWorksModal isOpen={helpOpen} onClose={() => setHelpOpen(false)} />
        </footer>
    );
}

function FooterCol({ title, links }: { title: string; links: { label: string; href: string; onClick?: () => void }[] }) {
    return (
        <div>
            <div className="label mb-3">{title}</div>
            <ul className="list-none p-0 flex flex-col gap-2">
                {links.map(l => (
                    <li key={l.href}>
                        {l.onClick ? (
                            <button
                                onClick={(e) => {
                                    e.preventDefault();
                                    l.onClick?.();
                                }}
                                className="text-neutral-600 no-underline text-sm font-medium hover:text-black bg-transparent border-none p-0 cursor-pointer text-left"
                            >
                                {l.label}
                            </button>
                        ) : (
                            <Link href={l.href} className="text-neutral-600 no-underline text-sm font-medium hover:text-black">
                                {l.label}
                            </Link>
                        )}
                    </li>
                ))}
            </ul>
        </div>
    );
}
