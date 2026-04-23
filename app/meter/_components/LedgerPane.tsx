'use client';

import { useMeterStore } from '../_store/useMeterStore';
import { arcExplorerTxUrl } from '@/lib/chains/arc';
import type { LedgerEvent, LedgerEventKind } from '@/lib/meter/types';

// Row type taxonomy — three categories judges should see
type RowCategory = 'ai' | 'payment' | 'settlement';

const KIND_CONFIG: Record<LedgerEventKind, { label: string; category: RowCategory }> = {
  extraction_estimate:        { label: 'Gemini Extraction',   category: 'ai' },
  review_estimate:            { label: 'Gemini Review',        category: 'ai' },
  followup_estimate:          { label: 'Gemini Follow-Up',     category: 'ai' },
  specialist_review_estimate: { label: 'Specialist Review',    category: 'ai' },
  reconciliation:             { label: 'Arc Reconciliation',   category: 'settlement' },
  escrow_release:             { label: 'Escrow Release',       category: 'settlement' },
  routing_fee:                { label: 'P402 Routing Fee',     category: 'payment' },
  cache_access:               { label: 'Cache Hit',            category: 'payment' },
};

const CATEGORY_COLORS: Record<RowCategory, string> = {
  ai:         'text-warning',
  payment:    'text-info',
  settlement: 'text-primary font-bold',
};

export function LedgerPane() {
  const { ledgerEvents, frequencyStats, budgetCapUsd, streamDone } = useMeterStore();
  const { totalCostUsd } = frequencyStats;
  const overBudget = totalCostUsd > budgetCapUsd;

  const displayEvents = ledgerEvents.slice(-16);

  const aiEvents      = ledgerEvents.filter((e) => KIND_CONFIG[e.eventKind]?.category === 'ai').length;
  const paymentEvents = ledgerEvents.filter((e) => KIND_CONFIG[e.eventKind]?.category === 'payment').length;
  const settleEvents  = ledgerEvents.filter((e) => KIND_CONFIG[e.eventKind]?.category === 'settlement').length;

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

      {/* Event taxonomy summary */}
      {ledgerEvents.length > 0 && (
        <div className="flex divide-x divide-neutral-800 border-b border-neutral-700">
          <TaxonomyCell label="AI Events" count={aiEvents} color="text-warning" />
          <TaxonomyCell label="Payment Auths" count={paymentEvents} color="text-info" />
          <TaxonomyCell label="Arc Settlements" count={settleEvents} color="text-primary" />
          <TaxonomyCell label="Total Events" count={ledgerEvents.length} color="text-neutral-300" />
        </div>
      )}

      {/* Ledger table */}
      <div className="flex-1 overflow-y-auto max-h-[320px]">
        {displayEvents.length === 0 ? (
          <div className="flex items-center justify-center h-24 text-xs font-mono text-neutral-600 uppercase tracking-wider">
            Awaiting economic events
          </div>
        ) : (
          <table className="w-full text-[10px] font-mono">
            <thead className="sticky top-0 bg-neutral-900">
              <tr className="border-b border-neutral-700">
                <th className="text-left px-3 py-2 text-neutral-500 uppercase tracking-wider font-normal">Time</th>
                <th className="text-left px-3 py-2 text-neutral-500 uppercase tracking-wider font-normal">Event</th>
                <th className="text-right px-3 py-2 text-neutral-500 uppercase tracking-wider font-normal">Tokens</th>
                <th className="text-right px-3 py-2 text-neutral-500 uppercase tracking-wider font-normal">Cost</th>
                <th className="text-right px-3 py-2 text-neutral-500 uppercase tracking-wider font-normal">Proof</th>
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

      {/* Reconcile footer */}
      {streamDone && (
        <div className="border-t-2 border-primary px-4 py-3 flex items-center justify-between bg-neutral-900">
          <div className="flex items-center gap-4 text-[10px] font-mono text-neutral-500 uppercase">
            <span>{ledgerEvents.length} events reconciled</span>
            <span className="text-warning">{aiEvents} AI</span>
            <span className="text-primary">{settleEvents} Arc tx</span>
          </div>
          <span className={`text-sm font-bold font-mono ${overBudget ? 'text-error' : 'text-primary'}`}>
            ${totalCostUsd.toFixed(6)}
          </span>
        </div>
      )}

      {/* Budget cap */}
      <div className="border-t border-neutral-700 px-4 py-2 flex items-center justify-between">
        <span className="text-[10px] font-mono uppercase text-neutral-600 tracking-wider">Budget Cap</span>
        <span className="text-[10px] font-mono text-neutral-400">${budgetCapUsd.toFixed(2)}</span>
      </div>
    </div>
  );
}

function LedgerRow({ event }: { event: LedgerEvent }) {
  const cfg = KIND_CONFIG[event.eventKind];
  const category: RowCategory = cfg?.category ?? 'payment';
  const label = cfg?.label ?? event.eventKind;
  const color = CATEGORY_COLORS[category] ?? 'text-neutral-400';

  const time = event.createdAt
    ? new Date(event.createdAt).toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' })
    : '—';

  const proofDisplay = event.arcTxHash
    ? event.arcTxHash.slice(0, 8) + '…'
    : event.proofRef
    ? event.proofRef.slice(0, 8) + '…'
    : event.provisional
    ? 'pending'
    : '✓';

  return (
    <tr className="border-b border-neutral-800 hover:bg-neutral-800/40 transition-colors">
      <td className="px-3 py-2 text-neutral-600 tabular-nums whitespace-nowrap">{time}</td>
      <td className={`px-3 py-2 ${color} uppercase tracking-wider`}>{label}</td>
      <td className="px-3 py-2 text-right text-neutral-600 tabular-nums">
        {event.tokensEstimate != null ? event.tokensEstimate.toString() : '—'}
      </td>
      <td className={`px-3 py-2 text-right tabular-nums ${event.provisional ? 'text-neutral-500' : 'text-neutral-200'}`}>
        ${event.costUsd.toFixed(6)}
      </td>
      <td className="px-3 py-2 text-right">
        {event.arcTxHash ? (
          <a
            href={arcExplorerTxUrl(event.arcTxHash)}
            target="_blank"
            rel="noopener noreferrer"
            className="text-info hover:text-primary underline"
          >
            {proofDisplay}
          </a>
        ) : (
          <span className={event.provisional ? 'text-neutral-700' : 'text-success'}>{proofDisplay}</span>
        )}
      </td>
    </tr>
  );
}

function TaxonomyCell({ label, count, color }: { label: string; count: number; color: string }) {
  return (
    <div className="flex-1 px-3 py-2 text-center">
      <div className={`text-sm font-bold tabular-nums ${color}`}>{count}</div>
      <div className="text-[9px] font-mono text-neutral-600 uppercase tracking-wider mt-0.5">{label}</div>
    </div>
  );
}

function RunningTotal({ total, overBudget }: { total: number; overBudget: boolean }) {
  return (
    <div className={`text-sm font-bold font-mono tabular-nums ${overBudget ? 'text-error' : 'text-primary'}`}>
      ${total.toFixed(6)}
    </div>
  );
}
