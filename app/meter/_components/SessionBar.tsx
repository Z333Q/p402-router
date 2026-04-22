'use client';

import { useMeterStore } from '../_store/useMeterStore';

export function SessionBar() {
  const { sessionId, budgetCapUsd, budgetSpentUsd, sessionState, frequencyStats } = useMeterStore();
  const isStreaming = sessionState === 'streaming';

  const pct = budgetCapUsd > 0 ? Math.min((budgetSpentUsd / budgetCapUsd) * 100, 100) : 0;
  const overBudget = budgetSpentUsd > budgetCapUsd;

  return (
    <div className="border-2 border-neutral-700 bg-neutral-800 px-4 py-3 flex flex-wrap items-center gap-4 text-xs font-mono">
      {/* Session ID */}
      <div className="flex items-center gap-2">
        <span className="text-neutral-400 uppercase tracking-widest">Session</span>
        <span className="text-primary font-bold">{sessionId ?? '—'}</span>
      </div>

      {/* Budget progress */}
      <div className="flex items-center gap-3 flex-1 min-w-[200px]">
        <span className="text-neutral-400 uppercase tracking-widest whitespace-nowrap">
          Billed{' '}
          <span className={`font-bold tabular-nums ${overBudget ? 'text-error' : isStreaming ? 'text-primary' : 'text-neutral-50'}`}>
            ${budgetSpentUsd.toFixed(6)}
          </span>
          {' '}/ ${budgetCapUsd.toFixed(2)} cap
        </span>
        <div className="flex-1 h-2 border border-neutral-600 bg-neutral-900">
          <div
            className={`h-full transition-all duration-300 ${overBudget ? 'bg-error' : 'bg-primary'}`}
            style={{ width: `${pct}%` }}
          />
        </div>
      </div>

      {/* Live event count while streaming */}
      {isStreaming && (
        <span className="text-[10px] font-mono text-success tabular-nums">
          {frequencyStats.authorizations} events
        </span>
      )}

      {/* State badge */}
      <StateBadge state={sessionState} />
    </div>
  );
}

function StateBadge({ state }: { state: string }) {
  const configs: Record<string, { label: string; cls: string }> = {
    idle: { label: 'READY', cls: 'border-neutral-600 text-neutral-400' },
    packet_submitted: { label: 'DOCUMENT RECEIVED', cls: 'border-info text-info' },
    work_order_extracting: { label: 'GEMINI EXTRACTING', cls: 'border-warning text-warning animate-pulse' },
    work_order_ready: { label: 'CASE STRUCTURED', cls: 'border-primary text-primary' },
    session_opening: { label: 'OPENING METERED SESSION', cls: 'border-warning text-warning' },
    streaming: { label: '⬤ BILLING IN REAL TIME', cls: 'border-success text-success' },
    reconciling: { label: 'RECONCILING ON ARC', cls: 'border-warning text-warning' },
    proof_ready: { label: 'ONCHAIN PROOF READY', cls: 'border-primary text-primary' },
    review_complete: { label: 'REVIEW COMPLETE', cls: 'border-success text-success' },
    approved: { label: '✓ APPROVED FOR REVIEW', cls: 'border-success text-success' },
    held: { label: 'HELD FOR ESCALATION', cls: 'border-warning text-warning' },
    approval_ready: { label: 'APPROVAL READY', cls: 'border-success text-success' },
    released: { label: '✓ ESCROW RELEASED', cls: 'border-success text-success' },
  };

  const cfg = configs[state] ?? { label: state.toUpperCase(), cls: 'border-neutral-600 text-neutral-400' };

  return (
    <div className={`border px-2 py-1 text-[10px] font-bold tracking-widest uppercase ${cfg.cls}`}>
      {cfg.label}
    </div>
  );
}
