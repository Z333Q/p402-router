/**
 * POST /api/v1/world-mini/session
 *
 * World Mini App sign-in. Accepts a SIWE-like payload from MiniKit.walletAuth
 * and returns a short-lived API key + credit balance for the Mini App session.
 *
 * Does NOT issue a full NextAuth session — returns a scoped bearer token only.
 */

import { NextRequest, NextResponse } from 'next/server';
import { checkAgentkitAccess } from '@/lib/identity/agentkit';
import { getBalance, getOrCreateAccount, FREE_TRIAL_CREDITS } from '@/lib/services/credits-service';
import { getReputationScore } from '@/lib/identity/reputation';
import crypto from 'crypto';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
    try {
        const body = await req.json() as {
            address?: string;
            signature?: string;
            message?: string;
        };

        if (!body.address) {
            return NextResponse.json({ error: 'address required' }, { status: 400 });
        }

        // Derive a tenant ID from the wallet address for this mini-app session
        const tenantId = `world-mini:${body.address.toLowerCase()}`;

        // Check AgentKit status (non-blocking — address-based lookup)
        let humanIdHash: string | undefined;
        let humanVerified = false;
        let usageRemaining: number | null = null;

        const agentkit = await checkAgentkitAccess(req, '/api/v1/world-mini/session').catch(() => null);
        if (agentkit?.humanId) {
            humanIdHash = agentkit.humanId;
            humanVerified = agentkit.humanVerified;
            usageRemaining = agentkit.usageRemaining ?? null;
        }

        // Get or create credit account (auto-grants free trial for verified humans)
        const account = await getOrCreateAccount(humanIdHash, tenantId);

        // Reputation score (non-blocking)
        const reputationScore = humanIdHash
            ? await getReputationScore(humanIdHash).catch(() => null)
            : null;

        // Issue a scoped session token (HMAC of address + timestamp, valid 24hr)
        const now = Date.now();
        const expiry = now + 24 * 60 * 60 * 1000;
        const tokenPayload = `${body.address.toLowerCase()}:${expiry}`;
        const secret = process.env.JWT_SECRET ?? 'fallback-secret';
        const apiKey = crypto.createHmac('sha256', secret).update(tokenPayload).digest('hex');

        return NextResponse.json({
            api_key: `p402_mini_${apiKey}`,
            expires_at: new Date(expiry).toISOString(),
            address: body.address,
            human_verified: humanVerified,
            credits_remaining: account.balance,
            usage_remaining: usageRemaining,
            free_trial_granted: account.freeTrialGranted,
            free_trial_credits: FREE_TRIAL_CREDITS,
            reputation_score: reputationScore,
        });

    } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : String(err);
        console.error('[WorldMini/session] Error:', msg);
        return NextResponse.json({ error: 'Session creation failed' }, { status: 500 });
    }
}
