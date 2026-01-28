import { NextResponse } from "next/server";

export async function GET() {
    // x402-compliant fields
    const kinds = [
        { x402Version: 1, scheme: 'exact', network: 'eip155:8453' },
        { x402Version: 1, scheme: 'onchain', network: 'eip155:8453' }
    ];
    const extensions = ['bazaar'];
    const signers = {
        'eip155:*': [process.env.P402_SIGNER_ADDRESS ?? '0x0000000000000000000000000000000000000000']
    };

    return NextResponse.json({
        // x402 spec fields
        kinds,
        extensions,
        signers,
        // Legacy fields for backward compatibility
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
