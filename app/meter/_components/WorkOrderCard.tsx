'use client';

import { useMeterStore } from '../_store/useMeterStore';

export function WorkOrderCard() {
  const { workOrder, workOrderDegraded, sessionState } = useMeterStore();
  const isExtracting = sessionState === 'work_order_extracting';
  const isEmpty = !workOrder && !isExtracting;

  if (isEmpty) {
    return (
      <div className="card p-0 flex flex-col opacity-40">
        <div className="section-header px-4 py-3 flex items-center gap-2">
          <span className="badge text-[10px]">02</span>
          <span className="text-sm font-bold tracking-wider uppercase">Gemini Extraction</span>
        </div>
        <div className="flex-1 flex items-center justify-center p-8 text-xs font-mono text-neutral-600 uppercase tracking-wider">
          Awaiting Document
        </div>
      </div>
    );
  }

  if (isExtracting && !workOrder) {
    return (
      <div className="card p-0 flex flex-col">
        <div className="section-header px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="badge badge-primary text-[10px]">02</span>
            <span className="text-sm font-bold tracking-wider uppercase">Gemini Extraction</span>
          </div>
          <span className="text-[10px] font-mono text-warning uppercase animate-pulse">Parsing document...</span>
        </div>
        <div className="p-4 flex flex-col gap-2">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div key={i} className="h-6 bg-neutral-800 animate-pulse border border-neutral-700" />
          ))}
        </div>
      </div>
    );
  }

  if (!workOrder) return null;

  const hx = workOrder.healthcareExtract;

  const urgencyColor =
    hx?.urgencyLevel === 'emergent' ? 'text-error' :
    hx?.urgencyLevel === 'urgent'   ? 'text-warning' :
    'text-success';

  const confPct = hx?.extractedConfidence != null
    ? Math.round(hx.extractedConfidence * 100)
    : null;

  return (
    <div className="card p-0 flex flex-col">
      {/* Header */}
      <div className="section-header px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="badge badge-primary text-[10px]">02</span>
          <span className="text-sm font-bold tracking-wider uppercase">Gemini Extraction</span>
        </div>
        <div className={`border px-2 py-0.5 text-[10px] font-bold uppercase ${workOrderDegraded ? 'border-warning text-warning' : 'border-success text-success'}`}>
          {workOrderDegraded ? 'Degraded' : `Extracted${confPct != null ? ` ${confPct}%` : ''}`}
        </div>
      </div>

      <div className="p-4 flex flex-col gap-0">
        {/* Healthcare extracted fields */}
        {hx && (
          <>
            <div className="text-[10px] font-mono text-neutral-500 uppercase tracking-widest mb-1">
              Extracted Case Fields
            </div>
            {hx.payerName && <WorkOrderRow label="Payer" value={hx.payerName} highlight />}
            {hx.providerName && <WorkOrderRow label="Provider" value={hx.providerName} />}
            {hx.memberIdMasked && <WorkOrderRow label="Member ID" value={hx.memberIdMasked} />}
            {hx.procedureRequested && <WorkOrderRow label="Procedure" value={hx.procedureRequested} />}
            {hx.diagnosisSummary && (
              <WorkOrderRow label="Diagnosis Category" value={hx.diagnosisSummary.slice(0, 60) + (hx.diagnosisSummary.length > 60 ? '…' : '')} />
            )}
            {hx.urgencyLevel && (
              <div className="flex items-center justify-between border-b border-neutral-800 py-2.5">
                <span className="text-[10px] font-mono uppercase text-neutral-400 tracking-wider">Urgency</span>
                <span className={`text-xs font-bold font-mono uppercase ${urgencyColor}`}>
                  {hx.urgencyLevel}
                </span>
              </div>
            )}
            {hx.caseType && <WorkOrderRow label="Case Type" value={hx.caseType.replace('_', ' ')} />}
            {hx.requiresSpecialistReview && (
              <div className="flex items-center justify-between border-b border-neutral-800 py-2.5">
                <span className="text-[10px] font-mono uppercase text-neutral-400 tracking-wider">Specialist Review</span>
                <span className="text-xs font-bold font-mono uppercase text-warning">Required</span>
              </div>
            )}
            <div className="mt-2 mb-1 border-t border-neutral-700 pt-2">
              <div className="text-[10px] font-mono text-neutral-500 uppercase tracking-widest mb-1">
                Session Parameters
              </div>
            </div>
          </>
        )}

        <WorkOrderRow label="Budget Cap" value={`$${workOrder.budgetCapUsd.toFixed(2)} USD`} />
        <WorkOrderRow label="Approval Required" value={workOrder.approvalRequired ? 'YES' : 'NO'} />
        <WorkOrderRow label="Execution Mode" value={workOrder.executionMode.toUpperCase()} />
        {workOrder.policySummary && (
          <WorkOrderRow
            label="Policy Reference"
            value={workOrder.policySummary.slice(0, 70) + (workOrder.policySummary.length > 70 ? '…' : '')}
          />
        )}

        {/* Packet summary */}
        {workOrder.packetSummary && (
          <div className="mt-3 border-t border-neutral-700 pt-3">
            <div className="text-[10px] font-mono uppercase text-neutral-400 tracking-widest mb-1">
              Administrative Summary
            </div>
            <p className="text-[11px] font-mono text-neutral-300 leading-relaxed">
              {workOrder.packetSummary}
            </p>
          </div>
        )}

        {/* Tool action trace */}
        {workOrder.toolTrace.length > 0 && (
          <div className="mt-3 border-t border-neutral-700 pt-3">
            <div className="text-[10px] font-mono uppercase text-neutral-400 tracking-widest mb-2">
              Gemini Tool Calls
            </div>
            <div className="flex flex-col gap-1">
              {workOrder.toolTrace.map((trace, i) => (
                <div key={i} className="flex items-center gap-2 text-[11px] font-mono">
                  <span className="text-primary">✓</span>
                  <span className="text-neutral-300">{trace}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function WorkOrderRow({ label, value, highlight }: { label: string; value: string; highlight?: boolean }) {
  return (
    <div className="flex items-center justify-between border-b border-neutral-800 py-2.5">
      <span className="text-[10px] font-mono uppercase text-neutral-400 tracking-wider">{label}</span>
      <span className={`text-xs font-bold font-mono ${highlight ? 'text-primary' : 'text-neutral-50'}`}>
        {value}
      </span>
    </div>
  );
}
