import { NextRequest, NextResponse } from "next/server";
import { SettlementService } from "@/lib/services/settlement-service";
import { ApiError } from "@/lib/errors";

export async function POST(req: NextRequest) {
    const requestId = crypto.randomUUID();

    try {
        const body = await req.json();
        const { txHash, amount, asset, network, tenantId, decisionId, authorization } = body;

        // txHash or authorization is REQUIRED for settlement
        if (!txHash && !authorization) {
            return NextResponse.json({
                success: false,
                error: "Either Transaction hash (txHash) or Authorization (authorization) is required"
            }, { status: 400 });
        }

        if (!amount && !authorization) {
            return NextResponse.json({
                success: false,
                error: "Amount is required for settlement"
            }, { status: 400 });
        }

        // Use full SettlementService
        const result = await SettlementService.settle(requestId, {
            txHash,     // Optional in new mode
            amount,     // Optional in new mode (derived from auth if missing)
            asset: asset || "USDC",
            tenantId,
            decisionId,
            authorization, // New EIP-3009 payload
            network
        });

        // x402-compliant response
        return NextResponse.json({
            success: result.settled,
            transaction: result.receipt.txHash,
            network: network || "eip155:8453",
            facilitatorId: result.facilitatorId,
            receipt: {
                txHash: result.receipt.txHash,
                amount: result.receipt.verifiedAmount,
                asset: result.receipt.asset,
                timestamp: result.receipt.timestamp
            }
        });
    } catch (error) {
        if (error instanceof ApiError) {
            return NextResponse.json({
                success: false,
                error: error.message,
                code: error.code
            }, { status: error.status });
        }

        console.error("Settlement error:", error);
        return NextResponse.json({
            success: false,
            error: "Settlement verification failed"
        }, { status: 500 });
    }
}
