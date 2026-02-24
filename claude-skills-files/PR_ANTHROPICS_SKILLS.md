# PR: Add P402 Payment-Aware AI Orchestration Skill

## What This Skill Does

P402 is a payment-aware AI orchestration layer that routes LLM requests across 300+ models via OpenRouter with cost, speed, and quality optimization, and settles micropayments in USDC on Base blockchain using the x402 protocol (co-founded by Coinbase and Cloudflare).

This skill gives Claude deep knowledge of:
- The P402 routing engine (4 modes, weighted scoring, automatic failover)
- The 6-layer Billing Guard (rate limits, circuit breakers, anomaly detection)
- Session-based budget management for autonomous agents
- x402 payment settlement (EIP-3009 gasless, onchain, receipt reuse)
- Google A2A protocol integration with the x402 payment extension
- AP2 mandates for agent spending authorization
- OpenAI-compatible API migration (2-line code change)
- Semantic caching with embedding similarity matching

## Why This Belongs Here

P402 implements standards from Coinbase (x402), Google (A2A protocol), and Cloudflare (x402 Foundation), positioning it at the intersection of AI infrastructure and crypto payments. The skill addresses a growing need in the AI agent ecosystem: programmatic spending controls and cost-aware routing.

The skill follows the Agent Skills spec exactly: YAML frontmatter with name/description, progressive disclosure via reference files, and under 500 lines for the core SKILL.md.

## Structure

```
p402/
├── SKILL.md                        (167 lines)
└── references/
    ├── api-reference.md            (533 lines)
    ├── routing-guide.md            (247 lines)
    ├── payment-flows.md            (416 lines)
    └── a2a-protocol.md             (607 lines)
```

## Triggering

The description triggers on: P402, x402, AI cost optimization, multi-model routing, agent spending controls, micropayments for AI, session budget management, payment-aware orchestration, and related terms.

## Testing

Tested with the skill-creator evaluation framework. Triggers correctly for integration queries, does not false-positive on unrelated AI or crypto questions.

## Links

- Website: https://p402.io
- GitHub: https://github.com/Z333Q/p402-router
- Docs: https://p402.io/docs
- Skill page: https://p402.io/docs/skill
