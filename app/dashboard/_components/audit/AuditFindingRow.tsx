'use client';

import { useState } from 'react';
import type { AuditFinding } from '@/lib/types/audit';

const SEVERITY_STYLES: Record<string, string> = {
    critical: 'bg-red-600 text-white',
    high: 'bg-orange-500 text-black',
    medium: 'bg-yellow-400 text-black',
    low: 'bg-blue-400 text-black',
    info: 'bg-neutral-300 text-black',
};

export function AuditFindingRow({ finding }: { finding: AuditFinding }) {
    const [expanded, setExpanded] = useState(false);

    return (
        <div className="border-2 border-black rounded-none bg-white">
            {/* Collapsed header */}
            <button
                onClick={() => setExpanded(!expanded)}
                className="w-full flex items-center gap-3 p-3 text-left hover:bg-neutral-50 transition-colors"
            >
                {/* Severity pill */}
                <span
                    className={`shrink-0 px-2 py-0.5 text-[10px] font-black uppercase tracking-wider rounded-none ${SEVERITY_STYLES[finding.severity] || SEVERITY_STYLES.info
                        }`}
                >
                    {finding.severity}
                </span>

                {/* Title */}
                <span className="flex-1 font-mono text-sm font-bold text-[var(--neutral-900)] truncate">
                    {finding.title}
                </span>

                {/* Domain tag */}
                <span className="shrink-0 text-[10px] font-bold uppercase tracking-widest text-neutral-400 border border-neutral-300 px-1.5 py-0.5 rounded-none">
                    {finding.domain}
                </span>

                {/* Expand chevron */}
                <span className="shrink-0 text-neutral-400 text-sm">
                    {expanded ? '▲' : '▼'}
                </span>
            </button>

            {/* Expanded detail */}
            {expanded && (
                <div className="border-t-2 border-black p-4 space-y-3 bg-neutral-50">
                    <p className="text-sm text-neutral-700">{finding.summary}</p>

                    <div>
                        <h5 className="text-[10px] font-bold uppercase tracking-widest text-neutral-400 mb-1">
                            User Impact
                        </h5>
                        <p className="text-sm font-mono text-neutral-800">{finding.user_impact}</p>
                    </div>

                    <div>
                        <h5 className="text-[10px] font-bold uppercase tracking-widest text-neutral-400 mb-1">
                            Recommendation
                        </h5>
                        <p className="text-sm font-mono text-neutral-800">{finding.recommendation}</p>
                    </div>

                    {finding.impact_estimate?.cost_savings_usd != null && finding.impact_estimate.cost_savings_usd > 0 && (
                        <div className="bg-green-100 border border-green-600 p-2 rounded-none">
                            <span className="text-xs font-bold uppercase text-green-800">
                                Est. savings: ${finding.impact_estimate.cost_savings_usd.toFixed(2)}/mo
                            </span>
                        </div>
                    )}

                    {finding.actions && finding.actions.length > 0 && (
                        <div className="flex flex-wrap gap-2 pt-2">
                            {finding.actions.map((action) => (
                                <a
                                    key={action.action_id}
                                    href={action.route}
                                    className="text-xs font-bold uppercase tracking-wide py-1.5 px-3 border-2 border-black rounded-none bg-[var(--primary)] text-[var(--neutral-900)] hover:brightness-110"
                                >
                                    {action.label}
                                </a>
                            ))}
                        </div>
                    )}

                    <div className="text-[10px] text-neutral-400 font-mono pt-1">
                        Code: {finding.code} · Seen {finding.occurrence_count_24h}× (24h)
                    </div>
                </div>
            )}
        </div>
    );
}
