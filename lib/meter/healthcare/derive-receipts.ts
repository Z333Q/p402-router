// lib/meter/healthcare/derive-receipts.ts
// Bridge live LedgerEvent → governance HealthcareAIOperationReceipt.
// The live Tempo pipeline emits per-chunk billing events; we map each
// billing event to one operation receipt and attach the session-level
// Tempo tx hash from the reconciliation event.

import type { LedgerEvent, LedgerEventKind } from '@/lib/meter/types';
import type {
  HealthcareAIOperationReceipt,
  HealthcareLineOfBusiness,
  HealthcareAgentName,
  HealthcareBudgetHierarchy,
} from './types';
import { evaluateOperationAgainstBudget, aggregateSpend } from './governance';
import { DEFAULT_BUDGET_HIERARCHY } from './mock-data';

const EVENT_TO_AGENT: Partial<Record<LedgerEventKind, HealthcareAgentName>> = {
  extraction_estimate: 'documentation-extraction-agent',
  review_estimate: 'reviewer-summary-agent',
  followup_estimate: 'criteria-mapping-agent',
  specialist_review_estimate: 'escalation-recommendation-agent',
};

const EVENT_TO_MODEL: Partial<Record<LedgerEventKind, string>> = {
  extraction_estimate: 'gemini-flash',
  review_estimate: 'gemini-pro',
  followup_estimate: 'gemini-flash',
  specialist_review_estimate: 'gemini-pro',
};

const TENANT_ID = 'tenant_government_program_payer';

function shortHash(seed: string): string {
  // Deterministic short hash from event id, so receipts stay stable across renders.
  let h = 0;
  for (let i = 0; i < seed.length; i++) {
    h = (h << 5) - h + seed.charCodeAt(i);
    h |= 0;
  }
  return Math.abs(h).toString(36).slice(0, 6).padEnd(6, '0');
}

export function deriveReceipts(
  events: LedgerEvent[],
  caseId: string,
  lineOfBusiness: HealthcareLineOfBusiness,
  baseHierarchy: HealthcareBudgetHierarchy = DEFAULT_BUDGET_HIERARCHY,
): {
  receipts: HealthcareAIOperationReceipt[];
  hierarchy: HealthcareBudgetHierarchy;
} {
  // Pull the session-level settlement (if any) off the reconciliation event.
  const reconciliation = events.find((e) => e.eventKind === 'reconciliation');
  const settlementTxHash = reconciliation?.settlementTxHash;
  const settlementChainId = reconciliation?.settlementChainId;

  // Only the billing-emitting events become operation receipts.
  const billingEvents = events.filter((e) => EVENT_TO_AGENT[e.eventKind]);

  // We need to evaluate each receipt's policy/mandate status against the
  // hierarchy *as of the moment it was billed* — so accumulate left-to-right.
  let runningHierarchy = baseHierarchy;
  const receipts: HealthcareAIOperationReceipt[] = [];

  for (const e of billingEvents) {
    const agent = EVENT_TO_AGENT[e.eventKind]!;
    const model = EVENT_TO_MODEL[e.eventKind] ?? 'gemini-flash';
    const hash = shortHash(e.id);
    const { policyStatus, mandateStatus } = evaluateOperationAgainstBudget(
      runningHierarchy,
      agent,
      e.costUsd,
    );
    const receipt: HealthcareAIOperationReceipt = {
      receiptId: `rcpt_SYN_${hash}`,
      operationId: `op_${agent}_${hash}`,
      tenantId: TENANT_ID,
      lineOfBusiness,
      workflow: 'prior_authorization_review',
      caseId,
      agent,
      model,
      inputTokens: Math.round((e.tokensEstimate ?? 0) * 0.8),
      outputTokens: Math.round((e.tokensEstimate ?? 0) * 0.2),
      costUsd: e.costUsd,
      policyStatus,
      mandateStatus,
      humanReviewRequired: true,
      evidenceHash: `ev_SYN_${hash}`,
      timestamp: e.createdAt,
    };
    if (settlementTxHash) receipt.settlementTxHash = settlementTxHash;
    if (typeof settlementChainId === 'number') receipt.settlementChainId = settlementChainId;
    receipts.push(receipt);
    runningHierarchy = aggregateSpend(receipts, baseHierarchy);
  }

  return { receipts, hierarchy: runningHierarchy };
}
