// lib/meter/tempo-settler.ts
// Submits real USDC.e transactions on Tempo mainnet for ledger event proof.
// Requires TEMPO_TREASURY_PRIVATE_KEY env var with USDC.e balance.
// Fund the wallet: send USDC.e to the signer address on Tempo mainnet (chain 4217).

import { createWalletClient, createPublicClient, http, parseUnits, formatUnits } from 'viem';
import { privateKeyToAccount } from 'viem/accounts';
import { tempo } from 'viem/chains';
import {
    TEMPO_CHAIN_ID,
    TEMPO_RPC_URL,
    TEMPO_EXPLORER_URL,
    TEMPO_SUPPORTED_CURRENCIES,
} from '@/lib/constants/tempo';

const USDC_E = TEMPO_SUPPORTED_CURRENCIES.find((c) => c.isDefault)!;

// Minimal ERC-20 ABI — only what the settler needs.
const ERC20_ABI = [
    {
        name: 'transfer',
        type: 'function',
        stateMutability: 'nonpayable',
        inputs: [
            { name: 'to', type: 'address' },
            { name: 'amount', type: 'uint256' },
        ],
        outputs: [{ type: 'bool' }],
    },
    {
        name: 'balanceOf',
        type: 'function',
        stateMutability: 'view',
        inputs: [{ name: 'owner', type: 'address' }],
        outputs: [{ type: 'uint256' }],
    },
] as const;

// Module-level singletons — one cold start, one client.
let _walletClient: ReturnType<typeof createWalletClient> | null = null;
let _publicClient: ReturnType<typeof createPublicClient> | null = null;

function getPublicClient(): ReturnType<typeof createPublicClient> {
    if (_publicClient) return _publicClient;
    _publicClient = createPublicClient({
        chain: { ...tempo, id: TEMPO_CHAIN_ID },
        transport: http(TEMPO_RPC_URL),
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    }) as any;
    return _publicClient!;
}

function getWalletClient(): ReturnType<typeof createWalletClient> {
    if (_walletClient) return _walletClient;
    const key = process.env.TEMPO_TREASURY_PRIVATE_KEY;
    if (!key) throw new Error('TEMPO_TREASURY_PRIVATE_KEY not configured, cannot submit Tempo transactions');
    const account = privateKeyToAccount(key as `0x${string}`);
    _walletClient = createWalletClient({
        account,
        chain: { ...tempo, id: TEMPO_CHAIN_ID },
        transport: http(TEMPO_RPC_URL),
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    }) as any;
    return _walletClient!;
}

export function isTempoSettlerEnabled(): boolean {
    return Boolean(process.env.TEMPO_TREASURY_PRIVATE_KEY);
}

export function getSignerAddress(): string {
    const key = process.env.TEMPO_TREASURY_PRIVATE_KEY;
    if (!key) throw new Error('TEMPO_TREASURY_PRIVATE_KEY not configured');
    return privateKeyToAccount(key as `0x${string}`).address;
}

// ── USDC.e balance check ──────────────────────────────────────────────────────

export async function getUsdceBalance(address?: string): Promise<bigint> {
    const client = getPublicClient();
    const addr = address ?? getSignerAddress();
    return client.readContract({
        address: USDC_E.contract,
        abi: ERC20_ABI,
        functionName: 'balanceOf',
        args: [addr as `0x${string}`],
    }) as Promise<bigint>;
}

// ── Settlement transfer ───────────────────────────────────────────────────────
// Sends USDC.e (TIP-20) from the settler wallet to the treasury as session-close proof.
// On Tempo, TIP-20 tokens use standard ERC-20 transfer() — no native value field.

export async function settleOnTempo(params: {
    toAddress: string;
    amountUsd: number;
}): Promise<{ txHash: string; blockNumber: number; chainId: number }> {
    const wallet = getWalletClient();
    const client = getPublicClient();

    // parseUnits gives a bigint with correct precision — no float truncation.
    // Floor at 1 raw unit ($0.000001) to avoid zero-value sends.
    const rawAmount = parseUnits(params.amountUsd.toFixed(USDC_E.decimals), USDC_E.decimals);
    const amountRaw = rawAmount < 1n ? 1n : rawAmount;

    const hash = await wallet.writeContract({
        address: USDC_E.contract,
        abi: ERC20_ABI,
        functionName: 'transfer',
        args: [params.toAddress as `0x${string}`, amountRaw],
        // No value field — Tempo TIP-20 uses ERC-20 transfer, not native send.
        chain: { ...tempo, id: TEMPO_CHAIN_ID },
        account: privateKeyToAccount(process.env.TEMPO_TREASURY_PRIVATE_KEY as `0x${string}`),
    });

    const receipt = await client.waitForTransactionReceipt({ hash, confirmations: 1 });

    return {
        txHash: receipt.transactionHash,
        blockNumber: Number(receipt.blockNumber),
        chainId: TEMPO_CHAIN_ID,
    };
}

// ── Fallback with retry ───────────────────────────────────────────────────────

export async function settleOnTempoWithFallback(params: {
    toAddress: string;
    amountUsd: number;
}): Promise<{ txHash: string; blockNumber: number; chainId: number } | null> {
    try {
        return await settleOnTempo(params);
    } catch (err) {
        console.error('[meter:tempo-settler] settlement failed', {
            error: String(err),
            toAddress: params.toAddress,
            amountUsd: params.amountUsd,
            timestamp: new Date().toISOString(),
        });
        return null;
    }
}

// ── Explorer URL helpers ──────────────────────────────────────────────────────

export function tempoExplorerTxUrl(txHash: string): string {
    return `${TEMPO_EXPLORER_URL}/tx/${txHash}`;
}

export function tempoExplorerAddressUrl(address: string): string {
    return `${TEMPO_EXPLORER_URL}/address/${address}`;
}

export function tempoExplorerBlockUrl(blockNumber: number | bigint): string {
    return `${TEMPO_EXPLORER_URL}/block/${blockNumber}`;
}

// ── Human-readable balance ────────────────────────────────────────────────────

export function formatUsdce(rawE6: bigint): string {
    return `${formatUnits(rawE6, USDC_E.decimals)} USDC.e`;
}
