/**
 * ERC-8004 Identity Registry Client
 *
 * Reads and writes to the on-chain Identity Registry (ERC-721).
 * Uses viem for all contract interactions.
 */

import { createWalletClient, http, type PublicClient } from 'viem';
import { privateKeyToAccount } from 'viem/accounts';
import { base, baseSepolia } from 'viem/chains';
import { basePublicClient, baseSepoliaPublicClient } from '../blockchain/client';
import { IDENTITY_REGISTRY_ABI } from './abis';
import { ERC8004_CONTRACTS, ERC8004_TESTNET_CONTRACTS, type AgentIdentity } from './types';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function isTestnet(): boolean {
  return process.env.ERC8004_TESTNET === 'true';
}

function getRegistryAddress(): `0x${string}` {
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

export async function getAgentOwner(agentId: bigint): Promise<`0x${string}`> {
  const client = getPublicClient();
  return client.readContract({
    address: getRegistryAddress(),
    abi: IDENTITY_REGISTRY_ABI,
    functionName: 'ownerOf',
    args: [agentId],
  }) as Promise<`0x${string}`>;
}

export async function getAgentURI(agentId: bigint): Promise<string> {
  const client = getPublicClient();
  return client.readContract({
    address: getRegistryAddress(),
    abi: IDENTITY_REGISTRY_ABI,
    functionName: 'tokenURI',
    args: [agentId],
  }) as Promise<string>;
}

export async function getAgentWallet(agentId: bigint): Promise<`0x${string}`> {
  const client = getPublicClient();
  return client.readContract({
    address: getRegistryAddress(),
    abi: IDENTITY_REGISTRY_ABI,
    functionName: 'getAgentWallet',
    args: [agentId],
  }) as Promise<`0x${string}`>;
}

export async function getAgentMetadata(agentId: bigint, key: string): Promise<string> {
  const client = getPublicClient();
  return client.readContract({
    address: getRegistryAddress(),
    abi: IDENTITY_REGISTRY_ABI,
    functionName: 'getMetadata',
    args: [agentId, key],
  }) as Promise<string>;
}

/**
 * Verify that an agent exists on-chain and return its identity data.
 * Returns null if the agent does not exist (ownerOf reverts).
 */
export async function verifyAgentIdentity(agentId: bigint): Promise<AgentIdentity | null> {
  try {
    const [owner, agentURI] = await Promise.all([
      getAgentOwner(agentId),
      getAgentURI(agentId),
    ]);

    let wallet: `0x${string}` | null = null;
    try {
      wallet = await getAgentWallet(agentId);
      if (wallet === '0x0000000000000000000000000000000000000000') {
        wallet = null;
      }
    } catch {
      // Agent wallet not set — not an error
    }

    return { agentId, owner, agentURI, wallet };
  } catch {
    // ownerOf reverts for non-existent tokens
    return null;
  }
}

// ---------------------------------------------------------------------------
// Write Operations
// ---------------------------------------------------------------------------

/**
 * Register a new agent on the Identity Registry.
 * Returns the minted token ID (agentId).
 */
export async function registerAgent(agentURI: string): Promise<bigint> {
  const { walletClient, account, chain } = getWriteConfig();
  const publicClient = getPublicClient();

  const txHash = await walletClient.writeContract({
    address: getRegistryAddress(),
    abi: IDENTITY_REGISTRY_ABI,
    functionName: 'register',
    args: [agentURI],
    account,
    chain,
  });

  const receipt = await publicClient.waitForTransactionReceipt({ hash: txHash });

  // Extract agentId from Transfer event (mint: from=0x0)
  const transferEvent = receipt.logs.find(
    (log) => log.topics[0] === '0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef'
  );

  if (!transferEvent?.topics[3]) {
    throw new Error('Failed to extract agentId from registration receipt');
  }

  return BigInt(transferEvent.topics[3]);
}

/**
 * Update the agent's metadata URI.
 */
export async function setAgentURI(agentId: bigint, agentURI: string): Promise<`0x${string}`> {
  const { walletClient, account, chain } = getWriteConfig();

  return walletClient.writeContract({
    address: getRegistryAddress(),
    abi: IDENTITY_REGISTRY_ABI,
    functionName: 'setAgentURI',
    args: [agentId, agentURI],
    account,
    chain,
  });
}

/**
 * Link a wallet address to an agent.
 */
export async function setAgentWalletOnChain(
  agentId: bigint,
  walletAddress: `0x${string}`
): Promise<`0x${string}`> {
  const { walletClient, account, chain } = getWriteConfig();

  return walletClient.writeContract({
    address: getRegistryAddress(),
    abi: IDENTITY_REGISTRY_ABI,
    functionName: 'setAgentWallet',
    args: [agentId, walletAddress],
    account,
    chain,
  });
}

/**
 * Set on-chain metadata for an agent.
 */
export async function setAgentMetadata(
  agentId: bigint,
  key: string,
  value: string
): Promise<`0x${string}`> {
  const { walletClient, account, chain } = getWriteConfig();

  return walletClient.writeContract({
    address: getRegistryAddress(),
    abi: IDENTITY_REGISTRY_ABI,
    functionName: 'setMetadata',
    args: [agentId, key, value],
    account,
    chain,
  });
}
