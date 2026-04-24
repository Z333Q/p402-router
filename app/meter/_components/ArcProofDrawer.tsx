'use client';

import { useMeterStore } from '../_store/useMeterStore';
import { arcExplorerTxUrl, arcExplorerAddressUrl, ARC_SIGNER_ADDRESS } from '@/lib/chains/arc';

const ARC_CHAIN_ID = 5042002;
const ARC_NETWORK = 'Arc Testnet';
const USDC_ASSET = 'USDC (native gas)';

export function ArcProofDrawer() {
  const { ledgerEvents, sessionId, proofDrawerOpen, setProofDrawerOpen, streamDone, frequencyStats, workOrder, arcSettleError } =
    useMeterStore();

  const txEvents = ledgerEvents.filter((e) => e.arcTxHash);
  const batchEvents = ledgerEvents.filter(
    (e) => e.eventKind === 'reconciliation' || e.eventKind === 'escrow_release' || e.arcBatchId != null,
  );
  const { totalCostUsd, authorizations } = frequencyStats;

  const thresholdMet = authorizations >= 50;

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
            <span className={`text-[10px] font-mono font-bold uppercase ${thresholdMet ? 'text-success' : 'text-warning'}`}>
              {thresholdMet ? '✓ Requirements Met' : '⚠ In Progress'}
            </span>
          )}
          <span className="text-neutral-400 text-xs">{proofDrawerOpen ? '▲' : '▼'}</span>
        </div>
      </button>

      {/* Always-visible summary grid */}
      <div className="px-4 py-3 grid grid-cols-4 gap-4 border-b border-neutral-700">
        <ProofStat label="Session" value={sessionId ? sessionId.slice(0, 10) + '…' : '—'} />
        <ProofStat label="Total Cost" value={streamDone ? `$${totalCostUsd.toFixed(6)}` : '—'} highlight />
        <ProofStat label="AI Events" value={authorizations > 0 ? `${authorizations}` : '—'} pass={thresholdMet || undefined} />
        <ProofStat label="Arc Tx" value={txEvents.length > 0 ? txEvents.length.toString() : batchEvents.length > 0 ? batchEvents.length.toString() : '—'} />
      </div>

      {/* Wallet verify link, always visible, no expansion needed */}
      <a
        href={arcExplorerAddressUrl(ARC_SIGNER_ADDRESS)}
        target="_blank"
        rel="noopener noreferrer"
        className="px-4 py-2 border-b border-neutral-700 flex items-center justify-between hover:bg-neutral-800 transition-colors group"
      >
        <div className="flex items-center gap-2">
          <span className="text-[9px] font-mono text-neutral-500 uppercase tracking-wider">Verify on ArcScan →</span>
          <span className="text-[10px] font-mono text-info group-hover:text-primary truncate max-w-[200px]">{ARC_SIGNER_ADDRESS}</span>
        </div>
        <span className="text-[9px] font-mono text-primary font-bold uppercase tracking-wider flex-shrink-0">↗ Open</span>
      </a>

      {/* Expandable proof detail */}
      {proofDrawerOpen && (
        <div className="p-4 flex flex-col gap-4">

          {/* Chain identifiers */}
          <div className="grid grid-cols-2 gap-3 text-[10px] font-mono">
            <ProofField label="Network" value={ARC_NETWORK} />
            <ProofField label="Chain ID" value={ARC_CHAIN_ID.toString()} />
            <ProofField label="Settlement Asset" value={USDC_ASSET} />
            <ProofField label="Session ID" value={sessionId ?? '—'} mono />
          </div>

          {/* Hackathon threshold proof */}
          <div className={`border-2 p-3 flex items-center justify-between ${thresholdMet ? 'border-success' : 'border-neutral-700'}`}>
            <div>
              <div className="text-[10px] font-mono text-neutral-400 uppercase tracking-wider mb-0.5">
                Hackathon Threshold: 50+ Onchain Events
              </div>
              <div className="text-[10px] font-mono text-neutral-500">
                {authorizations} AI billing events at ≤ $0.01 each
              </div>
            </div>
            <div className={`text-sm font-bold font-mono uppercase ${thresholdMet ? 'text-success' : 'text-neutral-600'}`}>
              {thresholdMet ? `${authorizations} ✓ PASS` : authorizations > 0 ? `${authorizations} / 50` : '—'}
            </div>
          </div>

          {/* Settlement batches */}
          {batchEvents.length > 0 && (
            <div>
              <div className="text-[10px] font-mono text-neutral-400 uppercase tracking-wider mb-2">
                Settlement Batches ({batchEvents.length})
              </div>
              {batchEvents.map((e) => (
                <div key={e.id} className="flex items-center justify-between border-b border-neutral-800 py-1.5">
                  <span className="text-[10px] font-mono text-neutral-500 uppercase">{e.eventKind}</span>
                  <span className="text-[10px] font-mono text-neutral-300 tabular-nums">${e.costUsd.toFixed(6)}</span>
                </div>
              ))}
            </div>
          )}

          {/* Funded wallet, always visible, verifiable before/after any run */}
          <div>
            <div className="text-[10px] font-mono text-neutral-400 uppercase tracking-wider mb-2">
              Settlement Wallet
            </div>
            <a
              href={arcExplorerAddressUrl(ARC_SIGNER_ADDRESS)}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-between border-2 border-primary px-3 py-2 hover:bg-neutral-800 transition-colors group"
            >
              <div className="flex flex-col gap-0.5">
                <span className="text-[9px] font-mono text-neutral-400 uppercase tracking-wider">Funded Arc Testnet USDC wallet</span>
                <span className="text-[10px] font-mono text-info group-hover:text-primary break-all">{ARC_SIGNER_ADDRESS}</span>
              </div>
              <span className="text-primary flex-shrink-0 ml-3 font-bold text-xs">↗ ArcScan</span>
            </a>
          </div>

          {/* Arc settle error — shown if settlement was attempted but failed */}
          {arcSettleError && (
            <div className="border border-error bg-neutral-900 px-3 py-2 flex flex-col gap-1">
              <div className="text-[9px] font-mono text-error uppercase tracking-wider">Arc Settle Error</div>
              <div className="text-[10px] font-mono text-neutral-300 leading-relaxed break-all">{arcSettleError}</div>
              <a
                href="/api/meter/arc-health"
                target="_blank"
                rel="noopener noreferrer"
                className="text-[9px] font-mono text-info hover:text-primary uppercase tracking-wider"
              >
                Run diagnostic → /api/meter/arc-health
              </a>
            </div>
          )}

          {/* Per-tx links, only present in live mode when Arc settles */}
          {txEvents.length > 0 ? (
            <div>
              <div className="text-[10px] font-mono text-neutral-400 uppercase tracking-wider mb-2">
                Settlement Transactions ({txEvents.length})
              </div>
              <div className="flex flex-col gap-1 max-h-[160px] overflow-y-auto">
                {txEvents.slice(0, 10).map((e) => (
                  <a
                    key={e.id}
                    href={arcExplorerTxUrl(e.arcTxHash!)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center justify-between text-[10px] font-mono hover:bg-neutral-800 px-2 py-1 transition-colors group"
                  >
                    <span className="text-info group-hover:text-primary truncate">{e.arcTxHash}</span>
                    <span className="text-neutral-400 flex-shrink-0 ml-2 uppercase">↗</span>
                  </a>
                ))}
                {txEvents.length > 10 && (
                  <div className="text-[10px] font-mono text-neutral-600 px-2 py-1">
                    +{txEvents.length - 10} more
                  </div>
                )}
              </div>
            </div>
          ) : streamDone ? (
            <div className="text-[10px] font-mono text-neutral-500 border border-neutral-700 px-3 py-2 leading-relaxed">
              Live mode produces per-tx hashes here. Demo mode uses the wallet above for on-chain verification.
            </div>
          ) : null}

          {/* Work order reference */}
          {workOrder && (
            <div className="border-t border-neutral-700 pt-3 grid grid-cols-2 gap-3 text-[10px] font-mono">
              <ProofField label="Work Order" value={workOrder.id.slice(0, 16) + '…'} mono />
              <ProofField label="Gemini Model" value={workOrder.geminiModel ?? 'gemini-3.1-flash'} />
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function ProofStat({
  label,
  value,
  highlight,
  pass,
}: {
  label: string;
  value: string;
  highlight?: boolean;
  pass?: boolean;
}) {
  const color =
    pass === true ? 'text-success' :
    highlight ? 'text-primary' :
    'text-neutral-50';

  return (
    <div>
      <div className="text-[9px] font-mono text-neutral-400 uppercase tracking-wider mb-1">{label}</div>
      <div className={`text-xs font-bold font-mono uppercase ${color}`}>{value}</div>
    </div>
  );
}

function ProofField({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="border border-neutral-800 p-2">
      <div className="text-[9px] text-neutral-500 uppercase tracking-wider mb-0.5">{label}</div>
      <div className={`text-[10px] ${mono ? 'text-neutral-400 break-all' : 'text-neutral-200 font-bold'}`}>{value}</div>
    </div>
  );
}
