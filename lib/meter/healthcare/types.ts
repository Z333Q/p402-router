// lib/meter/healthcare/types.ts
// Medicaid MCO prior authorization governance types. Synthetic-only.
// Live Tempo settlement still runs through lib/meter/types.ts LedgerEvent; this
// file overlays governance metadata (case, agent, policy, mandate, evidence,
// human review) on top of the existing per-operation billing pipeline.

export type HealthcareLineOfBusiness =
  | 'medicaid_mco'
  | 'medicare_dsnp'
  | 'marketplace';

export type HealthcarePersona =
  | 'medicaid-mco'
  | 'dual-eligible'
  | 'marketplace';

export type PAUrgency = 'standard' | 'expedited';

export type HumanReviewAction =
  | 'approve_for_reviewer_signoff'
  | 'request_more_information'
  | 'escalate_to_physician_advisor';

export type DocumentationStatus =
  | 'complete'
  | 'partial'
  | 'missing'
  | 'not_applicable';

export type CriteriaStatus =
  | 'met'
  | 'not_enough_information'
  | 'conflicting_information'
  | 'reviewer_required';

export type BudgetStatus = 'allowed' | 'warning' | 'blocked';

export type PolicyStatus = 'allowed' | 'denied';

export type MandateStatus = 'within_budget' | 'budget_exceeded' | 'category_denied';

export interface StateProgramPolicyProfile {
  id: string;
  displayName: string;
  lineOfBusiness: HealthcareLineOfBusiness;
  requestCategory: string;
  standardDecisionClockHours: number;
  expeditedDecisionClockHours: number;
  requiredDocuments: string[];
  reviewerRole: string;
  escalationRole: string;
  appealPacketRequired: boolean;
  publicReportingRelevant: boolean;
  sourceLabel: string;
  sourceVerified: boolean;
}

export interface HealthcareBudgetHierarchy {
  tenantId: string;
  clientMonthlyBudgetUsd: number;
  lineOfBusinessBudgetUsd: number;
  workflowBudgetUsd: number;
  caseCapUsd: number;
  agentCapsUsd: Record<string, number>;
  currentSpendUsd: {
    client: number;
    lineOfBusiness: number;
    workflow: number;
    case: number;
    agents: Record<string, number>;
  };
}

export interface HealthcareAIOperationReceipt {
  receiptId: string;
  operationId: string;
  tenantId: string;
  lineOfBusiness: HealthcareLineOfBusiness;
  workflow: 'prior_authorization_review';
  caseId: string;
  agent: string;
  model: string;
  inputTokens: number;
  outputTokens: number;
  costUsd: number;
  policyStatus: PolicyStatus;
  mandateStatus: MandateStatus;
  humanReviewRequired: boolean;
  evidenceHash: string;
  timestamp: string;
  // Optional bridge to on-chain proof for the session-level reconciliation.
  settlementTxHash?: string;
  settlementChainId?: number;
}

export interface SyntheticPriorAuthCase {
  caseId: string;
  memberId: string;
  lineOfBusiness: HealthcareLineOfBusiness;
  programProfileId: string;
  requestType: string;
  urgency: PAUrgency;
  receivedAt: string;
  requestedService: string;
  syntheticProviderName: string;
  packetSummary: string;
  documentation: Record<string, DocumentationStatus>;
}

export interface CriteriaMappingResult {
  category: string;
  extractedEvidence: string;
  status: CriteriaStatus;
  confidence: number;
  reviewerNote: string;
}

export interface ComplianceTrace {
  cmsDecisionClockTracked: boolean;
  specificReasonGenerated: boolean;
  humanReviewBoundaryPreserved: boolean;
  syntheticDataOnly: boolean;
  realPhiProcessed: false;
}

export interface OversightPacket {
  packetType: 'synthetic_prior_authorization_oversight_packet';
  caseId: string;
  tenantId: string;
  lineOfBusiness: HealthcareLineOfBusiness;
  programProfile: string;
  requestType: string;
  urgency: PAUrgency;
  decisionClock: string;
  receivedAt: string;
  aiReviewStartedAt: string;
  humanReviewRequired: true;
  humanDecision: HumanReviewAction | null;
  aiOperations: HealthcareAIOperationReceipt[];
  budgetHierarchy: HealthcareBudgetHierarchy;
  documentationCompleteness: Record<string, DocumentationStatus>;
  criteriaMapping: CriteriaMappingResult[];
  draftReason: string;
  complianceTrace: ComplianceTrace;
  evidenceHash: string;
  exportedAt: string;
}

export const HEALTHCARE_AGENT_NAMES = [
  'documentation-extraction-agent',
  'completeness-check-agent',
  'criteria-mapping-agent',
  'reviewer-summary-agent',
  'rfi-reason-agent',
  'escalation-recommendation-agent',
  'evidence-export-agent',
] as const;

export type HealthcareAgentName = (typeof HEALTHCARE_AGENT_NAMES)[number];
