/**
 * World AgentKit Integration
 * ==========================
 * Server-side proof-of-unique-human verification for the P402 payment layer.
 *
 * Agents registered in the AgentBook contract (Base mainnet via World ID) can
 * prove they represent a unique human using a ZK nullifier hash, then receive
 * free-trial or discounted access to P402 endpoints without paying x402 fees.
 *
 * Wire format (agent → server):
 *   Header: agentkit: <base64-encoded JSON AgentkitPayload>
 *   AgentkitPayload fields: domain, address, uri, version, chainId, type,
 *     nonce, issuedAt, signature, [signatureScheme], [expirationTime]
 *
 * Feature flag: AGENTKIT_ENABLED=true
 * Free-trial uses: AGENTKIT_FREE_TRIAL_USES (default: 5 per human per endpoint)
 */

import {
    createAgentBookVerifier,
    declareAgentkitExtension,
    parseAgentkitHeader,
    validateAgentkitMessage,
    verifyAgentkitSignature,
    type AgentBookVerifier,
    type AgentKitStorage,
    type AgentkitExtension,
    type AgentkitMode,
} from '@worldcoin/agentkit';
import db from '@/lib/db';

// ---------------------------------------------------------------------------
// Feature flag + config
// ---------------------------------------------------------------------------

export const AGENTKIT_ENABLED = process.env.AGENTKIT_ENABLED === 'true';

const FREE_TRIAL_USES = parseInt(
    process.env.AGENTKIT_FREE_TRIAL_USES ?? '5',
    10
);

const DEFAULT_MODE: AgentkitMode = {
    type: 'free-trial',
    uses: FREE_TRIAL_USES,
};

// ---------------------------------------------------------------------------
// PostgreSQL-backed AgentKitStorage
// ---------------------------------------------------------------------------

class P402AgentKitStorage implements AgentKitStorage {
    async getUsageCount(endpoint: string, humanId: string): Promise<number> {
        const res = await db.query(
            'SELECT use_count FROM agentkit_usage WHERE endpoint = $1 AND human_id = $2',
            [endpoint, humanId]
        );
        const row = res.rows[0] as { use_count: number } | undefined;
        return row?.use_count ?? 0;
    }

    async incrementUsage(endpoint: string, humanId: string): Promise<void> {
        await db.query(
            `INSERT INTO agentkit_usage (endpoint, human_id, use_count, updated_at)
             VALUES ($1, $2, 1, NOW())
             ON CONFLICT (endpoint, human_id)
             DO UPDATE SET use_count = agentkit_usage.use_count + 1, updated_at = NOW()`,
            [endpoint, humanId]
        );
    }

    async hasUsedNonce(nonce: string): Promise<boolean> {
        const res = await db.query(
            'SELECT 1 FROM agentkit_nonces WHERE nonce = $1',
            [nonce]
        );
        return (res.rowCount ?? 0) > 0;
    }

    async recordNonce(nonce: string): Promise<void> {
        await db.query(
            'INSERT INTO agentkit_nonces (nonce, created_at) VALUES ($1, NOW()) ON CONFLICT DO NOTHING',
            [nonce]
        );
    }
}

// ---------------------------------------------------------------------------
// Singletons (lazy init — safe in Next.js server context)
// ---------------------------------------------------------------------------

let _storage: P402AgentKitStorage | null = null;
let _agentBook: AgentBookVerifier | null = null;

function getStorage(): P402AgentKitStorage {
    if (!_storage) _storage = new P402AgentKitStorage();
    return _storage;
}

function getAgentBook(): AgentBookVerifier {
    if (!_agentBook) {
        _agentBook = createAgentBookVerifier({ network: 'base' });
    }
    return _agentBook;
}

// ---------------------------------------------------------------------------
// Public types
// ---------------------------------------------------------------------------

export interface AgentkitCheckResult {
    /**
     * If true, skip billing guard entirely — verified human with remaining free-trial uses.
     * If false, normal billing applies (but see humanVerified for rate-limit policy).
     */
    grantAccess: boolean;
    /**
     * True if the agent's wallet is registered in AgentBook with a World ID proof.
     * May be true even when grantAccess is false (free trial exhausted).
     * Used by Billing Guard to apply the verified-agent rate limit (2,000 req/hr).
     */
    humanVerified: boolean;
    /** The agent's wallet address (present when humanVerified is true). */
    address?: string;
    /** The World ID nullifier hash identifying the human (privacy-preserving). */
    humanId?: string;
    /** Remaining free-trial uses for this human+endpoint after this request. */
    usageRemaining?: number;
}

// ---------------------------------------------------------------------------
// Core verification pipeline
// ---------------------------------------------------------------------------

/**
 * Check the inbound request for a valid World AgentKit proof.
 *
 * Returns { grantAccess: true, address, humanId, usageRemaining } if the agent
 * is in AgentBook, the signature is valid, and the usage limit is not exhausted.
 *
 * Returns { grantAccess: false } for any failure — never throws. All errors
 * are logged as warnings and fall through to normal billing.
 */
export async function checkAgentkitAccess(
    req: { headers: { get(name: string): string | null } },
    path: string
): Promise<AgentkitCheckResult> {
    if (!AGENTKIT_ENABLED) return { grantAccess: false, humanVerified: false };

    const agentkitHeader = req.headers.get('agentkit');
    if (!agentkitHeader) return { grantAccess: false, humanVerified: false };

    try {
        const storage = getStorage();

        // Step 1: Parse the SIWE payload from the base64-encoded header
        const payload = parseAgentkitHeader(agentkitHeader);

        // Step 2: Validate the SIWE message (domain, uri, issuedAt, expiry, nonce replay)
        const resourceUri = `https://p402.io${path}`;
        const validationResult = await validateAgentkitMessage(payload, resourceUri, {
            maxAge: 300, // 5 minutes — nonces expire after 5 minutes
            checkNonce: async (nonce: string) => {
                // Return true if nonce is fresh (not yet used)
                const used = await storage.hasUsedNonce(nonce);
                return !used;
            },
        });

        if (!validationResult.valid) {
            console.warn('[AgentKit] Message validation failed:', validationResult.error);
            return { grantAccess: false, humanVerified: false };
        }

        // Step 3: Verify the EVM signature (EIP-191 / EIP-1271 / EIP-6492 smart wallets)
        const rpcUrl = process.env.NEXT_PUBLIC_RPC_URL ?? 'https://mainnet.base.org';
        const sigResult = await verifyAgentkitSignature(payload, rpcUrl);

        if (!sigResult.valid) {
            console.warn('[AgentKit] Signature verification failed:', sigResult.error);
            return { grantAccess: false, humanVerified: false };
        }

        const address = sigResult.address ?? payload.address;

        // Step 4: Look up the agent's wallet in AgentBook to get the anonymous humanId
        const humanId = await getAgentBook().lookupHuman(address, payload.chainId);

        if (!humanId) {
            console.log(`[AgentKit] Not in AgentBook: address=${address}`);
            return { grantAccess: false, humanVerified: false };
        }

        // Step 5: Check usage against the free-trial limit
        const usageCount = await storage.getUsageCount(path, humanId);

        if (usageCount >= FREE_TRIAL_USES) {
            console.log(
                `[AgentKit] Free trial exhausted: humanId=${humanId} endpoint=${path} count=${usageCount}`
            );
            // grantAccess=false (trial done) but humanVerified=true (still a known human)
            // Billing Guard uses this to apply the 2,000 req/hr verified-agent rate limit.
            return { grantAccess: false, humanVerified: true, address, humanId, usageRemaining: 0 };
        }

        // Step 6: Record the nonce (prevent replay) and increment usage atomically
        await storage.recordNonce(payload.nonce);
        await storage.incrementUsage(path, humanId);

        const usageRemaining = FREE_TRIAL_USES - usageCount - 1;
        console.log(
            `[AgentKit] Verified: address=${address} humanId=${humanId.slice(0, 10)}… remaining=${usageRemaining}`
        );

        return { grantAccess: true, humanVerified: true, address, humanId, usageRemaining };
    } catch (err) {
        // Non-blocking: any error falls through to normal billing
        console.warn(
            '[AgentKit] checkAgentkitAccess error (falling through to billing):',
            (err as Error).message
        );
        return { grantAccess: false, humanVerified: false };
    }
}

// ---------------------------------------------------------------------------
// Extension descriptor for 402 / billing-error responses
// ---------------------------------------------------------------------------

/**
 * Build a per-request AgentKit extension descriptor to include in 402 and
 * billing-blocked responses. This tells agents they can prove humanity for
 * free-trial access.
 *
 * Generates a fresh nonce each call (agents must sign the exact nonce issued).
 */
export function buildAgentkitChallengeExtension(): Record<string, AgentkitExtension> | null {
    if (!AGENTKIT_ENABLED) return null;

    try {
        return declareAgentkitExtension({
            domain: 'p402.io',
            resourceUri: 'https://p402.io/api/v2/chat/completions',
            statement:
                'Sign in with your World ID–verified wallet to access P402 free-trial (5 requests per human).',
            network: 'eip155:8453',
            expirationSeconds: 300,
            mode: DEFAULT_MODE,
        }) as Record<string, AgentkitExtension>;
    } catch {
        return null;
    }
}
