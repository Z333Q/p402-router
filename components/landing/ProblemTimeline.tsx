'use client';

import { useEffect, useState } from 'react';

type Event = { day: number; cost: number; label: string };

const EVENTS: ReadonlyArray<Event> = [
    { day: 2,  cost: 412.71, label: 'support' },
    { day: 3,  cost: 284.30, label: 'finance' },
    { day: 4,  cost: 198.50, label: 'legal' },
    { day: 5,  cost: 312.10, label: 'product' },
    { day: 7,  cost: 421.40, label: 'support' },
    { day: 8,  cost: 156.20, label: 'compliance' },
    { day: 9,  cost: 287.90, label: 'sales' },
    { day: 10, cost: 198.30, label: 'finance' },
    { day: 12, cost: 521.80, label: 'support' },
    { day: 13, cost: 312.40, label: 'legal' },
    { day: 14, cost: 184.20, label: 'product' },
    { day: 15, cost: 268.10, label: 'finance' },
    { day: 17, cost: 412.30, label: 'support' },
    { day: 18, cost: 297.50, label: 'compliance' },
    { day: 19, cost: 218.60, label: 'sales' },
    { day: 20, cost: 312.90, label: 'engineering' },
    { day: 22, cost: 487.10, label: 'support' },
    { day: 23, cost: 198.40, label: 'legal' },
    { day: 24, cost: 256.30, label: 'product' },
    { day: 25, cost: 287.20, label: 'finance' },
    { day: 27, cost: 412.80, label: 'support' },
    { day: 28, cost: 198.90, label: 'compliance' },
    { day: 29, cost: 312.50, label: 'sales' },
    { day: 30, cost: 256.70, label: 'engineering' },
];

const TOTAL = EVENTS.reduce((s, e) => s + e.cost, 0);

const FILL_MS    = 3000;
const COLLAPSE_MS = 1200;
const HOLD_MS    = 3000;
const CYCLE_MS   = FILL_MS + COLLAPSE_MS + HOLD_MS;

const COLOR_BY_LABEL: Record<string, string> = {
    support:     'bg-primary',
    finance:     'bg-cyan-300',
    legal:       'bg-amber-300',
    product:     'bg-primary',
    compliance:  'bg-cyan-300',
    sales:       'bg-amber-300',
    engineering: 'bg-primary',
};

const formatUsd = (n: number) =>
    `$${n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

export function ProblemTimeline() {
    const [tick, setTick] = useState(0);

    useEffect(() => {
        const start = Date.now();
        const id = setInterval(() => setTick(Date.now() - start), 60);
        return () => clearInterval(id);
    }, []);

    const t = tick % CYCLE_MS;
    const fillProgress  = Math.min(1, t / FILL_MS);
    const collapsing    = t > FILL_MS;
    const collapsed     = t > FILL_MS + COLLAPSE_MS * 0.6;
    const visibleCount  = Math.floor(fillProgress * EVENTS.length);
    const visibleEvents = EVENTS.slice(0, visibleCount);
    const runningTotal  = visibleEvents.reduce((s, e) => s + e.cost, 0);

    return (
        <div className="border-2 border-black bg-neutral-950 text-neutral-200 font-mono">
            <div className="border-b border-neutral-800 px-4 py-2 flex items-center justify-between bg-neutral-900">
                <span className="text-[10px] uppercase tracking-widest text-neutral-500">Nov 2026</span>
                <span className="text-[10px] uppercase tracking-widest text-neutral-500">
                    {collapsed ? 'month closed' : 'in flight'}
                </span>
            </div>

            <Track
                kind="without"
                events={visibleEvents}
                collapsing={collapsing}
                collapsed={collapsed}
                runningTotal={runningTotal}
                allEvents={EVENTS.length}
            />

            <div className="border-t border-neutral-800" />

            <Track
                kind="with"
                events={visibleEvents}
                collapsing={collapsing}
                collapsed={collapsed}
                runningTotal={runningTotal}
                allEvents={EVENTS.length}
            />
        </div>
    );
}

function Track({
    kind, events, collapsing, collapsed, runningTotal, allEvents,
}: {
    kind: 'without' | 'with';
    events: ReadonlyArray<Event>;
    collapsing: boolean;
    collapsed: boolean;
    runningTotal: number;
    allEvents: number;
}) {
    const isWithout = kind === 'without';

    return (
        <div className="px-4 py-4 flex flex-col gap-3">
            <div className="flex items-center justify-between">
                <div className="text-[10px] uppercase tracking-widest text-neutral-500">
                    {isWithout ? 'Without P402' : 'With P402'}
                </div>
                <div className="text-[10px] uppercase tracking-widest text-neutral-500">
                    {isWithout
                        ? collapsed
                            ? 'invoice received'
                            : 'no owner attached'
                        : 'event ledger live'}
                </div>
            </div>

            <div className="grid grid-cols-[1fr_auto] gap-4 items-stretch">
                <div className="border border-neutral-800 bg-neutral-900/40 p-3 h-24 relative overflow-hidden">
                    <div className="absolute inset-x-3 top-1/2 h-px bg-neutral-800" />
                    {events.map((e, i) => {
                        const left = `${((e.day - 1) / 29) * 100}%`;
                        const color = isWithout
                            ? collapsing ? 'bg-neutral-700' : 'bg-neutral-500'
                            : (COLOR_BY_LABEL[e.label] ?? 'bg-primary');
                        const opacity = isWithout && collapsed ? 'opacity-30' : 'opacity-100';
                        return (
                            <div
                                key={`${kind}-${i}`}
                                className={`absolute top-1/2 -translate-y-1/2 ${color} ${opacity} transition-opacity duration-500`}
                                style={{
                                    left,
                                    width: 6,
                                    height: 6,
                                    animation: 'pop 280ms ease-out',
                                }}
                            />
                        );
                    })}
                    {!isWithout && events.length > 0 && (
                        <div
                            className="absolute bottom-1 text-[8px] uppercase tracking-widest text-neutral-300 transition-all duration-300"
                            style={{
                                left: `${((events[events.length - 1]!.day - 1) / 29) * 100}%`,
                                transform: 'translateX(-50%)',
                            }}
                        >
                            {events[events.length - 1]!.label}
                        </div>
                    )}
                    <div className="absolute top-1 left-2 text-[8px] uppercase tracking-widest text-neutral-600">Nov 1</div>
                    <div className="absolute top-1 right-2 text-[8px] uppercase tracking-widest text-neutral-600">Nov 30</div>
                </div>

                <div className="w-32 border border-neutral-800 bg-neutral-900/40 px-3 py-2 flex flex-col justify-between">
                    {isWithout ? (
                        <>
                            <div className="text-[9px] uppercase tracking-widest text-neutral-500">
                                {collapsed ? 'Dec 1' : 'pending'}
                            </div>
                            <div className={`text-base font-black tabular-nums ${collapsed ? 'text-neutral-100' : 'text-neutral-600'} transition-colors duration-500`}>
                                {collapsed ? formatUsd(TOTAL) : '$ ___,___.__'}
                            </div>
                            <div className="text-[8px] uppercase tracking-widest text-neutral-600 leading-tight">
                                one row<br />no owner
                            </div>
                        </>
                    ) : (
                        <>
                            <div className="text-[9px] uppercase tracking-widest text-neutral-500">
                                live total
                            </div>
                            <div className="text-base font-black tabular-nums text-primary">
                                {formatUsd(runningTotal)}
                            </div>
                            <div className="text-[8px] uppercase tracking-widest text-neutral-600 leading-tight">
                                {events.length} of {allEvents} events
                            </div>
                        </>
                    )}
                </div>
            </div>

            <style jsx>{`
                @keyframes pop {
                    from { transform: translateY(-50%) scale(0); }
                    to   { transform: translateY(-50%) scale(1); }
                }
            `}</style>
        </div>
    );
}
