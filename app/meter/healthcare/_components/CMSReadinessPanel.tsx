'use client';

import { useGovernance } from '../_store/useGovernance';

export function CMSReadinessPanel() {
  const { case: caseRecord, profile } = useGovernance();
  const expedited = caseRecord.urgency === 'expedited';
  const clockHours = expedited
    ? profile.expeditedDecisionClockHours
    : profile.standardDecisionClockHours;
  const clockLabel = clockHours === 72 ? '72 hours' : 'seven calendar days';

  const rows: [string, string][] = [
    ['Expedited clock', '72 hours'],
    ['Standard clock', 'seven calendar days'],
    ['Active clock for this case', clockLabel],
    ['Specific denial or RFI reason', 'Required (CMS-0057-F, beginning 2026)'],
    ['Status trace', 'Timestamped per operation'],
    ['API path', 'FHIR Prior Authorization API readiness (mock)'],
    ['Public metrics path', 'Annual PA metrics export (mock)'],
    ['Request channels', 'API · portal · fax · phone · mail · email'],
  ];

  return (
    <section className="border-2 border-neutral-700 p-6 flex flex-col gap-3">
      <h2 className="text-lg font-bold text-neutral-50 uppercase tracking-tight">
        CMS Prior Authorization Readiness
      </h2>
      <p className="text-xs text-neutral-400 leading-relaxed max-w-3xl">
        This demo models workflow readiness for CMS prior authorization timing, reason specificity,
        status traceability, and future FHIR prior authorization API integration. It does not
        submit a real prior authorization request.
      </p>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
        {rows.map(([k, v]) => (
          <div key={k} className="border border-neutral-700 p-2">
            <div className="text-[9px] font-mono uppercase tracking-widest text-neutral-500 mb-1">
              {k}
            </div>
            <div className="text-xs text-neutral-200 leading-snug">{v}</div>
          </div>
        ))}
      </div>
    </section>
  );
}
