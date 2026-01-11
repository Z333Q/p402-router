import { NextRequest, NextResponse } from "next/server";
import { verifyTransfer } from "@/lib/viem";

export async function POST(req: NextRequest) {
    try {
        const body = await req.json();
        const { txHash, amount, recipient } = body;

        // If a txHash is provided, we attempt to verify it.
        // For domestic/local demo, we allow it to pass if no hash is provided, 
        // but if a hash IS provided, we MUST verify it.
        if (txHash) {
            const isValid = await verifyTransfer(txHash, amount, recipient);
            if (!isValid) {
                return NextResponse.json({ ok: false, error: "On-chain verification failed" }, { status: 400 });
            }
        }

        return NextResponse.json({
            ok: true,
            settlement_id: txHash || `set_local_${Date.now()}`,
            status: "settled",
            details: {
                message: txHash ? "On-chain settlement verified" : "P402 Local Facilitator settlement confirmed (demo mode)",
                txHash: txHash || null,
                timestamp: new Date().toISOString()
            }
        });
    } catch (error) {
        return NextResponse.json({ ok: false, error: "Invalid request payload or verification error" }, { status: 400 });
    }
}
