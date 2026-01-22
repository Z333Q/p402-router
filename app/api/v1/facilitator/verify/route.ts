import { NextRequest, NextResponse } from "next/server";
import { BlockchainService } from "@/lib/blockchain";
import db from "@/lib/db";

export async function POST(req: NextRequest) {
    try {
        const body = await req.json();
        const { txHash, network, tenantId, amount, asset } = body;

        if (!txHash) {
            return NextResponse.json({ success: false, error: "txHash is required for verification" }, { status: 400 });
        }

        // 1. Resolve Treasury
        const targetTenantId = tenantId || '00000000-0000-0000-0000-000000000001';
        const tenantRes = await db.query('SELECT treasury_address FROM tenants WHERE id = $1', [targetTenantId]);
        const treasury = tenantRes.rows[0]?.treasury_address;

        if (!treasury) {
            return NextResponse.json({ success: false, error: "Tenant treasury not configured" }, { status: 500 });
        }

        // 2. Verify On-Chain
        const verification = await BlockchainService.verifyPayment(
            txHash,
            amount || "0",
            asset || "USDC",
            treasury
        );

        return NextResponse.json({
            success: verification.verified,
            transaction: txHash,
            network: network || "eip155:8453",
            verification_id: `v_20_${Date.now()}`,
            status: verification.verified ? "verified" : "failed",
            error: verification.error,
            proof: {
                facilitatorId: "p402_base_fac",
                routeId: body.routeId || "unknown",
                requestId: body.requestId || `req_${Date.now()}`,
                timestamp: Date.now(),
                outcome: verification.verified ? "success" : "failure",
                actualAmount: verification.actualAmount,
                payer: verification.payerAddress
            }
        });
    } catch (error) {
        console.error("Verification error:", error);
        return NextResponse.json({ success: false, error: "Verification processing failed" }, { status: 500 });
    }
}
