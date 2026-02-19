import { NextResponse } from "next/server";
import { privateKeyToAccount } from "viem/accounts";

function getSignerAddress(): string {
    if (process.env.P402_SIGNER_ADDRESS) {
        return process.env.P402_SIGNER_ADDRESS;
    }
    const pk = process.env.P402_FACILITATOR_PRIVATE_KEY || process.env.DEPLOYER_PRIVATE_KEY;
    if (pk) {
        const prefixed = pk.startsWith('0x') ? pk : `0x${pk}`;
        return privateKeyToAccount(prefixed as `0x${string}`).address;
    }
    return '0x0000000000000000000000000000000000000000';
}

export async function GET() {
    const signerAddress = getSignerAddress();

    // x402-compliant fields
    const kinds = [
        { x402Version: 2, scheme: 'exact', network: 'eip155:8453' },
        { x402Version: 2, scheme: 'onchain', network: 'eip155:8453' }
    ];
    const signers = {
        'eip155:*': [signerAddress]
    };

    return NextResponse.json({
        // x402 spec fields
        kinds,
        extensions: [],
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
