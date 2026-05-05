'use client';

import { useMeterStore } from '../_store/useMeterStore';
import { tempoExplorerTxUrl, tempoExplorerAddressUrl } from '@/lib/meter/tempo-settler';
import { TEMPO_CHAIN_ID } from '@/lib/constants/tempo';

const TEMPO_SIGNER_ADDRESS = process.env.NEXT_PUBLIC_TEMPO_SIGNER_ADDRESS ?? '';

export function TempoSettlementProof() {
  const { ledgerEvents, streamDone, frequencyStats, sessionId } = useMeterStore();

  if (!streamDone) return null;

  // Find the reconciliation event — the one with a real Tempo tx hash
  const reconcile = ledgerEvents.find(
    (e) => e.eventKind === 'reconciliation' && e.settlementTxHash,
  );
  const { totalCostUsd, authorizations } = frequencyStats;

  return (
    <div className="border-2 border-primary flex flex-col">
      {/* Header */}
      <div className="px-5 py-3 border-b-2 border-primary flex items-center justify-between">
        <div className="flex items-center gap-3">
          <span className="text-[10px] font-mono text-primary uppercase tracking-widest">Settlement Proof</span>
          <span className="text-[10px] font-mono text-neutral-500 uppercase">
            {reconcile ? `Tempo Mainnet · Chain ${TEMPO_CHAIN_ID}` : 'Proof Replay Session'}
          </span>
        </div>
        <div className="text-[10px] font-mono text-neutral-500 uppercase tracking-wider">
          {authorizations} events · ${totalCostUsd.toFixed(6)}
        </div>
      </div>

      {reconcile ? (
        /* ── Live mode: real Tempo tx hash ───────────────────────────────── */
        <div className="flex flex-col gap-0">
          {/* Big verify button */}
          <a
            href={tempoExplorerTxUrl(reconcile.settlementTxHash!)}
            target="_blank"
            rel="noopener noreferrer"
            className="group flex items-center justify-between px-5 py-5 hover:bg-neutral-800 transition-colors"
          >
            <div className="flex flex-col gap-1.5">
              <div className="text-[10px] font-mono text-neutral-500 uppercase tracking-widest">Transaction Hash</div>
              <div className="text-sm font-mono text-info group-hover:text-primary break-all leading-snug">
                {reconcile.settlementTxHash}
              </div>
            </div>
            <div className="flex-shrink-0 ml-6">
              <div className="border-2 border-primary text-primary text-xs font-bold uppercase px-4 py-2 group-hover:bg-primary group-hover:text-neutral-900 transition-colors">
                Verify on Tempo →
              </div>
            </div>
          </a>

          {/* Proof fields */}
          <div className="border-t border-neutral-700 grid grid-cols-2 lg:grid-cols-4 divide-x divide-neutral-700">
            <ProofCell label="Block" value={reconcile.settlementBlock ? `#${reconcile.settlementBlock.toLocaleString()}` : '—'} />
            <ProofCell label="Amount" value={`$${reconcile.costUsd.toFixed(6)}`} highlight />
            <ProofCell label="Chain" value={`Tempo (${TEMPO_CHAIN_ID})`} />
            <ProofCell label="Status" value="Confirmed" success />
          </div>

          {/* Session row */}
          <div className="border-t border-neutral-700 px-5 py-2 flex items-center justify-between">
            <span className="text-[10px] font-mono text-neutral-500 uppercase tracking-wider">Session</span>
            <span className="text-[10px] font-mono text-neutral-400">{sessionId ? sessionId.slice(0, 20) + '…' : '—'}</span>
          </div>

          {/* Wallet link */}
          {TEMPO_SIGNER_ADDRESS && (
            <div className="border-t border-neutral-700 px-5 py-3 flex items-center justify-between">
              <span className="text-[10px] font-mono text-neutral-500 uppercase tracking-wider">
                Signer wallet — all session transactions
              </span>
              <a
                href={tempoExplorerAddressUrl(TEMPO_SIGNER_ADDRESS)}
                target="_blank"
                rel="noopener noreferrer"
                className="text-[10px] font-mono text-neutral-400 hover:text-primary uppercase tracking-wider transition-colors"
              >
                {TEMPO_SIGNER_ADDRESS.slice(0, 10)}…{TEMPO_SIGNER_ADDRESS.slice(-8)} ↗
              </a>
            </div>
          )}
        </div>
      ) : (
        /* ── Proof Replay mode: session ref ──────────────────────────────── */
        <div className="flex flex-col gap-0">
          <div className="px-5 py-5 flex items-center justify-between">
            <div className="flex flex-col gap-1.5">
              <div className="text-[10px] font-mono text-neutral-500 uppercase tracking-widest">Session Reference</div>
              <div className="text-sm font-mono text-neutral-300">
                {sessionId ?? 'replay_session'}
              </div>
              <div className="text-[10px] font-mono text-neutral-600 leading-relaxed max-w-md">
                Proof Replay mode uses pre-recorded stream data. Switch to Live Mode
                (requires GOOGLE_API_KEY + TEMPO_TREASURY_PRIVATE_KEY) to generate a real Tempo tx hash.
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function ProofCell({ label, value, highlight, success }: {
  label: string; value: string; highlight?: boolean; success?: boolean;
}) {
  const valueColor = success ? 'text-success' : highlight ? 'text-primary' : 'text-neutral-200';
  return (
    <div className="px-4 py-3 flex flex-col gap-0.5">
      <div className="text-[9px] font-mono text-neutral-600 uppercase tracking-wider">{label}</div>
      <div className={`text-xs font-bold font-mono tabular-nums ${valueColor}`}>{value}</div>
    </div>
  );
}
