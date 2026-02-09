/**
 * Blockchain Client
 * Provides configured clients for interacting with various blockchain networks
 */

import { createPublicClient, createWalletClient, http } from 'viem';
import { base, baseSepolia } from 'viem/chains';

// Create public client for Base mainnet
export const basePublicClient = createPublicClient({
  chain: base,
  transport: http()
});

// Create public client for Base Sepolia testnet
export const baseSepoliaPublicClient = createPublicClient({
  chain: baseSepolia,
  transport: http()
});

/**
 * Get the appropriate client based on environment
 */
export function getClient(network: 'base' | 'base-sepolia' = 'base') {
  switch (network) {
    case 'base':
      return basePublicClient;
    case 'base-sepolia':
      return baseSepoliaPublicClient;
    default:
      return basePublicClient;
  }
}

/**
 * Get RPC URL for a specific network
 */
export function getRpcUrl(network: 'base' | 'base-sepolia' = 'base'): string {
  switch (network) {
    case 'base':
      return process.env.BASE_RPC_URL || 'https://mainnet.base.org';
    case 'base-sepolia':
      return process.env.BASE_SEPOLIA_RPC_URL || 'https://sepolia.base.org';
    default:
      return 'https://mainnet.base.org';
  }
}

/**
 * Get chain ID for a specific network
 */
export function getChainId(network: 'base' | 'base-sepolia' = 'base'): number {
  switch (network) {
    case 'base':
      return 8453;
    case 'base-sepolia':
      return 84532;
    default:
      return 8453;
  }
}