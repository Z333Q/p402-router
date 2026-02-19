import { NextRequest, NextResponse } from "next/server";
import { type Hex } from "viem";
import { validateAuthorizationStructure, type EIP3009Authorization } from "@/lib/x402/eip3009";
import { SecurityChecks } from "@/lib/x402/security-checks";
import { DEFAULT_TOKEN } from "@/lib/tokens";

interface X402VerifyRequest {
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

export async function POST(req: NextRequest) {
    const requestId = crypto.randomUUID();

    try {
        const body = await req.json() as X402VerifyRequest;

        if (!body.paymentPayload?.payload?.authorization || !body.paymentPayload?.payload?.signature) {
            return NextResponse.json(
                { isValid: false, invalidReason: 'Missing paymentPayload.payload.authorization or signature' },
                { status: 400 }
            );
        }

        if (!body.paymentRequirements) {
            return NextResponse.json(
                { isValid: false, invalidReason: 'Missing paymentRequirements' },
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
                { isValid: false, invalidReason: 'Invalid signature format' },
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

        // Validate structure
        if (!validateAuthorizationStructure(auth)) {
            return NextResponse.json(
                { isValid: false, invalidReason: 'Invalid authorization structure' },
                { status: 400 }
            );
        }

        // Verify amount matches paymentRequirements
        const authValue = BigInt(auth.value);
        const requiredAmount = BigInt(paymentRequirements.maxAmountRequired);
        if (authValue < requiredAmount) {
            return NextResponse.json(
                { isValid: false, invalidReason: `Insufficient amount: authorized ${authValue}, required ${requiredAmount}` },
                { status: 400 }
            );
        }

        // Verify recipient matches paymentRequirements.payTo
        if (auth.to.toLowerCase() !== paymentRequirements.payTo.toLowerCase()) {
            return NextResponse.json(
                { isValid: false, invalidReason: `Recipient mismatch: authorization pays to ${auth.to}, required ${paymentRequirements.payTo}` },
                { status: 400 }
            );
        }

        // Run security checks (signature recovery + timing)
        const token = DEFAULT_TOKEN;
        await SecurityChecks.validateAuthorization(auth, token, requestId);

        return NextResponse.json({ isValid: true, payer: rawAuth.from });
    } catch (error: unknown) {
        const message = error instanceof Error ? error.message : 'Verification failed';
        return NextResponse.json(
            { isValid: false, invalidReason: message },
            { status: 400 }
        );
    }
}
