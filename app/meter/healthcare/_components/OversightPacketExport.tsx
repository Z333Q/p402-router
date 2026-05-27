'use client';

import { useMemo, useState } from 'react';
import { useGovernance } from '../_store/useGovernance';
import { buildOversightPacket } from '@/lib/meter/healthcare/governance';
import { SYNTHETIC_CRITERIA_MAPPING, SYNTHETIC_DRAFT_RFI_REASON } from '@/lib/meter/healthcare/mock-data';

export function OversightPacketExport() {
  const { case: caseRecord, profile, receipts, hierarchy, humanDecision } = useGovernance();
  const [copied, setCopied] = useState(false);

  const packet = useMemo(
    () =>
      buildOversightPacket({
        case: caseRecord,
        profile,
        receipts,
        hierarchy,
        criteria: SYNTHETIC_CRITERIA_MAPPING,
        draftReason: SYNTHETIC_DRAFT_RFI_REASON,
        humanDecision,
        aiReviewStartedAt: receipts[0]?.timestamp ?? new Date().toISOString(),
        evidenceHash: `ev_SYN_PACKET_${caseRecord.caseId.slice(-4)}`,
        exportedAt: new Date().toISOString(),
      }),
    [caseRecord, profile, receipts, hierarchy, humanDecision],
  );

  const json = JSON.stringify(packet, null, 2);
  const ready = humanDecision !== null && receipts.length > 0;

  async function copy() {
    try {
      await navigator.clipboard.writeText(json);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // ignore
    }
  }

  return (
    <section className="border-2 border-neutral-700 p-6 flex flex-col gap-3">
      <div className="flex items-baseline justify-between">
        <h2 className="text-lg font-bold text-neutral-50 uppercase tracking-tight">
          Oversight Packet
        </h2>
        <div className="flex items-center gap-2">
          <span
            className={`text-[10px] font-mono uppercase tracking-widest border px-2 py-0.5 ${
              ready
                ? 'border-success text-success'
                : 'border-neutral-600 text-neutral-500'
            }`}
          >
            {ready ? 'ready' : 'pending human review'}
          </span>
          <button
            onClick={copy}
            disabled={!ready}
            className="btn btn-secondary text-xs disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {copied ? 'Copied ✓' : 'Copy JSON'}
          </button>
        </div>
      </div>

      <p className="text-xs text-neutral-400 leading-relaxed">
        Export contains synthetic case identifiers, operation receipts, budget hierarchy state,
        documentation completeness, criteria mapping, draft reason, and a compliance trace. It
        does not contain real PHI.
      </p>

      <pre className="bg-neutral-900 border border-neutral-700 p-3 text-[10px] font-mono text-neutral-300 overflow-auto max-h-[420px]">
        {json}
      </pre>
    </section>
  );
}
