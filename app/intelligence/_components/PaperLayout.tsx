"use client";

import React from 'react';
import { cn } from '@/lib/utils'; // Assuming standard shadcn util exists, or we replace
import { DESIGN } from '../design';

interface PaperLayoutProps {
    children: React.ReactNode;
    title: string;
    subtitle?: string;
    meta?: {
        author: string;
        date: string;
        type: string; // e.g., "Protocol Standard"
    };
    toc?: Array<{ id: string; label: string }>;
    schema?: Record<string, any>; // JSON-LD data
}

export function PaperLayout({ children, title, subtitle, meta, toc, schema }: PaperLayoutProps) {
    return (
        <div className="min-h-screen bg-white text-black font-sans selection:bg-[#B6FF2E] selection:text-black">
            {/* SEO Schema */}
            {schema && (
                <script
                    type="application/ld+json"
                    dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
                />
            )}

            {/* Header Strip */}
            {meta && (
                <div className="border-b-2 border-black bg-neutral-50 px-6 py-3 flex justify-between items-center text-xs font-mono uppercase tracking-widest">
                    <span>{meta.type}</span>
                    <div className="flex gap-6">
                        <span>{meta.author}</span>
                        <span>{meta.date}</span>
                    </div>
                </div>
            )}

            <div className="max-w-[1400px] mx-auto grid grid-cols-1 lg:grid-cols-12 min-h-[calc(100vh-45px)]">

                {/* Left Sidebar (TOC) */}
                <aside className="hidden lg:block lg:col-span-3 border-r-2 border-black p-8 sticky top-0 h-screen overflow-y-auto">
                    <div className="mb-12">
                        <div className="w-12 h-12 bg-black text-[#B6FF2E] flex items-center justify-center font-black text-xl mb-6">
                            P402
                        </div>
                        <h1 className="text-3xl font-bold leading-tight uppercase tracking-tight mb-4">
                            {title}
                        </h1>
                        {subtitle && (
                            <p className="text-neutral-600 text-sm leading-relaxed">
                                {subtitle}
                            </p>
                        )}
                    </div>

                    {toc && toc.length > 0 && (
                        <nav>
                            <h3 className="font-mono text-xs uppercase font-bold text-neutral-400 mb-4 tracking-widest">
                                Contents
                            </h3>
                            <ul className="space-y-3">
                                {toc.map((item) => (
                                    <li key={item.id}>
                                        <a
                                            href={`#${item.id}`}
                                            className="text-sm font-medium hover:text-[#22D3EE] hover:underline decoration-2 underline-offset-4 transition-colors"
                                        >
                                            {item.label}
                                        </a>
                                    </li>
                                ))}
                            </ul>
                        </nav>
                    )}
                </aside>

                {/* Main Content */}
                <main className="lg:col-span-6 p-8 lg:p-16 border-r-2 border-black/5 leading-relaxed text-lg">
                    {/* Mobile Header (Visible only on small screens) */}
                    <div className="lg:hidden mb-12 border-b-2 border-black pb-8">
                        <div className="w-12 h-12 bg-black text-[#B6FF2E] flex items-center justify-center font-black text-xl mb-6">
                            P402
                        </div>
                        <h1 className="text-3xl font-bold leading-tight uppercase tracking-tight mb-4">
                            {title}
                        </h1>
                        {subtitle && (
                            <p className="text-neutral-600 text-sm leading-relaxed mb-6">
                                {subtitle}
                            </p>
                        )}
                        {toc && toc.length > 0 && (
                            <details className="bg-neutral-100 p-4 open:bg-white open:border-2 open:border-black">
                                <summary className="font-bold uppercase text-xs tracking-widest cursor-pointer select-none">
                                    Table of Contents
                                </summary>
                                <ul className="mt-4 space-y-2 border-t border-black pt-4">
                                    {toc.map((item) => (
                                        <li key={item.id}>
                                            <a href={`#${item.id}`} className="text-sm hover:text-[#22D3EE] block py-1">
                                                {item.label}
                                            </a>
                                        </li>
                                    ))}
                                </ul>
                            </details>
                        )}
                    </div>

                    <div className="prose prose-neutral max-w-none prose-headings:font-bold prose-headings:uppercase prose-h1:text-4xl prose-h2:text-2xl prose-h2:mt-12 prose-h2:mb-6 prose-h2:border-b-2 prose-h2:border-black prose-h2:pb-2 prose-p:mb-6 prose-code:bg-neutral-100 prose-code:px-1 prose-code:font-mono prose-code:text-sm">
                        {children}
                    </div>
                </main>

                {/* Right Sidebar (Citations & Metadata) */}
                <aside className="hidden lg:block lg:col-span-3 p-8 bg-neutral-50 h-full">
                    <div className="sticky top-8">
                        <div className="border-2 border-black p-6 bg-white shadow-[4px_4px_0_0_#000]">
                            <h3 className="font-mono text-xs uppercase font-bold mb-4">Download</h3>
                            <button className="w-full bg-black text-white text-sm font-bold uppercase py-3 hover:bg-[#B6FF2E] hover:text-black border-2 border-transparent hover:border-black transition-all">
                                PDF Version (arXiv)
                            </button>
                        </div>
                    </div>
                </aside>

            </div>
        </div>
    );
}
