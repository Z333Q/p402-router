'use client';

import { useTransition } from 'react';
import { revokeMandateAction } from '@/lib/actions/mandates';
import { StopCircle } from 'lucide-react';

interface Mandate {
    id: string;
    agent_did: string;
    type: string;
    amount_spent_usd: number;
    constraints: { max_amount_usd: number; valid_until?: string };
    status: 'active' | 'exhausted' | 'expired' | 'revoked';
}

export function MandateTable({ mandates }: { mandates: Mandate[] }) {
    const [isPending, startTransition] = useTransition();

    const handleRevoke = (id: string) => {
        if (confirm("Are you sure you want to revoke this agent's spending power? This takes effect instantly.")) {
            startTransition(async () => {
                await revokeMandateAction(id);
            });
        }
    };

    return (
        <div className="card border-2 border-black bg-white overflow-x-auto p-0">
            <table className="w-full text-left font-mono text-sm min-w-[800px]">
                <thead className="bg-[var(--neutral-900)] text-white border-b-2 border-black">
                    <tr>
                        <th className="p-4 uppercase tracking-wider text-xs">Agent Identity (DID)</th>
                        <th className="p-4 uppercase tracking-wider text-xs">Type</th>
                        <th className="p-4 uppercase tracking-wider text-xs w-1/4">Budget Utilized</th>
                        <th className="p-4 uppercase tracking-wider text-xs text-center">Status</th>
                        <th className="p-4 uppercase tracking-wider text-xs text-right">Action</th>
                    </tr>
                </thead>
                <tbody>
                    {mandates.length === 0 ? (
                        <tr>
                            <td colSpan={5} className="p-8 text-center text-[var(--neutral-400)] italic border-b-2 border-black">No active AP2 mandates found.</td>
                        </tr>
                    ) : (
                        mandates.map((m) => {
                            const spent = Number(m.amount_spent_usd || 0);
                            const max = Number(m.constraints.max_amount_usd || 1);
                            const percent = Math.min(100, (spent / max) * 100);

                            return (
                                <tr key={m.id} className="border-b-2 border-black last:border-b-0 hover:bg-[var(--neutral-50)] transition-colors">
                                    <td className="p-4 font-bold truncate max-w-[200px]" title={m.agent_did}>
                                        {m.agent_did.replace('did:erc8004:base:', '...')}
                                    </td>
                                    <td className="p-4 uppercase text-xs">{m.type}</td>

                                    {/* Hard-edged Neo-Brutalist Progress Bar */}
                                    <td className="p-4">
                                        <div className="flex justify-between text-xs mb-1 font-bold">
                                            <span>${spent.toFixed(2)}</span>
                                            <span>${max.toFixed(2)}</span>
                                        </div>
                                        <div className="w-full h-4 border-2 border-black bg-white">
                                            <div
                                                className={`h-full ${percent > 90 ? 'bg-[var(--error)]' : 'bg-[var(--primary)]'} border-r-2 border-black transition-all`}
                                                style={{ width: `${percent}%` }}
                                            />
                                        </div>
                                    </td>

                                    <td className="p-4 text-center">
                                        <span className={`badge px-2 py-1 text-[10px] border-2 border-black font-black uppercase ${m.status === 'active' ? 'bg-[var(--success)] text-white' :
                                            m.status === 'revoked' ? 'bg-[var(--error)] text-white' : 'bg-[var(--neutral-300)] text-black'
                                            }`}>
                                            {m.status}
                                        </span>
                                    </td>

                                    <td className="p-4 text-right">
                                        {m.status === 'active' && (
                                            <button
                                                onClick={() => handleRevoke(m.id)}
                                                disabled={isPending}
                                                className="btn bg-[var(--error)] text-white hover:bg-red-700 font-bold uppercase text-xs px-3 py-1.5 border-2 border-black inline-flex items-center gap-1 transition-colors"
                                            >
                                                <StopCircle className="w-4 h-4" /> Kill Switch
                                            </button>
                                        )}
                                    </td>
                                </tr>
                            );
                        })
                    )}
                </tbody>
            </table>
        </div>
    );
}
