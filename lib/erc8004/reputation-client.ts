/**
 * ERC-8004 Reputation Registry Client
 *
 * Reads and writes to the on-chain Reputation Registry.
 * Uses viem for all contract interactions.
 */

import { createWalletClient, http, keccak256, toBytes, type PublicClient } from 'viem';
import { privateKeyToAccount } from 'viem/accounts';
import { base, baseSepolia } from 'viem/chains';
import { basePublicClient, baseSepoliaPublicClient } from '../blockchain/client';
import { REPUTATION_REGISTRY_ABI } from './abis';
import {
  ERC8004_CONTRACTS,
  ERC8004_TESTNET_CONTRACTS,
  type ReputationFeedback,
  type ReputationSummary,
  type FeedbackEntry,
} from './types';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function isTestnet(): boolean {
  return process.env.ERC8004_TESTNET === 'true';
}

function getReputationAddress(): `0x${string}` {
  return isTestnet()
    ? ERC8004_TESTNET_CONTRACTS.REPUTATION_REGISTRY
    : ERC8004_CONTRACTS.REPUTATION_REGISTRY;
}

function getIdentityAddress(): `0x${string}` {
  return isTestnet()
    ? ERC8004_TESTNET_CONTRACTS.IDENTITY_REGISTRY
    : ERC8004_CONTRACTS.IDENTITY_REGISTRY;
}

function getPublicClient(): PublicClient {
  return (isTestnet() ? baseSepoliaPublicClient : basePublicClient) as PublicClient;
}

function getWriteConfig() {
  const key = process.env.P402_FACILITATOR_PRIVATE_KEY;
  if (!key) throw new Error('P402_FACILITATOR_PRIVATE_KEY not configured');

  const account = privateKeyToAccount(key as `0x${string}`);
  const chain = isTestnet() ? baseSepolia : base;

  const walletClient = createWalletClient({
    account,
    chain,
    transport: http(),
  });

  return { walletClient, account, chain };
}

// ---------------------------------------------------------------------------
// Read Operations
// ---------------------------------------------------------------------------

/**
 * Get aggregated reputation summary for an agent.
 * Returns total value, count, and computed average score.
 */
export async function getSummary(
  agentId: bigint,
  clientAddresses: `0x${string}`[] = [],
  tag1 = '',
  tag2 = ''
): Promise<ReputationSummary> {
  const client = getPublicClient();

  const [totalValue, count] = (await client.readContract({
    address: getReputationAddress(),
    abi: REPUTATION_REGISTRY_ABI,
    functionName: 'getSummary',
    args: [agentId, clientAddresses, tag1, tag2],
  })) as [bigint, bigint];

  const averageScore = count > 0n ? Number(totalValue) / Number(count) : 0;

  return { agentId, totalValue, count, averageScore };
}

/**
 * Read a specific feedback entry.
 */
export async function readFeedback(
  agentId: bigint,
  clientAddress: `0x${string}`,
  feedbackIndex: bigint
): Promise<FeedbackEntry> {
  const client = getPublicClient();

  const result = (await client.readContract({
    address: getReputationAddress(),
    abi: REPUTATION_REGISTRY_ABI,
    functionName: 'readFeedback',
    args: [agentId, clientAddress, feedbackIndex],
  })) as [bigint, number, string, string, string, `0x${string}`];

  return {
    value: result[0],
    valueDecimals: result[1],
    tag1: result[2],
    tag2: result[3],
    uri: result[4],
    hash: result[5],
  };
}

// ---------------------------------------------------------------------------
// Write Operations
// ---------------------------------------------------------------------------

/**
 * Submit reputation feedback for an agent.
 * The caller (P402 facilitator wallet) pays gas.
 */
export async function giveFeedback(feedback: ReputationFeedback): Promise<`0x${string}`> {
  const { walletClient, account, chain } = getWriteConfig();

  return walletClient.writeContract({
    address: getReputationAddress(),
    abi: REPUTATION_REGISTRY_ABI,
    functionName: 'giveFeedback',
    args: [
      feedback.agentRegistry,
      feedback.agentId,
      feedback.value,
      feedback.valueDecimals,
      feedback.tag1,
      feedback.tag2,
      feedback.uri,
      feedback.hash,
    ],
    account,
    chain,
  });
}

/**
 * Revoke a previously submitted feedback entry.
 */
export async function revokeFeedback(feedbackId: bigint): Promise<`0x${string}`> {
  const { walletClient, account, chain } = getWriteConfig();

  return walletClient.writeContract({
    address: getReputationAddress(),
    abi: REPUTATION_REGISTRY_ABI,
    functionName: 'revokeFeedback',
    args: [feedbackId],
    account,
    chain,
  });
}

// ---------------------------------------------------------------------------
// Utilities
// ---------------------------------------------------------------------------

/**
 * Build a ReputationFeedback object for a settlement outcome.
 *
 * @param agentId - The ERC-8004 agent ID of the facilitator being rated
 * @param score - 0-100 score (will be stored with 0 decimals)
 * @param tag1 - Primary category (e.g. 'settlement')
 * @param tag2 - Secondary category (e.g. 'success', 'failure')
 * @param feedbackUri - URI to detailed feedback JSON
 */
export function buildSettlementFeedback(
  agentId: bigint,
  score: number,
  tag1: string,
  tag2: string,
  feedbackUri: string
): ReputationFeedback {
  const clampedScore = Math.max(0, Math.min(100, Math.round(score)));
  const contentHash = keccak256(
    toBytes(JSON.stringify({ agentId: agentId.toString(), score: clampedScore, tag1, tag2, uri: feedbackUri }))
  );

  return {
    agentRegistry: getIdentityAddress(),
    agentId,
    value: BigInt(clampedScore),
    valueDecimals: 0,
    tag1,
    tag2,
    uri: feedbackUri,
    hash: contentHash,
  };
}
