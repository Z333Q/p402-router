'use client'

import { Copy, Download } from 'lucide-react'

export function AssetRow({ item }: { item: { name: string; size: string; format: string } }) {
    return (
        <div className="flex items-center justify-between py-2.5 border-b border-neutral-100 last:border-0 group">
            <div className="flex items-center gap-3">
                <span className="w-10 text-center px-1 py-0.5 text-[9px] font-black uppercase tracking-widest bg-neutral-100 border border-neutral-200 text-neutral-500 shrink-0">
                    {item.format}
                </span>
                <span className="text-xs font-bold text-black">{item.name}</span>
                {item.size !== '—' && (
                    <span className="text-[10px] text-neutral-400">{item.size}</span>
                )}
            </div>
            <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                {item.format === 'TXT' || item.format === 'TS' ? (
                    <button
                        title="Copy"
                        className="p-1.5 border border-black hover:bg-primary transition-colors"
                        onClick={() => alert('Asset download available after Phase 3 content upload.')}
                    >
                        <Copy size={12} />
                    </button>
                ) : null}
                <button
                    title="Download"
                    className="p-1.5 border border-black hover:bg-primary transition-colors"
                    onClick={() => alert('Asset download available after Phase 3 content upload.')}
                >
                    <Download size={12} />
                </button>
            </div>
        </div>
    )
}
