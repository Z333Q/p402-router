'use client';

import { useState } from 'react';
import { useGovernance } from '../_store/useGovernance';

const FLAGS = [
  ['Dual eligible', 'synthetic'],
  ['Disability', 'synthetic'],
  ['Language access', 'synthetic'],
  ['Geographic access', 'synthetic'],
];

const REVIEW_ITEMS = [
  'Prior authorization policy impact review',
  'Annual UM equity analysis export placeholder',
];

export function HealthEquityPanel() {
  const { lineOfBusiness } = useGovernance();
  const isDsnp = lineOfBusiness === 'medicare_dsnp';
  const [open, setOpen] = useState(isDsnp);

  return (
    <section className="border-2 border-neutral-700 p-6 flex flex-col gap-3">
      <button
        onClick={() => setOpen(!open)}
        className="flex items-baseline justify-between w-full text-left"
        aria-expanded={open}
      >
        <h2 className="text-lg font-bold text-neutral-50 uppercase tracking-tight">
          UM Equity Review Support
        </h2>
        <span className="text-[10px] font-mono uppercase tracking-widest text-neutral-500">
          {isDsnp ? 'Primary in D-SNP mode' : 'Optional'} · {open ? '▼' : '▶'}
        </span>
      </button>

      {open && (
        <>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
            {FLAGS.map(([k, v]) => (
              <div key={k} className="border border-neutral-700 p-2">
                <div className="text-[9px] font-mono uppercase tracking-widest text-neutral-500 mb-1">
                  {k}
                </div>
                <div className="text-xs text-neutral-200">{v}</div>
              </div>
            ))}
          </div>
          <ul className="flex flex-col gap-1 mt-2">
            {REVIEW_ITEMS.map((i) => (
              <li key={i} className="text-xs text-neutral-300 leading-snug">
                · {i}
              </li>
            ))}
          </ul>
          <p className="text-xs text-neutral-400 leading-relaxed">
            This panel supports review of utilization management impact patterns. It does not make
            a clinical decision or replace plan committee review.
          </p>
        </>
      )}
    </section>
  );
}
