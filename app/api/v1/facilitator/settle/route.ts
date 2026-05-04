import { NextRequest, NextResponse } from "next/server";
import { type Hex, formatUnits } from "viem";
import { SettlementService } from "@/lib/services/settlement-service";
import { type EIP3009Authorization } from "@/lib/x402/eip3009";
import { ApiError } from "@/lib/errors";
import { requireTenantAccess } from "@/lib/auth";
import { computePlatformFeeUsd } from "@/lib/billing/entitlements";
import { getTenantPlan } from "@/lib/billing/plan-guard";
import { recordUsage } from "@/lib/billing/usage";
import { verifyTransaction, resolveTokenSymbol } from "@/lib/x402/verify";

// Force dynamic execution to prevent Next.js from evaluating Redis/DB on build-time
export const dynamic = 'force-dynamic';

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

// ---------------------------------------------------------------------------
// onchain scheme settlement (Tempo and any future onchain-verify facilitator)
// ---------------------------------------------------------------------------

async function handleOnchainSettle(
    body: { paymentPayload?: { scheme?: string; network?: string; payload?: { txHash?: string } }; paymentRequirements?: { maxAmountRequired?: string; payTo?: string; network?: string; asset?: string } },
    requestId: string
): Promise<NextResponse> {
    const txHash = body.paymentPayload?.payload?.txHash;
    const paymentRequirements = body.paymentRequirements;

    if (!txHash || !/^0x[a-fA-F0-9]{64}$/.test(txHash)) {
        return NextResponse.json(
            buildSettleResponse(false, '', null, 'onchain scheme requires paymentPayload.payload.txHash (66-char hex)'),
            { status: 400 }
        );
    }

    if (!paymentRequirements?.payTo || !paymentRequirements?.maxAmountRequired) {
        return NextResponse.json(
            buildSettleResponse(false, '', null, 'Missing paymentRequirements.payTo or maxAmountRequired'),
            { status: 400 }
        );
    }

    const networkStr = (body.paymentPayload?.network ?? paymentRequirements.network) as string | undefined;
    const chainIdMatch = networkStr?.match(/:(\d+)$/);
    const chainId = chainIdMatch?.[1] ? parseInt(chainIdMatch[1], 10) : 8453;
    const assetAddress = paymentRequirements.asset ?? '';
    const tokenSymbol = resolveTokenSymbol(chainId, assetAddress) ?? 'USDC';

    // Atomically claim the tx hash to prevent double-crediting.
    // tenantId must be a valid UUID — use the system/anonymous tenant UUID for
    // onchain settlements that arrive without a session context.
    const { ReplayProtection } = await import('@/lib/replay-protection');
    const claim = await ReplayProtection.claimTxHash({
        txHash,
        requestId,
        tenantId: '00000000-0000-0000-0000-000000000001',
        asset: tokenSymbol,
        network: networkStr ?? `eip155:${chainId}`,
        settlementType: 'onchain',
    });

    if (!claim.claimed) {
        return NextResponse.json(
            buildSettleResponse(false, txHash, null, 'Transaction hash already settled (replay detected)'),
            { status: 409 }
        );
    }

    // Verify the Transfer event on-chain
    const result = await verifyTransaction(
        txHash as Hex,
        paymentRequirements.payTo as Hex,
        BigInt(paymentRequirements.maxAmountRequired),
        chainId,
        tokenSymbol
    );

    if (!result.valid) {
        // Release the claim so the client can retry after fixing the issue
        await ReplayProtection.releaseTxHash(txHash);
        return NextResponse.json(
            buildSettleResponse(false, txHash, null, result.error ?? 'On-chain Transfer event not found'),
            { status: 400 }
        );
    }

    // Settlement confirmed: the tx hash IS the settlement proof for the onchain scheme
    const network = networkStr ?? `eip155:${chainId}`;
    return NextResponse.json({
        success: true,
        transaction: txHash,
        network,
        payer: result.sender ?? null,
    });
}

export async function POST(req: NextRequest) {
    const requestId = crypto.randomUUID();

    try {
        const body = await req.json();

        // Detect request shape: x402 wire format vs legacy
        const isX402Wire = !!body.paymentPayload;

        if (isX402Wire) {
            // ── onchain scheme: client already submitted tx; verify Transfer event and return txHash ──
            if (body.paymentPayload?.scheme === 'onchain') {
                return handleOnchainSettle(body, requestId);
            }

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

            // Convert maxAmountRequired from atomic units to human-readable (USDC = 6 decimals).
            // formatUnits is precision-clean for all uint256 values including sub-cent amounts.
            const amountAtomic = BigInt(paymentRequirements.maxAmountRequired);
            const amountHuman = formatUnits(amountAtomic, 6);

            const result = await SettlementService.settleWithAuthorization(requestId, auth, {
                amount: amountHuman,
                asset: 'USDC',
                network: 'eip155:8453',
            });

            return NextResponse.json(
                buildSettleResponse(true, result.receipt.txHash, result.payer ?? null),
            );
        }

        // ── Legacy format: { txHash, amount, authorization, receiptId, ... } ──
        const { txHash, amount, asset, network, decisionId, authorization, receiptId } = body;

        // Resolve Tenant
        const access = await requireTenantAccess(req);
        if (access.error) {
            return NextResponse.json(
                buildSettleResponse(false, "", null, access.error),
                { status: access.status }
            );
        }
        const tenantId = access.tenantId;

        // ── Receipt scheme: reuse a prior settlement receipt ──
        if (receiptId) {
            if (!amount) {
                return NextResponse.json(
                    buildSettleResponse(false, "", null, "amount is required for receipt settlement"),
                    { status: 400 },
                );
            }
            const receiptResult = await SettlementService.settleWithReceipt(requestId, {
                tenantId,
                decisionId,
                receiptId,
                amount,
                asset: asset || 'USDC',
            });
            return NextResponse.json(
                buildSettleResponse(true, receiptResult.receipt.txHash, receiptResult.payer ?? null),
            );
        }

        if (!txHash && !authorization) {
            return NextResponse.json(
                buildSettleResponse(false, "", null, "Either txHash, authorization, or receiptId is required"),
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

        // =====================================================================
        // NEW BILLING LOGIC: Platform Fees & Usage Recording
        // =====================================================================
        // Calculate the platform fee for the facilitator transaction based on
        // the tenant's current plan.
        const planId = await getTenantPlan(tenantId || 'default');

        let numericAmount = 0;
        if (amount) {
            numericAmount = parseFloat(amount);
        } else if (result.receipt?.verifiedAmount) {
            numericAmount = parseFloat(result.receipt.verifiedAmount);
        }

        if (numericAmount > 0) {
            const platformFee = computePlatformFeeUsd(planId, numericAmount);
            // Record the standard tx value
            await recordUsage({
                tenantId: tenantId || 'default',
                eventType: 'api_call',
                costUsd: numericAmount
            });
            // Record the platform fee
            if (platformFee > 0) {
                await recordUsage({
                    tenantId: tenantId || 'default',
                    eventType: 'platform_fee',
                    costUsd: platformFee
                });
            }
        }

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
