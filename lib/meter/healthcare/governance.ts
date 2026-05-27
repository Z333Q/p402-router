// lib/meter/healthcare/governance.ts
// Pure functions: derive budget hierarchy spend from receipts, decide
// budget status, generate oversight packets. All synthetic-only.

import type {
  HealthcareAIOperationReceipt,
  HealthcareBudgetHierarchy,
  BudgetStatus,
  OversightPacket,
  HumanReviewAction,
  SyntheticPriorAuthCase,
  StateProgramPolicyProfile,
  CriteriaMappingResult,
  PolicyStatus,
  MandateStatus,
  HealthcareLineOfBusiness,
} from './types';
import { DEFAULT_BUDGET_HIERARCHY } from './mock-data';

// ---------------------------------------------------------------------------
// Budget hierarchy aggregation
// ---------------------------------------------------------------------------

export function aggregateSpend(
  receipts: HealthcareAIOperationReceipt[],
  base: HealthcareBudgetHierarchy = DEFAULT_BUDGET_HIERARCHY,
): HealthcareBudgetHierarchy {
  const allowed = receipts.filter((r) => r.policyStatus === 'allowed');
  const caseTotal = allowed.reduce((acc, r) => acc + r.costUsd, 0);

  const agents: Record<string, number> = {};
  for (const r of allowed) {
    agents[r.agent] = (agents[r.agent] ?? 0) + r.costUsd;
  }

  return {
    ...base,
    currentSpendUsd: {
      client: base.currentSpendUsd.client + caseTotal,
      lineOfBusiness: base.currentSpendUsd.lineOfBusiness + caseTotal,
      workflow: base.currentSpendUsd.workflow + caseTotal,
      case: caseTotal,
      agents,
    },
  };
}

export function budgetStatus(spent: number, cap: number): BudgetStatus {
  if (cap <= 0) return 'allowed';
  const ratio = spent / cap;
  if (ratio >= 1) return 'blocked';
  if (ratio >= 0.8) return 'warning';
  return 'allowed';
}

// Decide policy + mandate status for a *prospective* operation cost against
// the current hierarchy. Used to display per-operation budget evaluation.
export function evaluateOperationAgainstBudget(
  hierarchy: HealthcareBudgetHierarchy,
  agent: string,
  prospectiveCostUsd: number,
): { policyStatus: PolicyStatus; mandateStatus: MandateStatus } {
  const caseSpent = hierarchy.currentSpendUsd.case + prospectiveCostUsd;
  if (caseSpent > hierarchy.caseCapUsd) {
    return { policyStatus: 'denied', mandateStatus: 'budget_exceeded' };
  }
  const agentCap = hierarchy.agentCapsUsd[agent];
  const agentSpent = (hierarchy.currentSpendUsd.agents[agent] ?? 0) + prospectiveCostUsd;
  if (typeof agentCap === 'number' && agentSpent > agentCap) {
    return { policyStatus: 'denied', mandateStatus: 'budget_exceeded' };
  }
  return { policyStatus: 'allowed', mandateStatus: 'within_budget' };
}

// ---------------------------------------------------------------------------
// Oversight packet
// ---------------------------------------------------------------------------

export interface BuildOversightPacketInput {
  case: SyntheticPriorAuthCase;
  profile: StateProgramPolicyProfile;
  receipts: HealthcareAIOperationReceipt[];
  hierarchy: HealthcareBudgetHierarchy;
  criteria: CriteriaMappingResult[];
  draftReason: string;
  humanDecision: HumanReviewAction | null;
  aiReviewStartedAt: string;
  evidenceHash: string;
  exportedAt: string;
}

export function buildOversightPacket(input: BuildOversightPacketInput): OversightPacket {
  const clockHours =
    input.case.urgency === 'expedited'
      ? input.profile.expeditedDecisionClockHours
      : input.profile.standardDecisionClockHours;

  return {
    packetType: 'synthetic_prior_authorization_oversight_packet',
    caseId: input.case.caseId,
    tenantId: input.hierarchy.tenantId,
    lineOfBusiness: input.case.lineOfBusiness,
    programProfile: input.profile.displayName,
    requestType: input.case.requestType,
    urgency: input.case.urgency,
    decisionClock: formatClock(clockHours),
    receivedAt: input.case.receivedAt,
    aiReviewStartedAt: input.aiReviewStartedAt,
    humanReviewRequired: true,
    humanDecision: input.humanDecision,
    aiOperations: input.receipts,
    budgetHierarchy: input.hierarchy,
    documentationCompleteness: input.case.documentation,
    criteriaMapping: input.criteria,
    draftReason: input.draftReason,
    complianceTrace: {
      cmsDecisionClockTracked: true,
      specificReasonGenerated: input.draftReason.length > 0,
      humanReviewBoundaryPreserved: true,
      syntheticDataOnly: true,
      realPhiProcessed: false,
    },
    evidenceHash: input.evidenceHash,
    exportedAt: input.exportedAt,
  };
}

function formatClock(hours: number): string {
  if (hours === 72) return '72 hours';
  if (hours === 24 * 7) return 'seven calendar days';
  if (hours % 24 === 0) return `${hours / 24} calendar days`;
  return `${hours} hours`;
}

// ---------------------------------------------------------------------------
// Receipt construction helpers
// ---------------------------------------------------------------------------

export interface NewReceiptInput {
  agent: string;
  model: string;
  costUsd: number;
  inputTokens: number;
  outputTokens: number;
  caseId: string;
  lineOfBusiness: HealthcareLineOfBusiness;
  tenantId: string;
  hierarchy: HealthcareBudgetHierarchy;
  settlementTxHash?: string;
  settlementChainId?: number;
}

export function buildReceipt(input: NewReceiptInput): HealthcareAIOperationReceipt {
  const { policyStatus, mandateStatus } = evaluateOperationAgainstBudget(
    input.hierarchy,
    input.agent,
    input.costUsd,
  );
  const ts = new Date().toISOString();
  const shortHash = Math.random().toString(36).slice(2, 8);
  const receipt: HealthcareAIOperationReceipt = {
    receiptId: `rcpt_SYN_${shortHash}`,
    operationId: `op_${input.agent}_${shortHash}`,
    tenantId: input.tenantId,
    lineOfBusiness: input.lineOfBusiness,
    workflow: 'prior_authorization_review',
    caseId: input.caseId,
    agent: input.agent,
    model: input.model,
    inputTokens: input.inputTokens,
    outputTokens: input.outputTokens,
    costUsd: input.costUsd,
    policyStatus,
    mandateStatus,
    humanReviewRequired: true,
    evidenceHash: `ev_SYN_${shortHash}`,
    timestamp: ts,
  };
  if (input.settlementTxHash) receipt.settlementTxHash = input.settlementTxHash;
  if (typeof input.settlementChainId === 'number') receipt.settlementChainId = input.settlementChainId;
  return receipt;
}
