import { NextResponse } from "next/server";

export async function GET() {
    return NextResponse.json({
        success: true,
        facilitatorId: "p402-local",
        networks: ["eip155:8453", "eip155:84532"],
        assets: ["USDC"],
        schemes: ["exact", "onchain", "receipt"],
        capabilities: {
            verify: true,
            settle: true,
            supported: true,
            list: true
        }
    });
}
