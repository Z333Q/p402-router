'use client';

import { useEffect, useState } from 'react';

type Event = {
    ts: string;
    owner: string;
    workflow: string;
    model: string;
    tokens: number;
    cost: string;
    budget: string;
    policy: 'approved' | 'warned' | 'review';
    outcome: 'accepted' | 'revised' | 'escalated';
    evidence: string;
};

const EVENTS: ReadonlyArray<Event> = [
    { ts: '14:23:01', owner: 'acme.support',     workflow: 'ticket-triage',         model: 'claude-sonnet-4-6',  tokens: 842,  cost: '$0.0042', budget: 'customer-success',   policy: 'approved', outcome: 'accepted', evidence: 'bundle_a1f2' },
    { ts: '14:23:04', owner: 'acme.finance',     workflow: 'invoice-extract',       model: 'gpt-5.4-mini',       tokens: 1204, cost: '$0.0018', budget: 'finance-ops',        policy: 'approved', outcome: 'accepted', evidence: 'bundle_b8c3' },
    { ts: '14:23:07', owner: 'acme.legal',       workflow: 'contract-clause-scan',  model: 'claude-opus-4-8',    tokens: 3260, cost: '$0.0489', budget: 'legal-review',       policy: 'warned',   outcome: 'revised',  evidence: 'bundle_c4d9' },
    { ts: '14:23:11', owner: 'acme.product',     workflow: 'spec-summarize',        model: 'deepseek-chat',      tokens: 612,  cost: '$0.0003', budget: 'product-engineering', policy: 'approved', outcome: 'accepted', evidence: 'bundle_e7a0' },
    { ts: '14:23:14', owner: 'acme.compliance',  workflow: 'hipaa-redact',          model: 'gemini-3.1-flash',   tokens: 1488, cost: '$0.0007', budget: 'compliance',         policy: 'review',   outcome: 'escalated', evidence: 'bundle_f2b5' },
    { ts: '14:23:18', owner: 'acme.support',     workflow: 'ticket-triage',         model: 'claude-sonnet-4-6',  tokens: 712,  cost: '$0.0036', budget: 'customer-success',   policy: 'approved', outcome: 'accepted', evidence: 'bundle_a1f3' },
];

const POLICY_COLOR: Record<Event['policy'], string> = {
    approved: 'text-primary',
    warned: 'text-amber-300',
    review: 'text-cyan-300',
};

const OUTCOME_COLOR: Record<Event['outcome'], string> = {
    accepted: 'text-neutral-200',
    revised: 'text-amber-300',
    escalated: 'text-cyan-300',
};

export function HeroEventTicker() {
    const [count, setCount] = useState(1);

    useEffect(() => {
        const t = setInterval(() => {
            setCount((c) => (c >= EVENTS.length ? 1 : c + 1));
        }, 1800);
        return () => clearInterval(t);
    }, []);

    const visible = EVENTS.slice(0, count);

    return (
        <div className="border-2 border-black bg-neutral-950 text-neutral-200 font-mono text-[11px] leading-relaxed h-full min-h-[440px] flex flex-col">
            <div className="border-b border-neutral-800 px-4 py-2 flex items-center justify-between bg-neutral-900">
                <span className="text-[10px] uppercase tracking-widest text-neutral-500">live ledger</span>
                <span className="text-[10px] uppercase tracking-widest text-primary">streaming</span>
            </div>
            <div className="px-4 py-3 flex-1 flex flex-col gap-3 overflow-hidden">
                {visible.map((e, i) => (
                    <div
                        key={`${e.ts}-${i}`}
                        className="border-l-2 border-primary pl-3 flex flex-col gap-0.5"
                        style={{ animation: i === visible.length - 1 ? 'fadeInUp 320ms ease-out' : undefined }}
                    >
                        <div className="text-neutral-500">[{e.ts}]</div>
                        <div>
                            <span className="text-neutral-500">owner=</span>
                            <span className="text-neutral-100">{e.owner}</span>
                            <span className="text-neutral-500"> workflow=</span>
                            <span className="text-neutral-100">{e.workflow}</span>
                        </div>
                        <div>
                            <span className="text-neutral-500">model=</span>
                            <span className="text-neutral-100">{e.model}</span>
                            <span className="text-neutral-500"> tokens=</span>
                            <span className="text-neutral-100">{e.tokens}</span>
                            <span className="text-neutral-500"> cost=</span>
                            <span className="text-neutral-100">{e.cost}</span>
                        </div>
                        <div>
                            <span className="text-neutral-500">budget=</span>
                            <span className="text-neutral-100">{e.budget}</span>
                            <span className="text-neutral-500"> policy=</span>
                            <span className={POLICY_COLOR[e.policy]}>{e.policy}</span>
                            <span className="text-neutral-500"> outcome=</span>
                            <span className={OUTCOME_COLOR[e.outcome]}>{e.outcome}</span>
                        </div>
                        <div>
                            <span className="text-neutral-500">evidence=</span>
                            <span className="text-neutral-100">{e.evidence}</span>
                        </div>
                    </div>
                ))}
            </div>
            <div className="border-t border-neutral-800 px-4 py-2 flex items-center justify-between bg-neutral-900 text-[10px] uppercase tracking-widest">
                <span className="text-neutral-500">privacy: metadata-only</span>
                <span className="text-neutral-500">events: {count}</span>
            </div>
            <style jsx>{`
                @keyframes fadeInUp {
                    from { opacity: 0; transform: translateY(6px); }
                    to   { opacity: 1; transform: translateY(0); }
                }
            `}</style>
        </div>
    );
}
