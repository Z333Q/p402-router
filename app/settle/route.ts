import { NextResponse } from 'next/server';
import { type Hex } from 'viem';
import { type EIP3009Authorization } from '@/lib/x402/eip3009';
import { SettlementService } from '@/lib/services/settlement-service';

interface X402SettleRequest {
    x402Version: number;
    paymentPayload: {
        x402Version: number;
        scheme: string;
        network: string;
        payload: {
            signature: string;
            authorization: {
                from: string;
                to: string;
                value: string;
                validAfter: string;
                validBefore: string;
                nonce: string;
            };
        };
    };
    paymentRequirements: {
        scheme: string;
        network: string;
        maxAmountRequired: string;
        resource: string;
        description: string;
        mimeType?: string;
        payTo: string;
        maxTimeoutSeconds?: number;
        asset: string;
        extra?: Record<string, unknown>;
    };
}

/**
 * Parse a 65-byte hex signature into v, r, s components.
 */
function parseSignature(sig: string): { v: number; r: Hex; s: Hex } {
    const raw = sig.startsWith('0x') ? sig.slice(2) : sig;
    if (raw.length !== 130) {
        throw new Error(`Invalid signature length: expected 130 hex chars, got ${raw.length}`);
    }
    const r = `0x${raw.slice(0, 64)}` as Hex;
    const s = `0x${raw.slice(64, 128)}` as Hex;
    let v = parseInt(raw.slice(128, 130), 16);
    if (v < 2) {
        v += 27;
    }
    return { v, r, s };
}

export async function POST(request: Request) {
    const requestId = crypto.randomUUID();

    try {
        const body = await request.json() as X402SettleRequest;

        if (!body.paymentPayload?.payload?.authorization || !body.paymentPayload?.payload?.signature) {
            return NextResponse.json(
                { success: false, errorReason: 'Missing paymentPayload.payload.authorization or signature' },
                { status: 400 }
            );
        }

        if (!body.paymentRequirements) {
            return NextResponse.json(
                { success: false, errorReason: 'Missing paymentRequirements' },
                { status: 400 }
            );
        }

        const { authorization: rawAuth, signature } = body.paymentPayload.payload;
        const { paymentRequirements } = body;

        // Parse the 65-byte signature into v/r/s
        let sig: { v: number; r: Hex; s: Hex };
        try {
            sig = parseSignature(signature);
        } catch {
            return NextResponse.json(
                { success: false, errorReason: 'Invalid signature format' },
                { status: 400 }
            );
        }

        // Build internal authorization object
        const auth: EIP3009Authorization = {
            from: rawAuth.from as `0x${string}`,
            to: rawAuth.to as `0x${string}`,
            value: rawAuth.value,
            validAfter: rawAuth.validAfter,
            validBefore: rawAuth.validBefore,
            nonce: rawAuth.nonce as Hex,
            v: sig.v,
            r: sig.r,
            s: sig.s,
        };

        // Convert maxAmountRequired from atomic units to human-readable for internal service
        // USDC has 6 decimals
        const amountAtomic = BigInt(paymentRequirements.maxAmountRequired);
        const amountHuman = (Number(amountAtomic) / 1e6).toString();

        // Delegate to existing settlement service
        const result = await SettlementService.settleWithAuthorization(requestId, auth, {
            amount: amountHuman,
            asset: 'USDC',
            network: 'eip155:8453',
        });

        return NextResponse.json({
            success: result.settled,
            transaction: result.receipt.txHash,
            network: 'eip155:8453',
            payer: result.payer ?? null,
        });
    } catch (error: unknown) {
        const message = error instanceof Error ? error.message : 'Settlement failed';
        return NextResponse.json(
            { success: false, errorReason: message },
            { status: 400 }
        );
    }
}
