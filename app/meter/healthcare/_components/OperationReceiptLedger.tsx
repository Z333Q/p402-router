'use client';

import { useState } from 'react';
import { useGovernance } from '../_store/useGovernance';
import type { HealthcareAIOperationReceipt } from '@/lib/meter/healthcare/types';

function ReceiptRow({ r }: { r: HealthcareAIOperationReceipt }) {
  const [open, setOpen] = useState(false);
  const statusColor =
    r.policyStatus === 'allowed'
      ? 'border-success text-success'
      : 'border-error text-error';

  return (
    <div className="border border-neutral-700">
      <button
        onClick={() => setOpen(!open)}
        className="w-full grid grid-cols-12 gap-2 p-2 text-left items-center hover:bg-neutral-800 transition-none"
        aria-expanded={open}
      >
        <span className="col-span-3 text-[11px] font-mono text-neutral-200 truncate">
          {r.agent.replace(/-agent$/, '')}
        </span>
        <span className="col-span-3 text-[11px] font-mono text-neutral-400 truncate">
          {r.receiptId}
        </span>
        <span className="col-span-2 text-[11px] font-mono text-neutral-200 text-right">
          ${r.costUsd.toFixed(4)}
        </span>
        <span
          className={`col-span-2 text-[9px] font-mono uppercase border px-1.5 py-0.5 text-center ${statusColor}`}
        >
          {r.policyStatus}
        </span>
        <span className="col-span-2 text-[10px] font-mono text-neutral-500 text-right">
          {open ? '▼' : '▶'} {r.evidenceHash}
        </span>
      </button>

      {open && (
        <pre className="bg-neutral-900 border-t border-neutral-700 p-3 text-[10px] font-mono text-neutral-300 overflow-x-auto">
          {JSON.stringify(r, null, 2)}
        </pre>
      )}
    </div>
  );
}

export function OperationReceiptLedger() {
  const { receipts } = useGovernance();
  const total = receipts.reduce((acc, r) => acc + r.costUsd, 0);

  return (
    <section className="border-2 border-neutral-700 p-6 flex flex-col gap-3">
      <div className="flex items-baseline justify-between">
        <h2 className="text-lg font-bold text-neutral-50 uppercase tracking-tight">
          Operation-Level Receipts
        </h2>
        <span className="text-[10px] font-mono text-neutral-400">
          {receipts.length} ops · ${total.toFixed(4)} total
        </span>
      </div>
      <p className="text-xs text-neutral-400 leading-relaxed">
        Each receipt records one metered AI action. The receipt is evidence, not the budget.
      </p>

      {receipts.length === 0 ? (
        <div className="border border-dashed border-neutral-700 p-6 text-center">
          <span className="text-xs font-mono text-neutral-500 uppercase tracking-widest">
            Awaiting AI operations · Run demo to populate receipts
          </span>
        </div>
      ) : (
        <div className="flex flex-col gap-1">
          <div className="grid grid-cols-12 gap-2 px-2 text-[9px] font-mono uppercase tracking-widest text-neutral-500">
            <span className="col-span-3">Agent</span>
            <span className="col-span-3">Receipt</span>
            <span className="col-span-2 text-right">Cost</span>
            <span className="col-span-2 text-center">Policy</span>
            <span className="col-span-2 text-right">Evidence</span>
          </div>
          {receipts.map((r) => (
            <ReceiptRow key={r.receiptId} r={r} />
          ))}
        </div>
      )}
    </section>
  );
}
