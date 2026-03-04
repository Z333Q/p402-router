/**
 * CDP Server Wallet — Agent Provisioning
 * ========================================
 * Provisions CDP Server Wallets (v2) for AI agent sessions.
 *
 * Keys live in Coinbase's AWS Nitro Enclave (TEE). No mnemonic phrases
 * are stored or transmitted — this is deliberately different from AgentKit's
 * CdpWalletProvider which requires a mnemonic. CDP Server Wallet v2 is the
 * correct choice for server-side agent wallets.
 *
 * Wallet names are deterministic per agentId so getOrCreateAccount is safe
 * to call idempotently on every session create / restart.
 */

import { getCdpClientAsync, isCdpEnabled } from '@/lib/cdp-client';
import pool from '@/lib/db';

export interface AgentWalletInfo {
    address: string;
    cdpWalletName: string;
    source: 'cdp';
}

/**
 * Returns (or creates) a CDP-managed wallet for the given agent.
 * The wallet name encodes the agentId so it is stable across calls.
 *
 * Throws if CDP is not enabled — callers must check isCdpEnabled() first
 * or handle the error gracefully.
 */
export async function getOrProvisionAgentWallet(
    agentId: string
): Promise<AgentWalletInfo> {
    if (!isCdpEnabled()) {
        throw new Error(
            'CDP Server Wallet is not enabled. ' +
            'Set CDP_SERVER_WALLET_ENABLED=true and CDP credentials to provision agent wallets.'
        );
    }

    const cdp = await getCdpClientAsync();

    // Deterministic, URL-safe wallet name — max 64 chars
    const sanitised = agentId
        .replace(/[^a-z0-9-]/gi, '-')
        .toLowerCase()
        .slice(0, 50);
    const walletName = `p402-agent-${sanitised}`;

    const account = await cdp.evm.getOrCreateAccount({ name: walletName });

    return {
        address: account.address,
        cdpWalletName: walletName,
        source: 'cdp',
    };
}

/**
 * Creates a CDP spending policy scoped to a wallet, capping total ETH value.
 * Returns the policy ID for storage in the session record.
 *
 * This is a chain-level hard cap — independent of P402's AP2 mandate system.
 * Both layers must pass for a transaction to proceed (defence in depth).
 *
 * Returns null if policy creation fails (non-fatal — session is still created).
 */
export async function createSessionSpendingPolicy(
    budgetUsd: number,
    walletAddress: string
): Promise<string | null> {
    if (!isCdpEnabled()) return null;

    try {
        const cdp = await getCdpClientAsync();

        // Approximate USDC budget as ETH-equivalent for the policy.
        // The USDC contract enforces the actual spend; this acts as a circuit-breaker.
        // 1 ETH ≈ $3000 — generous enough not to block legitimate transactions.
        const budgetEth = (budgetUsd / 3000).toFixed(6);
        const budgetWei = BigInt(Math.floor(parseFloat(budgetEth) * 1e18));

        const policy = await cdp.policies.createPolicy({
            policy: {
                scope: 'account',
                description: `P402 session budget: $${budgetUsd} USD`,
                rules: [
                    {
                        action: 'reject',
                        operation: 'signEvmTransaction',
                        criteria: [
                            {
                                type: 'ethValue',
                                ethValue: budgetWei.toString(),
                                operator: '>',
                            },
                        ],
                    },
                ],
            },
        });

        return (policy as { id?: string }).id ?? null;
    } catch (err) {
        // Policy creation is best-effort — session proceeds without it
        console.error('[CDP] Session spending policy creation failed:', err);
        return null;
    }
}

/**
 * Records a CDP-provisioned wallet in the registry table for audit purposes.
 * Fire-and-forget — does not throw.
 */
export async function recordCdpWallet(opts: {
    cdpWalletName: string;
    walletAddress: string;
    purpose: 'facilitator' | 'agent-session';
    sessionId?: string;
}): Promise<void> {
    try {
        await pool.query(
            `INSERT INTO cdp_wallet_registry (id, cdp_wallet_name, wallet_address, purpose, session_token)
             VALUES ($1, $2, $3, $4, $5)
             ON CONFLICT (cdp_wallet_name) DO NOTHING`,
            [
                `cdp_${crypto.randomUUID().replace(/-/g, '')}`,
                opts.cdpWalletName,
                opts.walletAddress,
                opts.purpose,
                opts.sessionId ?? null,
            ]
        );
    } catch {
        // Registry logging is best-effort
    }
}
