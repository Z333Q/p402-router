'use client';

import { useState } from 'react';
import { useMeterStore } from '../_store/useMeterStore';
import { arcExplorerTxUrl } from '@/lib/chains/arc';
import type { SpecialistJob } from '@/lib/meter/types';

export function SpecialistEscrowCard() {
  const { workOrder, sessionId, appendLedgerEvent } = useMeterStore();
  const [job, setJob] = useState<SpecialistJob | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const needsSpecialist = workOrder?.healthcareExtract?.requiresSpecialistReview === true;
  if (!workOrder || !needsSpecialist || !sessionId) return null;

  async function handleEscrow() {
    if (!sessionId || !workOrder) return;
    setLoading(true);
    setError(null);

    try {
      const res = await fetch('/api/meter/escrow', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionId,
          workOrderId: workOrder.id,
          reason: `Case type ${workOrder.healthcareExtract?.caseType ?? 'specialist_consult'} requires specialist review`,
          escrowAmountUsd: 0.012,
        }),
      });

      const data = await res.json() as {
        jobId?: string;
        deliverableHash?: string;
        arcTxHash?: string;
        arcExplorerUrl?: string;
        escrowAmountUsd?: number;
        escrowAmountUsdcE6?: number;
        status?: string;
        reviewOutput?: { recommendation: string; rationale: string };
        createdAt?: string;
        completedAt?: string;
        error?: string;
      };

      if (!res.ok) throw new Error(data.error ?? 'escrow failed');

      const newJob: SpecialistJob = {
        jobId: data.jobId ?? `job_demo`,
        sessionId,
        workOrderId: workOrder.id,
        reason: `Specialist review required`,
        escrowAmountUsd: data.escrowAmountUsd ?? 0.012,
        escrowAmountUsdcE6: data.escrowAmountUsdcE6 ?? 12000,
        deliverableHash: data.deliverableHash,
        arcTxHash: data.arcTxHash,
        arcExplorerUrl: data.arcTxHash ? arcExplorerTxUrl(data.arcTxHash) : undefined,
        status: 'complete',
        createdAt: data.createdAt ?? new Date().toISOString(),
        completedAt: data.completedAt,
      };
      setJob(newJob);

      // Record escrow_release ledger event in store
      appendLedgerEvent({
        id: crypto.randomUUID(),
        sessionId,
        workOrderId: workOrder.id,
        eventKind: 'escrow_release',
        costUsd: data.escrowAmountUsd ?? 0.012,
        costUsdcE6: data.escrowAmountUsdcE6 ?? 12000,
        provisional: false,
        proofRef: data.deliverableHash,
        arcTxHash: data.arcTxHash,
        createdAt: new Date().toISOString(),
      });
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'escrow failed');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="card p-0">
      <div className="section-header px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="badge badge-primary text-[10px]">↗</span>
          <span className="text-sm font-bold tracking-wider uppercase">Specialist Escalation</span>
        </div>
        <div className="border border-warning px-2 py-0.5 text-[10px] font-mono text-warning uppercase">
          ERC-8183 Escrow
        </div>
      </div>

      <div className="p-4 flex flex-col gap-3">
        <div className="text-[10px] font-mono text-neutral-400 border-l-2 border-warning pl-2">
          Gemini determined this case requires specialist agent review.
          The work will be delegated under escrow — payment releases on deliverable submission.
        </div>

        {error && (
          <div className="text-[10px] font-mono text-error border border-error px-3 py-2">{error}</div>
        )}

        {!job ? (
          <div className="flex flex-col gap-2">
            <div className="flex items-center justify-between text-[10px] font-mono">
              <span className="text-neutral-400 uppercase">Case Type</span>
              <span className="text-neutral-50 font-bold uppercase">
                {workOrder.healthcareExtract?.caseType?.replace('_', ' ') ?? 'specialist consult'}
              </span>
            </div>
            <div className="flex items-center justify-between text-[10px] font-mono">
              <span className="text-neutral-400 uppercase">Escrow Amount</span>
              <span className="text-neutral-50 font-bold">$0.012 USDC</span>
            </div>
            <div className="flex items-center justify-between text-[10px] font-mono">
              <span className="text-neutral-400 uppercase">Contract</span>
              <span className="text-neutral-400 font-mono text-[9px]">ERC-8183 Arc Testnet</span>
            </div>
            <button
              className="btn btn-primary text-xs mt-1"
              onClick={handleEscrow}
              disabled={loading}
            >
              {loading ? 'Creating Job...' : 'Delegate to Specialist Agent →'}
            </button>
          </div>
        ) : (
          <div className="flex flex-col gap-2">
            {/* Job timeline */}
            <EscrowStep label="Job Created" done />
            <EscrowStep label="Escrow Funded" done />
            <EscrowStep label="Specialist Reviewing" done />
            <EscrowStep label="Deliverable Submitted" done highlight />
            <EscrowStep label="Escrow Released" done />

            {/* Deliverable hash */}
            {job.deliverableHash && (
              <div className="border border-neutral-700 p-2 mt-1">
                <div className="text-[9px] font-mono text-neutral-500 uppercase tracking-wider mb-1">Deliverable Hash</div>
                <div className="text-[9px] font-mono text-neutral-300 break-all">{job.deliverableHash}</div>
              </div>
            )}

            {/* Arc explorer link */}
            {job.arcExplorerUrl ? (
              <a
                href={job.arcExplorerUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-[10px] font-mono text-info underline"
              >
                View on Arc Block Explorer →
              </a>
            ) : (
              <div className="text-[10px] font-mono text-neutral-600">
                Arc tx pending — configure ARC_PRIVATE_KEY for live settlement
              </div>
            )}

            <div className="text-[10px] font-mono text-success font-bold uppercase border border-success px-3 py-1.5 mt-1">
              Specialist Review Complete · Escrow Released
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function EscrowStep({ label, done, highlight }: { label: string; done?: boolean; highlight?: boolean }) {
  return (
    <div className="flex items-center gap-2 text-[11px] font-mono">
      <span className={done ? (highlight ? 'text-primary' : 'text-success') : 'text-neutral-600'}>
        {done ? '✓' : '○'}
      </span>
      <span className={highlight ? 'text-primary font-bold' : done ? 'text-neutral-300' : 'text-neutral-600'}>
        {label}
      </span>
    </div>
  );
}
