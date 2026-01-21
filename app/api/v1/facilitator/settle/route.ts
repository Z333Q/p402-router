import { NextRequest, NextResponse } from "next/server";
import { SettlementService } from "@/lib/services/settlement-service";
import { ApiError } from "@/lib/errors";

export async function POST(req: NextRequest) {
    const requestId = crypto.randomUUID();

    try {
        const body = await req.json();
        const { txHash, amount, asset, network, tenantId, decisionId } = body;

        // txHash is REQUIRED for settlement
        if (!txHash) {
            return NextResponse.json({
                success: false,
                error: "Transaction hash (txHash) is required for settlement"
            }, { status: 400 });
        }

        if (!amount) {
            return NextResponse.json({
                success: false,
                error: "Amount is required for settlement"
            }, { status: 400 });
        }

        // Use full SettlementService with on-chain verification
        const result = await SettlementService.settle(requestId, {
            txHash,
            amount,
            asset: asset || "USDC",
            tenantId,
            decisionId
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
