/**
 * ERC-8004 Validation Registry Client
 *
 * Contract interactions for requesting and reading validation responses.
 * Used for high-value transactions that warrant additional trust verification.
 */

import { createWalletClient, http, type PublicClient } from 'viem';
import { privateKeyToAccount } from 'viem/accounts';
import { base, baseSepolia } from 'viem/chains';
import { basePublicClient, baseSepoliaPublicClient } from '../blockchain/client';
import { VALIDATION_REGISTRY_ABI } from './abis';
import type { ValidationStatus } from './types';

// The Validation Registry is not yet deployed on mainnet.
// This address will be updated once deployed.
const VALIDATION_REGISTRY_MAINNET = '0x0000000000000000000000000000000000000000' as `0x${string}`;
const VALIDATION_REGISTRY_TESTNET = '0x0000000000000000000000000000000000000000' as `0x${string}`;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function isTestnet(): boolean {
  return process.env.ERC8004_TESTNET === 'true';
}

function getValidationAddress(): `0x${string}` {
  const envAddr = process.env.ERC8004_VALIDATION_REGISTRY;
  if (envAddr) return envAddr as `0x${string}`;
  return isTestnet() ? VALIDATION_REGISTRY_TESTNET : VALIDATION_REGISTRY_MAINNET;
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
// Operations
// ---------------------------------------------------------------------------

/**
 * Request validation for a high-value transaction.
 */
export async function requestValidation(
  validatorAddress: `0x${string}`,
  agentId: bigint,
  requestUri: string,
  requestHash: `0x${string}`
): Promise<`0x${string}`> {
  const { walletClient, account, chain } = getWriteConfig();

  return walletClient.writeContract({
    address: getValidationAddress(),
    abi: VALIDATION_REGISTRY_ABI,
    functionName: 'validationRequest',
    args: [validatorAddress, agentId, requestUri, requestHash],
    account,
    chain,
  });
}

/**
 * Check validation status for a request.
 */
export async function getValidationStatus(
  requestHash: `0x${string}`
): Promise<ValidationStatus> {
  const client = getPublicClient();

  const result = (await client.readContract({
    address: getValidationAddress(),
    abi: VALIDATION_REGISTRY_ABI,
    functionName: 'getValidationStatus',
    args: [requestHash],
  })) as [boolean, boolean, string];

  return {
    validated: result[0],
    response: result[1],
    responseUri: result[2],
  };
}

/**
 * Submit a validation response (when P402 acts as a validator).
 */
export async function submitValidationResponse(
  requestHash: `0x${string}`,
  response: boolean,
  responseUri: string,
  responseHash: `0x${string}`,
  tag: string
): Promise<`0x${string}`> {
  const { walletClient, account, chain } = getWriteConfig();

  return walletClient.writeContract({
    address: getValidationAddress(),
    abi: VALIDATION_REGISTRY_ABI,
    functionName: 'validationResponse',
    args: [requestHash, response, responseUri, responseHash, tag],
    account,
    chain,
  });
}
