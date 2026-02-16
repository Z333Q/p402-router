/**
 * ERC-8004 Trustless Agents — Type Definitions
 *
 * On-chain registries for AI agent identity, reputation, and validation.
 * Deployed on Base mainnet (chain ID 8453).
 */

// ---------------------------------------------------------------------------
// Contract Addresses
// ---------------------------------------------------------------------------

export const ERC8004_CONTRACTS = {
  /** Identity Registry (ERC-721) on Base mainnet */
  IDENTITY_REGISTRY: '0x8004A169FB4a3325136EB29fA0ceB6D2e539a432' as `0x${string}`,
  /** Reputation Registry on Base mainnet */
  REPUTATION_REGISTRY: '0x8004BAa17C55a88189AE136b182e5fdA19dE9b63' as `0x${string}`,
} as const;

export const ERC8004_TESTNET_CONTRACTS = {
  /** Identity Registry on Base Sepolia */
  IDENTITY_REGISTRY: '0x8004A818BFB912233c491871b3d84c89A494BD9e' as `0x${string}`,
  /** Reputation Registry on Base Sepolia */
  REPUTATION_REGISTRY: '0x8004B663056A597Dffe9eCcC1965A193B7388713' as `0x${string}`,
} as const;

// ---------------------------------------------------------------------------
// Agent Registration File (off-chain JSON served at tokenURI)
// ---------------------------------------------------------------------------

export interface ERC8004Service {
  type: 'a2a-agent-card' | 'mcp' | 'x402-facilitator' | 'oasf-manifest' | string;
  uri: string;
}

export interface ERC8004Registration {
  /** CAIP-10 style: eip155:{chainId}:{registryAddress} */
  agentRegistry: string;
  /** On-chain NFT token ID */
  agentId: string;
}

export type TrustModel = 'reputation' | 'crypto-economic' | 'tee-attestation';

export interface ERC8004AgentRegistration {
  type: 'erc8004-agent-v1';
  name: string;
  description: string;
  image?: string;
  services: ERC8004Service[];
  registrations: ERC8004Registration[];
  supportedTrust: TrustModel[];
}

// ---------------------------------------------------------------------------
// Identity
// ---------------------------------------------------------------------------

export interface AgentIdentity {
  agentId: bigint;
  owner: `0x${string}`;
  agentURI: string;
  wallet: `0x${string}` | null;
}

// ---------------------------------------------------------------------------
// Reputation
// ---------------------------------------------------------------------------

export interface ReputationFeedback {
  agentRegistry: `0x${string}`;
  agentId: bigint;
  value: bigint;
  valueDecimals: number;
  tag1: string;
  tag2: string;
  uri: string;
  hash: `0x${string}`;
}

export interface ReputationSummary {
  agentId: bigint;
  totalValue: bigint;
  count: bigint;
  averageScore: number;
}

export interface FeedbackEntry {
  value: bigint;
  valueDecimals: number;
  tag1: string;
  tag2: string;
  uri: string;
  hash: `0x${string}`;
}

// ---------------------------------------------------------------------------
// Validation
// ---------------------------------------------------------------------------

export interface ValidationRequest {
  validatorAddress: `0x${string}`;
  agentId: bigint;
  requestUri: string;
  requestHash: `0x${string}`;
}

export interface ValidationStatus {
  validated: boolean;
  response: boolean;
  responseUri: string;
}

// ---------------------------------------------------------------------------
// Local DB Cache Types
// ---------------------------------------------------------------------------

export interface FacilitatorERC8004Identity {
  facilitatorId: string;
  erc8004AgentId: string | null;
  erc8004Wallet: string | null;
  erc8004AgentUri: string | null;
  erc8004ReputationCached: number | null;
  erc8004ReputationFetchedAt: Date | null;
  erc8004Verified: boolean;
}

// ---------------------------------------------------------------------------
// Feedback Queue (DB row shape)
// ---------------------------------------------------------------------------

export type FeedbackStatus = 'pending' | 'submitted' | 'confirmed' | 'failed';

export interface ERC8004FeedbackRow {
  id: string;
  settlementEventId: string;
  facilitatorId: string;
  agentId: string;
  txHash: string | null;
  value: number;
  tag1: string;
  tag2: string | null;
  feedbackUri: string | null;
  feedbackHash: string | null;
  status: FeedbackStatus;
  createdAt: Date;
}

// ---------------------------------------------------------------------------
// Validation Queue (DB row shape)
// ---------------------------------------------------------------------------

export type ValidationDbStatus = 'requested' | 'validated' | 'rejected' | 'expired';

export interface ERC8004ValidationRow {
  id: string;
  requestHash: string;
  agentId: string;
  validatorAddress: string | null;
  requestUri: string | null;
  response: boolean | null;
  responseUri: string | null;
  responseHash: string | null;
  tag: string | null;
  status: ValidationDbStatus;
  txHash: string | null;
  createdAt: Date;
  respondedAt: Date | null;
}
