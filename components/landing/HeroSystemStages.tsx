'use client';

import { useEffect, useState } from 'react';

type Row = { label: string; amount: string; pct: number };

const ROWS: ReadonlyArray<Row> = [
    { label: 'support.ticket-triage',       amount: '$4,128.71', pct: 28.9 },
    { label: 'finance.invoice-extract',     amount: '$2,847.02', pct: 19.9 },
    { label: 'legal.contract-review',       amount: '$2,193.55', pct: 15.4 },
    { label: 'product.spec-summarize',      amount: '$1,684.20', pct: 11.8 },
    { label: 'compliance.hipaa-redact',     amount: '$1,420.94', pct: 9.9 },
    { label: 'sales.proposal-draft',        amount: '$1,108.30', pct: 7.8 },
    { label: 'engineering.code-review',     amount: '$  624.80', pct: 4.4 },
    { label: 'unattributed',                amount: '$  279.90', pct: 2.0 },
];

const TOTAL = '$14,287.42';

export function HeroSystemStages() {
    const [revealed, setRevealed] = useState(0);

    useEffect(() => {
        let timer: ReturnType<typeof setTimeout>;
        const tick = () => {
            setRevealed((r) => {
                if (r >= ROWS.length) {
                    timer = setTimeout(tick, 2400);
                    return 0;
                }
                timer = setTimeout(tick, 260);
                return r + 1;
            });
        };
        timer = setTimeout(tick, 260);
        return () => clearTimeout(timer);
    }, []);

    return (
        <div className="border-2 border-black bg-neutral-950 text-neutral-200 h-full min-h-[440px] flex flex-col font-mono">
            <div className="border-b border-neutral-800 px-4 py-2 flex items-center justify-between bg-neutral-900">
                <span className="text-[10px] uppercase tracking-widest text-neutral-500">provider invoice</span>
                <span className="text-[10px] uppercase tracking-widest text-primary">p402 ledger</span>
            </div>

            <div className="grid grid-cols-2 flex-1">
                <div className="border-r border-neutral-800 p-5 flex flex-col gap-3 bg-neutral-900/30">
                    <div className="text-[10px] uppercase tracking-widest text-neutral-500">
                        before
                    </div>
                    <div className="text-[11px] text-neutral-400">
                        OpenAI<br />
                        Nov 2026
                    </div>
                    <div className="mt-auto">
                        <div className="text-[10px] uppercase tracking-widest text-neutral-500 mb-1">
                            total
                        </div>
                        <div className="text-2xl md:text-3xl font-black text-neutral-100 tracking-tight">
                            {TOTAL}
                        </div>
                        <div className="text-[10px] uppercase tracking-widest text-neutral-600 mt-3 leading-relaxed">
                            one row.<br />
                            no owner.<br />
                            no workflow.
                        </div>
                    </div>
                </div>

                <div className="p-5 flex flex-col gap-2">
                    <div className="text-[10px] uppercase tracking-widest text-neutral-500 mb-1">
                        after
                    </div>
                    <div className="text-[11px] text-neutral-400 mb-2">
                        same total.<br />
                        attributed.
                    </div>
                    <div className="flex flex-col gap-1.5 flex-1">
                        {ROWS.map((r, i) => {
                            const visible = i < revealed;
                            return (
                                <div
                                    key={r.label}
                                    className={`text-[10px] leading-tight transition-opacity duration-300 ${visible ? 'opacity-100' : 'opacity-0'}`}
                                >
                                    <div className="flex items-baseline justify-between gap-2 mb-0.5">
                                        <span className="text-neutral-200 truncate">{r.label}</span>
                                        <span className="text-neutral-400 tabular-nums shrink-0">{r.amount}</span>
                                    </div>
                                    <div className="h-1 bg-neutral-800 overflow-hidden">
                                        <div
                                            className="h-full bg-primary transition-all duration-500"
                                            style={{ width: visible ? `${r.pct * 3.46}%` : '0%' }}
                                        />
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            </div>

            <div className="border-t border-neutral-800 px-4 py-2 flex items-center justify-between bg-neutral-900 text-[10px] uppercase tracking-widest">
                <span className="text-neutral-500">privacy: metadata-only</span>
                <span className="text-neutral-500">
                    rows: {revealed} of {ROWS.length}
                </span>
            </div>
        </div>
    );
}
