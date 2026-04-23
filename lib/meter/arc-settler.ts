// lib/meter/arc-settler.ts
// Submits real USDC transactions on Arc testnet for ledger event proof.
// Requires ARC_PRIVATE_KEY env var with testnet USDC balance.
// Get testnet USDC: https://faucet.circle.com (select Arc Testnet)

import { ethers } from 'ethers';
import {
  ARC_TESTNET_RPC,
  ARC_TESTNET_RPC_FALLBACKS,
  ARC_TESTNET_CHAIN_ID,
  USDC_ARC_TESTNET,
  ERC_8183_AGENTIC_COMMERCE,
} from '@/lib/chains/arc';

// Minimal ERC-20 ABI, just transfer()
const ERC20_ABI = [
  'function transfer(address to, uint256 amount) returns (bool)',
  'function balanceOf(address owner) view returns (uint256)',
];

// Minimal ERC-8183 ABI, createJob() from Arc quickstart
const ERC8183_ABI = [
  'function createJob(address provider, address evaluator, address paymentToken, uint256 paymentAmount, bytes32 deliverableHash, uint256 deadline) returns (uint256)',
  'function completeJob(uint256 jobId) returns (bool)',
  'function refundJob(uint256 jobId) returns (bool)',
];

let _provider: ethers.JsonRpcProvider | null = null;
let _signer: ethers.Wallet | null = null;

function getProvider(): ethers.JsonRpcProvider {
  if (_provider) return _provider;
  const rpc = process.env.ARC_RPC_URL ?? ARC_TESTNET_RPC;
  _provider = new ethers.JsonRpcProvider(rpc, ARC_TESTNET_CHAIN_ID);
  return _provider;
}

function getSigner(): ethers.Wallet {
  if (_signer) return _signer;
  const key = process.env.ARC_PRIVATE_KEY;
  if (!key) throw new Error('ARC_PRIVATE_KEY not configured, cannot submit Arc transactions');
  _signer = new ethers.Wallet(key, getProvider());
  return _signer;
}

export function isArcSettlerEnabled(): boolean {
  return Boolean(process.env.ARC_PRIVATE_KEY);
}

export async function getSignerAddress(): Promise<string> {
  return getSigner().address;
}

// ── USDC balance check ────────────────────────────────────────────────────────

export async function getUsdcBalance(address?: string): Promise<bigint> {
  const provider = getProvider();
  const usdc = new ethers.Contract(USDC_ARC_TESTNET, ERC20_ABI, provider);
  const addr = address ?? getSigner().address;
  return usdc.getFunction('balanceOf')(addr) as Promise<bigint>;
}

// ── Settlement transfer ───────────────────────────────────────────────────────
// Sends a small USDC amount to the session recipient as proof of real Arc settlement.
// Amount is the actual AI billing cost in USDC-e6 units.

export async function settleOnArc(params: {
  toAddress: string;
  amountUsd: number;
  memo?: string;
}): Promise<{ txHash: string; blockNumber: number; gasUsed: string }> {
  const signer = getSigner();
  const usdc = new ethers.Contract(USDC_ARC_TESTNET, ERC20_ABI, signer);

  // Convert USD to USDC-e6 (floor at 1 to avoid zero-value transfers)
  const amountE6 = BigInt(Math.max(1, Math.round(params.amountUsd * 1_000_000)));

  // Explicit gasLimit avoids estimation failure on Arc's USDC-as-native-gas setup
  const tx = await (usdc.getFunction('transfer').populateTransaction(params.toAddress, amountE6)
    .then((populated) => signer.sendTransaction({ ...populated, gasLimit: 100000n })) as Promise<ethers.TransactionResponse>);
  const receipt = await tx.wait(1);

  if (!receipt) throw new Error('Arc tx receipt was null');

  return {
    txHash: receipt.hash,
    blockNumber: receipt.blockNumber,
    gasUsed: receipt.gasUsed.toString(),
  };
}

// ── ERC-8183 job creation ─────────────────────────────────────────────────────
// Creates an on-chain agentic job with USDC escrow.
// provider = specialist agent address, evaluator = P402 policy engine address

export async function createErc8183Job(params: {
  providerAddress: string;
  evaluatorAddress: string;
  escrowAmountUsd: number;
  deliverableHash: string;   // bytes32 hex, keccak256 of deliverable
  deadlineSeconds?: number;  // default 1 hour
}): Promise<{ txHash: string; jobId: string; blockNumber: number }> {
  const signer = getSigner();
  const contract = new ethers.Contract(ERC_8183_AGENTIC_COMMERCE, ERC8183_ABI, signer);

  const amountE6 = BigInt(Math.max(1, Math.round(params.escrowAmountUsd * 1_000_000)));
  const deadline = BigInt(Math.floor(Date.now() / 1000) + (params.deadlineSeconds ?? 3600));

  // Pad deliverableHash to bytes32 if needed
  const deliverableBytes32 = params.deliverableHash.startsWith('0x')
    ? params.deliverableHash.padEnd(66, '0')
    : `0x${params.deliverableHash.padEnd(64, '0')}`;

  const tx = await (contract.getFunction('createJob')(
    params.providerAddress,
    params.evaluatorAddress,
    USDC_ARC_TESTNET,
    amountE6,
    deliverableBytes32,
    deadline,
  ) as Promise<ethers.ContractTransactionResponse>);

  const receipt = await tx.wait(1);
  if (!receipt) throw new Error('ERC-8183 createJob receipt was null');

  // Extract jobId from logs (first uint256 in Transfer or JobCreated event)
  // Fall back to block number as a deterministic ID if event parsing fails
  let jobId = `${receipt.blockNumber}-${receipt.index}`;
  try {
    const iface = new ethers.Interface(ERC8183_ABI);
    for (const log of receipt.logs) {
      try {
        const parsed = iface.parseLog(log);
        if (parsed?.name === 'JobCreated') {
          jobId = parsed.args[0]?.toString() ?? jobId;
          break;
        }
      } catch { /* skip unparseable logs */ }
    }
  } catch { /* non-fatal */ }

  return {
    txHash: receipt.hash,
    jobId,
    blockNumber: receipt.blockNumber,
  };
}

// ── Fallback with retry across RPC endpoints ─────────────────────────────────

export async function settleOnArcWithFallback(params: {
  toAddress: string;
  amountUsd: number;
}): Promise<{ txHash: string; blockNumber: number; gasUsed: string } | null> {
  const rpcs = [process.env.ARC_RPC_URL ?? ARC_TESTNET_RPC, ...ARC_TESTNET_RPC_FALLBACKS];

  for (const rpc of rpcs) {
    try {
      _provider = new ethers.JsonRpcProvider(rpc, ARC_TESTNET_CHAIN_ID);
      _signer = null; // force re-init with new provider
      return await settleOnArc(params);
    } catch (err) {
      // try next RPC
      if (rpc === rpcs[rpcs.length - 1]) throw err;
    }
  }
  return null;
}
