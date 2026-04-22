'use client';

import { useState, useEffect } from 'react';
import { useMeterStore } from '../_store/useMeterStore';
import type { EconomicAudit } from '@/lib/meter/types';

export function EconomicAuditPanel() {
  const { sessionState, sessionId, frequencyStats, ledgerEvents } = useMeterStore();
  const [audit, setAudit] = useState<EconomicAudit | null>(null);
  const [loading, setLoading] = useState(false);

  const isDone = sessionState === 'review_complete' || sessionState === 'approved' || sessionState === 'held';

  useEffect(() => {
    if (!isDone || !sessionId || audit || loading) return;

    async function fetchAudit() {
      setLoading(true);
      try {
        // Compute breakdown from ledger events
        const aiTokenCostUsd = ledgerEvents
          .filter((e) => e.eventKind === 'extraction_estimate' || e.eventKind === 'review_estimate' || e.eventKind === 'followup_estimate')
          .reduce((sum, e) => sum + e.costUsd, 0);

        const routingFeeUsd = ledgerEvents
          .filter((e) => e.eventKind === 'routing_fee')
          .reduce((sum, e) => sum + e.costUsd, 0);

        const escrowCostUsd = ledgerEvents
          .filter((e) => e.eventKind === 'escrow_release')
          .reduce((sum, e) => sum + e.costUsd, 0);

        const res = await fetch('/api/meter/audit', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            sessionId,
            totalCostUsd: frequencyStats.totalCostUsd,
            arcTxCount: frequencyStats.authorizations,
            aiTokenCostUsd,
            routingFeeUsd,
            escrowCostUsd,
          }),
        });
        if (res.ok) {
          const data = await res.json() as { audit?: EconomicAudit };
          if (data.audit) setAudit(data.audit);
        }
      } catch { /* non-fatal */ }
      finally { setLoading(false); }
    }

    void fetchAudit();
  }, [isDone, sessionId, audit, loading, frequencyStats, ledgerEvents]);

  if (!isDone && !loading) return null;

  return (
    <div className="card p-0">
      <div className="section-header px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="badge badge-primary text-[10px]">Pro</span>
          <span className="text-sm font-bold tracking-wider uppercase">Economic Audit</span>
        </div>
        <div className="text-[10px] font-mono text-neutral-400 uppercase">Gemini Pro · Post-Run</div>
      </div>

      <div className="p-4 flex flex-col gap-3">
        {loading && !audit && (
          <div className="flex items-center gap-2 text-[10px] font-mono text-neutral-400 animate-pulse uppercase">
            Gemini Pro analyzing session economics...
          </div>
        )}

        {audit && (
          <>
            {/* Cost breakdown grid */}
            <div className="grid grid-cols-2 gap-2">
              <CostCell label="AI Tokens" value={`$${audit.costBreakdown.aiTokenCostUsd.toFixed(6)}`} />
              <CostCell label="P402 Routing" value={`$${audit.costBreakdown.routingFeeUsd.toFixed(6)}`} />
              <CostCell label="Arc Gas" value={`$${audit.costBreakdown.arcGasCostUsd.toFixed(4)}`} />
              <CostCell label="Escrow" value={audit.costBreakdown.escrowCostUsd > 0 ? `$${audit.costBreakdown.escrowCostUsd.toFixed(4)}` : '—'} />
            </div>

            {/* Grand total */}
            <div className="border-2 border-primary px-3 py-2 flex items-center justify-between">
              <span className="text-[10px] font-mono uppercase text-neutral-400">Grand Total</span>
              <span className="text-sm font-bold font-mono text-primary">${audit.totalCostUsd.toFixed(6)} USD</span>
            </div>

            {/* Comparison row */}
            <div className="flex flex-col gap-1 border border-neutral-700 p-3">
              <div className="text-[10px] font-mono text-neutral-500 uppercase tracking-wider mb-1">
                Why Traditional Rails Fail
              </div>
              <CompRow label="ETH Mainnet (30 gwei)" value={`~$${audit.comparisonEthMainnetUsd.toFixed(2)}`} bad />
              <CompRow label="Stripe minimum fee" value={`~$${audit.comparisonStripeUsd.toFixed(2)}`} bad />
              <CompRow label="Arc (this session)" value={`$${audit.totalCostUsd.toFixed(6)}`} good />
              <div className="mt-1 text-[10px] font-mono text-primary font-bold">
                {audit.savingVsEthMainnetPct}% saving vs ETH mainnet
              </div>
            </div>

            {/* Gemini Pro narrative */}
            <div className="border-l-4 border-primary pl-3">
              <div className="text-[10px] font-mono text-neutral-500 uppercase tracking-wider mb-1">
                Gemini Pro Analysis
              </div>
              <p className="text-[11px] font-mono text-neutral-300 leading-relaxed">
                {audit.recommendation}
              </p>
            </div>

            <div className="text-[9px] font-mono text-neutral-600 text-right">
              {audit.model} · {audit.arcTxCount} onchain events · avg ${audit.avgCostPerActionUsd.toFixed(6)}/action
            </div>
          </>
        )}
      </div>
    </div>
  );
}

function CostCell({ label, value }: { label: string; value: string }) {
  return (
    <div className="border border-neutral-700 p-2">
      <div className="text-[9px] font-mono text-neutral-500 uppercase tracking-wider">{label}</div>
      <div className="text-xs font-mono font-bold text-neutral-50">{value}</div>
    </div>
  );
}

function CompRow({ label, value, bad, good }: { label: string; value: string; bad?: boolean; good?: boolean }) {
  return (
    <div className="flex items-center justify-between text-[10px] font-mono">
      <span className="text-neutral-400">{label}</span>
      <span className={good ? 'text-primary font-bold' : bad ? 'text-error' : 'text-neutral-50'}>{value}</span>
    </div>
  );
}
