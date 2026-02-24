import type { AuditContractPayload } from '@/lib/types/audit';

const GRADE_COLORS: Record<string, string> = {
    A: 'text-green-600',
    B: 'text-green-500',
    C: 'text-yellow-500',
    D: 'text-orange-500',
    F: 'text-red-600',
};

export function AuditScorecard({ audit }: { audit: AuditContractPayload }) {
    const { score, grade } = audit.overall_score;

    return (
        <div className="bg-[var(--neutral-50)] text-[var(--neutral-900)] p-6 flex flex-col gap-4 border-2 border-black rounded-none">
            {/* Header: Score + Grade */}
            <div className="flex justify-between items-end border-b-2 border-black pb-4">
                <div>
                    <h2 className="text-xs font-bold uppercase tracking-widest text-neutral-400">
                        Audit Score
                    </h2>
                    <div className="text-5xl font-mono font-black mt-1">
                        {score}
                        <span className="text-2xl text-neutral-400">/100</span>
                    </div>
                </div>
                <div className={`text-6xl font-black ${GRADE_COLORS[grade] || 'text-neutral-500'}`}>
                    {grade}
                </div>
            </div>

            {/* Domain Breakdown */}
            {audit.domain_breakdown && audit.domain_breakdown.length > 0 && (
                <div className="grid grid-cols-2 gap-2">
                    {audit.domain_breakdown.map((d) => (
                        <div key={d.domain} className="border border-black p-2 rounded-none">
                            <div className="text-[10px] font-bold uppercase tracking-widest text-neutral-500">
                                {d.domain}
                            </div>
                            <div className="text-lg font-mono font-black">
                                {d.score}
                                <span className={`ml-1 text-sm ${GRADE_COLORS[d.grade] || ''}`}>{d.grade}</span>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* Top Findings */}
            <div className="flex flex-col gap-2">
                <h3 className="font-bold uppercase text-xs tracking-wide">Top Findings</h3>
                {audit.top_findings.length === 0 ? (
                    <div className="text-green-600 font-mono text-sm">✓ No critical issues detected.</div>
                ) : (
                    audit.top_findings.map((f) => (
                        <div
                            key={f.finding_id}
                            className="flex items-start gap-2 text-sm font-mono bg-neutral-800 text-white p-2 border border-black rounded-none"
                        >
                            <span
                                className={`shrink-0 px-1.5 py-0.5 font-bold text-xs uppercase ${f.severity === 'critical'
                                        ? 'bg-red-600 text-white'
                                        : f.severity === 'high'
                                            ? 'bg-orange-500 text-black'
                                            : 'bg-yellow-400 text-black'
                                    }`}
                            >
                                {f.severity}
                            </span>
                            <span className="break-words">{f.title}</span>
                        </div>
                    ))
                )}
            </div>
        </div>
    );
}
