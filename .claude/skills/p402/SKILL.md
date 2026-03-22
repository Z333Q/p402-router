---
name: p402
description: >
  Build cost-aware AI applications with P402.io, the payment-aware AI orchestration layer combining
  multi-provider LLM routing (300+ models) with x402 stablecoin micropayments on Base. Use this skill
  when the user wants to: route AI requests across providers with cost/speed/quality optimization, add
  spending limits or billing guards to AI agents, implement session-based budget management, integrate
  x402 USDC micropayments for AI services, set up A2A agent communication with payment rails, create
  AP2 spending mandates, migrate from single-provider OpenAI/Anthropic to multi-provider routing,
  implement semantic caching for LLM costs, or compare model pricing. Trigger for any mention of P402,
  x402 payments, AI cost reduction, multi-model routing, agent spending controls, or payment-aware
  orchestration, even without exact terms.
---

# P402: Payment-Aware AI Orchestration

P402.io is an infrastructure layer that solves two problems at once: fragmented AI provider APIs and broken micropayment economics. It routes LLM requests to the optimal provider based on cost, speed, or quality, while settling payments in USDC/USDT on Base blockchain using the x402 protocol.

The key mental model: P402 sits between your application and AI providers the same way a payment network sits between merchants and banks. It handles routing, authorization, and settlement so your code just makes API calls.

## Why P402 Exists

Traditional payment processors charge ~$0.30 per transaction, which makes micropayments for AI API calls (often $0.001-$0.05) economically impossible. P402 uses stablecoin settlement on Base L2 where transaction costs are fractions of a cent, enabling true pay-per-request economics for AI agents.

Most AI applications are "cost-blind" -- they hardcode a single provider and overpay by 70-85%. P402 makes applications "cost-aware" by exposing real-time pricing across 300+ models and routing intelligently.

## Core Concepts

### The Session Lifecycle

Sessions are the foundational primitive. Every interaction with P402 flows through a session:

1. **Create** a session with a budget cap and optional policies
2. **Fund** the session (USDC via Base Pay, direct transfer, or test credits)
3. **Use** the session for chat completions -- P402 tracks spending per request
4. **Expire** -- sessions auto-close when budget is exhausted or time limit is reached

Sessions enforce spending boundaries. An agent with a $10 session physically cannot spend $10.01. This is the core safety mechanism for autonomous agent spending.

### Routing Modes

Every chat completion request can specify a routing mode that controls how P402 selects the provider and model:

| Mode | Optimizes For | Best For | Typical Provider |
|------|--------------|----------|-----------------|
| `cost` | Lowest price, acceptable quality | Batch processing, background tasks, high-volume | DeepSeek V3.2, Haiku 4.5, GPT-4o-mini |
| `quality` | Best output, price secondary | Final outputs, complex reasoning, user-facing answers | Claude Opus 4.6, GPT-5.2, Gemini 3.1 Pro |
| `speed` | Lowest latency, price secondary | Real-time chat, interactive UX, streaming | Groq (LPU), Flash models |
| `balanced` | Equal weight across all factors | General purpose, default choice | Sonnet 4.6, GPT-4o-mini, Gemini 3.1 Pro |

The router scores every available model using a proprietary weighted algorithm, filters by capability requirements and policy constraints, and returns the optimal choice. If the selected provider fails, automatic failover retries with the next-best alternative.

**Decision guidance for developers:** Start with `balanced` as your default. Switch to `cost` for any task where quality above "good enough" does not matter (summarization, classification, extraction). Use `quality` only for tasks where the output is the final product a human will read or where reasoning depth is critical. Use `speed` when time-to-first-byte matters more than cost (real-time chat, autocomplete).

### The Billing Guard

P402 enforces a multi-layer defense system on every request. Default limits are configurable per tenant via the [P402 dashboard](https://p402.io/dashboard). Developers should handle these error codes:

| Layer | Protection | Error Code | What To Do |
|-------|-----------|------------|------------|
| Rate limit | Requests per hour cap | `RATE_LIMIT_EXCEEDED` | Back off, use `retryAfterMs` from error |
| Daily circuit breaker | Daily spend cap | `DAILY_LIMIT_EXCEEDED` | Contact support or wait for daily reset |
| Concurrent requests | Simultaneous request cap | `TOO_MANY_CONCURRENT` | Queue requests, reduce parallelism |
| Anomaly detection | Statistical outlier detection | Logged warning (soft) | Unusual cost pattern flagged, not blocked |
| Per-request cap | Single request cost cap | `REQUEST_TOO_EXPENSIVE` | Use a cheaper model or reduce max_tokens |
| Budget reservation | Atomic budget check | Insufficient budget error | Fund the session with more USDC |

The guard runs a pre-check before every completion, executing all layers in sequence. If any hard layer fails, the request is rejected before it reaches the provider. This fail-closed design means an agent cannot spend money it has not been authorized to spend. View and adjust your limits at [p402.io/dashboard](https://p402.io/dashboard).

### The OpenAI-Compatible Interface

P402's chat completions endpoint is a drop-in replacement for OpenAI's API. The only additions are the `p402` extension object and the `p402_metadata` in the response:

```typescript
// Before: direct OpenAI call
const response = await fetch('https://api.openai.com/v1/chat/completions', {
  headers: { 'Authorization': `Bearer ${OPENAI_KEY}` },
  body: JSON.stringify({ model: 'gpt-4o', messages })
});

// After: P402 (same shape, smarter routing)
const response = await fetch('https://p402.io/api/v2/chat/completions', {
  headers: { 'Authorization': `Bearer ${P402_KEY}` },
  body: JSON.stringify({
    messages,
    // model is optional -- P402 picks the best one
    p402: { mode: 'cost', session_id: 'sess_abc', cache: true }
  })
});
```

The response includes `p402_metadata` with routing and cost telemetry. Key fields:

| Field | Type | Description |
|-------|------|-------------|
| `provider` | string | Provider that served the request |
| `model` | string | Exact model used |
| `cost_usd` | number | Actual cost charged |
| `latency_ms` | number | Total round-trip latency |
| `cached` | boolean | Whether result came from semantic cache |
| `human_verified` | boolean | True if request was World ID-verified |
| `human_usage_remaining` | number \| null | Free-trial uses remaining for this human |
| `reputation_score` | number \| null | Human-anchored reputation [0.0–1.0] |
| `credits_spent` | number \| null | Credits deducted this request (1 credit = $0.01) |
| `credits_balance` | number \| null | Remaining credit balance after this request |

Response headers also expose: `X-P402-Provider`, `X-P402-Cost-USD`, `X-P402-Latency-MS`, `X-P402-Request-ID`.

### Semantic Cache

P402 can cache responses for semantically similar prompts. When enabled (`p402.cache: true`), the system:

1. Generates an embedding of the request via OpenRouter
2. Searches existing cache entries for high semantic similarity
3. Returns the cached response instantly if a strong match is found
4. Otherwise, forwards to the provider and caches the result

Caching is scoped by tenant -- no cross-tenant data leakage is possible. Default TTL is 1 hour, max age is 24 hours. Both are configurable per request via `p402.cache_ttl`. Tune cache settings in your [P402 dashboard](https://p402.io/dashboard).

Cache is most effective for: classification tasks, FAQ-style queries, repeated extractions, and any workload with natural prompt repetition. It is least effective for: creative generation, conversation continuations, and tasks requiring fresh data.

## Getting Started

The fastest way to try P402 is to sign in at [p402.io](https://p402.io) with your **email address** — no MetaMask or seed phrases required. A Base embedded wallet is created automatically via Coinbase CDP Embedded Wallet (email OTP, keys secured in AWS Nitro Enclave). The guided onboarding walks you through: role selection → API key generation → dashboard orientation. Wallet funding is pay-as-you-go — you'll be prompted to send USDC on Base when you make your first routed request.

For programmatic access, grab your API key from the dashboard after signing in. You can also try P402 via the **Base Mini App** at [mini.p402.io](https://mini.p402.io) — connect a Base Account, fund with USDC via Base Pay, and start chatting with real-time cost and savings tracking.

**MCP Server:** If you use Claude Desktop, Cursor, or Windsurf, add `@p402/mcp-server` to your MCP config — no REST integration needed:

```json
{
  "mcpServers": {
    "p402": {
      "command": "npx",
      "args": ["-y", "@p402/mcp-server"],
      "env": { "P402_API_KEY": "p402_live_..." }
    }
  }
}
```

The MCP server is listed on the official registry as `io.github.Z333Q/p402`.

## API Quick Reference

**Base URL:** `https://p402.io`

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/api/v2/chat/completions` | POST | Main routing endpoint (OpenAI-compatible) |
| `/api/v2/sessions` | POST | Create a new session |
| `/api/v2/sessions` | GET | List active sessions |
| `/api/v2/sessions/:id` | GET | Get session details and budget status |
| `/api/v2/sessions/:id` | DELETE | End a session |
| `/api/v2/providers` | GET | List all 300+ available providers/models |
| `/api/v2/providers/compare` | POST | Compare model pricing for a token count |
| `/api/v2/analytics/spend` | GET | Spending analytics |
| `/api/v2/analytics/recommendations` | GET | Cost optimization suggestions |
| `/api/v2/cache/stats` | GET | Cache hit rate and savings |
| `/api/v2/credits/balance` | GET | Current credit balance (1 credit = $0.01) |
| `/api/v2/credits/purchase` | POST | Buy credits (test or paid mode) |
| `/api/v2/credits/history` | GET | Credit transaction history |
| `/api/a2a` | POST | A2A JSON-RPC endpoint |
| `/.well-known/agent.json` | GET | Agent discovery card |
| `/api/a2a/mandates` | POST | Create AP2 spending mandate |
| `/api/a2a/mandates/:id/use` | POST | Use a mandate for payment |
| `/models` | GET (page) | Live model comparison with cost calculator |

**MCP Tools** (via `@p402/mcp-server`, stdio transport):

| Tool | Purpose |
|------|---------|
| `p402_chat` | Route a prompt (cost/quality/speed/balanced modes) |
| `p402_create_session` | Create a USD-capped budget session |
| `p402_get_session` | Check session balance and spend |
| `p402_list_models` | List all 300+ routable models |
| `p402_compare_providers` | Cost and latency comparison per model |
| `p402_agent_status` | Check World AgentKit registration and credit balance for a wallet |
| `p402_health` | Router and facilitator health status |

For complete request/response schemas and code examples in TypeScript, Python, and curl, read `references/api-reference.md`.

## Integration Patterns

### Pattern 1: Drop-In OpenAI Replacement (Simplest)

Change the base URL and API key. Optionally remove the `model` field to let P402 choose. Add `p402.mode` for routing control. This is a 2-line migration for any OpenAI SDK user.

### Pattern 2: Session-Budgeted Agent

Create a session with a dollar budget, pass `session_id` on every request, and P402 enforces the cap. When budget runs low, the session status changes to `exhausted` and requests are rejected. This is the pattern for autonomous agents that need spending guardrails.

### Pattern 3: A2A Agent-to-Agent Communication

Use the JSON-RPC endpoint at `/api/a2a` with Google's A2A protocol. Agents discover each other via `/.well-known/agent.json`, exchange tasks, and settle payments via the x402 extension. AP2 mandates pre-authorize spending. Read `references/a2a-protocol.md` for the full flow.

### Pattern 4: x402 Payment Settlement

For machine-to-machine payments using the HTTP 402 flow: service responds with payment requirements, client submits payment proof (EIP-3009 signature or transaction hash), service verifies and releases the resource. Three schemes are supported: `exact` (gasless EIP-3009), `onchain` (direct tx verification), and `receipt` (reuse prior payments). Read `references/payment-flows.md` for implementation details.

### Pattern 5: Credits-Based Free Trial (World ID)

Human-verified users receive **500 free credits ($5.00)** when they first verify with World ID. Credits are consumed automatically on every chat completion request for verified humans (`credits_spent` in `p402_metadata`). When credits run out, the session falls back to standard USDC billing. Check balance via `GET /api/v2/credits/balance`. Purchase additional credits via `POST /api/v2/credits/purchase` with `{ amount_usd, mode: 'test' | 'paid' }`.

```typescript
// Check credit balance
const res = await fetch('https://p402.io/api/v2/credits/balance', {
  headers: { Authorization: `Bearer ${P402_KEY}` }
});
const { balance } = await res.json();  // e.g. 487 (= $4.87)

// After a request: read credits_balance from p402_metadata
console.log(response.p402_metadata.credits_spent);   // 3 (= $0.03)
console.log(response.p402_metadata.credits_balance);  // 484
```

### Pattern 6: MCP Server (Claude Desktop / Cursor / Windsurf)

Add `@p402/mcp-server` to your MCP client config. No REST integration needed — the server runs as a stdio subprocess and exposes all 6 tools natively. The client can call `p402_chat` to route and pay for LLM requests, `p402_create_session` to establish a budget, and `p402_list_models` to discover providers. Registry identifier: `io.github.Z333Q/p402`.

### Pattern 7: Cost Intelligence Dashboard

Use `/api/v2/analytics/spend` for spending data and `/api/v2/analytics/recommendations` for optimization suggestions. The recommendations endpoint identifies cheaper model alternatives and estimates potential savings. Use `/api/v2/providers/compare` to show users real-time pricing comparisons.

## Reference Files

Read these when you need deeper detail than this overview provides:

- **`references/api-reference.md`** -- Complete endpoint documentation with TypeScript interfaces, request/response examples, error codes, and authentication details. Read this when generating integration code.

- **`references/routing-guide.md`** -- Deep dive on the routing engine: scoring algorithm, provider capabilities, model tiers, failover logic, and advanced configuration like custom weights, provider exclusion, and capability filtering. Read this when the user needs fine-grained routing control.

- **`references/payment-flows.md`** -- x402 protocol implementation: the 3-step payment flow, EIP-3009 gasless transfers, onchain verification, receipt reuse, USDC contract addresses, and the settlement lifecycle. Read this when the user is integrating payment settlement.

- **`references/a2a-protocol.md`** -- Google A2A protocol integration: JSON-RPC methods, task lifecycle, agent discovery, AP2 mandates, the x402 payment extension, and the Bazaar service marketplace. Read this when the user is building agent-to-agent systems.

## World AgentKit (Proof-of-Human Free Trial)

World AgentKit (`@worldcoin/agentkit`) is integrated into P402 as an identity layer. Agents registered in the AgentBook contract on Base mainnet with a World ID ZK proof-of-human receive free-trial access to `/api/v2/chat/completions` (default: 5 requests per unique human per endpoint), bypassing the standard billing guard.

### Prerequisites for World AgentKit

1. **Server**: `AGENTKIT_ENABLED=true` must be set in the P402 router environment. DB migration `v2_017_agentkit.sql` must be applied.
2. **Agent wallet**: Must be registered in AgentBook on Base mainnet (`0xE1D1D3526A6FAa37eb36bD10B933C1b77f4561a4`). Registration requires World ID verification via the World App.
3. **SIWE challenge signing**: On each request, the agent must sign a CAIP-122 / EIP-4361 SIWE challenge from the server. The signed payload goes in the `agentkit` request header (base64-encoded JSON).

### SDK Integration (transparent retry)

```typescript
const client = new P402Client({
  apiKey: 'p402_live_...',
  worldId: {
    signer: {
      address: '0xYourAgentWallet',
      chainId: 'eip155:8453',
      signMessage: (msg) => walletClient.signMessage({ message: msg }),
    },
  },
});

// SDK automatically signs the SIWE challenge and retries when the server
// signals free-trial availability via agentkit_challenge in a 429 response.
const response = await client.chat({ messages: [...] });
console.log(response.p402_metadata.human_verified);      // true
console.log(response.p402_metadata.human_usage_remaining); // 4 (uses left)
```

### CLI Commands

```bash
# Check if a wallet is registered in AgentBook
p402 agent register 0xYourAgentWallet

# Show AgentKit status for the configured agent
P402_AGENT_ADDRESS=0xYourAgentWallet p402 agent status
```

### MCP Tool

The `p402_agent_status` MCP tool checks AgentBook registration for any wallet address. Set `P402_WORLD_ID_ENABLED=true` in the MCP server environment to enable World AgentKit awareness.

### Cost Optimization with World AgentKit

- Check `human_verified` in `p402_metadata` before deciding whether to use a session budget
- If `human_verified: true`, the request was free — no budget was consumed
- Use `human_usage_remaining` to monitor free-trial exhaustion and switch to paid sessions proactively
- Never assume the free trial is unlimited — it defaults to 5 uses per human per endpoint

### Human-Anchored Reputation (Phase 2, live)

`reputation_score` in `p402_metadata` is a float [0.0–1.0], Redis-cached per World ID nullifier hash. Starts at 0.5 (neutral) for new verified humans.

Score components (weights): `settlement_score` (0.4), `session_score` (0.3), `dispute_score` (0.2), `sentinel_score` (0.1).

Events that affect score:
- **+settlement**: `recordSettlement()` — sigmoid increase toward 0.95 over 50+ payments
- **+session**: `recordSession(true/false)` — regularized completion rate
- **–dispute**: `recordDispute()` — mandate violations; each costs ~10%, floor 0.2
- **–sentinel**: `recordAnomalyFlag()` — anomaly flags; each costs ~5%, floor 0.3

Query a wallet's reputation publicly: `GET /api/v2/agents/{address}/reputation`

AP2 mandates: if grantor sends `agentkit:` header, the mandate row stores `human_id_hash`. Violations automatically call `recordDispute()` for that human.

## Tech Stack Context

P402 is a Next.js App Router application using TypeScript. The design system follows neo-brutalist principles: primary color #B6FF2E (lime), 2px borders, no rounded corners, IBM Plex Sans + monospace fonts. When generating UI code for P402-related interfaces, follow this aesthetic.
