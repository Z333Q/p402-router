'use client';

import { useMeterStore } from '../_store/useMeterStore';
import type { LedgerEvent } from '@/lib/meter/types';

export function LedgerPane() {
  const { ledgerEvents, frequencyStats, budgetCapUsd, streamDone } = useMeterStore();
  const { totalCostUsd } = frequencyStats;
  const overBudget = totalCostUsd > budgetCapUsd;

  // Show last 12 events in the table
  const displayEvents = ledgerEvents.slice(-12);

  return (
    <div className="card p-0 flex flex-col">
      {/* Header */}
      <div className="section-header px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="badge badge-primary text-[10px]">04</span>
          <span className="text-sm font-bold tracking-wider uppercase">Economic Ledger</span>
        </div>
        <RunningTotal total={totalCostUsd} overBudget={overBudget} />
      </div>

      {/* Ledger table */}
      <div className="flex-1 overflow-y-auto max-h-[280px]">
        {displayEvents.length === 0 ? (
          <div className="flex items-center justify-center h-24 text-xs font-mono text-neutral-600 uppercase tracking-wider">
            Awaiting economic events
          </div>
        ) : (
          <table className="w-full text-[10px] font-mono">
            <thead>
              <tr className="border-b border-neutral-700">
                <th className="text-left px-4 py-2 text-neutral-400 uppercase tracking-wider font-normal">Kind</th>
                <th className="text-right px-4 py-2 text-neutral-400 uppercase tracking-wider font-normal">Cost</th>
                <th className="text-right px-4 py-2 text-neutral-400 uppercase tracking-wider font-normal">Status</th>
              </tr>
            </thead>
            <tbody>
              {displayEvents.map((e) => (
                <LedgerRow key={e.id} event={e} />
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Footer — reconcile row */}
      {streamDone && (
        <div className="border-t-2 border-primary px-4 py-3 flex items-center justify-between bg-neutral-900">
          <span className="text-[10px] font-mono uppercase text-neutral-400 tracking-wider">Reconciled Final Cost</span>
          <span className={`text-sm font-bold font-mono ${overBudget ? 'text-error' : 'text-primary'}`}>
            ${totalCostUsd.toFixed(6)}
          </span>
        </div>
      )}

      {/* Budget cap reference */}
      <div className="border-t border-neutral-700 px-4 py-2 flex items-center justify-between">
        <span className="text-[10px] font-mono uppercase text-neutral-600 tracking-wider">Budget Cap</span>
        <span className="text-[10px] font-mono text-neutral-400">${budgetCapUsd.toFixed(2)}</span>
      </div>
    </div>
  );
}

function LedgerRow({ event }: { event: LedgerEvent }) {
  const kindLabels: Record<string, string> = {
    estimate: 'Estimate',
    reconcile: 'Reconcile',
    routing_fee: 'Routing Fee',
    cache_hit: 'Cache Hit',
    release: 'Release',
    arc_settlement: 'Arc Settlement',
  };

  const kindColors: Record<string, string> = {
    estimate: 'text-neutral-400',
    reconcile: 'text-primary font-bold',
    routing_fee: 'text-neutral-400',
    cache_hit: 'text-success',
    release: 'text-info',
    arc_settlement: 'text-primary',
  };

  const color = kindColors[event.eventKind] ?? 'text-neutral-400';

  return (
    <tr className="border-b border-neutral-800 hover:bg-neutral-800/50 transition-colors">
      <td className={`px-4 py-2 ${color} uppercase`}>{kindLabels[event.eventKind] ?? event.eventKind}</td>
      <td className={`px-4 py-2 text-right ${color} tabular-nums`}>
        ${event.costUsd.toFixed(6)}
      </td>
      <td className="px-4 py-2 text-right">
        {event.provisional ? (
          <span className="text-neutral-600">provisional</span>
        ) : (
          <span className="text-success">final</span>
        )}
      </td>
    </tr>
  );
}

function RunningTotal({ total, overBudget }: { total: number; overBudget: boolean }) {
  return (
    <div className={`text-sm font-bold font-mono tabular-nums ${overBudget ? 'text-error' : 'text-primary'}`}>
      ${total.toFixed(6)}
    </div>
  );
}
