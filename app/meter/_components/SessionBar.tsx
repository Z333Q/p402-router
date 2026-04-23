'use client';

import { useMeterStore } from '../_store/useMeterStore';

export function SessionBar() {
  const { sessionId, budgetCapUsd, budgetSpentUsd, sessionState, frequencyStats, ledgerEvents } =
    useMeterStore();

  const isStreaming = sessionState === 'streaming';
  const isDone = sessionState === 'review_complete' || sessionState === 'approved' || sessionState === 'held' || sessionState === 'released';

  const pct = budgetCapUsd > 0 ? Math.min((budgetSpentUsd / budgetCapUsd) * 100, 100) : 0;
  const overBudget = budgetSpentUsd > budgetCapUsd;
  const budgetRemaining = Math.max(0, budgetCapUsd - budgetSpentUsd);

  const arcTxCount = ledgerEvents.filter((e) => e.arcTxHash != null).length;
  const avgCostPerTx =
    frequencyStats.authorizations > 0
      ? frequencyStats.totalCostUsd / frequencyStats.authorizations
      : null;

  const thresholdMet = frequencyStats.authorizations >= 50;
  const costMet = avgCostPerTx != null && avgCostPerTx < 0.01;

  const proofStatus =
    isDone && thresholdMet && costMet ? 'VERIFIED' :
    isDone ? 'PARTIAL' :
    isStreaming ? 'LIVE' :
    sessionId ? 'PENDING' :
    'READY';

  const proofColor =
    proofStatus === 'VERIFIED' ? 'text-success border-success' :
    proofStatus === 'LIVE'     ? 'text-primary border-primary animate-pulse' :
    proofStatus === 'PARTIAL'  ? 'text-warning border-warning' :
    'text-neutral-600 border-neutral-700';

  return (
    <div className="border-2 border-neutral-700 bg-neutral-800">
      {/* Judge KPI row */}
      <div className="px-4 py-2 border-b border-neutral-700 flex flex-wrap items-center gap-4 text-[10px] font-mono">
        <KpiCell label="Budget Spent" value={`$${budgetSpentUsd.toFixed(6)}`} color={overBudget ? 'text-error' : isStreaming ? 'text-primary' : 'text-neutral-300'} />
        <KpiCell label="Remaining" value={`$${budgetRemaining.toFixed(4)}`} color={overBudget ? 'text-error' : 'text-neutral-400'} />
        <KpiCell label="AI Events" value={frequencyStats.authorizations > 0 ? `${frequencyStats.authorizations}` : '—'} color={thresholdMet ? 'text-success' : 'text-neutral-400'} />
        <KpiCell label="Arc Tx" value={arcTxCount > 0 ? arcTxCount.toString() : '—'} color="text-neutral-400" />
        <KpiCell label="Avg / Event" value={avgCostPerTx != null ? `$${avgCostPerTx.toFixed(6)}` : '—'} color={costMet ? 'text-success' : 'text-neutral-400'} />
        <div className="ml-auto flex items-center gap-2">
          <span className="text-neutral-600 uppercase tracking-wider">Proof</span>
          <span className={`border px-2 py-0.5 font-bold uppercase tracking-widest ${proofColor}`}>
            {proofStatus}
          </span>
          <StateBadge state={sessionState} />
        </div>
      </div>

      {/* Budget progress bar */}
      <div className="px-4 py-2 flex items-center gap-3">
        <span className="text-[10px] font-mono text-neutral-500 uppercase tracking-wider whitespace-nowrap">
          Session
        </span>
        <span className="text-[10px] font-mono text-primary font-bold">
          {sessionId ?? '—'}
        </span>
        <div className="flex-1 flex items-center gap-2 ml-2">
          <span className="text-[10px] font-mono text-neutral-600 uppercase whitespace-nowrap">Budget</span>
          <div className="flex-1 h-1.5 border border-neutral-700 bg-neutral-900">
            <div
              className={`h-full transition-all duration-300 ${overBudget ? 'bg-error' : 'bg-primary'}`}
              style={{ width: `${pct}%` }}
            />
          </div>
          <span className="text-[10px] font-mono text-neutral-600 tabular-nums whitespace-nowrap">
            ${budgetSpentUsd.toFixed(4)} / ${budgetCapUsd.toFixed(2)}
          </span>
        </div>
        {isStreaming && (
          <span className="text-[10px] font-mono text-success animate-pulse whitespace-nowrap">
            ⬤ BILLING LIVE
          </span>
        )}
      </div>
    </div>
  );
}

function KpiCell({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <div className="flex flex-col gap-0.5">
      <span className="text-neutral-600 uppercase tracking-widest text-[9px]">{label}</span>
      <span className={`font-bold tabular-nums ${color}`}>{value}</span>
    </div>
  );
}

function StateBadge({ state }: { state: string }) {
  const configs: Record<string, { label: string; cls: string }> = {
    idle:                { label: 'READY',               cls: 'border-neutral-700 text-neutral-500' },
    packet_submitted:    { label: 'DOC RECEIVED',        cls: 'border-info text-info' },
    work_order_extracting: { label: 'GEMINI EXTRACTING', cls: 'border-warning text-warning animate-pulse' },
    work_order_ready:    { label: 'CASE STRUCTURED',     cls: 'border-primary text-primary' },
    session_opening:     { label: 'OPENING SESSION',     cls: 'border-warning text-warning' },
    streaming:           { label: '⬤ BILLING LIVE',      cls: 'border-success text-success' },
    reconciling:         { label: 'RECONCILING',         cls: 'border-warning text-warning' },
    proof_ready:         { label: 'PROOF READY',         cls: 'border-primary text-primary' },
    review_complete:     { label: 'REVIEW COMPLETE',     cls: 'border-success text-success' },
    approved:            { label: '✓ APPROVED',          cls: 'border-success text-success' },
    held:                { label: 'HELD',                cls: 'border-warning text-warning' },
    released:            { label: '✓ RELEASED',          cls: 'border-success text-success' },
  };

  const cfg = configs[state] ?? { label: state.toUpperCase(), cls: 'border-neutral-700 text-neutral-500' };

  return (
    <div className={`border px-2 py-0.5 text-[9px] font-bold tracking-widest uppercase ${cfg.cls}`}>
      {cfg.label}
    </div>
  );
}
