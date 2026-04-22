'use client';

import { useMeterStore } from '../_store/useMeterStore';
import { arcExplorerTxUrl } from '@/lib/chains/arc';

export function OptionalReleaseStrip() {
  const { releaseState, releaseDrawerOpen, setReleaseDrawerOpen, approvalRecord } = useMeterStore();

  const isEnabled = process.env.NEXT_PUBLIC_ERC8183_ENABLED === 'true';
  const canRelease =
    approvalRecord?.recommendation === 'approve_for_manual_review' && isEnabled;

  return (
    <div className="border-2 border-neutral-800 bg-neutral-900">
      <button
        className="w-full px-4 py-2 border-b border-neutral-800 flex items-center justify-between hover:bg-neutral-800/50 transition-colors"
        onClick={() => setReleaseDrawerOpen(!releaseDrawerOpen)}
      >
        <span className="text-[10px] font-mono uppercase text-neutral-500 tracking-widest">
          Arc-Native Release Path (ERC-8183)
        </span>
        <div className="flex items-center gap-2">
          <ReleaseStatusBadge status={releaseState.status} />
          <span className="text-neutral-600 text-xs">{releaseDrawerOpen ? '▲' : '▼'}</span>
        </div>
      </button>

      {releaseDrawerOpen && (
        <div className="px-4 py-3 flex flex-col gap-3">
          {!isEnabled ? (
            <div className="text-[10px] font-mono text-neutral-600 uppercase tracking-wider">
              ERC-8183 release path disabled in this environment.
              Set NEXT_PUBLIC_ERC8183_ENABLED=true to enable the Arc-native release flow.
              Same workflow — approval triggers on-chain job settlement via ERC-8183.
            </div>
          ) : (
            <>
              <ReleaseTimeline status={releaseState.status} />
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
              {canRelease && releaseState.status === 'ready' && (
                <button className="btn btn-primary text-xs self-start">
                  Approve &amp; Release →
                </button>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}

function ReleaseStatusBadge({ status }: { status: string }) {
  const configs: Record<string, { label: string; cls: string }> = {
    disabled: { label: 'Disabled', cls: 'text-neutral-600' },
    ready: { label: 'Ready', cls: 'text-info' },
    submitted: { label: 'Submitted', cls: 'text-warning' },
    completed: { label: 'Released', cls: 'text-success' },
    failed: { label: 'Failed', cls: 'text-error' },
  };
  const cfg = configs[status] ?? configs['disabled']!;
  return <span className={`text-[10px] font-mono uppercase font-bold ${cfg.cls}`}>{cfg.label}</span>;
}

function ReleaseTimeline({ status }: { status: string }) {
  const steps = [
    { key: 'ready', label: 'Awaiting Approval' },
    { key: 'submitted', label: 'Approval Submitted' },
    { key: 'completed', label: 'Released on Arc' },
  ];

  const stepOrder = ['ready', 'submitted', 'completed'];
  const currentIndex = stepOrder.indexOf(status);

  return (
    <div className="flex items-center gap-1">
      {steps.map((step, i) => (
        <div key={step.key} className="flex items-center gap-1">
          <div
            className={`w-2 h-2 border ${
              i <= currentIndex ? 'bg-primary border-primary' : 'bg-transparent border-neutral-600'
            }`}
          />
          <span
            className={`text-[9px] font-mono uppercase tracking-wider ${
              i <= currentIndex ? 'text-neutral-300' : 'text-neutral-600'
            }`}
          >
            {step.label}
          </span>
          {i < steps.length - 1 && <span className="text-neutral-700 mx-1">→</span>}
        </div>
      ))}
    </div>
  );
}
