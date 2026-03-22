
import { NextRequest, NextResponse } from 'next/server';
import { v4 as uuidv4 } from 'uuid';
import { verifyTypedData } from 'viem';
import { query } from '@/lib/db';
import { AP2Mandate } from '@/lib/a2a-types';
import { checkAgentkitAccess } from '@/lib/identity/agentkit';

const AP2_MANDATE_DOMAIN = {
    name: 'P402 AP2 Mandates',
    version: '1',
    chainId: 8453, // Base mainnet
} as const;

const AP2_MANDATE_TYPES = {
    Mandate: [
        { name: 'type', type: 'string' },
        { name: 'user_did', type: 'string' },
        { name: 'agent_did', type: 'string' },
        { name: 'max_amount_usd', type: 'uint256' },
        { name: 'valid_until', type: 'uint256' },
        { name: 'allowed_categories', type: 'string' },
    ],
} as const;

async function verifyMandateSignature(mandate: any): Promise<{ valid: boolean; error?: string }> {
    if (!mandate.signature || !mandate.public_key) {
        // If AP2_REQUIRE_SIGNATURES is set, unsigned mandates are rejected
        if (process.env.AP2_REQUIRE_SIGNATURES === 'true') {
            return { valid: false, error: 'Signature required but not provided' };
        }
        // Otherwise, allow unsigned mandates (dev/testing)
        return { valid: true };
    }

    try {
        const message = {
            type: mandate.type || 'intent',
            user_did: mandate.user_did,
            agent_did: mandate.agent_did,
            max_amount_usd: BigInt(Math.round(mandate.constraints.max_amount_usd * 100)),
            valid_until: BigInt(mandate.constraints.valid_until
                ? Math.floor(new Date(mandate.constraints.valid_until).getTime() / 1000)
                : 0),
            allowed_categories: (mandate.constraints.allowed_categories || []).join(','),
        };

        const isValid = await verifyTypedData({
            address: mandate.public_key as `0x${string}`,
            domain: AP2_MANDATE_DOMAIN,
            types: AP2_MANDATE_TYPES,
            primaryType: 'Mandate',
            message,
            signature: mandate.signature as `0x${string}`,
        });

        if (!isValid) {
            return { valid: false, error: 'EIP-712 signature verification failed' };
        }

        return { valid: true };
    } catch (err: any) {
        return { valid: false, error: `Signature verification error: ${err.message}` };
    }
}

export async function POST(req: NextRequest) {
    try {
        const body = await req.json();
        const { mandate } = body;

        if (!mandate || !mandate.user_did || !mandate.agent_did || !mandate.constraints) {
            return NextResponse.json({ error: 'Invalid mandate structure' }, { status: 400 });
        }

        // EIP-712 Signature Verification
        const sigResult = await verifyMandateSignature(mandate);
        if (!sigResult.valid) {
            return NextResponse.json({
                error: {
                    code: 'MANDATE_SIGNATURE_INVALID',
                    message: sigResult.error || 'Invalid signature',
                }
            }, { status: 400 });
        }

        // Optionally link to grantor's World ID (non-blocking)
        let humanIdHash: string | null = null;
        if (process.env.AGENTKIT_ENABLED === 'true') {
            const agentkit = await checkAgentkitAccess(req, '/api/a2a/mandates').catch(() => null);
            if (agentkit?.humanId) {
                humanIdHash = agentkit.humanId;
            }
        }

        const mandateId = `mnd_${uuidv4()}`;

        await query(
            `INSERT INTO ap2_mandates (
            id, tenant_id, type, user_did, agent_did, constraints,
            signature, public_key, human_id_hash, status
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, 'active')`,
            [
                mandateId,
                null,
                mandate.type || 'intent',
                mandate.user_did,
                mandate.agent_did,
                JSON.stringify(mandate.constraints),
                mandate.signature || null,
                mandate.public_key || null,
                humanIdHash
            ]
        );

        return NextResponse.json({
            id: mandateId,
            status: 'active',
            signed: !!mandate.signature,
            human_verified: humanIdHash !== null,
        });

    } catch (error) {
        console.error(error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
