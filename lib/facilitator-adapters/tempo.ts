/**
 * Tempo Mainnet Direct Facilitator Adapter
 * =========================================
 * Handles x402 onchain-verify scheme on Tempo (chain 4217).
 *
 * Settlement model: user submits transfer(treasury, amount) to a TIP-20 contract,
 * then passes the tx hash to /api/v1/facilitator/verify. The facilitator watches for a
 * confirmed Transfer event and credits the session. No EIP-3009 or off-chain signature needed.
 *
 * Gas: paid by the user in pathUSD via Tempo's FeeAMM (stablecoin gas model).
 * No ETH or native token required; no relayer needed.
 *
 * ⚠ pathUSD transfer restrictions: the TIP-20 spec may restrict which transfer paths are
 * permitted via the payment-only lane. See v2_037_tempo_mpp_facilitator.sql comment for
 * the full caveat. If restricted, the on-chain Transfer event will be absent and
 * verifyTransaction will return { valid: false }.
 *
 * viem 2.48.8+ ships `tempo` with the correct RPC (rpc.tempo.xyz).
 *   We use `chain: tempo` for metadata only and override the transport to TEMPO_RPC_URL
 *   for env-configurability.
 */

import { createPublicClient, http } from 'viem';
import { tempo } from 'viem/chains';
import type { FacilitatorAdapter, FacilitatorProbe } from './index';
import { TEMPO_CHAIN_ID, TEMPO_RPC_URL, TEMPO_SUPPORTED_CURRENCIES } from '@/lib/constants/tempo';

const TEMPO_NETWORK = `eip155:${TEMPO_CHAIN_ID}` as const;
const TEMPO_TREASURY_FALLBACK = '0xe00DD502FF571F3C721f22B3F9E525312d21D797' as const;

// ---------------------------------------------------------------------------
// Probe types
// ---------------------------------------------------------------------------

export interface TempoProbeResult {
    healthy: boolean;
    checks: {
        chainId: { passed: boolean; expected: number; actual?: number; error?: string };
        contractCode: { passed: boolean; address: string; codeLength?: number; error?: string };
        treasuryBalance: { passed: boolean; treasury: string; rawBalance?: string; error?: string };
    };
    durationMs: number;
    probedAt: string;
}

// ---------------------------------------------------------------------------
// Low-level RPC helper
// ---------------------------------------------------------------------------

async function rpcCall(
    rpcUrl: string,
    method: string,
    params: unknown[],
    id: number,
    timeoutMs = 5000
): Promise<{ result?: unknown; error?: { message: string } }> {
    const res = await fetch(rpcUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ jsonrpc: '2.0', method, params, id }),
        signal: AbortSignal.timeout(timeoutMs),
    });
    return res.json() as Promise<{ result?: unknown; error?: { message: string } }>;
}

// ---------------------------------------------------------------------------
// tempoMainnetProbe — three deterministic RPC checks
// ---------------------------------------------------------------------------

/**
 * Run three RPC checks against the Tempo mainnet:
 *   1. eth_chainId must return 0x1089 (4217)
 *   2. eth_getCode on stablecoinAddress must return non-empty bytecode
 *   3. balanceOf(treasuryAddress) on the stablecoin contract must not revert
 *
 * Reads stablecoinAddress and treasuryAddress from caller — never hardcoded here.
 * The cron passes them from auth_config.stablecoin.address and the treasury_address
 * DB column so the probe follows the row, not compiled-in constants.
 *
 * Each check has a 5-second timeout. Failures are captured per-check; a single
 * failure marks the probe unhealthy but all three checks still run.
 */
export async function tempoMainnetProbe(opts: {
    rpcUrl?: string;
    stablecoinAddress: string;
    treasuryAddress: string;
}): Promise<TempoProbeResult> {
    const rpcUrl = opts.rpcUrl ?? TEMPO_RPC_URL;
    const start = Date.now();

    const checks: TempoProbeResult['checks'] = {
        chainId: { passed: false, expected: TEMPO_CHAIN_ID },
        contractCode: { passed: false, address: opts.stablecoinAddress },
        treasuryBalance: { passed: false, treasury: opts.treasuryAddress },
    };

    // Check 1: chain ID must be 4217
    try {
        const json = await rpcCall(rpcUrl, 'eth_chainId', [], 1);
        if (json.error) {
            checks.chainId.error = json.error.message;
        } else {
            const actual = parseInt(String(json.result ?? '0x0'), 16);
            checks.chainId.actual = actual;
            checks.chainId.passed = actual === TEMPO_CHAIN_ID;
            if (!checks.chainId.passed) {
                checks.chainId.error = `chain_id_mismatch: got ${actual}, expected ${TEMPO_CHAIN_ID}`;
            }
        }
    } catch (err: unknown) {
        checks.chainId.error = err instanceof Error ? err.message : String(err);
    }

    // Check 2: stablecoin contract must have bytecode at its address
    try {
        const json = await rpcCall(rpcUrl, 'eth_getCode', [opts.stablecoinAddress, 'latest'], 2);
        if (json.error) {
            checks.contractCode.error = json.error.message;
        } else {
            const code = String(json.result ?? '0x');
            const codeLength = code.length > 2 ? code.length - 2 : 0;
            checks.contractCode.codeLength = codeLength;
            checks.contractCode.passed = codeLength > 0;
            if (!checks.contractCode.passed) {
                checks.contractCode.error = 'contract_code_missing: no bytecode at stablecoin address';
            }
        }
    } catch (err: unknown) {
        checks.contractCode.error = err instanceof Error ? err.message : String(err);
    }

    // Check 3: balanceOf(treasury) must not revert
    // ERC-20 / TIP-20 balanceOf selector: keccak256("balanceOf(address)") = 0x70a08231
    try {
        const treasuryPadded = opts.treasuryAddress.replace(/^0x/i, '').toLowerCase().padStart(64, '0');
        const callData = `0x70a08231${treasuryPadded}`;
        const json = await rpcCall(
            rpcUrl,
            'eth_call',
            [{ to: opts.stablecoinAddress, data: callData }, 'latest'],
            3
        );
        if (json.error) {
            checks.treasuryBalance.error = `treasury_balance_unreadable: ${json.error.message}`;
        } else {
            const raw = String(json.result ?? '0x');
            checks.treasuryBalance.rawBalance = raw;
            // Any response with data beyond bare '0x' is a successful call
            checks.treasuryBalance.passed = raw.startsWith('0x') && raw.length > 2;
            if (!checks.treasuryBalance.passed) {
                checks.treasuryBalance.error = 'treasury_balance_unreadable: empty response from balanceOf';
            }
        }
    } catch (err: unknown) {
        checks.treasuryBalance.error = err instanceof Error ? err.message : String(err);
    }

    return {
        healthy: checks.chainId.passed && checks.contractCode.passed && checks.treasuryBalance.passed,
        checks,
        durationMs: Date.now() - start,
        probedAt: new Date().toISOString(),
    };
}

// ---------------------------------------------------------------------------
// TempoAdapter — FacilitatorAdapter implementation
// ---------------------------------------------------------------------------

export class TempoAdapter implements FacilitatorAdapter {
    readonly id = 'fac_tempo_mainnet_direct';
    readonly name = 'Tempo Mainnet Direct';
    readonly networks = [TEMPO_NETWORK];

    supports(args: { network: string; scheme: string; asset: string }): boolean {
        if (args.network !== TEMPO_NETWORK) return false;
        if (args.scheme !== 'onchain') return false;

        const assetLower = args.asset.toLowerCase();
        const match = TEMPO_SUPPORTED_CURRENCIES.find(
            (c) => c.symbol.toLowerCase() === assetLower || c.contract.toLowerCase() === assetLower
        );

        if (!match) return false;

        if (!match.verified) {
            console.warn(JSON.stringify({
                event: 'unverified_currency_settlement_attempted',
                currency: match.symbol,
                contract: match.contract,
                facilitator: this.id,
            }));
        }

        return true;
    }

    async probe(): Promise<FacilitatorProbe> {
        // When called via the FacilitatorAdapter interface (e.g. /api/v1/facilitator/health),
        // we don't have the DB row. Fall back to constants as the source of truth.
        const defaultCurrency = TEMPO_SUPPORTED_CURRENCIES.find((c) => c.isDefault);
        const stablecoinAddress = defaultCurrency?.contract ?? (TEMPO_SUPPORTED_CURRENCIES[0]?.contract ?? '0x');
        const treasuryAddress = process.env.TEMPO_TREASURY_ADDRESS ?? TEMPO_TREASURY_FALLBACK;

        try {
            const result = await tempoMainnetProbe({ stablecoinAddress, treasuryAddress });

            const failedChecks = Object.entries(result.checks)
                .filter(([, c]) => !c.passed)
                .map(([name, c]) => `${name}: ${c.error ?? 'failed'}`)
                .join('; ');

            if (!result.healthy) {
                return {
                    status: 'down',
                    p95VerifyMs: result.durationMs,
                    p95SettleMs: result.durationMs + 2000,
                    successRate: 0,
                    lastCheckedAt: result.probedAt,
                    reason: failedChecks,
                };
            }

            return {
                status: 'healthy',
                p95VerifyMs: result.durationMs,
                // onchain confirmation ~2s on Tempo; settle = verify (no separate execution)
                p95SettleMs: result.durationMs + 2000,
                successRate: 0.999,
                lastCheckedAt: result.probedAt,
            };
        } catch (err: unknown) {
            const msg = err instanceof Error ? err.message : String(err);
            return {
                status: 'down',
                p95VerifyMs: 0,
                p95SettleMs: 0,
                successRate: 0,
                lastCheckedAt: new Date().toISOString(),
                reason: msg,
            };
        }
    }

    /** Build a viem public client for Tempo with the canonical RPC URL. */
    buildClient() {
        return createPublicClient({
            // Use the viem `tempo` chain for metadata (name, nativeCurrency, explorer).
            // ⚠ viem 2.46.3 has stale rpcUrls (rpc.presto.tempo.xyz) — transport overrides it.
            chain: tempo,
            transport: http(TEMPO_RPC_URL),
        });
    }

    getEndpoint(): string {
        const base = process.env.NEXT_PUBLIC_APP_URL ?? 'https://p402.io';
        return `${base}/api/v1/facilitator`;
    }

    getPaymentConfig(): { treasuryAddress: string } {
        return {
            treasuryAddress: process.env.TEMPO_TREASURY_ADDRESS ?? TEMPO_TREASURY_FALLBACK,
        };
    }
}
