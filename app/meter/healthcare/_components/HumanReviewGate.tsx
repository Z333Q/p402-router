'use client';

import { useGovernance } from '../_store/useGovernance';
import type { HumanReviewAction } from '@/lib/meter/healthcare/types';

const ACTIONS: { id: HumanReviewAction; label: string; tone: 'primary' | 'neutral' | 'warn' }[] = [
  { id: 'approve_for_reviewer_signoff', label: 'Approve for reviewer sign-off', tone: 'primary' },
  { id: 'request_more_information', label: 'Request more information', tone: 'warn' },
  { id: 'escalate_to_physician_advisor', label: 'Escalate to physician advisor', tone: 'neutral' },
];

export function HumanReviewGate() {
  const { humanDecision, setHumanDecision, receipts } = useGovernance();
  const streamComplete = receipts.length > 0;

  return (
    <section
      className={`border-2 p-6 flex flex-col gap-3 ${
        humanDecision ? 'border-success' : 'border-primary'
      }`}
    >
      <div className="flex items-baseline justify-between">
        <h2 className="text-lg font-bold text-neutral-50 uppercase tracking-tight">
          Human Review Required
        </h2>
        <span
          className={`text-[10px] font-mono uppercase tracking-widest border px-2 py-0.5 ${
            humanDecision
              ? 'border-success text-success'
              : 'border-primary text-primary'
          }`}
        >
          {humanDecision ? 'recorded' : 'awaiting reviewer'}
        </span>
      </div>

      <p className="text-sm text-neutral-300 leading-relaxed">
        AI has prepared a draft review packet. The system has not made a coverage decision. Select
        a human reviewer action.
      </p>

      <p className="text-[11px] text-neutral-500 leading-snug">
        Note: this demo never produces a primary &ldquo;Deny&rdquo; action. Any adverse-determination
        reason is treated as a draft requiring human review.
      </p>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
        {ACTIONS.map((a) => {
          const active = humanDecision === a.id;
          const cls = active
            ? a.tone === 'primary'
              ? 'border-primary bg-neutral-800 text-primary'
              : a.tone === 'warn'
                ? 'border-warning bg-neutral-800 text-warning'
                : 'border-info bg-neutral-800 text-info'
            : 'border-neutral-700 text-neutral-200 hover:border-neutral-500';
          return (
            <button
              key={a.id}
              type="button"
              disabled={!streamComplete}
              onClick={() => setHumanDecision(a.id)}
              className={`border-2 p-3 text-sm font-bold uppercase tracking-tight transition-none text-left disabled:opacity-40 disabled:cursor-not-allowed ${cls}`}
            >
              {a.label}
            </button>
          );
        })}
      </div>

      {!streamComplete && (
        <p className="text-[11px] font-mono text-neutral-500">
          Run the demo to enable reviewer actions.
        </p>
      )}
    </section>
  );
}
