'use client';

import { useGovernance } from '../_store/useGovernance';

export function SyntheticPriorAuthPacket() {
  const { case: caseRecord } = useGovernance();
  const missing = Object.entries(caseRecord.documentation).filter(
    ([, s]) => s === 'missing' || s === 'partial',
  );

  return (
    <section className="border-2 border-neutral-700 p-6 flex flex-col gap-3">
      <div className="flex items-baseline justify-between">
        <h2 className="text-lg font-bold text-neutral-50 uppercase tracking-tight">
          Synthetic Prior Authorization Packet
        </h2>
        <span className="text-[10px] font-mono uppercase tracking-widest text-warning border border-warning px-2 py-0.5">
          Synthetic · No PHI
        </span>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
        {[
          ['Case ID', caseRecord.caseId],
          ['Member ID', caseRecord.memberId],
          ['Date received', caseRecord.receivedAt.slice(0, 10)],
          ['Request type', caseRecord.requestType],
          ['Urgency', caseRecord.urgency === 'expedited' ? 'Expedited' : 'Standard'],
          ['Requested service', caseRecord.requestedService],
          ['Provider', caseRecord.syntheticProviderName],
        ].map(([k, v]) => (
          <div key={k} className="border border-neutral-700 p-2">
            <div className="text-[9px] font-mono uppercase tracking-widest text-neutral-500 mb-1">
              {k}
            </div>
            <div className="text-xs text-neutral-200 leading-snug">{v}</div>
          </div>
        ))}
      </div>

      <div className="border border-neutral-700 p-3">
        <div className="text-[9px] font-mono uppercase tracking-widest text-neutral-500 mb-1">
          Provider note (synthetic)
        </div>
        <p className="text-xs text-neutral-300 leading-relaxed font-mono">
          {caseRecord.packetSummary}
        </p>
      </div>

      {missing.length > 0 && (
        <div className="border border-warning p-3">
          <div className="text-[9px] font-mono uppercase tracking-widest text-warning mb-1">
            Missing documentation flags
          </div>
          <ul className="flex flex-wrap gap-1.5">
            {missing.map(([k, s]) => (
              <li
                key={k}
                className="text-[10px] font-mono text-warning border border-warning px-2 py-0.5"
              >
                {k}: {s}
              </li>
            ))}
          </ul>
        </div>
      )}
    </section>
  );
}
