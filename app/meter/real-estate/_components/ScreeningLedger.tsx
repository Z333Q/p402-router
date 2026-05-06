'use client';

import { useRealEstateStore } from '../_store/useRealEstateStore';
import { SCENARIOS } from '../_demo/applicants/scenarios';

const STEP_LABEL: Record<string, string> = {
  extraction:  'Extract',
  consistency: 'Consistency',
  fraud:       'Fraud',
  escalation:  'Escalation',
};

export function ScreeningLedger() {
  const { ledgerEntries, totalCostUsd, activeScenarioId, screeningState } = useRealEstateStore();
  const scenario = SCENARIOS.find((s) => s.id === activeScenarioId);

  const settledEntries = ledgerEntries.filter((e) => !e.provisional);
  const provisionalEntries = ledgerEntries.filter((e) => e.provisional);
  const settledCount = settledEntries.filter((e) => e.txHash).length;

  const flashCost = settledEntries.filter((e) => e.model === 'flash').reduce((a, e) => a + e.costUsd, 0);
  const proCost   = settledEntries.filter((e) => e.model === 'pro').reduce((a, e) => a + e.costUsd, 0);

  return (
    <div className="border-2 border-neutral-700 flex flex-col">
      <div className="border-b-2 border-neutral-700 px-4 py-3">
        <div className="text-[9px] font-mono text-neutral-500 uppercase tracking-widest mb-0.5">Screening Ledger</div>
        <div className="text-xs font-bold uppercase">
          {scenario ? scenario.name : 'Per-Applicant Cost Meter'}
        </div>
      </div>

      {/* KPI row */}
      <div className="grid grid-cols-3 divide-x-2 divide-neutral-700 border-b-2 border-neutral-700">
        <div className="px-4 py-3">
          <div className="text-lg font-bold tabular-nums text-primary">${totalCostUsd.toFixed(7)}</div>
          <div className="text-[9px] font-mono text-neutral-500 uppercase">AI cost</div>
        </div>
        <div className="px-4 py-3">
          <div className="text-lg font-bold tabular-nums text-neutral-300">{ledgerEntries.length}</div>
          <div className="text-[9px] font-mono text-neutral-500 uppercase">Events</div>
        </div>
        <div className="px-4 py-3">
          <div className="text-lg font-bold tabular-nums text-neutral-300">{settledCount}</div>
          <div className="text-[9px] font-mono text-neutral-500 uppercase">Settled on Tempo</div>
        </div>
      </div>

      {/* Model breakdown */}
      {(flashCost > 0 || proCost > 0) && (
        <div className="grid grid-cols-2 divide-x divide-neutral-800 border-b border-neutral-800">
          <div className="px-4 py-2">
            <div className="text-[8px] font-mono text-neutral-500 uppercase mb-0.5">Gemini Flash (extraction)</div>
            <div className="text-sm font-bold text-neutral-300 tabular-nums">${flashCost.toFixed(7)}</div>
          </div>
          <div className="px-4 py-2">
            <div className="text-[8px] font-mono text-neutral-500 uppercase mb-0.5">Gemini Pro (consistency)</div>
            <div className="text-sm font-bold text-warning tabular-nums">${proCost.toFixed(7)}</div>
          </div>
        </div>
      )}

      {/* Event log */}
      <div className="overflow-y-auto max-h-48">
        {ledgerEntries.length === 0 ? (
          <div className="px-4 py-6 text-center text-[10px] font-mono text-neutral-700">
            Ledger events appear here during screening.
          </div>
        ) : (
          <div className="divide-y divide-neutral-900">
            {[...ledgerEntries].reverse().slice(0, 30).map((e) => (
              <div key={e.id} className="px-4 py-1.5 flex items-center justify-between gap-2">
                <div className="flex items-center gap-2 min-w-0">
                  <span className={`text-[8px] font-mono px-1 py-0.5 border uppercase shrink-0 ${
                    e.provisional ? 'border-neutral-700 text-neutral-600' : 'border-success text-success'
                  }`}>
                    {e.provisional ? 'est' : 'settled'}
                  </span>
                  <span className={`text-[8px] font-mono shrink-0 ${e.model === 'pro' ? 'text-warning' : 'text-neutral-500'}`}>
                    {e.model === 'pro' ? 'Pro' : 'Flash'}
                  </span>
                  <span className="text-[9px] font-mono text-neutral-500 truncate">{e.docLabel}</span>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  {e.txHash && (
                    <a
                      href={`https://explore.tempo.xyz/tx/${e.txHash}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-[8px] font-mono text-info hover:underline"
                    >
                      {e.txHash.slice(0, 8)}…
                    </a>
                  )}
                  <span className="text-[9px] font-mono text-neutral-400 tabular-nums">${e.costUsd.toFixed(7)}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Baseline comparison */}
      <div className="border-t-2 border-neutral-700 px-4 py-3">
        <div className="text-[9px] font-mono text-neutral-600 uppercase tracking-wider mb-2">vs industry baseline</div>
        <div className="grid grid-cols-3 gap-2 text-center">
          <div>
            <div className="text-xs font-bold text-primary">${totalCostUsd > 0 ? totalCostUsd.toFixed(5) : '~$0.00002'}</div>
            <div className="text-[8px] font-mono text-neutral-600 uppercase">This screening</div>
          </div>
          <div>
            <div className="text-xs font-bold text-neutral-500">$30–50</div>
            <div className="text-[8px] font-mono text-neutral-600 uppercase">TransUnion SmartMove</div>
          </div>
          <div>
            <div className="text-xs font-bold text-neutral-500">$50–80</div>
            <div className="text-[8px] font-mono text-neutral-600 uppercase">Manual review</div>
          </div>
        </div>
      </div>
    </div>
  );
}
