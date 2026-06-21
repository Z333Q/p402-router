'use client';

import { useState } from 'react';

export type BuyerPath = 'build' | 'govern' | 'pilot';

const TABS: { id: BuyerPath; label: string; description: string; anchorId: string }[] = [
    {
        id: 'build',
        label: 'Build AI software',
        description: 'For engineering teams shipping AI products. Start free, upgrade when usage and governance needs grow.',
        anchorId: 'plans-build',
    },
    {
        id: 'govern',
        label: 'Govern enterprise AI spend',
        description: 'For platform, FinOps, and security teams accountable for organization-wide AI spend.',
        anchorId: 'plans-govern',
    },
    {
        id: 'pilot',
        label: 'Launch a pilot',
        description: 'For buyers who want a paid diagnostic or procurement-ready evidence before committing to annual.',
        anchorId: 'bridge-offers',
    },
];

export function BuyerPathTabs({ initial = 'build' as BuyerPath }: { initial?: BuyerPath }) {
    const [active, setActive] = useState<BuyerPath>(initial);
    const activeDescription = TABS.find((t) => t.id === active)?.description ?? '';

    return (
        <div className="border-b-2 border-neutral-200 mb-12">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-px bg-neutral-200">
                {TABS.map((tab) => {
                    const isActive = tab.id === active;
                    return (
                        <a
                            key={tab.id}
                            href={`#${tab.anchorId}`}
                            onClick={() => setActive(tab.id)}
                            aria-pressed={isActive}
                            data-buyer-path={tab.id}
                            className={[
                                'text-left px-5 py-4 transition-colors no-underline block',
                                isActive
                                    ? 'bg-black text-white'
                                    : 'bg-white text-black hover:bg-neutral-100',
                            ].join(' ')}
                        >
                            <div className="text-[11px] font-black uppercase tracking-widest">{tab.label}</div>
                        </a>
                    );
                })}
            </div>
            <p className="mt-4 text-xs font-mono text-neutral-700">{activeDescription}</p>
        </div>
    );
}
