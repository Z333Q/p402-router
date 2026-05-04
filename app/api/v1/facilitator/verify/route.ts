import { NextRequest, NextResponse } from "next/server";
import { type Hex } from "viem";
import { validateAuthorizationStructure, type EIP3009Authorization } from "@/lib/x402/eip3009";
import { SecurityChecks } from "@/lib/x402/security-checks";
import { DEFAULT_TOKEN } from "@/lib/tokens";
import { verifyTransaction, resolveTokenSymbol } from "@/lib/x402/verify";

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

// ---------------------------------------------------------------------------
// onchain scheme handler (Tempo and any future onchain-verify facilitator)
// ---------------------------------------------------------------------------

async function handleOnchainVerify(
    body: { paymentPayload?: { scheme?: string; network?: string; payload?: { txHash?: string } }; paymentRequirements?: { maxAmountRequired?: string; payTo?: string; network?: string; asset?: string } },
    requestId: string
): Promise<NextResponse> {
    const txHash = body.paymentPayload?.payload?.txHash;
    const paymentRequirements = body.paymentRequirements;

    if (!txHash || !/^0x[a-fA-F0-9]{64}$/.test(txHash)) {
        return NextResponse.json(
            { isValid: false, invalidReason: 'onchain scheme requires paymentPayload.payload.txHash (66-char hex)' },
            { status: 400 }
        );
    }

    if (!paymentRequirements?.payTo || !paymentRequirements?.maxAmountRequired) {
        return NextResponse.json(
            { isValid: false, invalidReason: 'Missing paymentRequirements.payTo or maxAmountRequired' },
            { status: 400 }
        );
    }

    // Derive chain ID from CAIP-2 network identifier (e.g. 'eip155:4217' → 4217)
    const networkStr = (body.paymentPayload?.network ?? paymentRequirements.network) as string | undefined;
    const chainIdMatch = networkStr?.match(/:(\d+)$/);
    const chainId = chainIdMatch?.[1] ? parseInt(chainIdMatch[1], 10) : 8453;

    // Resolve token symbol from asset address (e.g. 0x20c0...0000 → 'pathUSD')
    const assetAddress = paymentRequirements.asset ?? '';
    const tokenSymbol = resolveTokenSymbol(chainId, assetAddress) ?? 'USDC';

    // Replay protection — reject if this tx hash has already been verified
    const { ReplayProtection } = await import('@/lib/replay-protection');
    const alreadyProcessed = await ReplayProtection.isProcessed(txHash);
    if (alreadyProcessed) {
        return NextResponse.json(
            { isValid: false, invalidReason: 'Transaction hash already processed (replay detected)' },
            { status: 409 }
        );
    }

    const result = await verifyTransaction(
        txHash as Hex,
        paymentRequirements.payTo as Hex,
        BigInt(paymentRequirements.maxAmountRequired),
        chainId,
        tokenSymbol
    );

    if (!result.valid) {
        return NextResponse.json(
            { isValid: false, invalidReason: result.error ?? 'On-chain Transfer event not found' },
            { status: 400 }
        );
    }

    return NextResponse.json({ isValid: true, payer: result.sender ?? null });
}

export async function POST(req: NextRequest) {
    const requestId = crypto.randomUUID();

    try {
        const body = await req.json() as X402VerifyRequest & { paymentPayload?: { scheme?: string; payload?: { txHash?: string } } };

        // ── onchain scheme: client already submitted tx, we verify the Transfer event ──
        if (body.paymentPayload?.scheme === 'onchain') {
            return handleOnchainVerify(body, requestId);
        }

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

        // 0. Replay Protection (Finding 1.1)
        // Ensure this exact signature hasn't been replayed (Theft of Service)
        const { ethers } = await import('ethers');
        const abiCoder = ethers.AbiCoder.defaultAbiCoder();
        const paymentHash = ethers.keccak256(
            abiCoder.encode(
                ['address', 'bytes32', 'uint256'],
                [auth.from, auth.nonce, auth.value]
            )
        );

        const { ReplayProtection } = await import('@/lib/replay-protection');
        const isProcessed = await ReplayProtection.isProcessed(paymentHash);
        if (isProcessed) {
            return NextResponse.json(
                { isValid: false, invalidReason: 'This authorization has already been processed or settled.' },
                { status: 409 }
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
