"use client";

import React from 'react';

interface CitationBlockProps {
    id: string;
    source: string;
    details: string;
    link?: string;
}

export function CitationBlock({ id, source, details, link }: CitationBlockProps) {
    return (
        <div id={id} className="my-8 pl-4 border-l-4 border-[#B6FF2E] bg-neutral-50 p-4 text-sm">
            <div className="flex items-baseline gap-2 mb-1">
                <span className="font-mono font-bold text-xs text-black bg-[#B6FF2E] px-1">
                    [{id}]
                </span>
                <span className="font-bold uppercase tracking-tight text-neutral-800">
                    {source}
                </span>
            </div>
            <p className="text-neutral-600 mb-2 italic">
                {details}
            </p>
            {link && (
                <a href={link} target="_blank" rel="noreferrer" className="text-[#22D3EE] font-mono text-xs hover:underline decoration-2 underline-offset-2">
                    View Source →
                </a>
            )}
        </div>
    );
}
