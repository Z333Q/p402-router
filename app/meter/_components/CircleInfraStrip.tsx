'use client';

import { useMeterStore } from '../_store/useMeterStore';
import { TEMPO_CHAIN_ID } from '@/lib/constants/tempo';

interface InfraStep {
  product: string;
  role: string;
  detail: string;
  live: boolean;
}

export function CircleInfraStrip() {
  const { sessionState, sessionId, ledgerEvents, frequencyStats } = useMeterStore();

  const hasSession  = sessionId != null;
  const hasPayments = frequencyStats.authorizations > 0;
  const hasTx       = ledgerEvents.some((e) => e.settlementTxHash != null);
  const isDone      = sessionState === 'review_complete' || sessionState === 'approved' || sessionState === 'held' || sessionState === 'released';

  const steps: InfraStep[] = [
    {
      product: 'P402 Router',
      role: 'Session Wallet',
      detail: 'Pre-funded TEMPO_TREASURY_PRIVATE_KEY wallet settles on behalf of the session. No user custody required.',
      live: hasSession,
    },
    {
      product: 'Gemini Flash',
      role: 'Sub-Cent AI Billing',
      detail: 'One ledger event per AI output chunk. 55+ provisional nanopayment events per session.',
      live: hasPayments,
    },
    {
      product: 'MPP / mppx',
      role: 'Payment Method Layer',
      detail: 'Machine Payment Protocol (tempo.xyz). Per-request payment gate via USDC.e TIP-20 transfer.',
      live: hasTx,
    },
    {
      product: 'Tempo Mainnet',
      role: 'Chain Settlement',
      detail: `USDC.e (TIP-20). Chain ID ${TEMPO_CHAIN_ID}. FeeAMM gas model. Sub-millidollar settlement fee.`,
      live: isDone,
    },
  ];

  return (
    <div className="border-2 border-info bg-neutral-900">
      <div className="px-4 py-2 border-b border-neutral-800 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <span className="text-[10px] font-mono font-bold text-info uppercase tracking-widest">
            Tempo + MPP Infrastructure
          </span>
          <span className="text-[9px] font-mono text-neutral-600 uppercase tracking-wider">
            load-bearing components
          </span>
        </div>
        <div className="flex items-center gap-1.5">
          {steps.map((s) => (
            <div
              key={s.product}
              className={`w-2 h-2 border ${s.live ? 'bg-success border-success' : 'bg-transparent border-neutral-700'}`}
              title={s.product}
            />
          ))}
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 divide-x divide-neutral-800">
        {steps.map((step) => (
          <div key={step.product} className="px-4 py-3 flex flex-col gap-1">
            <div className="flex items-center gap-2">
              <div className={`w-1.5 h-1.5 ${step.live ? 'bg-success' : 'bg-neutral-700'}`} />
              <span className={`text-[10px] font-mono font-bold uppercase tracking-wider ${step.live ? 'text-info' : 'text-neutral-500'}`}>
                {step.product}
              </span>
            </div>
            <div className="text-[10px] font-mono font-bold text-neutral-300 uppercase tracking-wider">
              {step.role}
            </div>
            <div className="text-[9px] font-mono text-neutral-600 leading-relaxed">
              {step.detail}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
