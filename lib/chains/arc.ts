// lib/chains/arc.ts
// Source: https://docs.arc.network/arc/references/connect-to-arc
// All addresses verified against Arc official documentation, April 2026

// ============================================================================
// Network
// ============================================================================
export const ARC_TESTNET_CHAIN_ID = 5042002;
export const ARC_TESTNET_NAME = "Arc Testnet";
export const ARC_TESTNET_CURRENCY_SYMBOL = "USDC"; // USDC is native gas on Arc

// ============================================================================
// RPC endpoints (HTTP + WebSocket, with fallbacks)
// ============================================================================
export const ARC_TESTNET_RPC = "https://rpc.testnet.arc.network";
export const ARC_TESTNET_RPC_FALLBACKS = [
  "https://rpc.blockdaemon.testnet.arc.network",
  "https://rpc.drpc.testnet.arc.network",
  "https://rpc.quicknode.testnet.arc.network",
] as const;

export const ARC_TESTNET_WS = "wss://rpc.testnet.arc.network";
export const ARC_TESTNET_WS_FALLBACKS = [
  "wss://rpc.drpc.testnet.arc.network",
  "wss://rpc.quicknode.testnet.arc.network",
] as const;

// ============================================================================
// Block explorer
// ============================================================================
export const ARC_TESTNET_EXPLORER = "https://testnet.arcscan.app";

export function arcExplorerTxUrl(txHash: string): string {
  return `${ARC_TESTNET_EXPLORER}/tx/${txHash}`;
}

export function arcExplorerAddressUrl(address: string): string {
  return `${ARC_TESTNET_EXPLORER}/address/${address}`;
}

export function arcExplorerBlockUrl(blockNumber: number | bigint): string {
  return `${ARC_TESTNET_EXPLORER}/block/${blockNumber}`;
}

// ============================================================================
// Faucet
// ============================================================================
export const ARC_TESTNET_FAUCET = "https://faucet.circle.com";

// ============================================================================
// Core assets
// USDC on Arc testnet — predeploy address used in Arc's ERC-8183 quickstart.
// Interact via Circle Wallets' createContractExecutionTransaction (not vanilla ERC-20).
// ============================================================================
export const USDC_ARC_TESTNET = "0x3600000000000000000000000000000000000000";
export const USDC_DECIMALS = 6;

// ============================================================================
// ERC-8004 — AI Agent Identity, Reputation, Validation
// Source: https://docs.arc.network/arc/tutorials/register-your-first-ai-agent
// ============================================================================
export const ERC_8004_IDENTITY_REGISTRY   = "0x8004A818BFB912233c491871b3d84c89A494BD9e";
export const ERC_8004_REPUTATION_REGISTRY = "0x8004B663056A597Dffe9eCcC1965A193B7388713";
export const ERC_8004_VALIDATION_REGISTRY = "0x8004Cb1BF31DAf7788923b405b754f57acEB4272";

// ============================================================================
// ERC-8183 — Agentic Commerce reference contract (job escrow)
// Source: https://docs.arc.network/arc/tutorials/create-your-first-erc-8183-job
// ============================================================================
export const ERC_8183_AGENTIC_COMMERCE = "0x0747EEf0706327138c69792bF28Cd525089e4583";

// ============================================================================
// Circle Gateway on Arc testnet (same addresses across all EVM testnets)
// Arc testnet joined as Gateway domain 26 in late 2025/early 2026.
// ============================================================================
export const GATEWAY_WALLET_TESTNET  = "0x0077777d7EBA4688BDeF3E311b846F25870A19B9";
export const GATEWAY_MINTER_TESTNET  = "0x0022222ABE238Cc2C7Bb1f21003F0a260052475B";
export const GATEWAY_DOMAIN_ARC_TESTNET = 26;

// ============================================================================
// Circle Developer-Controlled Wallets — blockchain identifier string
// Use when calling circleClient.createWallets({ blockchains: [...] })
// ============================================================================
export const CIRCLE_WALLETS_BLOCKCHAIN_ARC_TESTNET = "ARC-TESTNET";

// ============================================================================
// Gas cost reference (informational — used by FrequencyCounter)
// "On Arc, gas is approximately 0.006 USDC-TESTNET per transaction."
// Source: Arc register-your-first-ai-agent quickstart Step 4
// ============================================================================
export const ARC_TYPICAL_GAS_COST_USDC = 0.006;

// ============================================================================
// Nanopayments API base URL
// Set via env var — do NOT hardcode. Pull from Circle skills docs on Day 1.
// ============================================================================
export const NANOPAYMENTS_API_BASE = process.env.NANOPAYMENTS_API_BASE ?? "";
