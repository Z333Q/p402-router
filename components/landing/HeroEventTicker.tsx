'use client';

import { useEffect, useState } from 'react';

type Field = { key: string; raw: string; resolved: string };

const FIELDS: ReadonlyArray<Field> = [
    { key: 'owner',    raw: '?', resolved: 'acme.support' },
    { key: 'workflow', raw: '?', resolved: 'ticket-triage' },
    { key: 'model',    raw: 'claude-sonnet-4-6', resolved: 'claude-sonnet-4-6' },
    { key: 'tokens',   raw: '842', resolved: '842' },
    { key: 'cost',     raw: '$0.0042', resolved: '$0.0042' },
    { key: 'budget',   raw: '?', resolved: 'customer-success' },
    { key: 'policy',   raw: '?', resolved: 'approved' },
    { key: 'outcome',  raw: '?', resolved: 'accepted' },
    { key: 'evidence', raw: '?', resolved: 'bundle_a1f2' },
];

const RESOLVABLE = FIELDS.map((f, i) => i).filter((i) => FIELDS[i]!.raw === '?');

const CYCLE_MS = 700;
const HOLD_MS = 2400;

export function HeroEventTicker() {
    const [resolvedCount, setResolvedCount] = useState(0);

    useEffect(() => {
        let timer: ReturnType<typeof setTimeout>;
        const tick = () => {
            setResolvedCount((c) => {
                if (c >= RESOLVABLE.length) {
                    timer = setTimeout(tick, HOLD_MS);
                    return 0;
                }
                timer = setTimeout(tick, CYCLE_MS);
                return c + 1;
            });
        };
        timer = setTimeout(tick, CYCLE_MS);
        return () => clearTimeout(timer);
    }, []);

    const resolvedSet = new Set(RESOLVABLE.slice(0, resolvedCount));
    const allResolved = resolvedCount >= RESOLVABLE.length;

    return (
        <div className="border-2 border-black bg-neutral-950 text-neutral-200 h-full min-h-[440px] flex flex-col font-mono">
            <div className="border-b border-neutral-800 px-4 py-2 flex items-center justify-between bg-neutral-900">
                <span className="text-[10px] uppercase tracking-widest text-neutral-500">request</span>
                <span className="text-[10px] uppercase tracking-widest text-primary">
                    {allResolved ? 'economic event' : 'attributing...'}
                </span>
            </div>

            <div className="px-5 py-4 border-b border-neutral-800 bg-neutral-900/50">
                <div className="text-[10px] uppercase tracking-widest text-neutral-500 mb-1">
                    POST /v1/chat/completions
                </div>
                <div className="text-[11px] text-neutral-400">
                    req_<span className="text-neutral-200">7f3a9c12</span>
                </div>
            </div>

            <div className="px-5 py-4 flex-1 flex flex-col gap-2">
                {FIELDS.map((f, i) => {
                    const isUnknown = f.raw === '?';
                    const isResolved = !isUnknown || resolvedSet.has(i);
                    const display = isResolved ? f.resolved : f.raw;
                    return (
                        <div
                            key={f.key}
                            className={`flex items-baseline gap-3 text-[11px] leading-tight transition-colors duration-300 ${isResolved ? '' : 'opacity-60'}`}
                        >
                            <span className="text-neutral-500 w-20 shrink-0">{f.key}</span>
                            <span
                                key={`${f.key}-${display}`}
                                className={isResolved ? 'text-neutral-100' : 'text-neutral-600'}
                                style={isUnknown && isResolved ? { animation: 'fillIn 300ms ease-out' } : undefined}
                            >
                                {display}
                            </span>
                            {isUnknown && isResolved && (
                                <span className="text-primary text-[9px] uppercase tracking-widest ml-auto">+ attributed</span>
                            )}
                        </div>
                    );
                })}
            </div>

            <div className="border-t border-neutral-800 px-4 py-2 flex items-center justify-between bg-neutral-900 text-[10px] uppercase tracking-widest">
                <span className="text-neutral-500">
                    privacy: metadata-only
                </span>
                <span className={allResolved ? 'text-primary' : 'text-neutral-500'}>
                    {allResolved ? 'ledger entry written' : `${resolvedCount} of ${RESOLVABLE.length} attributed`}
                </span>
            </div>

            <style jsx>{`
                @keyframes fillIn {
                    0%   { background-color: rgba(182, 255, 46, 0.35); }
                    100% { background-color: transparent; }
                }
            `}</style>
        </div>
    );
}
