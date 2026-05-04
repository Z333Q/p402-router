import { NextResponse } from 'next/server';
import { TEMPO_SUPPORTED_CURRENCIES, TEMPO_CHAIN_ID } from '@/lib/constants/tempo';

export async function GET() {
    const agentCard = {
        protocolVersion: "v1.0",
        name: "P402 Payment Router",
        description: "Payment-aware AI orchestration layer for the agentic web. Routes LLM requests across 300+ models with cost optimization and settles payments in USDC on Base via x402.",
        url: "https://p402.io",
        iconUrl: "https://p402.io/favicon.png",
        version: "2.2.0",

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
                        { chain: "eip155:1", name: "Ethereum Mainnet" },
                        {
                            // Tempo Mainnet — chain ID 4217 (eip155:4217)
                            // Phase 1: onchain scheme only. EIP-3009/exact deferred to Phase 2+.
                            // viem 2.46.3 ships stale RPC (rpc.presto.tempo.xyz); transport
                            // is always overridden to rpc.tempo.xyz in lib/facilitator-adapters/tempo.ts.
                            chain: `eip155:${TEMPO_CHAIN_ID}`,
                            name: "Tempo",
                            protocols: ["x402"],
                            schemes: ["onchain"],
                            treasury: "0xe00DD502FF571F3C721f22B3F9E525312d21D797",
                            explorerUrl: "https://explore.tempo.xyz",
                            rpcUrl: "https://rpc.tempo.xyz",
                            // All 10 TIP-20 stablecoins supported. verified:true = live settlement
                            // tested; verified:false = deployed but transfer path not fully validated.
                            currencies: TEMPO_SUPPORTED_CURRENCIES.map((c) => ({
                                symbol: c.symbol,
                                contract: c.contract,
                                decimals: c.decimals,
                                isDefault: c.isDefault,
                                verified: c.verified,
                            })),
                            capabilities: {
                                // Minimum payable amount on Tempo: 1 raw unit (1e-6 USDC.e = $0.000001).
                                // The onchain dispatch is bigint-clean — no float rounding at this floor.
                                minSettlementAmount: "1",
                            },
                        },
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
