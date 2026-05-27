'use client';

import { SYNTHETIC_CRITERIA_MAPPING } from '@/lib/meter/healthcare/mock-data';
import type { CriteriaStatus } from '@/lib/meter/healthcare/types';

const STATUS_COLOR: Record<CriteriaStatus, string> = {
  met: 'border-success text-success',
  not_enough_information: 'border-warning text-warning',
  conflicting_information: 'border-error text-error',
  reviewer_required: 'border-info text-info',
};

export function CriteriaMappingPanel() {
  return (
    <section className="border-2 border-neutral-700 p-6 flex flex-col gap-3">
      <div className="flex items-baseline justify-between">
        <h2 className="text-lg font-bold text-neutral-50 uppercase tracking-tight">
          Clinical Criteria Mapping
        </h2>
        <span className="text-[10px] font-mono uppercase tracking-widest text-warning border border-warning px-2 py-0.5">
          Synthetic
        </span>
      </div>
      <p className="text-[11px] text-neutral-500 leading-snug">
        Synthetic category labels for demo purposes. Production deployment must use the payer's
        licensed medical policy.
      </p>

      <div className="flex flex-col gap-2">
        {SYNTHETIC_CRITERIA_MAPPING.map((c) => (
          <div key={c.category} className="border border-neutral-700 p-3 flex flex-col gap-1">
            <div className="flex items-center justify-between gap-2">
              <span className="text-sm font-bold text-neutral-50">{c.category}</span>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-mono text-neutral-400">
                  conf {Math.round(c.confidence * 100)}%
                </span>
                <span
                  className={`text-[9px] font-mono uppercase tracking-widest border px-1.5 py-0.5 ${STATUS_COLOR[c.status]}`}
                >
                  {c.status.replace(/_/g, ' ')}
                </span>
              </div>
            </div>
            <p className="text-xs text-neutral-300 leading-snug">{c.extractedEvidence}</p>
            <p className="text-[11px] text-neutral-500 leading-snug italic">
              Reviewer note: {c.reviewerNote}
            </p>
          </div>
        ))}
      </div>
    </section>
  );
}
