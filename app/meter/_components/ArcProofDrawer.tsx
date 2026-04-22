'use client';

import { useMeterStore } from '../_store/useMeterStore';
import { arcExplorerTxUrl } from '@/lib/chains/arc';

export function ArcProofDrawer() {
  const { ledgerEvents, sessionId, proofDrawerOpen, setProofDrawerOpen, streamDone, frequencyStats } =
    useMeterStore();

  const txEvents = ledgerEvents.filter((e) => e.arcTxHash);
  const batchCount = ledgerEvents.filter((e) => e.arcBatchId != null || e.eventKind === 'reconciliation' || e.eventKind === 'escrow_release').length;
  const { totalCostUsd } = frequencyStats;

  return (
    <div className="card p-0 flex flex-col">
      {/* Header */}
      <button
        className="section-header px-4 py-3 flex items-center justify-between w-full text-left hover:bg-neutral-800 transition-colors"
        onClick={() => setProofDrawerOpen(!proofDrawerOpen)}
      >
        <div className="flex items-center gap-2">
          <span className="badge badge-primary text-[10px]">05</span>
          <span className="text-sm font-bold tracking-wider uppercase">Arc Proof</span>
        </div>
        <div className="flex items-center gap-3">
          {streamDone && (
            <span className="text-[10px] font-mono text-success uppercase font-bold">✓ Verified</span>
          )}
          <span className="text-neutral-400 text-xs">{proofDrawerOpen ? '▲' : '▼'}</span>
        </div>
      </button>

      {/* Compact summary (always visible) */}
      <div className="px-4 py-3 grid grid-cols-3 gap-4 border-b border-neutral-700">
        <ProofStat label="Session" value={sessionId ? sessionId.slice(0, 12) + '...' : '—'} />
        <ProofStat label="Final Cost" value={streamDone ? `$${totalCostUsd.toFixed(6)}` : '—'} highlight />
        <ProofStat label="Proof Status" value={streamDone ? 'READY' : 'PENDING'} />
      </div>

      {/* Expandable detail */}
      {proofDrawerOpen && (
        <div className="p-4 flex flex-col gap-3">
          <div className="grid grid-cols-2 gap-3 text-[10px] font-mono">
            <div>
              <div className="text-neutral-400 uppercase tracking-wider mb-1">Authorizations</div>
              <div className="text-neutral-50 font-bold">{ledgerEvents.filter((e) => e.eventKind === 'extraction_estimate' || e.eventKind === 'review_estimate' || e.eventKind === 'followup_estimate' || e.eventKind === 'specialist_review_estimate').length}</div>
            </div>
            <div>
              <div className="text-neutral-400 uppercase tracking-wider mb-1">Arc Batches</div>
              <div className="text-neutral-50 font-bold">{batchCount}</div>
            </div>
          </div>

          {txEvents.length > 0 ? (
            <div className="flex flex-col gap-1">
              <div className="text-[10px] font-mono text-neutral-400 uppercase tracking-wider mb-1">Explorer Links</div>
              {txEvents.slice(0, 5).map((e) => (
                <a
                  key={e.id}
                  href={arcExplorerTxUrl(e.arcTxHash!)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-[10px] font-mono text-info hover:text-primary underline truncate"
                >
                  {e.arcTxHash}
                </a>
              ))}
            </div>
          ) : (
            <div className="text-[10px] font-mono text-neutral-600 uppercase">
              {streamDone ? 'Arc settlement in progress' : 'No Arc transactions yet'}
            </div>
          )}

          <div className="border-t border-neutral-700 pt-3">
            <div className="text-[10px] font-mono text-neutral-400 uppercase tracking-wider mb-1">Network</div>
            <div className="text-[10px] font-mono text-neutral-50">Arc Testnet · Chain ID 5042002 · USDC Gas</div>
          </div>
        </div>
      )}
    </div>
  );
}

function ProofStat({ label, value, highlight }: { label: string; value: string; highlight?: boolean }) {
  return (
    <div>
      <div className="text-[10px] font-mono text-neutral-400 uppercase tracking-wider mb-1">{label}</div>
      <div className={`text-xs font-bold font-mono uppercase ${highlight ? 'text-primary' : 'text-neutral-50'}`}>
        {value}
      </div>
    </div>
  );
}
