'use client';

import { useMeterStore } from '../_store/useMeterStore';
import { tempoExplorerTxUrl, tempoExplorerAddressUrl } from '@/lib/meter/tempo-settler';
import { TEMPO_CHAIN_ID } from '@/lib/constants/tempo';

const TEMPO_SIGNER_ADDRESS = process.env.NEXT_PUBLIC_TEMPO_SIGNER_ADDRESS ?? '';

export function TempoSettlementProof() {
  const { ledgerEvents, streamDone, frequencyStats, sessionId, safeMode } = useMeterStore();

  if (!streamDone) return null;

  const reconcile = ledgerEvents.find(
    (e) => e.eventKind === 'reconciliation' && e.settlementTxHash,
  );
  const { totalCostUsd, authorizations } = frequencyStats;
  const isLive = !!reconcile;

  return (
    <div className={`border-2 flex flex-col ${isLive ? 'border-primary' : 'border-neutral-600'}`}>

      {/* ── Hero reveal ────────────────────────────────────────────────────── */}
      <div className={`px-6 py-8 flex flex-col gap-4 ${isLive ? 'bg-neutral-800' : 'bg-neutral-850'}`}>
        <div className="flex items-start justify-between gap-6 flex-wrap">
          <div className="flex flex-col gap-2">
            <div className="text-[10px] font-mono text-neutral-500 uppercase tracking-widest">
              {isLive ? `Tempo Mainnet · Chain ${TEMPO_CHAIN_ID}` : 'Proof Replay Session'}
            </div>
            <div className={`text-3xl lg:text-4xl font-bold uppercase tracking-tight leading-none ${isLive ? 'text-primary' : 'text-neutral-300'}`}>
              {isLive ? 'Settled on Tempo Mainnet' : 'Verified — Proof Replay'}
            </div>
            <div className="text-sm font-mono text-neutral-400 mt-1">
              {authorizations} AI actions · <span className={isLive ? 'text-primary font-bold' : 'text-neutral-300 font-bold'}>${totalCostUsd.toFixed(6)} total</span>
            </div>
          </div>
          <div className={`text-right flex flex-col gap-1 ${isLive ? '' : 'hidden'}`}>
            <div className="text-[9px] font-mono text-neutral-600 uppercase tracking-wider">Cost this case</div>
            <div className="text-4xl font-bold tabular-nums text-primary leading-none">${totalCostUsd.toFixed(5)}</div>
            <div className="text-[10px] font-mono text-neutral-500">vs $25–100 manual review</div>
          </div>
        </div>

        {/* Buyer language bullets */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-3 pt-2">
          {[
            isLive
              ? 'This case cost $' + totalCostUsd.toFixed(5) + '. Your auditor can verify it in 10 seconds.'
              : 'In live mode, a real Tempo transaction confirms every session. Auditors verify directly on-chain.',
            'Every AI action that processed this claim is on-chain and tamper-proof.',
            'Your compliance team has a defensible record. No spreadsheet. No manual log.',
          ].map((bullet, i) => (
            <div key={i} className="flex items-start gap-2">
              <span className={`text-xs font-bold mt-0.5 shrink-0 ${isLive ? 'text-primary' : 'text-neutral-500'}`}>→</span>
              <span className="text-[11px] font-mono text-neutral-300 leading-relaxed">{bullet}</span>
            </div>
          ))}
        </div>
      </div>

      {isLive ? (
        <>
          {/* ── Tx hash — large and front-center ──────────────────────────── */}
          <a
            href={tempoExplorerTxUrl(reconcile!.settlementTxHash!)}
            target="_blank"
            rel="noopener noreferrer"
            className="group border-t-2 border-primary px-6 py-5 flex items-center justify-between gap-4 hover:bg-neutral-800 transition-colors"
          >
            <div className="flex flex-col gap-1.5 min-w-0">
              <div className="text-[9px] font-mono text-neutral-500 uppercase tracking-widest">Transaction Hash</div>
              <div className="text-sm font-mono text-info group-hover:text-primary break-all leading-snug">
                {reconcile!.settlementTxHash}
              </div>
            </div>
            <div className="flex-shrink-0">
              <div className="border-2 border-primary text-primary text-xs font-bold uppercase px-5 py-2.5 group-hover:bg-primary group-hover:text-neutral-900 transition-colors whitespace-nowrap">
                Verify on Tempo →
              </div>
            </div>
          </a>

          {/* ── Technical proof details ────────────────────────────────────── */}
          <div className="border-t border-neutral-700 grid grid-cols-2 lg:grid-cols-4 divide-x divide-neutral-700">
            <ProofCell label="Block" value={reconcile!.settlementBlock ? `#${reconcile!.settlementBlock.toLocaleString()}` : '—'} />
            <ProofCell label="Reconciliation" value={`$${reconcile!.costUsd.toFixed(6)}`} highlight />
            <ProofCell label="Chain" value={`Tempo (${TEMPO_CHAIN_ID})`} />
            <ProofCell label="Status" value="Confirmed" success />
          </div>

          <div className="border-t border-neutral-700 px-5 py-2 flex items-center justify-between">
            <span className="text-[10px] font-mono text-neutral-600 uppercase tracking-wider">Session</span>
            <span className="text-[10px] font-mono text-neutral-500">{sessionId ? sessionId.slice(0, 24) + '…' : '—'}</span>
          </div>

          {TEMPO_SIGNER_ADDRESS && (
            <div className="border-t border-neutral-700 px-5 py-3 flex items-center justify-between">
              <span className="text-[10px] font-mono text-neutral-600 uppercase tracking-wider">
                Signer wallet — all session transactions
              </span>
              <a
                href={tempoExplorerAddressUrl(TEMPO_SIGNER_ADDRESS)}
                target="_blank"
                rel="noopener noreferrer"
                className="text-[10px] font-mono text-neutral-500 hover:text-primary uppercase tracking-wider transition-colors"
              >
                {TEMPO_SIGNER_ADDRESS.slice(0, 10)}…{TEMPO_SIGNER_ADDRESS.slice(-8)} ↗
              </a>
            </div>
          )}
        </>
      ) : (
        /* ── Proof Replay mode ─────────────────────────────────────────────── */
        <div className="border-t border-neutral-700 px-6 py-4 flex flex-col gap-3">
          <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
            <ProofCell label="Session" value={sessionId ? sessionId.slice(0, 16) + '…' : 'replay_session'} />
            <ProofCell label="Events" value={`${authorizations} settled`} highlight />
            <ProofCell label="Mode" value={safeMode ? 'Safe Mode' : 'Proof Replay'} />
          </div>
          <p className="text-[10px] font-mono text-neutral-600 leading-relaxed max-w-lg">
            Live mode (requires GOOGLE_API_KEY + TEMPO_TREASURY_PRIVATE_KEY) generates a real Tempo transaction hash verifiable at explore.tempo.xyz.
          </p>
        </div>
      )}
    </div>
  );
}

function ProofCell({ label, value, highlight, success }: {
  label: string; value: string; highlight?: boolean; success?: boolean;
}) {
  const valueColor = success ? 'text-success' : highlight ? 'text-primary' : 'text-neutral-300';
  return (
    <div className="px-4 py-3 flex flex-col gap-0.5">
      <div className="text-[9px] font-mono text-neutral-600 uppercase tracking-wider">{label}</div>
      <div className={`text-xs font-bold font-mono tabular-nums ${valueColor}`}>{value}</div>
    </div>
  );
}
