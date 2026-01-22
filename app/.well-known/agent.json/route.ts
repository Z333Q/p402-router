import { NextResponse } from 'next/server';

export async function GET() {
    const agentCard = {
        protocolVersion: "v2.0",
        name: "P402 Protocol Governor",
        description: "Autonomous policy governance and settlement layer for A2A commerce.",
        url: "https://p402.io",
        iconUrl: "https://p402.io/favicon.png",
        version: "3.0.0",

        capabilities: {
            streaming: true,
            pushNotifications: true,
            autonomousSettlement: true,
            policyEnforcement: true
        },

        skills: [
            {
                id: "a2a-routing",
                name: "Intelligent A2A Routing",
                description: "Optimizes Agent-to-Agent requests based on fiscal mandates and security policies."
            },
            {
                id: "forensic-audit",
                name: "Forensic Policy Audit",
                description: "Analyzes orchestration ledgers for budget compliance and cost inefficiencies."
            },
            {
                id: "semantic-cache",
                name: "Smart Semantic Interception",
                description: "Intercepts redundant requests to reduce API overhead to zero."
            }
        ],

        defaultInputModes: ["text/plain", "application/json"],
        defaultOutputModes: ["text/plain", "application/json"],

        extensions: [
            {
                uri: "tag:x402.org,2025:x402-payment",
                config: {
                    networks: [
                        { chain: "eip155:8453", name: "Base Mainnet" }
                    ],
                    tokens: ["USDC", "EURC"],
                    features: ["EIP-3009", "AP2-Mandates"]
                }
            }
        ]
    };

    return NextResponse.json(agentCard);
}
