'use client';

import { useMeterStore } from '../_store/useMeterStore';

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
  const hasTx       = ledgerEvents.some((e) => e.arcTxHash != null);
  const isDone      = sessionState === 'review_complete' || sessionState === 'approved' || sessionState === 'held' || sessionState === 'released';

  const steps: InfraStep[] = [
    {
      product: 'Circle DCW',
      role: 'Session Wallet',
      detail: 'Developer-Controlled Wallet provisioned on ARC-TESTNET per session. No user custody required.',
      live: hasSession,
    },
    {
      product: 'Nanopayments',
      role: 'Sub-Cent Settlement',
      detail: 'Circle Nanopayments API authorizes each USDC micro-event. One authorization per AI billing chunk.',
      live: hasPayments,
    },
    {
      product: 'Circle Gateway',
      role: 'x402 Verification',
      detail: 'Gateway domain 26 on Arc testnet. Verifies x402 payment headers at gateway-api-testnet.circle.com.',
      live: hasTx,
    },
    {
      product: 'Arc Testnet',
      role: 'Chain Settlement',
      detail: 'USDC as native gas. Chain ID 5042002. USDC predeploy 0x36000…. Settlement at $0.006/tx.',
      live: isDone,
    },
  ];

  return (
    <div className="border-2 border-info bg-neutral-900">
      <div className="px-4 py-2 border-b border-neutral-800 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <span className="text-[10px] font-mono font-bold text-info uppercase tracking-widest">
            Circle + Arc Infrastructure
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
