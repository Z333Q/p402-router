/**
 * On-chain settler for the `base` mppx charge method (Phase 3.2).
 *
 * Provides `executeBaseSettle`, used as the `onSettle` callback in
 * `verifyBaseCharge()`. Two-layer replay protection:
 *   1. Redis nonce lock (pre-execution, prevents concurrent duplicate submissions)
 *   2. FacilitatorWallet.executeSettlement simulation (on-chain: revert if nonce used)
 *
 * Note: The FacilitatorWallet chain (base vs base-sepolia) is determined by
 * NEXT_PUBLIC_CHAIN_ENV at startup. Set NEXT_PUBLIC_CHAIN_ENV=testnet for Sepolia.
 */

import type { Hex } from 'viem';
import { getFacilitatorWallet } from '@/lib/x402/facilitator-wallet';
import { BASE_TOKEN_CONFIG } from '@p402/mpp-method';
import type { BaseChargeSettleData } from '@p402/mpp-method';
import redis from '@/lib/redis';

const NONCE_TTL_S = 86400; // 24 hours — covers the EIP-3009 validBefore window

/**
 * Split a 65-byte packed ECDSA signature into (v, r, s).
 * Input: 0x-prefixed 130-char hex string (0x + r[32B] + s[32B] + v[1B]).
 */
function splitSignature(sig: string): { v: number; r: Hex; s: Hex } {
    const r = sig.slice(0, 66) as Hex;              // '0x' + 64 hex = 32 bytes
    const s = `0x${sig.slice(66, 130)}` as Hex;     // '0x' + 64 hex = 32 bytes
    const v = parseInt(sig.slice(130, 132), 16);    // 1 byte = 27 or 28
    return { v, r, s };
}

/**
 * Execute an on-chain EIP-3009 transferWithAuthorization for the `base` method.
 *
 * Usage (in route handler):
 * ```ts
 * await verifyBaseCharge({ ..., onSettle: executeBaseSettle });
 * ```
 */
export async function executeBaseSettle(data: BaseChargeSettleData): Promise<string> {
    const { authorization, signature, currency, network } = data;

    // Layer 1: Redis nonce lock — prevent concurrent duplicate submissions
    const nonceKey = `mppx:base:nonce:${authorization.nonce}`;
    const locked = await redis
        .set(nonceKey, '1', 'EX', NONCE_TTL_S, 'NX')
        .catch((err: unknown) => {
            // Redis unavailable — log alert and fall through to on-chain simulation as safety net
            console.error('[mppx:alert] CRITICAL redis_lock_failure', {
                nonce: authorization.nonce,
                error: String(err),
                fallback: 'on-chain simulateContract only',
                timestamp: new Date().toISOString(),
            });
            return 'ok'; // treat as unlocked so settlement proceeds; on-chain sim is the backstop
        });
    if (locked === null) {
        console.warn('[mppx:alert] WARN nonce_replay_detected', {
            nonce: authorization.nonce,
            currency,
            network,
            timestamp: new Date().toISOString(),
        });
        throw new Error('base: authorization nonce already used (replay detected)');
    }

    const tokenAddress = network === 'base'
        ? BASE_TOKEN_CONFIG[currency].mainnet
        : BASE_TOKEN_CONFIG[currency].sepolia;

    const { v, r, s } = splitSignature(signature);

    // Layer 2: FacilitatorWallet — simulateContract catches on-chain used nonces
    const wallet = await getFacilitatorWallet();
    const settlementId = crypto.randomUUID();
    const settleStart = Date.now();
    let txHash: string;
    try {
        txHash = await wallet.executeSettlement(
            tokenAddress,
            {
                from: authorization.from as Hex,
                to: authorization.to as Hex,
                value: BigInt(authorization.value),
                validAfter: Number(authorization.validAfter),
                validBefore: Number(authorization.validBefore),
                nonce: authorization.nonce as Hex,
                v,
                r,
                s,
            },
            settlementId,
        );
    } catch (err) {
        console.error('[mppx:alert] CRITICAL settlement_failure', {
            rail: 'base',
            currency,
            network,
            token: tokenAddress,
            from: authorization.from,
            value: authorization.value,
            settlementId,
            latencyMs: Date.now() - settleStart,
            error: String(err),
            timestamp: new Date().toISOString(),
        });
        throw err;
    }

    console.info('[mppx:settlement] settled', {
        rail: 'base',
        currency,
        network,
        txHash,
        value: authorization.value,
        settlementId,
        latencyMs: Date.now() - settleStart,
    });

    return txHash;
}
