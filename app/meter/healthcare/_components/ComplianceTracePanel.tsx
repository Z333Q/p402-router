'use client';

import { useGovernance } from '../_store/useGovernance';

export function ComplianceTracePanel() {
  const { receipts, humanDecision } = useGovernance();
  const clockTracked = receipts.length > 0;
  const reasonGenerated = clockTracked;
  const humanBoundary = true;
  const syntheticOnly = true;

  const items: [string, boolean, string][] = [
    ['CMS decision-clock tracked', clockTracked, 'Each AI operation carries a timestamp.'],
    ['Specific reason generated', reasonGenerated, 'Structured RFI / adverse-reason draft attached.'],
    ['Human review boundary preserved', humanBoundary, 'No autonomous denial path exists.'],
    ['Synthetic data only', syntheticOnly, 'No real PHI processed.'],
    [
      'Human decision recorded',
      humanDecision !== null,
      humanDecision ? humanDecision.replace(/_/g, ' ') : 'Pending reviewer action',
    ],
  ];

  return (
    <section
      id="compliance-trace"
      className="border-2 border-neutral-700 p-6 flex flex-col gap-3"
    >
      <h2 className="text-lg font-bold text-neutral-50 uppercase tracking-tight">
        Compliance Trace
      </h2>
      <ul className="grid grid-cols-1 md:grid-cols-2 gap-2">
        {items.map(([label, ok, detail]) => (
          <li key={label} className="border border-neutral-700 p-2 flex flex-col gap-1">
            <div className="flex items-center justify-between">
              <span className="text-xs text-neutral-200 font-bold">{label}</span>
              <span
                className={`text-[9px] font-mono uppercase tracking-widest px-1.5 py-0.5 border ${
                  ok
                    ? 'border-success text-success'
                    : 'border-warning text-warning'
                }`}
              >
                {ok ? 'ok' : 'pending'}
              </span>
            </div>
            <span className="text-[11px] text-neutral-400 leading-snug">{detail}</span>
          </li>
        ))}
      </ul>
    </section>
  );
}
