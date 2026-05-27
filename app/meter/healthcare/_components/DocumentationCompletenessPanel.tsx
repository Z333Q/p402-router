'use client';

import { useGovernance } from '../_store/useGovernance';
import { SYNTHETIC_DRAFT_RFI_REASON } from '@/lib/meter/healthcare/mock-data';
import type { DocumentationStatus } from '@/lib/meter/healthcare/types';

const STATUS_COLOR: Record<DocumentationStatus, string> = {
  complete: 'border-success text-success',
  partial: 'border-warning text-warning',
  missing: 'border-error text-error',
  not_applicable: 'border-neutral-600 text-neutral-500',
};

export function DocumentationCompletenessPanel() {
  const { case: caseRecord } = useGovernance();
  const docs = Object.entries(caseRecord.documentation);

  return (
    <section className="border-2 border-neutral-700 p-6 flex flex-col gap-3">
      <h2 className="text-lg font-bold text-neutral-50 uppercase tracking-tight">
        Documentation Completeness
      </h2>

      <ul className="grid grid-cols-1 md:grid-cols-2 gap-2">
        {docs.map(([doc, status]) => (
          <li
            key={doc}
            className="border border-neutral-700 p-2 flex items-center justify-between gap-2"
          >
            <span className="text-xs text-neutral-200">{doc}</span>
            <span
              className={`text-[9px] font-mono uppercase tracking-widest border px-1.5 py-0.5 ${STATUS_COLOR[status]}`}
            >
              {status}
            </span>
          </li>
        ))}
      </ul>

      <div className="border border-warning p-3 mt-1">
        <div className="text-[9px] font-mono uppercase tracking-widest text-warning mb-1">
          Suggested next action
        </div>
        <div className="text-sm font-bold text-neutral-50 mb-2">Request more information</div>
        <div className="text-[9px] font-mono uppercase tracking-widest text-neutral-500 mb-1">
          Draft RFI reason
        </div>
        <p className="text-xs text-neutral-300 leading-relaxed">{SYNTHETIC_DRAFT_RFI_REASON}</p>
      </div>
    </section>
  );
}
