'use client';

import { useGovernance } from '../_store/useGovernance';

export function StateProgramPolicyProfileCard() {
  const { profile, case: caseRecord } = useGovernance();
  const clockHours =
    caseRecord.urgency === 'expedited'
      ? profile.expeditedDecisionClockHours
      : profile.standardDecisionClockHours;
  const clockLabel = clockHours === 72 ? '72 hours' : 'seven calendar days';

  const rows: [string, string][] = [
    ['Program', profile.displayName],
    ['Line of business', labelLOB(profile.lineOfBusiness)],
    ['Request category', profile.requestCategory],
    ['Urgency', caseRecord.urgency === 'expedited' ? 'Expedited' : 'Standard'],
    ['Decision clock', clockLabel],
    ['Reviewer role', profile.reviewerRole],
    ['Escalation', profile.escalationRole],
    ['Output path', 'Approve for reviewer sign-off · Request more information · Escalate'],
    ['State policy source', profile.sourceLabel],
    ['State-specific legal review', 'Required before production'],
  ];

  return (
    <section className="border-2 border-neutral-700 p-6 flex flex-col gap-4">
      <div className="flex items-baseline justify-between">
        <h2 className="text-lg font-bold text-neutral-50 uppercase tracking-tight">
          State Program Policy Profile
        </h2>
        <span className="text-[10px] font-mono uppercase tracking-widest text-warning border border-warning px-2 py-0.5">
          Synthetic
        </span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
        {rows.map(([k, v]) => (
          <div key={k} className="border border-neutral-700 p-2 flex flex-col">
            <span className="text-[9px] font-mono uppercase tracking-widest text-neutral-500">
              {k}
            </span>
            <span className="text-xs text-neutral-200 leading-snug">{v}</span>
          </div>
        ))}
      </div>

      <div className="border border-neutral-700 p-3">
        <div className="text-[9px] font-mono uppercase tracking-widest text-neutral-500 mb-1">
          Required documents
        </div>
        <ul className="flex flex-wrap gap-2">
          {profile.requiredDocuments.map((d) => (
            <li
              key={d}
              className="text-[11px] font-mono text-neutral-300 border border-neutral-700 px-2 py-0.5"
            >
              {d}
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}

function labelLOB(lob: string): string {
  switch (lob) {
    case 'medicaid_mco':
      return 'Medicaid Managed Care';
    case 'medicare_dsnp':
      return 'Medicare D-SNP';
    case 'marketplace':
      return 'Marketplace';
    default:
      return lob;
  }
}
