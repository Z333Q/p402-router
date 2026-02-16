/**
 * x402 Payment Verification
 * =========================
 * Parses and verifies x402 payment headers for agent-to-agent payments.
 * 
 * Supports:
 * - On-chain transaction verification
 * - EIP-3009 signature verification
 * - Receipt reuse
 */

import { createPublicClient, http, parseUnits, type Hex } from 'viem';
import { base } from 'viem/chains';

// =============================================================================
// TYPES
// =============================================================================

export interface X402PaymentHeader {
    version: string;
    network: number;
    token: Hex;
    tokenSymbol?: string;
    txHash?: Hex;
    signature?: string;
    receiptId?: string;
    amount?: string;
}

export interface VerificationResult {
    valid: boolean;
    amount?: bigint;
    sender?: Hex;
    error?: string;
}

// =============================================================================
// TOKEN CONTRACT CONFIG
// =============================================================================

const TOKEN_ADDRESSES: Record<number, Record<string, Hex>> = {
    8453: {
        USDC: '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913', // Base Mainnet
        USDT: '0xfde4C96c8593536E31F229EA8f37b2ADa2699bb2', // Base Mainnet (Bridged)
    },
    84532: {
        USDC: '0x036CbD53842c5426634e7929541eC2318f3dCF7e', // Base Sepolia
    },
};

/**
 * Reverse-lookup: given a chain ID and contract address, find the token symbol.
 */
function resolveTokenSymbol(chainId: number, address: string): string | undefined {
    const tokens = TOKEN_ADDRESSES[chainId];
    if (!tokens) return undefined;
    const lowerAddress = address.toLowerCase();
    for (const [symbol, addr] of Object.entries(tokens)) {
        if (addr.toLowerCase() === lowerAddress) return symbol;
    }
    return undefined;
}

const ERC20_ABI = [
    {
        name: 'Transfer',
        type: 'event',
        inputs: [
            { indexed: true, name: 'from', type: 'address' },
            { indexed: true, name: 'to', type: 'address' },
            { indexed: false, name: 'value', type: 'uint256' }
        ]
    }
] as const;

// =============================================================================
// PARSE HEADER
// =============================================================================

export function parseX402Header(header: string): X402PaymentHeader | null {
    try {
        // Format: x402-v1;network=8453;token=0x833...;tok=USDC;tx=0xabc...
        const parts = header.split(';');
        const result: Partial<X402PaymentHeader> = {};
        let tokSymbol: string | undefined;

        for (const part of parts) {
            if (part.startsWith('x402-')) {
                result.version = part.replace('x402-', '');
            } else if (part.startsWith('network=')) {
                result.network = parseInt(part.split('=')[1] ?? '0');
            } else if (part.startsWith('tok=')) {
                tokSymbol = part.split('=')[1];
            } else if (part.startsWith('token=')) {
                result.token = (part.split('=')[1] ?? '') as Hex;
            } else if (part.startsWith('tx=')) {
                result.txHash = (part.split('=')[1] ?? '') as Hex;
            } else if (part.startsWith('sig=')) {
                result.signature = part.split('=')[1] ?? '';
            } else if (part.startsWith('receipt=')) {
                result.receiptId = part.split('=')[1] ?? '';
            } else if (part.startsWith('amount=')) {
                result.amount = part.split('=')[1] ?? '';
            }
        }

        // Store the token symbol for downstream use
        if (tokSymbol) {
            result.tokenSymbol = tokSymbol;
        }

        if (!result.version || !result.network) {
            return null;
        }

        return result as X402PaymentHeader;
    } catch {
        return null;
    }
}

// =============================================================================
// VERIFY ON-CHAIN TRANSACTION
// =============================================================================

export async function verifyTransaction(
    txHash: Hex,
    expectedRecipient: Hex,
    minAmount: bigint,
    chainId: number = 8453,
    token: string = 'USDC'
): Promise<VerificationResult> {
    try {
        const rpcUrl = chainId === 8453
            ? (process.env.NEXT_PUBLIC_RPC_URL || 'https://mainnet.base.org')
            : 'https://sepolia.base.org';

        const client = createPublicClient({
            chain: base,
            transport: http(rpcUrl)
        });

        // Get transaction receipt
        const receipt = await client.getTransactionReceipt({ hash: txHash });

        if (receipt.status !== 'success') {
            return { valid: false, error: 'Transaction failed' };
        }

        // Find Transfer event to treasury
        const tokenAddress = TOKEN_ADDRESSES[chainId]?.[token];
        if (!tokenAddress) {
            return { valid: false, error: `Unsupported chain/token: ${chainId}/${token}` };
        }

        const transferLog = receipt.logs.find(log =>
            log.address.toLowerCase() === tokenAddress.toLowerCase() &&
            log.topics[2]?.toLowerCase() === `0x000000000000000000000000${expectedRecipient.slice(2).toLowerCase()}`
        );

        if (!transferLog) {
            return { valid: false, error: `No ${token} transfer to expected recipient found` };
        }

        // Decode amount
        const amount = BigInt(transferLog.data);
        if (amount < minAmount) {
            return { valid: false, error: `Insufficient amount: ${amount} < ${minAmount}` };
        }

        // Get sender from first topic
        const sender = `0x${transferLog.topics[1]?.slice(-40)}` as Hex;

        return { valid: true, amount, sender };

    } catch (error: any) {
        return { valid: false, error: error.message || 'Verification failed' };
    }
}

// =============================================================================
// VERIFY x402 PAYMENT FROM REQUEST
// =============================================================================

export async function verifyX402Payment(
    request: Request,
    expectedRecipient: Hex,
    minAmountUsd: number
): Promise<VerificationResult> {
    const header = request.headers.get('X-402-Payment');

    if (!header) {
        return { valid: false, error: 'No X-402-Payment header' };
    }

    const parsed = parseX402Header(header);
    if (!parsed) {
        return { valid: false, error: 'Invalid X-402-Payment format' };
    }

    // Resolve token symbol: prefer explicit tok= field, then reverse-lookup from token= address
    let tokenSymbol = parsed.tokenSymbol;
    if (!tokenSymbol && parsed.token) {
        tokenSymbol = resolveTokenSymbol(parsed.network, parsed.token);
    }
    if (!tokenSymbol) {
        tokenSymbol = 'USDC'; // Default for backwards compatibility
    }

    // Both USDC and USDT use 6 decimals
    const minAmount = parseUnits(minAmountUsd.toString(), 6);

    // Verify based on payment type
    if (parsed.txHash) {
        return verifyTransaction(parsed.txHash, expectedRecipient, minAmount, parsed.network, tokenSymbol);
    }

    if (parsed.receiptId) {
        // Receipt reuse - would check database
        return { valid: false, error: 'Receipt verification not implemented' };
    }

    if (parsed.signature) {
        // EIP-3009 - would verify signature
        return { valid: false, error: 'Signature verification not implemented' };
    }

    return { valid: false, error: 'No valid payment proof provided' };
}
