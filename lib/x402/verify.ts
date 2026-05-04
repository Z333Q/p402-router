/**
 * x402 Payment Verification
 * =========================
 * Parses and verifies x402 payment headers.
 *
 * Supports two wire formats:
 *
 *   Format A — Official @x402/core JSON (recommended for new integrations):
 *     X-PAYMENT header: JSON { x402Version, scheme, network, payload: { signature, authorization } }
 *
 *   Format B — Legacy P402 semicolon-delimited:
 *     X-402-Payment header: "x402-v1;network=8453;token=0x...;tx=0x..."
 *
 * Both formats are accepted transparently. All new P402 responses include
 * the official @x402/core Content-Type so external agents using @x402/fetch
 * interoperate out of the box.
 */

import { createPublicClient, http, parseUnits, type Hex } from 'viem';
import { base, tempo } from 'viem/chains';
import { TEMPO_CHAIN_ID, TEMPO_RPC_URL, TEMPO_SUPPORTED_CURRENCIES } from '@/lib/constants/tempo';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface X402PaymentHeader {
    version: string;
    network: number;
    token: Hex;
    tokenSymbol?: string;
    txHash?: Hex;
    signature?: string;
    receiptId?: string;
    amount?: string;
    // Official x402 fields (present when parsed from JSON format)
    authorization?: {
        from: string;
        to: string;
        value: string;
        validAfter: string;
        validBefore: string;
        nonce: string;
    };
    format?: 'official' | 'legacy';
}

export interface VerificationResult {
    valid: boolean;
    amount?: bigint;
    sender?: Hex;
    error?: string;
}

// Official @x402/core PaymentPayload shape (subset we need)
interface OfficialPaymentPayload {
    x402Version?: number;
    scheme?: string;
    network?: string; // CAIP-2 e.g. "eip155:8453"
    payload?: {
        signature?: string;
        authorization?: {
            from?: string;
            to?: string;
            value?: string;
            validAfter?: string;
            validBefore?: string;
            nonce?: string;
        };
    };
}

// ---------------------------------------------------------------------------
// Token config
// ---------------------------------------------------------------------------

// Tempo entries are derived from TEMPO_SUPPORTED_CURRENCIES (lib/constants/tempo.ts)
// to keep a single source of truth. To add a Tempo token, update that file.
const TEMPO_TOKEN_ADDRESSES: Record<string, Hex> = Object.fromEntries(
    TEMPO_SUPPORTED_CURRENCIES.map((c) => [c.symbol, c.contract as Hex])
);

const TOKEN_ADDRESSES: Record<number, Record<string, Hex>> = {
    8453: {
        USDC: '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913',
        USDT: '0xfde4C96c8593536E31F229EA8f37b2ADa2699bb2',
    },
    84532: {
        USDC: '0x036CbD53842c5426634e7929541eC2318f3dCF7e',
    },
    // Tempo Mainnet (chain 4217) — all 10 TIP-20 stablecoins
    // ⚠ Some have verified: false — see lib/constants/tempo.ts for the full list.
    [TEMPO_CHAIN_ID]: TEMPO_TOKEN_ADDRESSES,
};

export function resolveTokenSymbol(
    chainId: number,
    address: string
): string | undefined {
    const tokens = TOKEN_ADDRESSES[chainId];
    if (!tokens) return undefined;
    const lower = address.toLowerCase();
    for (const [sym, addr] of Object.entries(tokens)) {
        if (addr.toLowerCase() === lower) return sym;
    }
    return undefined;
}

// ---------------------------------------------------------------------------
// Dual-format parser
// ---------------------------------------------------------------------------

/**
 * Parse an X-PAYMENT or X-402-Payment header value into a unified
 * X402PaymentHeader regardless of which wire format was used.
 */
export function parseX402Header(header: string): X402PaymentHeader | null {
    // Detect official @x402/core JSON format
    const trimmed = header.trim();
    if (trimmed.startsWith('{')) {
        return parseOfficialX402Header(trimmed);
    }
    // Fall through: legacy P402 semicolon format
    return parseLegacyX402Header(header);
}

/** Parse official @x402/core JSON payload */
function parseOfficialX402Header(json: string): X402PaymentHeader | null {
    try {
        const payload = JSON.parse(json) as OfficialPaymentPayload;

        // CAIP-2 → numeric chain ID (e.g. "eip155:8453" → 8453)
        const networkStr = payload.network ?? payload.payload?.authorization?.to ?? '';
        const chainIdMatch = networkStr.match(/:(\d+)$/);
        const network = chainIdMatch?.[1] ? parseInt(chainIdMatch[1], 10) : 0;

        const auth = payload.payload?.authorization;
        const toAddress = auth?.to;

        // Resolve token address: for USDC on Base we know the address
        const usdcAddress = TOKEN_ADDRESSES[network]?.['USDC'];
        const token: Hex = (usdcAddress ?? '0x') as Hex;

        return {
            version: String(payload.x402Version ?? '2'),
            network,
            token,
            tokenSymbol: usdcAddress ? 'USDC' : undefined,
            signature: payload.payload?.signature,
            authorization: auth
                ? {
                      from: auth.from ?? '',
                      to: auth.to ?? '',
                      value: auth.value ?? '0',
                      validAfter: auth.validAfter ?? '0',
                      validBefore: auth.validBefore ?? String(Math.floor(Date.now() / 1000) + 3600),
                      nonce: auth.nonce ?? '0x',
                  }
                : undefined,
            amount: auth?.value,
            format: 'official',
        };
    } catch {
        return null;
    }
}

/** Parse legacy P402 semicolon-delimited format */
function parseLegacyX402Header(header: string): X402PaymentHeader | null {
    try {
        const parts = header.split(';');
        const result: Partial<X402PaymentHeader> = { format: 'legacy' };
        let tokSymbol: string | undefined;

        for (const part of parts) {
            if (part.startsWith('x402-')) {
                result.version = part.replace('x402-', '');
            } else if (part.startsWith('network=')) {
                result.network = parseInt(part.split('=')[1] ?? '0', 10);
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

        if (tokSymbol) result.tokenSymbol = tokSymbol;

        if (!result.version || !result.network) return null;

        // Back-fill tokenSymbol from address when not provided explicitly
        if (!result.tokenSymbol && result.token && result.network) {
            result.tokenSymbol = resolveTokenSymbol(result.network, result.token);
        }

        return result as X402PaymentHeader;
    } catch {
        return null;
    }
}

// ---------------------------------------------------------------------------
// On-chain transaction verification
// ---------------------------------------------------------------------------

export async function verifyTransaction(
    txHash: Hex,
    expectedRecipient: Hex,
    minAmount: bigint,
    chainId = 8453,
    token = 'USDC'
): Promise<VerificationResult> {
    try {
        // Fetch the receipt using a chain-specific client.
        // Branches are kept separate so TypeScript infers each client type in isolation
        // (viem's PublicClient generics differ between defineChain and known chains).
        const receipt = chainId === TEMPO_CHAIN_ID
            ? await (() => {
                // Use viem `tempo` chain for metadata; override transport URL for env-configurability.
                return createPublicClient({
                    chain: tempo,
                    transport: http(TEMPO_RPC_URL),
                }).getTransactionReceipt({ hash: txHash });
            })()
            : await (() => {
                const rpcUrl =
                    chainId === 8453
                        ? (process.env.NEXT_PUBLIC_RPC_URL ?? 'https://mainnet.base.org')
                        : 'https://sepolia.base.org';
                return createPublicClient({ chain: base, transport: http(rpcUrl) })
                    .getTransactionReceipt({ hash: txHash });
            })();

        if (receipt.status !== 'success') {
            return { valid: false, error: 'Transaction reverted on-chain' };
        }

        const tokenAddress = TOKEN_ADDRESSES[chainId]?.[token];
        if (!tokenAddress) {
            return {
                valid: false,
                error: `Unsupported chain/token combination: ${chainId}/${token}`,
            };
        }

        const transferLog = receipt.logs.find(
            (log) =>
                log.address.toLowerCase() === tokenAddress.toLowerCase() &&
                log.topics[2]?.toLowerCase() ===
                    `0x000000000000000000000000${expectedRecipient
                        .slice(2)
                        .toLowerCase()}`
        );

        if (!transferLog) {
            return {
                valid: false,
                error: `No ${token} transfer to expected recipient found in tx`,
            };
        }

        const amount = BigInt(transferLog.data);
        if (amount < minAmount) {
            return {
                valid: false,
                error: `Insufficient amount: got ${amount}, expected ≥ ${minAmount}`,
            };
        }

        const sender = `0x${transferLog.topics[1]?.slice(-40)}` as Hex;
        return { valid: true, amount, sender };
    } catch (error: unknown) {
        return {
            valid: false,
            error:
                error instanceof Error ? error.message : 'Verification failed',
        };
    }
}

// ---------------------------------------------------------------------------
// Receipt verification
// ---------------------------------------------------------------------------

/**
 * Verify a receipt ID against the appropriate DB table.
 *
 * Receipt ID prefixes:
 *   sr_  → settlement_receipts (EIP-3009 session reuse)
 *   rec_ → x402_receipts      (A2A payment flow)
 */
async function verifyReceipt(receiptId: string): Promise<VerificationResult> {
    try {
        const { createHmac, timingSafeEqual } = await import('crypto');
        const db = (await import('@/lib/db')).default;
        const secret = process.env.P402_RECEIPT_SECRET ?? process.env.NEXTAUTH_SECRET ?? '';

        if (receiptId.startsWith('sr_')) {
            // EIP-3009 settlement receipt
            const res = await db.query(
                `SELECT payer_address, original_amount_atomic, consumed_amount_atomic,
                        facilitator_signature, tx_hash, expires_at
                 FROM settlement_receipts WHERE receipt_id = $1`,
                [receiptId]
            );
            if (!res.rows[0]) {
                return { valid: false, error: 'Receipt not found' };
            }
            const r = res.rows[0] as {
                payer_address: string;
                original_amount_atomic: string;
                consumed_amount_atomic: string;
                facilitator_signature: string;
                tx_hash: string;
                expires_at: string;
            };
            if (new Date(r.expires_at) < new Date()) {
                return { valid: false, error: 'Receipt has expired' };
            }
            const remaining = BigInt(r.original_amount_atomic) - BigInt(r.consumed_amount_atomic);
            if (remaining <= 0n) {
                return { valid: false, error: 'Receipt balance exhausted' };
            }
            // Verify HMAC
            const expected = createHmac('sha256', secret)
                .update(`${receiptId}:${r.tx_hash}:${r.original_amount_atomic}:${r.payer_address}`)
                .digest('hex');
            let sigValid = false;
            try {
                sigValid = timingSafeEqual(Buffer.from(r.facilitator_signature, 'hex'), Buffer.from(expected, 'hex'));
            } catch { sigValid = false; }
            if (!sigValid) {
                return { valid: false, error: 'Receipt signature invalid' };
            }
            return {
                valid: true,
                amount: remaining,
                sender: r.payer_address as Hex,
            };
        }

        // A2A x402_receipts
        const res = await db.query(
            `SELECT use_count, max_uses, valid_until, status, signature, receipt_data
             FROM x402_receipts WHERE receipt_id = $1`,
            [receiptId]
        );
        if (!res.rows[0]) {
            return { valid: false, error: 'Receipt not found' };
        }
        const r = res.rows[0] as {
            use_count: number;
            max_uses: number | null;
            valid_until: string | null;
            status: string;
            signature: string;
            receipt_data: { tx_hash?: string; amount?: number; asset?: string };
        };
        if (r.status !== 'active') {
            return { valid: false, error: `Receipt is ${r.status}` };
        }
        if (r.valid_until && new Date(r.valid_until) < new Date()) {
            return { valid: false, error: 'Receipt has expired' };
        }
        if (r.max_uses !== null && r.use_count >= r.max_uses) {
            return { valid: false, error: 'Receipt use limit reached' };
        }
        // Verify HMAC (rec_ receipts are signed as "receiptId:tx_hash:amount:asset")
        const expected = createHmac('sha256', secret)
            .update(`${receiptId}:${r.receipt_data.tx_hash ?? ''}:${r.receipt_data.amount ?? 0}:${r.receipt_data.asset ?? 'USDC'}`)
            .digest('hex');
        let sigValid = false;
        try {
            sigValid = timingSafeEqual(Buffer.from(r.signature, 'hex'), Buffer.from(expected, 'hex'));
        } catch { sigValid = false; }
        if (!sigValid) {
            return { valid: false, error: 'Receipt signature invalid' };
        }
        return { valid: true };
    } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : '';
        return {
            valid: false,
            error: msg || 'Receipt verification failed',
        };
    }
}

// ---------------------------------------------------------------------------
// Unified verifyX402Payment — checks both header names
// ---------------------------------------------------------------------------

/**
 * Verify an inbound x402 payment from a Request.
 * Checks both X-PAYMENT (official) and X-402-Payment (legacy) headers.
 */
export async function verifyX402Payment(
    request: Request,
    expectedRecipient: Hex,
    minAmountUsd: number
): Promise<VerificationResult> {
    // Official header name takes precedence
    const header =
        request.headers.get('X-PAYMENT') ??
        request.headers.get('X-402-Payment');

    if (!header) {
        return {
            valid: false,
            error: 'Missing payment header. Include X-PAYMENT (official) or X-402-Payment (legacy).',
        };
    }

    const parsed = parseX402Header(header);
    if (!parsed) {
        return { valid: false, error: 'Malformed x402 payment header' };
    }

    // Resolve token symbol
    const tokenSymbol =
        parsed.tokenSymbol ??
        (parsed.token
            ? resolveTokenSymbol(parsed.network, parsed.token)
            : undefined) ??
        'USDC';

    // USDC and USDT use 6 decimals
    const minAmount = parseUnits(minAmountUsd.toString(), 6);

    if (parsed.txHash) {
        return verifyTransaction(
            parsed.txHash,
            expectedRecipient,
            minAmount,
            parsed.network,
            tokenSymbol
        );
    }

    if (parsed.receiptId) {
        return verifyReceipt(parsed.receiptId);
    }

    if (parsed.signature) {
        // EIP-3009 signature verification is handled by SecurityChecks in the settle route
        return { valid: false, error: 'EIP-3009 signature: use /api/v1/facilitator/verify' };
    }

    return { valid: false, error: 'No valid payment proof found in header' };
}
