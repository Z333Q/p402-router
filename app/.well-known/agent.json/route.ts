import { NextResponse } from 'next/server';

export async function GET() {
    const agentCard = {
        protocolVersion: "v1.0",
        name: "P402 Payment Router",
        description: "Payment-aware AI orchestration layer for the agentic web. Routes LLM requests across 300+ models with cost optimization and settles payments in USDC on Base via x402.",
        url: "https://p402.io",
        iconUrl: "https://p402.io/favicon.png",
        version: "2.1.0",

        capabilities: {
            streaming: true,
            pushNotifications: true
        },

        skills: [
            {
                id: "ai-completion",
                name: "AI Completion",
                description: "Route chat completion requests to optimal providers based on cost, speed, or quality. 300+ models via OpenRouter."
            },
            {
                id: "cost-intelligence",
                name: "Cost Intelligence",
                description: "Compare model pricing across providers, get spending analytics, and receive cost optimization recommendations."
            },
            {
                id: "claude-skill",
                name: "P402 Claude Skill",
                description: "Installable skill package for Claude Code and Claude.ai with full API reference, routing guide, payment flows, and A2A protocol documentation.",
                tags: ["skill", "claude", "documentation", "integration"]
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
                    tokens: ["USDC", "USDT", "ETH"],
                    schemes: ["exact", "onchain", "receipt"]
                }
            }
        ],

        endpoints: {
            a2a: {
                jsonrpc: "https://p402.io/api/a2a",
                stream: "https://p402.io/api/a2a/stream"
            },
            skill: {
                download: "https://p402.io/skill/p402.zip",
                manifest: "https://p402.io/skill/SKILL.md",
                references: {
                    api: "https://p402.io/skill/references/api-reference.md",
                    routing: "https://p402.io/skill/references/routing-guide.md",
                    payments: "https://p402.io/skill/references/payment-flows.md",
                    a2a: "https://p402.io/skill/references/a2a-protocol.md"
                }
            },
            llms: {
                index: "https://p402.io/llms.txt",
                full: "https://p402.io/llms-full.txt"
            }
        }
    };

    return NextResponse.json(agentCard);
}
