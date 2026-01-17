import { NextResponse } from 'next/server';

export async function GET() {
    const agentCard = {
        name: "P402 Payment Router",
        description: "Payment-aware AI orchestration layer for the agentic web.",
        protocolVersion: "1.0",

        capabilities: {
            streaming: true,
            pushNotifications: true
        },

        skills: [
            {
                id: "ai-completion",
                name: "AI Completion",
                description: "Route chat completion requests to optimal providers based on cost/performance."
            }
        ],

        extensions: [
            {
                uri: "tag:x402.org,2025:x402-payment",
                config: {
                    networks: [
                        { chain: "eip155:8453", name: "Base Mainnet" },
                        { chain: "eip155:1", name: "Ethereum Mainnet" }
                    ],
                    tokens: ["USDC", "USDT", "ETH"]
                }
            }
        ]
    };

    return NextResponse.json(agentCard);
}
