import { NextRequest, NextResponse } from "next/server";
import { type Hex } from "viem";
import { SettlementService } from "@/lib/services/settlement-service";
import { type EIP3009Authorization } from "@/lib/x402/eip3009";
import { ApiError } from "@/lib/errors";

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

/**
 * Build a spec-compliant SettleResponse.
 * Reference: @x402/core/types/facilitator.ts → SettleResponse
 */
function buildSettleResponse(
    success: boolean,
    transaction: string,
    payer: string | null,
    errorReason?: string,
) {
    return {
        success,
        transaction,
        network: "eip155:8453" as const,
        payer,
        ...(errorReason ? { errorReason } : {}),
    };
}

export async function POST(req: NextRequest) {
    const requestId = crypto.randomUUID();

    try {
        const body = await req.json();

        // Detect request shape: x402 wire format vs legacy
        const isX402Wire = !!body.paymentPayload;

        if (isX402Wire) {
            // ── x402 wire format: { paymentPayload, paymentRequirements } ──
            if (!body.paymentPayload?.payload?.authorization || !body.paymentPayload?.payload?.signature) {
                return NextResponse.json(
                    buildSettleResponse(false, "", null, "Missing paymentPayload.payload.authorization or signature"),
                    { status: 400 },
                );
            }

            if (!body.paymentRequirements) {
                return NextResponse.json(
                    buildSettleResponse(false, "", null, "Missing paymentRequirements"),
                    { status: 400 },
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
                    buildSettleResponse(false, "", null, "Invalid signature format"),
                    { status: 400 },
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

            // Convert maxAmountRequired from atomic units to human-readable (USDC = 6 decimals)
            const amountAtomic = BigInt(paymentRequirements.maxAmountRequired);
            const amountHuman = (Number(amountAtomic) / 1e6).toString();

            const result = await SettlementService.settleWithAuthorization(requestId, auth, {
                amount: amountHuman,
                asset: 'USDC',
                network: 'eip155:8453',
            });

            return NextResponse.json(
                buildSettleResponse(true, result.receipt.txHash, result.payer ?? null),
            );
        }

        // ── Legacy format: { txHash, amount, authorization, ... } ──
        const { txHash, amount, asset, network, tenantId, decisionId, authorization } = body;

        if (!txHash && !authorization) {
            return NextResponse.json(
                buildSettleResponse(false, "", null, "Either txHash or authorization is required"),
                { status: 400 },
            );
        }

        if (!amount && !authorization) {
            return NextResponse.json(
                buildSettleResponse(false, "", null, "Amount is required for settlement"),
                { status: 400 },
            );
        }

        const result = await SettlementService.settle(requestId, {
            txHash,
            amount,
            asset: asset || "USDC",
            tenantId,
            decisionId,
            authorization,
            network,
        });

        return NextResponse.json({
            ...buildSettleResponse(true, result.receipt.txHash, result.payer ?? null),
            // Legacy fields for backward compatibility
            facilitatorId: result.facilitatorId,
            receipt: {
                txHash: result.receipt.txHash,
                amount: result.receipt.verifiedAmount,
                asset: result.receipt.asset,
                timestamp: result.receipt.timestamp,
            },
        });
    } catch (error) {
        if (error instanceof ApiError) {
            return NextResponse.json({
                ...buildSettleResponse(false, "", null, error.message),
                code: error.code,
            }, { status: error.status });
        }

        console.error("Settlement error:", error);
        return NextResponse.json(
            buildSettleResponse(false, "", null, "Settlement verification failed"),
            { status: 500 },
        );
    }
}
