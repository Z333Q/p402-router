'use client';

import React, { useEffect, useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import {
    Search,
    FileText,
    LayoutDashboard,
    Zap,
    Shield,
    Globe,
    Terminal,
    ArrowRight
} from 'lucide-react';

interface CommandPaletteProps {
    isOpen: boolean;
    onClose: () => void;
}

const COMMANDS = [
    {
        category: 'Navigation',
        items: [
            { id: 'home', label: 'Home', href: '/', icon: Globe },
            { id: 'product', label: 'Product Overview', href: '/#product', icon: Zap },
            { id: 'bazaar', label: 'Bazaar Directory', href: '/dashboard/bazaar', icon: Globe },
        ]
    },
    {
        category: 'Dashboard',
        items: [
            { id: 'dash-main', label: 'Main Dashboard', href: '/dashboard', icon: LayoutDashboard },
            { id: 'policies', label: 'Policy management', href: '/dashboard/policies', icon: Shield },
        ]
    },
    {
        category: 'Developers',
        items: [
            { id: 'api-docs', label: 'API Reference', href: '/docs/api', icon: FileText },
            { id: 'sdk-docs', label: 'SDK Guide', href: '/docs/sdk', icon: Terminal },
            { id: 'mcp-docs', label: 'MCP Server', href: '/docs/mcp', icon: Terminal },
        ]
    }
];

export function CommandPalette({ isOpen, onClose }: CommandPaletteProps) {
    const [query, setQuery] = useState('');
    const [selectedIndex, setSelectedIndex] = useState(0);
    const router = useRouter();
    const inputRef = useRef<HTMLInputElement>(null);

    const filteredCommands = COMMANDS.map(cat => ({
        ...cat,
        items: cat.items.filter(item =>
            item.label.toLowerCase().includes(query.toLowerCase()) ||
            cat.category.toLowerCase().includes(query.toLowerCase())
        )
    })).filter(cat => cat.items.length > 0);

    const allItems = filteredCommands.flatMap(cat => cat.items);

    useEffect(() => {
        if (isOpen) {
            setQuery('');
            setSelectedIndex(0);
            setTimeout(() => inputRef.current?.focus(), 10);
        }
    }, [isOpen]);

    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (!isOpen) return;

            if (e.key === 'Escape') {
                onClose();
            } else if (e.key === 'ArrowDown') {
                e.preventDefault();
                setSelectedIndex(i => (i + 1) % allItems.length);
            } else if (e.key === 'ArrowUp') {
                e.preventDefault();
                setSelectedIndex(i => (i - 1 + allItems.length) % allItems.length);
            } else if (e.key === 'Enter') {
                e.preventDefault();
                const selected = allItems[selectedIndex];
                if (selected) {
                    router.push(selected.href);
                    onClose();
                }
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [isOpen, selectedIndex, allItems, router, onClose]);

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[100] flex items-start justify-center pt-[20vh] px-4">
            {/* Backdrop */}
            <div
                className="absolute inset-0 bg-white/80 backdrop-grayscale"
                onClick={onClose}
            />

            {/* Palette Container */}
            <div className="relative w-full max-w-2xl bg-white border-[3px] border-black shadow-[12px_12px_0px_0px_rgba(0,0,0,1)] animate-in fade-in zoom-in-95 duration-100">
                <div className="flex items-center gap-4 px-6 py-4 border-b-[3px] border-black">
                    <Search className="w-6 h-6 text-neutral-400" />
                    <input
                        ref={inputRef}
                        type="text"
                        placeholder="Search protocol, tools, or dashboard..."
                        className="flex-1 bg-transparent border-none outline-none font-mono text-lg font-black uppercase placeholder-neutral-300"
                        value={query}
                        onChange={(e) => {
                            setQuery(e.target.value);
                            setSelectedIndex(0);
                        }}
                    />
                    <div className="px-2 py-1 border-2 border-black text-[10px] font-black">ESC</div>
                </div>

                <div className="max-h-[60vh] overflow-y-auto p-4 custom-scrollbar">
                    {filteredCommands.length === 0 ? (
                        <div className="py-12 text-center">
                            <p className="text-neutral-400 font-black uppercase italic tracking-widest text-sm">No commands found matching "{query}"</p>
                        </div>
                    ) : (
                        filteredCommands.map((cat) => (
                            <div key={cat.category} className="mb-6 last:mb-2">
                                <div className="px-2 mb-2 text-[10px] font-black uppercase tracking-[0.2em] text-neutral-400">
                                    {cat.category}
                                </div>
                                <div className="space-y-1">
                                    {cat.items.map((item) => {
                                        const globalIndex = allItems.indexOf(item);
                                        const isSelected = globalIndex === selectedIndex;
                                        const Icon = item.icon;

                                        return (
                                            <button
                                                key={item.id}
                                                onClick={() => {
                                                    router.push(item.href);
                                                    onClose();
                                                }}
                                                onMouseEnter={() => setSelectedIndex(globalIndex)}
                                                className={`
                                                    w-full flex items-center justify-between px-3 py-3 transition-none group
                                                    ${isSelected ? 'bg-[#B6FF2E] text-black border-2 border-black translate-x-1 -translate-y-1 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]' : 'bg-transparent text-neutral-600 border-2 border-transparent'}
                                                `}
                                            >
                                                <div className="flex items-center gap-3">
                                                    <Icon className={`w-5 h-5 ${isSelected ? 'text-black' : 'text-neutral-400'}`} />
                                                    <span className="font-mono text-sm font-black uppercase tracking-tight">
                                                        {item.label}
                                                    </span>
                                                </div>
                                                {isSelected && (
                                                    <div className="flex items-center gap-2">
                                                        <span className="text-[10px] font-black italic mr-2 opacity-50 tracking-widest">NAVIGATE</span>
                                                        <ArrowRight className="w-4 h-4" />
                                                    </div>
                                                )}
                                            </button>
                                        );
                                    })}
                                </div>
                            </div>
                        ))
                    )}
                </div>

                <div className="px-6 py-3 bg-neutral-50 border-t-2 border-black flex justify-between items-center">
                    <div className="flex items-center gap-6">
                        <div className="flex items-center gap-1.5 text-[9px] font-black uppercase text-neutral-400">
                            <span className="px-1.5 py-0.5 border border-neutral-300 bg-white">↑↓</span>
                            <span>Move</span>
                        </div>
                        <div className="flex items-center gap-1.5 text-[9px] font-black uppercase text-neutral-400">
                            <span className="px-1.5 py-0.5 border border-neutral-300 bg-white">ENTER</span>
                            <span>Select</span>
                        </div>
                    </div>
                    <div className="text-[9px] font-black uppercase italic text-neutral-300 tracking-tighter">
                        P402 PROTOCOL COMMAND PALETTE V1.0
                    </div>
                </div>
            </div>
        </div>
    );
}
