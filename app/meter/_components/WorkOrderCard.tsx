'use client';

import { useMeterStore } from '../_store/useMeterStore';

// Maps Gemini tool call names → what Circle/Arc action they trigger
const TOOL_TARGETS: Record<string, string> = {
  parsePriorAuthDocument:      'Gemini Flash multimodal → structured HealthcareExtract JSON',
  parseMultimodalDocument:     'Gemini Flash vision → inlineData base64 decode + field extraction',
  geminiVisionExtract:         'Gemini Flash multimodal → image/PDF structured extraction',
  createReviewSession:         'Circle DCW → session wallet provisioned on ARC-TESTNET',
  addLedgerEstimate:           'Arc nanopayment authorization → USDC ledger event recorded',
  fundSession:                 'Circle Gateway x402 → payment verified, session funded',
  writeWorkOrder:              'DB write → WorkOrder persisted with budget cap',
  reconcileSession:            'Arc settlement → final USDC batch tx on chain 5042002',
  releaseEscrow:               'ERC-8183 → escrow release tx on Arc, deliverable hash anchored',
};

export function WorkOrderCard() {
  const { workOrder, workOrderDegraded, sessionState } = useMeterStore();
  const isExtracting = sessionState === 'work_order_extracting';
  const isEmpty = !workOrder && !isExtracting;

  if (isEmpty) {
    return (
      <div className="card p-0 flex flex-col">
        <div className="section-header px-4 py-3 flex items-center gap-2">
          <span className="badge text-[10px]">02</span>
          <span className="text-sm font-bold text-neutral-50 uppercase tracking-wider">Gemini Extraction</span>
        </div>
        <div className="p-6 flex flex-col gap-2">
          <p className="text-sm font-bold text-neutral-200">Upload a packet or load the demo packet.</p>
          <p className="text-sm text-neutral-400 leading-relaxed">
            Gemini will extract payer, procedure, urgency level, and review flags here.
          </p>
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

        {/* Tool action trace + function call targets */}
        {workOrder.toolTrace.length > 0 && (
          <div className="mt-3 border-t border-neutral-700 pt-3">
            <div className="flex items-center justify-between mb-2">
              <div className="text-[10px] font-mono uppercase text-neutral-400 tracking-widest">
                Gemini Function Calls
              </div>
              <div className="text-[9px] font-mono border border-warning text-warning px-2 py-0.5 uppercase">
                {workOrder.geminiModel ?? 'gemini-3.1-flash'}
              </div>
            </div>
            <div className="flex flex-col gap-1.5">
              {workOrder.toolTrace.map((trace, i) => {
                const target = TOOL_TARGETS[trace];
                return (
                  <div key={i} className="flex items-start gap-2 text-[11px] font-mono">
                    <span className="text-primary mt-0.5 shrink-0">✓</span>
                    <div className="flex flex-col gap-0.5">
                      <span className="text-neutral-300">{trace}</span>
                      {target && (
                        <span className="text-[9px] text-neutral-600">→ {target}</span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Gemini role note */}
            <div className="mt-3 border-t border-neutral-800 pt-2 flex flex-col gap-1">
              <div className="text-[9px] font-mono text-neutral-600 uppercase tracking-wider">
                Gemini roles in this workflow
              </div>
              <div className="text-[9px] font-mono text-neutral-500">
                <span className="text-warning">Flash</span>, multimodal extraction, structured function calling, live review stream
              </div>
              <div className="text-[9px] font-mono text-neutral-500">
                <span className="text-warning">Pro</span>, post-run economic audit, cost breakdown narrative (see Gemini Audit panel)
              </div>
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
