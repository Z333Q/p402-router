'use client';

import { useLegalStore } from '../_store/useLegalStore';
import { CONTRACTS, TOTAL_ESTIMATED_COST_USD } from '../_demo/contracts/matter-acme-beta';

export function MatterLedger() {
  const { ledgerEntries, budgetSpentUsd, budgetCapUsd, docReviews } = useLegalStore();

  const doneCount = Object.values(docReviews).filter((r) => r?.state === 'done' || r?.state === 'escalated').length;
  const proCount = CONTRACTS.filter((c) => c.tier === 'pro').length;
  const flashCount = CONTRACTS.filter((c) => c.tier === 'flash').length;
  const settledCount = ledgerEntries.filter((e) => !e.provisional && e.txHash).length;
  const spentPct = budgetCapUsd > 0 ? Math.min((budgetSpentUsd / budgetCapUsd) * 100, 100) : 0;

  const proSpent = ledgerEntries
    .filter((e) => e.tier === 'pro' && !e.provisional)
    .reduce((acc, e) => acc + e.costUsd, 0);
  const flashSpent = ledgerEntries
    .filter((e) => e.tier === 'flash' && !e.provisional)
    .reduce((acc, e) => acc + e.costUsd, 0);

  return (
    <div className="border-2 border-neutral-700 flex flex-col">
      <div className="border-b-2 border-neutral-700 px-4 py-3">
        <div className="text-[9px] font-mono text-neutral-500 uppercase tracking-widest mb-0.5">Matter Ledger</div>
        <div className="text-xs font-bold uppercase">Acme / Beta Acquisition · AI Cost Meter</div>
      </div>

      {/* KPI row */}
      <div className="grid grid-cols-3 divide-x-2 divide-neutral-700 border-b-2 border-neutral-700">
        <div className="px-4 py-3">
          <div className="text-lg font-bold tabular-nums text-primary">${budgetSpentUsd.toFixed(6)}</div>
          <div className="text-[9px] font-mono text-neutral-500 uppercase">Matter cost</div>
        </div>
        <div className="px-4 py-3">
          <div className="text-lg font-bold tabular-nums text-neutral-300">{doneCount}/{CONTRACTS.length}</div>
          <div className="text-[9px] font-mono text-neutral-500 uppercase">Docs reviewed</div>
        </div>
        <div className="px-4 py-3">
          <div className="text-lg font-bold tabular-nums text-neutral-300">{settledCount}</div>
          <div className="text-[9px] font-mono text-neutral-500 uppercase">Tempo settlements</div>
        </div>
      </div>

      {/* Budget bar */}
      <div className="px-4 py-3 border-b border-neutral-800">
        <div className="flex items-center justify-between mb-1.5">
          <span className="text-[9px] font-mono text-neutral-500 uppercase">Budget</span>
          <span className="text-[9px] font-mono text-neutral-400">${budgetSpentUsd.toFixed(6)} / ${budgetCapUsd.toFixed(2)}</span>
        </div>
        <div className="w-full h-1.5 bg-neutral-800">
          <div
            className="h-full bg-primary transition-all duration-300"
            style={{ width: `${spentPct}%` }}
          />
        </div>
        <div className="flex items-center justify-between mt-1">
          <span className="text-[8px] font-mono text-neutral-700">{spentPct.toFixed(1)}% of budget</span>
          <span className="text-[8px] font-mono text-neutral-700">vs ${TOTAL_ESTIMATED_COST_USD.toFixed(6)} estimated</span>
        </div>
      </div>

      {/* Tier breakdown */}
      <div className="grid grid-cols-2 divide-x divide-neutral-800 border-b border-neutral-800">
        <div className="px-4 py-2">
          <div className="flex items-center justify-between">
            <span className="text-[9px] font-mono text-warning uppercase">Gemini Pro</span>
            <span className="text-[9px] font-mono text-neutral-400">{proCount} docs</span>
          </div>
          <div className="text-sm font-bold tabular-nums text-warning mt-0.5">${proSpent.toFixed(6)}</div>
        </div>
        <div className="px-4 py-2">
          <div className="flex items-center justify-between">
            <span className="text-[9px] font-mono text-neutral-400 uppercase">Gemini Flash</span>
            <span className="text-[9px] font-mono text-neutral-400">{flashCount} docs</span>
          </div>
          <div className="text-sm font-bold tabular-nums text-neutral-300 mt-0.5">${flashSpent.toFixed(6)}</div>
        </div>
      </div>

      {/* Event log */}
      <div className="flex-1 overflow-y-auto max-h-64">
        {ledgerEntries.length === 0 ? (
          <div className="px-4 py-6 text-center text-[10px] font-mono text-neutral-700">
            Events will appear here as documents are reviewed.
          </div>
        ) : (
          <div className="divide-y divide-neutral-900">
            {[...ledgerEntries].reverse().slice(0, 40).map((entry) => (
              <div key={entry.id} className="px-4 py-1.5 flex items-center justify-between gap-3">
                <div className="flex items-center gap-2 min-w-0">
                  <span className={`text-[8px] font-mono px-1 py-0.5 border uppercase shrink-0 ${
                    entry.provisional ? 'border-neutral-700 text-neutral-600' : 'border-success text-success'
                  }`}>
                    {entry.provisional ? 'est' : 'settled'}
                  </span>
                  <span className={`text-[8px] font-mono shrink-0 ${entry.tier === 'pro' ? 'text-warning' : 'text-neutral-500'}`}>
                    {entry.tier === 'pro' ? 'Pro' : 'Flash'}
                  </span>
                  <span className="text-[9px] font-mono text-neutral-500 truncate">{entry.docType}</span>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  {entry.txHash && (
                    <a
                      href={`https://explore.tempo.xyz/tx/${entry.txHash}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-[8px] font-mono text-info hover:underline"
                    >
                      {entry.txHash.slice(0, 8)}…
                    </a>
                  )}
                  <span className="text-[9px] font-mono text-neutral-400 tabular-nums">
                    ${entry.costUsd.toFixed(7)}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Baseline comparison */}
      <div className="border-t-2 border-neutral-700 px-4 py-3">
        <div className="text-[9px] font-mono text-neutral-600 uppercase tracking-wider mb-2">Cost comparison</div>
        <div className="grid grid-cols-3 gap-2 text-center">
          <div>
            <div className="text-xs font-bold text-primary">${budgetSpentUsd.toFixed(4) || '—'}</div>
            <div className="text-[8px] font-mono text-neutral-600 uppercase">This matter</div>
          </div>
          <div>
            <div className="text-xs font-bold text-neutral-500">$200–800</div>
            <div className="text-[8px] font-mono text-neutral-600 uppercase">Paralegal</div>
          </div>
          <div>
            <div className="text-xs font-bold text-neutral-500">$2,000–8,000</div>
            <div className="text-[8px] font-mono text-neutral-600 uppercase">Associate review</div>
          </div>
        </div>
      </div>
    </div>
  );
}
