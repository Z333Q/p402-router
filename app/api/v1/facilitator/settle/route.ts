import { NextRequest, NextResponse } from "next/server";
import { verifyTransfer } from "@/lib/viem";

export async function POST(req: NextRequest) {
    try {
        const body = await req.json();
        const { txHash, amount, recipient, network } = body;

        // If a txHash is provided, we attempt to verify it.
        if (txHash) {
            const isValid = await verifyTransfer(txHash, amount, recipient);
            if (!isValid) {
                return NextResponse.json({ success: false, error: "On-chain verification failed" }, { status: 400 });
            }
        } else if (process.env.NODE_ENV === 'production') {
            // In production, a txHash is REQUIRED for settlement.
            return NextResponse.json({ success: false, error: "Transaction hash required for production settlement" }, { status: 400 });
        }

        return NextResponse.json({
            success: true,
            transaction: txHash || `set_local_${Date.now()}`,
            network: network || "eip155:8453",
            settlement_id: txHash || `set_local_${Date.now()}`,
            status: "settled",
            details: {
                message: txHash ? "On-chain settlement verified" : "P402 Settlement confirmed",
                txHash: txHash || null,
                timestamp: new Date().toISOString()
            }
        });
    } catch (error) {
        return NextResponse.json({ success: false, error: "Invalid request payload or verification error" }, { status: 400 });
    }
}
