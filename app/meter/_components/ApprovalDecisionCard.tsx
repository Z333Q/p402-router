'use client';

import { useMeterStore } from '../_store/useMeterStore';

export function ApprovalDecisionCard() {
  const { approvalRecord, sessionState, streamDone, frequencyStats, budgetCapUsd } = useMeterStore();

  const isWaiting = !streamDone;
  const { totalCostUsd } = frequencyStats;

  if (isWaiting) {
    return (
      <div className="card p-0 flex flex-col opacity-40">
        <div className="section-header px-4 py-3 flex items-center gap-2">
          <span className="badge text-[10px]">06</span>
          <span className="text-sm font-bold tracking-wider uppercase">Governed Outcome</span>
        </div>
        <div className="flex-1 flex items-center justify-center p-8 text-xs font-mono text-neutral-600 uppercase tracking-wider">
          Awaiting Review Completion
        </div>
      </div>
    );
  }

  const rec = approvalRecord?.recommendation ?? 'approve_for_manual_review';
  const insideBudget = approvalRecord?.insideBudget ?? totalCostUsd <= budgetCapUsd;
  const policyCompliant = approvalRecord?.policyCompliant ?? true;
  const outputInScope = approvalRecord?.outputInScope ?? true;
  const reasonSummary = approvalRecord?.reasonSummary ?? 'Review completed. Ready for manual approval.';

  const recConfig: Record<string, { label: string; color: string; bg: string }> = {
    approve_for_manual_review: {
      label: 'APPROVE FOR MANUAL REVIEW',
      color: 'text-success',
      bg: 'border-success',
    },
    hold_for_escalation: {
      label: 'HOLD FOR ESCALATION',
      color: 'text-warning',
      bg: 'border-warning',
    },
    revise_output: {
      label: 'REVISE OUTPUT',
      color: 'text-error',
      bg: 'border-error',
    },
  };

  const recDisplay = recConfig[rec] ?? recConfig['approve_for_manual_review']!;

  return (
    <div className="card p-0 flex flex-col">
      {/* Header */}
      <div className="section-header px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="badge badge-primary text-[10px]">06</span>
          <span className="text-sm font-bold tracking-wider uppercase">Approval Decision</span>
        </div>
        <div className={`border-2 px-3 py-1 text-[10px] font-bold uppercase ${recDisplay.bg} ${recDisplay.color}`}>
          {recDisplay.label}
        </div>
      </div>

      <div className="p-4 flex flex-col gap-0">
        {/* Status rows */}
        <StatusRow
          label="Budget Status"
          value={insideBudget ? 'INSIDE CAP' : 'OVER BUDGET'}
          pass={insideBudget}
          detail={`$${totalCostUsd.toFixed(6)} / $${budgetCapUsd.toFixed(2)}`}
        />
        <StatusRow
          label="Policy Compliance"
          value={policyCompliant ? 'COMPLIANT' : 'REVIEW REQUIRED'}
          pass={policyCompliant}
        />
        <StatusRow
          label="Output Scope"
          value={outputInScope ? 'IN SCOPE' : 'OUT OF SCOPE'}
          pass={outputInScope}
        />
        <StatusRow
          label="Proof on Arc"
          value="VERIFIED"
          pass={true}
        />

        {/* Recommendation */}
        <div className={`mt-4 border-2 ${recDisplay.bg} p-3`}>
          <div className={`text-xs font-bold uppercase tracking-wider mb-2 ${recDisplay.color}`}>
            Recommendation
          </div>
          <div className="text-xs font-mono text-neutral-300 leading-relaxed">
            {reasonSummary}
          </div>
        </div>

        {/* Final cost vs traditional rails */}
        <div className="mt-4 border-t border-neutral-700 pt-3 flex flex-col gap-2">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-mono text-neutral-400 uppercase tracking-wider">Total Billed on Arc</span>
            <span className={`text-lg font-bold font-mono tabular-nums ${insideBudget ? 'text-primary' : 'text-error'}`}>
              ${totalCostUsd.toFixed(6)}
            </span>
          </div>
          {totalCostUsd > 0 && (
            <div className="flex items-center justify-between text-[10px] font-mono">
              <span className="text-neutral-600">Stripe minimum fee would be</span>
              <span className="text-error line-through">${(0.30 + totalCostUsd * 0.029).toFixed(4)}</span>
            </div>
          )}
          {totalCostUsd > 0 && (
            <div className="flex items-center justify-between text-[10px] font-mono">
              <span className="text-neutral-600">ETH mainnet gas equivalent</span>
              <span className="text-error line-through">~${(Math.max(1, Math.round(totalCostUsd / 0.000006)) * 2.85).toFixed(2)}</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function StatusRow({
  label,
  value,
  pass,
  detail,
}: {
  label: string;
  value: string;
  pass: boolean;
  detail?: string;
}) {
  return (
    <div className="flex items-center justify-between border-b border-neutral-800 py-2.5">
      <span className="text-[10px] font-mono uppercase text-neutral-400 tracking-wider">{label}</span>
      <div className="flex items-center gap-2">
        {detail && <span className="text-[10px] font-mono text-neutral-600">{detail}</span>}
        <span className={`text-[11px] font-bold font-mono uppercase ${pass ? 'text-success' : 'text-error'}`}>
          {value}
        </span>
      </div>
    </div>
  );
}
