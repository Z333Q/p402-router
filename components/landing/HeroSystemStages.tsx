'use client';

import { useEffect, useState } from 'react';

type Stage = {
    name: string;
    href: string;
    line: string;
    status: 'shipped' | 'gated';
};

const STAGES: ReadonlyArray<Stage> = [
    { name: 'Meter',    href: '/meter',    line: 'Turn each AI call into an economic event with owner, tokens, cost, and evidence.', status: 'shipped' },
    { name: 'Monitor',  href: '/monitor',  line: 'See spend by department, workflow, model, vendor, and customer.',                  status: 'shipped' },
    { name: 'Control',  href: '/control',  line: 'Design budgets and policy boundaries. Runtime enforcement is gated.',              status: 'gated' },
    { name: 'Optimize', href: '/optimize', line: 'Prepare AI spend for measured savings. Recommendations are gated.',                status: 'gated' },
    { name: 'Settle',   href: '/settle',   line: 'Issue receipts and settlement records for payable AI work.',                       status: 'shipped' },
    { name: 'Prove',    href: '/prove',    line: 'Export evidence bundles, finance reports, and event proof.',                       status: 'shipped' },
];

export function HeroSystemStages() {
    const [idx, setIdx] = useState(0);

    useEffect(() => {
        const t = setInterval(() => {
            setIdx((i) => (i + 1) % STAGES.length);
        }, 2400);
        return () => clearInterval(t);
    }, []);

    const active = STAGES[idx]!;

    return (
        <div className="border-2 border-black bg-neutral-950 text-neutral-200 h-full min-h-[440px] flex flex-col">
            <div className="border-b border-neutral-800 px-4 py-2 flex items-center justify-between bg-neutral-900 font-mono">
                <span className="text-[10px] uppercase tracking-widest text-neutral-500">system pipeline</span>
                <span className="text-[10px] uppercase tracking-widest text-primary">{active.name}</span>
            </div>

            <div className="px-6 py-8 flex-1 flex flex-col gap-6 justify-center">
                <div className="text-[10px] font-mono uppercase tracking-widest text-neutral-500">
                    Stage {String(idx + 1).padStart(2, '0')} of {String(STAGES.length).padStart(2, '0')}
                </div>
                <div className="text-3xl md:text-4xl font-black uppercase tracking-tighter text-primary leading-none">
                    {active.name}
                </div>
                <p className="text-sm font-mono text-neutral-300 leading-relaxed max-w-md">
                    {active.line}
                </p>
                <div className="inline-flex items-center gap-2 self-start border border-neutral-700 px-2 py-1 text-[10px] font-mono uppercase tracking-widest">
                    <span className={active.status === 'shipped' ? 'text-primary' : 'text-cyan-300'}>
                        {active.status === 'shipped' ? '+' : '~'}
                    </span>
                    <span className="text-neutral-300">
                        {active.status === 'shipped' ? 'shipped' : 'gated'}
                    </span>
                </div>
            </div>

            <div className="border-t border-neutral-800 px-3 py-3 bg-neutral-900">
                <div className="grid grid-cols-6 gap-1">
                    {STAGES.map((s, i) => {
                        const isActive = i === idx;
                        const isPast = i < idx;
                        return (
                            <div
                                key={s.name}
                                className={`p-2 border ${isActive ? 'border-primary bg-primary text-black' : isPast ? 'border-neutral-600 text-neutral-300' : 'border-neutral-800 text-neutral-500'} text-center transition-colors`}
                            >
                                <div className="text-[9px] font-mono font-black uppercase tracking-widest">
                                    {s.name}
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>
        </div>
    );
}
