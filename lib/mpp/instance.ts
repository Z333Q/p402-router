/**
 * Feature-flagged mppx instance for P402.
 *
 * Enabled when USE_MPP_METHOD=true. Two method modes:
 *
 *   USE_P402_MPP_METHOD=false (default)
 *     → native tempo() method — Tempo mainnet TIP-20 stablecoin payments
 *     Requires: P402_FACILITATOR_PRIVATE_KEY, MPP_SECRET_KEY, TEMPO_TREASURY_ADDRESS
 *
 *   USE_P402_MPP_METHOD=true
 *     → @p402/mpp-method p402Charge — multi-rail P402 credential (Phase 3 verifier)
 *     Requires: MPP_SECRET_KEY only (no hot-wallet key in the mppx layer)
 *     verifyP402Charge() stub returns success; wired to real settlement in Phase 3.
 *
 * Instance is cached at module level (one per cold start). getMppx() returns
 * null when disabled or misconfigured; callers must guard with `if (mppx)`.
 */

import { Mppx, tempo } from 'mppx/nextjs';
import { privateKeyToAccount } from 'viem/accounts';
import { p402Charge, baseCharge } from '@p402/mpp-method';
import { TEMPO_SUPPORTED_CURRENCIES } from '@/lib/constants/tempo';
import { createMppxStore } from './store';

// ---------------------------------------------------------------------------
// Factory A — native tempo() method (USE_P402_MPP_METHOD=false)
// ---------------------------------------------------------------------------
// Captures the concrete TypeScript type for the tempo instance so that
// `charge`, `session`, etc. are visible without the unconstrained Methods generic.

function _buildTempoInstance(
    privateKey: `0x${string}`,
    secretKey: string,
    currency: `0x${string}`,
    recipient: `0x${string}`,
) {
    return Mppx.create({
        methods: tempo({ currency, recipient, account: privateKeyToAccount(privateKey), store: createMppxStore() }),
        secretKey,
    });
}

// ---------------------------------------------------------------------------
// Factory B — @p402/mpp-method multi-rail (USE_P402_MPP_METHOD=true)
// ---------------------------------------------------------------------------
// Registers p402Charge + baseCharge so clients can use either method.
// No pre-configured hot-wallet at the mppx layer — settlement is dispatched
// via verifyP402Charge() or verifyBaseCharge() in the route handler (Phase 3.2).
//
// Both methods have intent 'charge', so the mppx.charge() shorthand is NOT
// available on this instance (not a unique intent). The route handler uses
// mppx.compose() instead — cast via `as any` since TypeScript infers the
// gateway type from the tempo factory for the .charge() path.

function _buildMultiRailInstance(secretKey: string) {
    return Mppx.create({
        methods: [p402Charge, baseCharge],
        secretKey,
    });
}

// ---------------------------------------------------------------------------
// Gateway type — common subset used by the route handler
// ---------------------------------------------------------------------------
// Both factory return types expose .charge() via mppx's IsUniqueIntent shorthand.
// We capture the tempo type (superset) and use it as the public interface;
// the p402 instance is cast to it since call signatures are compatible.

type TempoInstance = ReturnType<typeof _buildTempoInstance>;
type MultiRailInstance = ReturnType<typeof _buildMultiRailInstance>;

// Gateway type = TempoInstance (exposes .charge() shorthand).
// When USE_P402_MPP_METHOD=true the stored instance is MultiRailInstance cast to
// this type. The route handler uses `(mppx as any).compose()` for multi-rail;
// .charge() is never called on the multi-rail instance.
type MppxGateway = TempoInstance;

// ---------------------------------------------------------------------------
// Module-level singletons (one per cold start)
// ---------------------------------------------------------------------------

let _instance: MppxGateway | null = null;
let _initialized = false;
let _usingP402Method = false;

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Returns the active mppx instance, or null if disabled / misconfigured.
 * Guards: USE_MPP_METHOD must be 'true'; required env vars must be present.
 */
export function getMppx(): MppxGateway | null {
    if (process.env.USE_MPP_METHOD !== 'true') return null;
    if (_initialized) return _instance;
    _initialized = true;

    const secretKey = process.env.MPP_SECRET_KEY;
    if (!secretKey) {
        console.error('[mppx] USE_MPP_METHOD=true but MPP_SECRET_KEY is missing');
        return null;
    }

    _usingP402Method = process.env.USE_P402_MPP_METHOD === 'true';

    if (_usingP402Method) {
        // Multi-rail (p402 + base) — no hot-wallet key at this layer.
        // The route handler calls (mppx as any).compose() for payment handling.
        try {
            const raw: MultiRailInstance = _buildMultiRailInstance(secretKey);
            _instance = raw as unknown as MppxGateway;
            console.info('[mppx] multi-rail active: p402Charge + baseCharge (Phase 3.2)');
            return _instance;
        } catch (err) {
            console.error('[mppx] Mppx.create (multi-rail) failed:', err);
            return null;
        }
    }

    // Default: native tempo() method
    const privateKey = process.env.P402_FACILITATOR_PRIVATE_KEY;
    if (!privateKey) {
        console.error('[mppx] USE_MPP_METHOD=true but P402_FACILITATOR_PRIVATE_KEY is missing');
        return null;
    }

    const usdce = TEMPO_SUPPORTED_CURRENCIES.find((c) => c.symbol === 'USDC.e');
    if (!usdce) {
        console.error('[mppx] USDC.e not found in TEMPO_SUPPORTED_CURRENCIES');
        return null;
    }

    const treasury = (
        process.env.TEMPO_TREASURY_ADDRESS ?? '0xe00DD502FF571F3C721f22B3F9E525312d21D797'
    ) as `0x${string}`;

    try {
        _instance = _buildTempoInstance(
            privateKey as `0x${string}`,
            secretKey,
            usdce.contract,
            treasury,
        );
        console.info('[mppx] tempo method active (Tempo mainnet USDC.e)');
        return _instance;
    } catch (err) {
        console.error('[mppx] Mppx.create (tempo) failed:', err);
        return null;
    }
}

/**
 * Returns true when the p402 method is active (USE_P402_MPP_METHOD=true).
 * Use this to branch to verifyP402Charge() in the route handler.
 */
export function isP402MppMethod(): boolean {
    return _usingP402Method;
}

/**
 * Per-request charge amount in human-readable USDC decimal format.
 * Override with MPP_CHARGE_AMOUNT_USD. Default: $0.001 (1000 raw USDC.e units).
 */
export function getMppxChargeAmount(): string {
    return process.env.MPP_CHARGE_AMOUNT_USD ?? '0.001';
}

/**
 * Extract payer wallet address from an Authorization: Payment <...> header.
 * The credential JSON carries `source` in CAIP-10: "eip155:<chainId>:0x<addr>".
 * Returns null if the header is malformed or missing.
 */
export function extractMppxPayer(authHeader: string): string | null {
    try {
        const encoded = authHeader.slice('Payment '.length);
        const credential = JSON.parse(Buffer.from(encoded, 'base64url').toString('utf8')) as {
            source?: string;
        };
        const parts = (credential.source ?? '').split(':');
        return parts[2] ?? null;
    } catch {
        return null;
    }
}

/**
 * Decode the mppx credential JSON from an Authorization: Payment <...> header.
 * Returns the method name, payload object, and challengeId.
 * Falls back to safe defaults on any parse error.
 */
export function extractMppxCredential(authHeader: string): {
    method: string;
    payload: Record<string, unknown>;
    challengeId: string | null;
} {
    try {
        const encoded = authHeader.startsWith('Payment ') ? authHeader.slice('Payment '.length) : '';
        if (!encoded) return { method: 'p402', payload: {}, challengeId: null };
        const json = JSON.parse(Buffer.from(encoded, 'base64url').toString('utf8')) as {
            method?: string;
            payload?: Record<string, unknown>;
            challengeId?: string;
        };
        return {
            method: json.method ?? 'p402',
            payload: json.payload ?? {},
            challengeId: json.challengeId ?? null,
        };
    } catch {
        return { method: 'p402', payload: {}, challengeId: null };
    }
}
