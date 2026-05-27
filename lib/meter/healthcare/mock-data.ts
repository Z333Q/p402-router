// lib/meter/healthcare/mock-data.ts
// Synthetic-only data for the Medicaid MCO PA governance demo.
// All identifiers begin with SYN- and must never be replaced with real PHI.

import type {
  StateProgramPolicyProfile,
  SyntheticPriorAuthCase,
  HealthcareBudgetHierarchy,
  HealthcareAIOperationReceipt,
  CriteriaMappingResult,
  OversightPacket,
  HealthcarePersona,
  HealthcareLineOfBusiness,
} from './types';

// ============================================================================
// State Program Policy Profiles
// ============================================================================

export const MEDICAID_MCO_PROFILE: StateProgramPolicyProfile = {
  id: 'state-a-medicaid',
  displayName: 'State A Medicaid Program',
  lineOfBusiness: 'medicaid_mco',
  requestCategory: 'Behavioral Health Inpatient Extension',
  standardDecisionClockHours: 24 * 7, // seven calendar days
  expeditedDecisionClockHours: 72,
  requiredDocuments: [
    'admission note',
    'treatment plan',
    'risk assessment',
    'current symptoms',
    'discharge plan',
    'prior authorization request form',
  ],
  reviewerRole: 'UM Nurse',
  escalationRole: 'Behavioral Health Physician Advisor',
  appealPacketRequired: true,
  publicReportingRelevant: true,
  sourceLabel: 'Demo placeholder',
  sourceVerified: false,
};

export const MEDICARE_DSNP_PROFILE: StateProgramPolicyProfile = {
  id: 'state-a-dsnp',
  displayName: 'State A D-SNP Program',
  lineOfBusiness: 'medicare_dsnp',
  requestCategory: 'Post-Acute SNF Extension',
  standardDecisionClockHours: 24 * 7,
  expeditedDecisionClockHours: 72,
  requiredDocuments: [
    'admission note',
    'rehabilitation progress note',
    'functional assessment',
    'discharge plan',
    'medication reconciliation',
  ],
  reviewerRole: 'UM Nurse',
  escalationRole: 'Plan Medical Director',
  appealPacketRequired: true,
  publicReportingRelevant: true,
  sourceLabel: 'Demo placeholder',
  sourceVerified: false,
};

export const MARKETPLACE_PROFILE: StateProgramPolicyProfile = {
  id: 'state-a-marketplace',
  displayName: 'State A Marketplace QHP',
  lineOfBusiness: 'marketplace',
  requestCategory: 'Outpatient Imaging Prior Authorization',
  standardDecisionClockHours: 24 * 7,
  expeditedDecisionClockHours: 72,
  requiredDocuments: [
    'imaging request form',
    'ordering provider notes',
    'prior conservative care documentation',
  ],
  reviewerRole: 'UM Nurse',
  escalationRole: 'Plan Medical Director',
  appealPacketRequired: true,
  publicReportingRelevant: true,
  sourceLabel: 'Demo placeholder',
  sourceVerified: false,
};

export const ALL_PROFILES: Record<HealthcareLineOfBusiness, StateProgramPolicyProfile> = {
  medicaid_mco: MEDICAID_MCO_PROFILE,
  medicare_dsnp: MEDICARE_DSNP_PROFILE,
  marketplace: MARKETPLACE_PROFILE,
};

// ============================================================================
// Synthetic PA cases
// ============================================================================

export const SYNTHETIC_BH_CASE: SyntheticPriorAuthCase = {
  caseId: 'SYN-CASE-BH-2026-041',
  memberId: 'SYN-MEMBER-10482',
  lineOfBusiness: 'medicaid_mco',
  programProfileId: MEDICAID_MCO_PROFILE.id,
  requestType: 'Behavioral Health Inpatient Extension',
  urgency: 'expedited',
  receivedAt: '2026-05-27T09:00:00Z',
  requestedService: 'Three additional inpatient behavioral health days',
  syntheticProviderName: 'Synthetic Behavioral Health Facility',
  packetSummary:
    'Member remains in acute inpatient behavioral health setting after initial stabilization. Provider requests three additional inpatient days. Packet includes admission note and treatment plan. Discharge plan is incomplete. Risk assessment is partial. Current medication reconciliation is missing.',
  documentation: {
    'Admission note': 'complete',
    'Treatment plan': 'complete',
    'Risk assessment': 'partial',
    'Discharge plan': 'missing',
    'Medication reconciliation': 'missing',
    'Current symptom update': 'partial',
  },
};

export const SYNTHETIC_DSNP_SNF_CASE: SyntheticPriorAuthCase = {
  caseId: 'SYN-CASE-SNF-2026-118',
  memberId: 'SYN-MEMBER-22041',
  lineOfBusiness: 'medicare_dsnp',
  programProfileId: MEDICARE_DSNP_PROFILE.id,
  requestType: 'Post-Acute SNF Extension',
  urgency: 'expedited',
  receivedAt: '2026-05-27T09:00:00Z',
  requestedService: 'Five additional SNF days post-acute',
  syntheticProviderName: 'Synthetic Post-Acute Facility',
  packetSummary:
    'Dual-eligible member with mobility limitations. Provider requests five additional SNF days. Functional assessment shows partial improvement. Discharge plan references home health handoff but lacks confirmed services. Medication reconciliation is partial.',
  documentation: {
    'Admission note': 'complete',
    'Rehabilitation progress note': 'complete',
    'Functional assessment': 'partial',
    'Discharge plan': 'partial',
    'Medication reconciliation': 'partial',
  },
};

export const SYNTHETIC_MARKETPLACE_IMAGING_CASE: SyntheticPriorAuthCase = {
  caseId: 'SYN-CASE-IMG-2026-307',
  memberId: 'SYN-MEMBER-33112',
  lineOfBusiness: 'marketplace',
  programProfileId: MARKETPLACE_PROFILE.id,
  requestType: 'Outpatient Imaging Prior Authorization',
  urgency: 'standard',
  receivedAt: '2026-05-27T09:00:00Z',
  requestedService: 'Advanced outpatient diagnostic imaging',
  syntheticProviderName: 'Synthetic Imaging Group',
  packetSummary:
    'Member with documented symptoms referred for outpatient advanced imaging. Conservative care documentation provided. Ordering provider notes are present. Some history fields are partially populated.',
  documentation: {
    'Imaging request form': 'complete',
    'Ordering provider notes': 'complete',
    'Prior conservative care documentation': 'partial',
  },
};

export const SYNTHETIC_CASES_BY_PERSONA: Record<HealthcarePersona, SyntheticPriorAuthCase> = {
  'medicaid-mco': SYNTHETIC_BH_CASE,
  'dual-eligible': SYNTHETIC_DSNP_SNF_CASE,
  marketplace: SYNTHETIC_MARKETPLACE_IMAGING_CASE,
};

export const PERSONA_TO_LOB: Record<HealthcarePersona, HealthcareLineOfBusiness> = {
  'medicaid-mco': 'medicaid_mco',
  'dual-eligible': 'medicare_dsnp',
  marketplace: 'marketplace',
};

export const LOB_TO_PERSONA: Record<HealthcareLineOfBusiness, HealthcarePersona> = {
  medicaid_mco: 'medicaid-mco',
  medicare_dsnp: 'dual-eligible',
  marketplace: 'marketplace',
};

// ============================================================================
// Budget hierarchy
// ============================================================================

export const DEFAULT_BUDGET_HIERARCHY: HealthcareBudgetHierarchy = {
  tenantId: 'tenant_government_program_payer',
  clientMonthlyBudgetUsd: 50_000,
  lineOfBusinessBudgetUsd: 20_000,
  workflowBudgetUsd: 8_000,
  caseCapUsd: 0.15,
  agentCapsUsd: {
    'documentation-extraction-agent': 0.03,
    'completeness-check-agent': 0.02,
    'criteria-mapping-agent': 0.04,
    'reviewer-summary-agent': 0.05,
    'rfi-reason-agent': 0.02,
    'escalation-recommendation-agent': 0.02,
    'evidence-export-agent': 0.03,
  },
  currentSpendUsd: {
    client: 0,
    lineOfBusiness: 0,
    workflow: 0,
    case: 0,
    agents: {},
  },
};

// ============================================================================
// Synthetic operation receipts (for static demo state + ledger seed)
// ============================================================================

export const SYNTHETIC_OPERATION_RECEIPTS: HealthcareAIOperationReceipt[] = [
  {
    receiptId: 'rcpt_SYN_BH_001',
    operationId: 'op_doc_extract_001',
    tenantId: 'tenant_government_program_payer',
    lineOfBusiness: 'medicaid_mco',
    workflow: 'prior_authorization_review',
    caseId: SYNTHETIC_BH_CASE.caseId,
    agent: 'documentation-extraction-agent',
    model: 'gemini-flash',
    inputTokens: 2140,
    outputTokens: 420,
    costUsd: 0.0024,
    policyStatus: 'allowed',
    mandateStatus: 'within_budget',
    humanReviewRequired: true,
    evidenceHash: 'ev_SYN_001',
    timestamp: '2026-05-27T10:15:00Z',
  },
  {
    receiptId: 'rcpt_SYN_BH_002',
    operationId: 'op_criteria_map_002',
    tenantId: 'tenant_government_program_payer',
    lineOfBusiness: 'medicaid_mco',
    workflow: 'prior_authorization_review',
    caseId: SYNTHETIC_BH_CASE.caseId,
    agent: 'criteria-mapping-agent',
    model: 'gemini-flash',
    inputTokens: 2400,
    outputTokens: 510,
    costUsd: 0.0031,
    policyStatus: 'allowed',
    mandateStatus: 'within_budget',
    humanReviewRequired: true,
    evidenceHash: 'ev_SYN_002',
    timestamp: '2026-05-27T10:15:08Z',
  },
  {
    receiptId: 'rcpt_SYN_BH_003',
    operationId: 'op_reviewer_summary_003',
    tenantId: 'tenant_government_program_payer',
    lineOfBusiness: 'medicaid_mco',
    workflow: 'prior_authorization_review',
    caseId: SYNTHETIC_BH_CASE.caseId,
    agent: 'reviewer-summary-agent',
    model: 'gemini-pro',
    inputTokens: 3000,
    outputTokens: 720,
    costUsd: 0.0046,
    policyStatus: 'allowed',
    mandateStatus: 'within_budget',
    humanReviewRequired: true,
    evidenceHash: 'ev_SYN_003',
    timestamp: '2026-05-27T10:15:18Z',
  },
  {
    receiptId: 'rcpt_SYN_BH_004',
    operationId: 'op_evidence_export_004',
    tenantId: 'tenant_government_program_payer',
    lineOfBusiness: 'medicaid_mco',
    workflow: 'prior_authorization_review',
    caseId: SYNTHETIC_BH_CASE.caseId,
    agent: 'evidence-export-agent',
    model: 'gemini-flash',
    inputTokens: 1200,
    outputTokens: 180,
    costUsd: 0.0012,
    policyStatus: 'allowed',
    mandateStatus: 'within_budget',
    humanReviewRequired: true,
    evidenceHash: 'ev_SYN_004',
    timestamp: '2026-05-27T10:15:30Z',
  },
];

// ============================================================================
// Criteria mapping (synthetic categories, NOT proprietary medical policy)
// ============================================================================

export const SYNTHETIC_CRITERIA_MAPPING: CriteriaMappingResult[] = [
  {
    category: 'Acute safety risk',
    extractedEvidence:
      'Provider notes ongoing acute symptoms with active safety monitoring required.',
    status: 'reviewer_required',
    confidence: 0.62,
    reviewerNote: 'Risk assessment is partial; reviewer must validate current safety status.',
  },
  {
    category: 'Current symptoms',
    extractedEvidence: 'Current symptom update is partial. Some fields missing.',
    status: 'not_enough_information',
    confidence: 0.48,
    reviewerNote: 'Request more information from provider on current symptom inventory.',
  },
  {
    category: 'Treatment response',
    extractedEvidence: 'Treatment plan documents medication and therapy regimen in place.',
    status: 'met',
    confidence: 0.81,
    reviewerNote: 'Treatment plan present and consistent.',
  },
  {
    category: 'Discharge readiness',
    extractedEvidence: 'Discharge plan is incomplete.',
    status: 'not_enough_information',
    confidence: 0.35,
    reviewerNote: 'A complete discharge plan is required before evaluating discharge readiness.',
  },
  {
    category: 'Less restrictive level of care',
    extractedEvidence: 'No assessment of step-down alternatives is included.',
    status: 'not_enough_information',
    confidence: 0.4,
    reviewerNote: 'Request step-down alternatives assessment.',
  },
  {
    category: 'Medication plan',
    extractedEvidence: 'Medication reconciliation is missing.',
    status: 'not_enough_information',
    confidence: 0.3,
    reviewerNote: 'Medication reconciliation must be supplied.',
  },
  {
    category: 'Follow-up plan',
    extractedEvidence: 'Outpatient follow-up plan is referenced but not confirmed.',
    status: 'reviewer_required',
    confidence: 0.55,
    reviewerNote: 'Reviewer to validate outpatient follow-up scheduling.',
  },
];

export const SYNTHETIC_DRAFT_RFI_REASON =
  'The packet is missing a complete discharge plan and current medication reconciliation. A behavioral health risk assessment is partial and requires reviewer validation.';

// ============================================================================
// Synthetic oversight packet (used as fallback / test fixture)
// ============================================================================

export const SYNTHETIC_OVERSIGHT_PACKET: OversightPacket = {
  packetType: 'synthetic_prior_authorization_oversight_packet',
  caseId: SYNTHETIC_BH_CASE.caseId,
  tenantId: 'tenant_government_program_payer',
  lineOfBusiness: 'medicaid_mco',
  programProfile: MEDICAID_MCO_PROFILE.displayName,
  requestType: SYNTHETIC_BH_CASE.requestType,
  urgency: SYNTHETIC_BH_CASE.urgency,
  decisionClock: '72 hours',
  receivedAt: SYNTHETIC_BH_CASE.receivedAt,
  aiReviewStartedAt: '2026-05-27T09:02:00Z',
  humanReviewRequired: true,
  humanDecision: 'request_more_information',
  aiOperations: SYNTHETIC_OPERATION_RECEIPTS,
  budgetHierarchy: {
    ...DEFAULT_BUDGET_HIERARCHY,
    currentSpendUsd: {
      client: 0.0113,
      lineOfBusiness: 0.0113,
      workflow: 0.0113,
      case: 0.0113,
      agents: {
        'documentation-extraction-agent': 0.0024,
        'criteria-mapping-agent': 0.0031,
        'reviewer-summary-agent': 0.0046,
        'evidence-export-agent': 0.0012,
      },
    },
  },
  documentationCompleteness: SYNTHETIC_BH_CASE.documentation,
  criteriaMapping: SYNTHETIC_CRITERIA_MAPPING,
  draftReason: SYNTHETIC_DRAFT_RFI_REASON,
  complianceTrace: {
    cmsDecisionClockTracked: true,
    specificReasonGenerated: true,
    humanReviewBoundaryPreserved: true,
    syntheticDataOnly: true,
    realPhiProcessed: false,
  },
  evidenceHash: 'ev_SYN_PACKET_9f4c',
  exportedAt: '2026-05-27T09:05:00Z',
};

// ============================================================================
// Display helpers
// ============================================================================

export const LOB_DISPLAY: Record<HealthcareLineOfBusiness, string> = {
  medicaid_mco: 'Medicaid Managed Care',
  medicare_dsnp: 'Medicare D-SNP',
  marketplace: 'Marketplace',
};

export const PERSONA_DISPLAY: Record<HealthcarePersona, string> = {
  'medicaid-mco': 'Medicaid MCO',
  'dual-eligible': 'Medicare D-SNP',
  marketplace: 'Marketplace',
};
