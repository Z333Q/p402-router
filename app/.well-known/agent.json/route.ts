import { NextResponse } from 'next/server';

export async function GET() {
    const agentCard = {
        protocolVersion: "v1.0",
        name: "P402 Payment Router",
        description: "Payment-aware AI orchestration layer for the agentic web.",
        url: "https://p402.io",
        iconUrl: "https://p402.io/favicon.png",
        version: "1.0.0",

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

        defaultInputModes: ["text/plain"],
        defaultOutputModes: ["text/plain"],

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
