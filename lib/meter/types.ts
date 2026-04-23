// lib/meter/types.ts
// P402 Meter, healthcare payer-ops types (Molina pack aligned)

// ============================================================================
// Packet
// ============================================================================

export type PacketFormat = "text" | "pdf" | "image";
export type PacketType = "prior_auth_packet" | "utilization_review_packet" | "administrative_policy_packet";

export interface PacketAsset {
  id: string;
  tenantId: string;
  sessionId?: string;
  workOrderId?: string;
  assetType: PacketFormat;
  storageUrl?: string;
  inlineContent?: string;
  sha256?: string;
  sourceLabel: string;
  deidentified: boolean;
  packetType: PacketType;
  previewText?: string;
  createdAt: string;
}

// ============================================================================
// Healthcare extract, structured fields from Gemini multimodal parsing
// ============================================================================

export type UrgencyLevel = "routine" | "urgent" | "emergent";
export type CaseType = "prior_auth" | "utilization_review" | "appeals" | "specialist_consult";

export interface HealthcareExtract {
  requestId: string;
  payerName?: string;
  memberIdMasked?: string;          // e.g. "***-**-1234"
  providerName?: string;
  procedureRequested?: string;
  diagnosisSummary?: string;        // administrative summary only, no PHI
  urgencyLevel?: UrgencyLevel;
  caseType?: CaseType;
  extractedConfidence?: number;     // 0–1
  attachmentCount?: number;
  requiresSpecialistReview?: boolean;
}

// ============================================================================
// Work Order
// ============================================================================

export type WorkflowType = "prior_auth_review";
export type WorkOrderStatus =
  | "created"
  | "parsing"
  | "session_open"
  | "executing"
  | "reconciling"
  | "proof_ready"
  | "approved"
  | "held";

export interface WorkOrder {
  id: string;
  tenantId: string;
  sessionId?: string;
  requestId: string;
  workflowType: WorkflowType;
  packetFormat: PacketFormat;
  packetSummary?: string;
  policySummary?: string;
  budgetCapUsd: number;
  approvalRequired: boolean;
  deidentified: boolean;
  reviewMode: "live" | "safe";
  executionMode: "live" | "safe";
  toolTrace: string[];
  status: WorkOrderStatus;
  geminiModel?: string;
  // Healthcare-specific extracted fields
  healthcareExtract?: HealthcareExtract;
  createdAt: string;
  updatedAt: string;
}

// ============================================================================
// Ledger event kinds, healthcare-specific, judge-readable labels
// ============================================================================

export type LedgerEventKind =
  | "extraction_estimate"       // Gemini multimodal parsing cost
  | "review_estimate"           // per-chunk review streaming cost
  | "followup_estimate"         // follow-up reasoning step cost
  | "specialist_review_estimate"// specialist agent review cost
  | "reconciliation"            // final reconcile at stream close
  | "routing_fee"               // P402 governance/routing overhead
  | "cache_access"              // semantic cache hit (near-zero cost)
  | "escrow_release";           // ERC-8183 escrow release event

export interface LedgerEvent {
  id: string;
  sessionId: string;
  workOrderId?: string;
  eventKind: LedgerEventKind;
  chunkIndex?: number;
  tokensEstimate?: number;
  costUsd: number;
  costUsdcE6: number;
  provisional: boolean;
  arcTxHash?: string;
  arcBatchId?: string;
  arcBlock?: number;
  proofRef?: string;
  createdAt: string;
}

// ============================================================================
// SSE frame types (server → client)
// ============================================================================

export interface SseTextDelta {
  type: "text_delta";
  delta: string;
}

export interface SseLedgerEvent {
  type: "ledger_event";
  event: LedgerEvent;
}

export interface SseStreamDone {
  type: "stream_done";
  totalCostUsd: number;
  totalTokens: number;
  reconciled: boolean;
}

export interface SseError {
  type: "error";
  code: string;
  message: string;
}

export type SseFrame = SseTextDelta | SseLedgerEvent | SseStreamDone | SseError;

// ============================================================================
// Specialist escrow job (ERC-8183 backed)
// ============================================================================

export type SpecialistJobStatus =
  | "idle"
  | "creating"
  | "funding"
  | "reviewing"
  | "complete"
  | "failed";

export interface SpecialistJob {
  jobId: string;
  sessionId: string;
  workOrderId?: string;
  reason: string;                   // why escalation was triggered
  escrowAmountUsd: number;
  escrowAmountUsdcE6: number;
  deliverableHash?: string;         // keccak256 of specialist output
  arcTxHash?: string;               // ERC-8183 job tx
  arcExplorerUrl?: string;
  status: SpecialistJobStatus;
  createdAt: string;
  completedAt?: string;
}

// ============================================================================
// Gemini Pro economic audit (post-run)
// ============================================================================

export interface EconomicAudit {
  sessionId: string;
  totalCostUsd: number;
  costBreakdown: {
    aiTokenCostUsd: number;
    routingFeeUsd: number;
    arcGasCostUsd: number;
    escrowCostUsd: number;
  };
  arcTxCount: number;
  avgCostPerActionUsd: number;
  comparisonStripeUsd: number;      // what Stripe minimum fee would be
  comparisonEthMainnetUsd: number;  // equivalent gas cost on ETH mainnet
  savingVsEthMainnetPct: number;    // percentage saving vs ETH
  recommendation: string;           // Gemini Pro narrative
  model: "gemini-3.1-pro" | "gemini-3.1-flash";
  createdAt: string;
}

// ============================================================================
// Proof
// ============================================================================

export interface ArcProofRecord {
  sessionId: string;
  workOrderId: string;
  finalAmountUsd: number;
  finalAmountUsdcE6: number;
  authorizationCount: number;
  arcBatchCount: number;
  explorerLinks: string[];
  txHashes: string[];
  status: "pending" | "partial" | "verified" | "safe_mode";
  createdAt: string;
}

// ============================================================================
// Approval
// ============================================================================

export type ApprovalRecommendation = "approve_for_manual_review" | "hold_for_escalation" | "revise_output";

export interface ApprovalRecord {
  sessionId: string;
  workOrderId: string;
  insideBudget: boolean;
  policyCompliant: boolean;
  outputInScope: boolean;
  recommendation: ApprovalRecommendation;
  reasonSummary: string;
  createdAt: string;
}

// ============================================================================
// Trust summary (ERC-8004 + P402 stack)
// ============================================================================

export interface TrustSummary {
  hasIdentity: boolean;
  hasReputation: boolean;
  hasBudgetControls: boolean;
  hasEvidenceBundle: boolean;
  agentDid?: string;
  identityTx?: string;
  reputationScore?: number;
}

// ============================================================================
// Release state (ERC-8183)
// ============================================================================

export type ReleaseStatus = "disabled" | "ready" | "submitted" | "completed" | "failed";

export interface ReleaseState {
  enabled: boolean;
  status: ReleaseStatus;
  jobId?: string;
  txHash?: string;
  arcExplorerUrl?: string;
}

// ============================================================================
// Frequency counter
// ============================================================================

export interface FrequencyStats {
  authorizations: number;
  arcBatches: number;
  avgCostPerAction: number;
  totalCostUsd: number;
  runningCostUsd: number;
}
