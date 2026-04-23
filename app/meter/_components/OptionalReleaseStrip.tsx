'use client';

import { useState } from 'react';
import { useMeterStore } from '../_store/useMeterStore';
import { arcExplorerTxUrl } from '@/lib/chains/arc';

type EscrowStep = 'job_created' | 'escrow_funded' | 'work_submitted' | 'evaluator_decision' | 'released' | 'rejected';

const STEP_ORDER: EscrowStep[] = [
  'job_created',
  'escrow_funded',
  'work_submitted',
  'evaluator_decision',
  'released',
];

const STEP_LABELS: Record<EscrowStep, string> = {
  job_created: 'Job Created',
  escrow_funded: 'Escrow Funded',
  work_submitted: 'Work Submitted',
  evaluator_decision: 'Evaluator Decision',
  released: 'Released',
  rejected: 'Rejected',
};

export function OptionalReleaseStrip() {
  const { releaseState, releaseDrawerOpen, setReleaseDrawerOpen, approvalRecord, streamDone, frequencyStats, sessionId } =
    useMeterStore();

  const [demoStep, setDemoStep] = useState<EscrowStep | null>(null);
  const [demoRunning, setDemoRunning] = useState(false);

  const isEnabled = process.env.NEXT_PUBLIC_ERC8183_ENABLED === 'true';
  const canRelease = approvalRecord?.recommendation === 'approve_for_manual_review' && streamDone;

  // Advance the ERC-8183 demo simulation one step at a time
  async function advanceDemoStep() {
    setDemoRunning(true);
    const current = demoStep;
    const next: EscrowStep | null =
      current === null ? 'job_created' :
      current === 'job_created' ? 'escrow_funded' :
      current === 'escrow_funded' ? 'work_submitted' :
      current === 'work_submitted' ? 'evaluator_decision' :
      current === 'evaluator_decision' ? 'released' :
      null;

    await new Promise((r) => setTimeout(r, 600));
    if (next) setDemoStep(next);
    setDemoRunning(false);
  }

  const currentStepIndex = demoStep ? STEP_ORDER.indexOf(demoStep) : -1;

  return (
    <div className="border-2 border-neutral-700 bg-neutral-900">
      <button
        className="w-full px-4 py-3 border-b border-neutral-700 flex items-center justify-between hover:bg-neutral-800/50 transition-colors"
        onClick={() => setReleaseDrawerOpen(!releaseDrawerOpen)}
      >
        <div className="flex items-center gap-3">
          <span className="text-[10px] font-mono uppercase text-neutral-300 tracking-widest font-bold">
            Arc-Native Release Path
          </span>
          <span className="text-[9px] font-mono border border-info text-info px-2 py-0.5 uppercase tracking-wider">
            ERC-8183
          </span>
        </div>
        <div className="flex items-center gap-3">
          <ReleaseStatusBadge
            status={
              demoStep === 'released' ? 'completed' :
              demoStep === 'rejected' ? 'failed' :
              demoStep != null ? 'submitted' :
              isEnabled ? releaseState.status :
              'demo'
            }
          />
          <span className="text-neutral-500 text-xs">{releaseDrawerOpen ? '▲' : '▼'}</span>
        </div>
      </button>

      {releaseDrawerOpen && (
        <div className="px-4 py-4 flex flex-col gap-4">

          {/* ERC-8183 job lifecycle — always visible */}
          <div>
            <div className="text-[9px] font-mono text-neutral-500 uppercase tracking-widest mb-3">
              ERC-8183 Job Lifecycle · Agentic Job Flow Standard
            </div>
            <div className="flex items-start gap-0">
              {STEP_ORDER.map((step, i) => {
                const done = i <= currentStepIndex;
                const active = i === currentStepIndex;
                return (
                  <div key={step} className="flex items-center flex-1 min-w-0">
                    <div className="flex flex-col items-center gap-1 flex-shrink-0">
                      <div
                        className={`w-6 h-6 border-2 flex items-center justify-center text-[9px] font-bold transition-colors ${
                          done ? 'bg-primary border-primary text-neutral-900' :
                          active ? 'border-warning text-warning animate-pulse' :
                          'border-neutral-700 text-neutral-600'
                        }`}
                      >
                        {done ? '✓' : i + 1}
                      </div>
                      <div
                        className={`text-[8px] font-mono uppercase text-center leading-tight max-w-[60px] ${
                          done ? 'text-neutral-300' : 'text-neutral-600'
                        }`}
                      >
                        {STEP_LABELS[step]}
                      </div>
                    </div>
                    {i < STEP_ORDER.length - 1 && (
                      <div className={`flex-1 h-0.5 mt-[-14px] mx-1 ${done ? 'bg-primary' : 'bg-neutral-800'}`} />
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Job details */}
          <div className="grid grid-cols-2 gap-3 text-[10px] font-mono">
            <div className="border border-neutral-800 p-2">
              <div className="text-neutral-500 uppercase tracking-wider mb-1">Job Type</div>
              <div className="text-neutral-300 font-bold">Prior Auth Review</div>
            </div>
            <div className="border border-neutral-800 p-2">
              <div className="text-neutral-500 uppercase tracking-wider mb-1">Escrow Token</div>
              <div className="text-neutral-300 font-bold">USDC · Arc Testnet</div>
            </div>
            <div className="border border-neutral-800 p-2">
              <div className="text-neutral-500 uppercase tracking-wider mb-1">Client Wallet</div>
              <div className="text-neutral-300 font-bold">Circle DCW · session-scoped</div>
            </div>
            <div className="border border-neutral-800 p-2">
              <div className="text-neutral-500 uppercase tracking-wider mb-1">Evaluator Role</div>
              <div className="text-neutral-300 font-bold">Gemini Pro · policy engine</div>
            </div>
          </div>

          {/* Demo advance button */}
          {canRelease && (
            <div className="flex flex-col gap-2">
              {demoStep === null ? (
                <div className="text-[10px] font-mono text-neutral-400 border-l-2 border-info pl-2">
                  Review complete. Advance the ERC-8183 escrow flow to see on-chain job settlement.
                  {!isEnabled && (
                    <span className="block text-neutral-600 mt-0.5">
                      Set NEXT_PUBLIC_ERC8183_ENABLED=true to enable live on-chain settlement.
                    </span>
                  )}
                </div>
              ) : null}
              {demoStep !== 'released' && demoStep !== 'rejected' && (
                <button
                  className="btn btn-primary text-xs self-start"
                  onClick={advanceDemoStep}
                  disabled={demoRunning}
                >
                  {demoRunning ? 'Processing...' :
                    demoStep === null ? 'Create ERC-8183 Job →' :
                    demoStep === 'job_created' ? 'Fund Escrow →' :
                    demoStep === 'escrow_funded' ? 'Submit Deliverable →' :
                    demoStep === 'work_submitted' ? 'Evaluator Decision →' :
                    demoStep === 'evaluator_decision' ? 'Release Escrow →' :
                    'Done'
                  }
                </button>
              )}
              {demoStep === 'released' && (
                <div className="border-2 border-success p-3 flex flex-col gap-1">
                  <div className="text-xs font-bold text-success uppercase">✓ Escrow Released on Arc</div>
                  <div className="text-[10px] font-mono text-neutral-400">
                    Job completed · funds transferred to provider · outcome recorded
                  </div>
                </div>
              )}
            </div>
          )}

          {!canRelease && !streamDone && (
            <div className="text-[10px] font-mono text-neutral-600 uppercase tracking-wider">
              ERC-8183 flow activates after review completes
            </div>
          )}

          {/* Live tx hash if available */}
          {releaseState.txHash && (
            <div className="text-[10px] font-mono">
              <span className="text-neutral-400 uppercase">Release Tx: </span>
              <a
                href={arcExplorerTxUrl(releaseState.txHash)}
                target="_blank"
                rel="noopener noreferrer"
                className="text-info hover:text-primary underline"
              >
                {releaseState.txHash.slice(0, 20)}...
              </a>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function ReleaseStatusBadge({ status }: { status: string }) {
  const configs: Record<string, { label: string; cls: string }> = {
    demo: { label: 'Demo Ready', cls: 'text-neutral-500' },
    disabled: { label: 'Disabled', cls: 'text-neutral-600' },
    ready: { label: 'Ready', cls: 'text-info' },
    submitted: { label: 'In Progress', cls: 'text-warning' },
    completed: { label: 'Released', cls: 'text-success' },
    failed: { label: 'Failed', cls: 'text-error' },
  };
  const cfg = configs[status] ?? configs['demo']!;
  return <span className={`text-[10px] font-mono uppercase font-bold ${cfg.cls}`}>{cfg.label}</span>;
}
