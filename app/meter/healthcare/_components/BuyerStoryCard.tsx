'use client';

import { useMeterStore } from '../_store/useMeterStore';

export function BuyerStoryCard() {
  const { sessionState } = useMeterStore();
  const isIdle = sessionState === 'idle';

  return (
    <div className="border-2 border-neutral-700 grid grid-cols-1 lg:grid-cols-3">

      {/* Persona */}
      <div className="border-b-2 lg:border-b-0 lg:border-r-2 border-neutral-700 px-6 py-5 flex flex-col gap-3">
        <div className="text-[9px] font-mono text-neutral-500 uppercase tracking-widest">You are</div>
        <div>
          <div className="text-base font-bold uppercase tracking-tight text-neutral-50">VP of Utilization Management</div>
          <div className="text-sm font-mono text-neutral-400 mt-0.5">Regional health plan · 2.1M members</div>
        </div>
        <div className="flex flex-col gap-1 text-[11px] font-mono text-neutral-400 leading-relaxed">
          <span>Your team processes <span className="text-neutral-200 font-bold">50,000 prior authorizations</span> per year.</span>
          <span>Each one requires a UM nurse or physician reviewer — 15–45 minutes of clinical documentation work.</span>
          <span>URAC accreditation requires every decision to be auditable. Your current system is a spreadsheet and a fax machine.</span>
        </div>
      </div>

      {/* Current cost */}
      <div className="border-b-2 lg:border-b-0 lg:border-r-2 border-neutral-700 px-6 py-5 flex flex-col gap-3">
        <div className="text-[9px] font-mono text-neutral-500 uppercase tracking-widest">What you pay today</div>
        <div className="flex flex-col gap-2">
          {[
            { label: 'Manual UM nurse review', cost: '$25–45', note: 'per case, 15–30 min' },
            { label: 'Physician advisor review', cost: '$80–150', note: 'per complex case' },
            { label: 'Vendor software (Utilization Management)', cost: '$18–32', note: 'per seat/month' },
            { label: 'Audit documentation', cost: '$8–15', note: 'per case for URAC prep' },
          ].map(({ label, cost, note }) => (
            <div key={label} className="flex items-start justify-between gap-4">
              <div>
                <div className="text-[10px] font-mono text-neutral-300">{label}</div>
                <div className="text-[9px] font-mono text-neutral-600">{note}</div>
              </div>
              <span className="text-[11px] font-bold text-neutral-400 tabular-nums shrink-0">{cost}</span>
            </div>
          ))}
        </div>
        <div className="border-t border-neutral-700 pt-2 flex items-center justify-between">
          <span className="text-[10px] font-mono text-neutral-500 uppercase">Annual AI processing spend</span>
          <span className="text-sm font-bold text-neutral-300">$0</span>
        </div>
      </div>

      {/* The question */}
      <div className="px-6 py-5 flex flex-col gap-3">
        <div className="text-[9px] font-mono text-neutral-500 uppercase tracking-widest">What you&apos;re about to see</div>
        <div className="flex flex-col gap-2 text-[11px] font-mono text-neutral-400 leading-relaxed">
          <p>Gemini Flash reads and classifies your prior auth packet. Gemini Pro audits the economics. Every AI token is a billed event on Tempo mainnet.</p>
          <p>No batch processing. No monthly invoice. No opaque vendor markup.</p>
          <p><span className="text-neutral-200 font-bold">One case. One payment. One proof — on-chain and auditable in 10 seconds.</span></p>
        </div>
        <div className="flex flex-col gap-1.5 mt-auto pt-3">
          <div className="flex items-center justify-between">
            <span className="text-[9px] font-mono text-neutral-600 uppercase">Cost per case — today</span>
            <span className="text-sm font-bold text-neutral-500">$25–100</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-[9px] font-mono text-primary uppercase">Cost per case — P402</span>
            <span className="text-sm font-bold text-primary">$0.00035</span>
          </div>
          <div className="w-full h-px bg-neutral-700 my-1" />
          <div className="flex items-center justify-between">
            <span className="text-[9px] font-mono text-neutral-500 uppercase">That&apos;s</span>
            <span className="text-xs font-bold text-primary">71,000–286,000× cheaper</span>
          </div>
        </div>
        {isIdle && (
          <a href="#demo" className="btn btn-primary text-xs mt-2 text-center px-4 py-2">
            See it happen in real time →
          </a>
        )}
      </div>

    </div>
  );
}
