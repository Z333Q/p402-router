'use client';

import { useGovernance } from '../_store/useGovernance';
import { useMeterStore } from '../_store/useMeterStore';

const PHASES: { label: string; agent?: string; matchKind?: string }[] = [
  { label: 'Packet intake classification', matchKind: 'work_order_extracting' },
  { label: 'Document extraction', agent: 'documentation-extraction-agent' },
  { label: 'Completeness check', agent: 'completeness-check-agent' },
  { label: 'Criteria mapping', agent: 'criteria-mapping-agent' },
  { label: 'Reviewer summary generation', agent: 'reviewer-summary-agent' },
  { label: 'RFI reason draft', agent: 'rfi-reason-agent' },
  { label: 'Escalation recommendation', agent: 'escalation-recommendation-agent' },
  { label: 'Evidence bundle export', agent: 'evidence-export-agent' },
];

export function AIOperationStream() {
  const { receipts } = useGovernance();
  const sessionState = useMeterStore((s) => s.sessionState);
  const agentsHit = new Set(receipts.map((r) => r.agent));
  const intakeDone =
    sessionState !== 'idle' && sessionState !== 'packet_submitted' && sessionState !== 'work_order_extracting';

  return (
    <section className="border-2 border-neutral-700 p-6 flex flex-col gap-3">
      <div className="flex items-baseline justify-between">
        <h2 className="text-lg font-bold text-neutral-50 uppercase tracking-tight">
          Metered AI Operations
        </h2>
        <span className="text-[10px] font-mono uppercase tracking-widest text-neutral-500">
          {sessionState}
        </span>
      </div>

      <ol className="flex flex-col gap-1">
        {PHASES.map((p, i) => {
          const done = p.agent ? agentsHit.has(p.agent) : intakeDone;
          const receipt = p.agent ? receipts.find((r) => r.agent === p.agent) : undefined;
          return (
            <li
              key={p.label}
              className={`border p-2 flex items-center gap-3 ${
                done ? 'border-success' : 'border-neutral-700'
              }`}
            >
              <span
                className={`text-[10px] font-mono w-6 text-center ${
                  done ? 'text-success' : 'text-neutral-500'
                }`}
              >
                {done ? '✓' : (i + 1).toString().padStart(2, '0')}
              </span>
              <span className="text-xs text-neutral-200 flex-1 leading-snug">{p.label}</span>
              {receipt && (
                <span className="text-[10px] font-mono text-neutral-400">
                  ${receipt.costUsd.toFixed(4)} · {receipt.evidenceHash}
                </span>
              )}
            </li>
          );
        })}
      </ol>

      <p className="text-[11px] text-neutral-500 leading-snug">
        Each step is an AI-assisted draft for human review. No step is a coverage decision.
      </p>
    </section>
  );
}
