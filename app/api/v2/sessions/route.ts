/**
 * P402 V2 Sessions Endpoint
 * =========================
 * Manage agent sessions with budgets and policies.
 *
 * POST /api/v2/sessions — Create a new session
 *   wallet_source: 'cdp'   — P402 provisions a CDP Server Wallet for the agent
 *   wallet_source: 'eoa'   — Caller supplies their own wallet_address
 *   (omitted)              — Wallet-less session; wallet linked later
 *
 * GET  /api/v2/sessions    — List active sessions
 */

import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/db';
import { requireTenantAccess } from '@/lib/auth';
import { isCdpEnabled } from '@/lib/cdp-client';
import {
    getOrProvisionAgentWallet,
    createSessionSpendingPolicy,
    recordCdpWallet,
} from '@/lib/cdp-server-wallet';

export const dynamic = 'force-dynamic';

// ---------------------------------------------------------------------------
// GET /api/v2/sessions
// ---------------------------------------------------------------------------

export async function GET(req: NextRequest) {
    const access = await requireTenantAccess(req);
    if (access.error) {
        return NextResponse.json({ error: access.error }, { status: access.status });
    }

    const tenantId = access.tenantId;
    const status = req.nextUrl.searchParams.get('status') ?? 'active';

    try {
        const result = await pool.query(
            `SELECT
                session_token,
                tenant_id,
                agent_id,
                wallet_address,
                wallet_source,
                cdp_wallet_name,
                budget_total_usd,
                budget_spent_usd,
                budget_total_usd - budget_spent_usd AS budget_remaining,
                policies,
                status,
                created_at,
                expires_at
             FROM agent_sessions
             WHERE tenant_id = $1 AND status = $2
             ORDER BY created_at DESC
             LIMIT 100`,
            [tenantId, status]
        );

        return NextResponse.json({
            object: 'list',
            data: result.rows.map(formatSession),
        });
    } catch {
        return NextResponse.json({ object: 'list', data: [] });
    }
}

// ---------------------------------------------------------------------------
// POST /api/v2/sessions
// ---------------------------------------------------------------------------

export async function POST(req: NextRequest) {
    const access = await requireTenantAccess(req);
    if (access.error) {
        return NextResponse.json({ error: access.error }, { status: access.status });
    }

    const tenantId = access.tenantId;

    try {
        const body = await req.json() as {
            agent_id?: string;
            wallet_address?: string;
            wallet_source?: 'cdp' | 'eoa';
            budget_usd?: number;
            expires_in_hours?: number;
            policy?: Record<string, unknown>;
        };

        const {
            agent_id,
            budget_usd = 10.0,
            expires_in_hours = 24,
            policy = {},
        } = body;

        let walletSource: 'cdp' | 'eoa' = body.wallet_source ?? 'eoa';
        let walletAddress: string | null = body.wallet_address ?? null;
        let cdpWalletName: string | null = null;
        let cdpPolicyId: string | null = null;

        // Validate budget
        if (budget_usd <= 0 || budget_usd > 10_000) {
            return NextResponse.json(
                { error: { type: 'invalid_request', message: 'Budget must be between $0.01 and $10,000' } },
                { status: 400 }
            );
        }

        // Validate wallet_source
        if (body.wallet_source && !['cdp', 'eoa'].includes(body.wallet_source)) {
            return NextResponse.json(
                { error: { type: 'invalid_request', message: "wallet_source must be 'cdp' or 'eoa'" } },
                { status: 400 }
            );
        }

        // CDP wallet provisioning
        if (walletSource === 'cdp') {
            if (!isCdpEnabled()) {
                return NextResponse.json(
                    {
                        error: {
                            type: 'invalid_request',
                            message: 'CDP wallet provisioning is not enabled on this deployment. '
                                + 'Use wallet_source: "eoa" and supply a wallet_address, '
                                + 'or contact support to enable CDP wallets.',
                        },
                    },
                    { status: 400 }
                );
            }

            const agentKey = agent_id ?? `anon-${crypto.randomUUID().slice(0, 8)}`;
            const provisioned = await getOrProvisionAgentWallet(agentKey);

            walletAddress = provisioned.address;
            cdpWalletName = provisioned.cdpWalletName;

            // Create chain-level spending policy (best-effort, non-blocking)
            cdpPolicyId = await createSessionSpendingPolicy(budget_usd, walletAddress);
        }

        // Generate session token
        const sessionId = `sess_${crypto.randomUUID().replace(/-/g, '').slice(0, 24)}`;

        // Calculate expiry
        const expiresAt = new Date();
        expiresAt.setHours(expiresAt.getHours() + expires_in_hours);

        // ── AP2 mandate auto-issue (CDP sessions with agent_id only) ───────
        let finalPolicy = { ...policy };
        if (walletSource === 'cdp' && agent_id) {
            try {
                const mandateId = `mnd_${crypto.randomUUID().replace(/-/g, '').slice(0, 20)}`;
                await pool.query(
                    `INSERT INTO ap2_mandates
                       (id, tenant_id, type, user_did, agent_did, constraints, status, amount_spent_usd)
                     VALUES ($1, $2, 'payment', $3, $4, $5::jsonb, 'active', 0)
                     ON CONFLICT (id) DO NOTHING`,
                    [
                        mandateId,
                        tenantId,
                        `did:p402:tenant:${tenantId}`,
                        `did:p402:agent:${agent_id}`,
                        JSON.stringify({
                            max_amount_usd: budget_usd,
                            valid_until: expiresAt.toISOString(),
                        }),
                    ]
                );
                finalPolicy = { ...finalPolicy, ap2_mandate_id: mandateId };

                // ── ERC-8004 wallet link (best-effort, fire-and-forget) ────
                if (process.env.ERC8004_ENABLE_VALIDATION === 'true' && walletAddress) {
                    const addr = walletAddress as `0x${string}`; // capture narrowed type for closure
                    if (/^\d+$/.test(agent_id)) {
                        import('@/lib/erc8004/identity-client')
                            .then(({ setAgentWalletOnChain }) =>
                                setAgentWalletOnChain(BigInt(agent_id), addr)
                            )
                            .catch(e => console.warn('[sessions] ERC-8004 wallet link failed:', e));
                    }
                }
            } catch (e) {
                console.warn('[sessions] AP2 mandate auto-issue failed (non-blocking):', e);
            }
        }

        // Persist session
        const result = await pool.query(
            `INSERT INTO agent_sessions (
                session_token, tenant_id, agent_id, wallet_address, wallet_source,
                cdp_wallet_name, cdp_policy_id, budget_total_usd, budget_spent_usd,
                policies, status, created_at, expires_at
             ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 0, $9, 'active', NOW(), $10)
             RETURNING *`,
            [
                sessionId,
                tenantId,
                agent_id ?? null,
                walletAddress,
                walletSource,
                cdpWalletName,
                cdpPolicyId,
                budget_usd,
                JSON.stringify(finalPolicy),
                expiresAt,
            ]
        );

        const row = result.rows[0];

        // Audit log for CDP wallets (fire-and-forget)
        if (walletSource === 'cdp' && cdpWalletName && walletAddress) {
            recordCdpWallet({
                cdpWalletName,
                walletAddress,
                purpose: 'agent-session',
                sessionId,
            });
        }

        return NextResponse.json(
            {
                ...formatSession(row),
                // Surface session key for API auth — returned only at creation
                session_key: row.session_token,
            },
            { status: 201 }
        );
    } catch (error: unknown) {
        const msg = error instanceof Error ? error.message : 'Failed to create session';
        console.error('[Sessions] Create error:', error);
        return NextResponse.json(
            { error: { type: 'internal_error', message: msg } },
            { status: 500 }
        );
    }
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function formatSession(row: Record<string, unknown>) {
    return {
        object: 'session',
        id: row['session_token'],
        tenant_id: row['tenant_id'],
        agent_id: row['agent_id'],
        wallet_address: row['wallet_address'],
        wallet_source: row['wallet_source'] ?? 'eoa',
        cdp_wallet_name: row['cdp_wallet_name'] ?? null,
        budget: {
            total_usd: parseFloat(String(row['budget_total_usd'])),
            used_usd: parseFloat(String(row['budget_spent_usd'])),
            remaining_usd:
                parseFloat(String(row['budget_total_usd'])) -
                parseFloat(String(row['budget_spent_usd'])),
        },
        policy: row['policies'],
        status: row['status'],
        created_at: row['created_at'],
        expires_at: row['expires_at'],
    };
}
